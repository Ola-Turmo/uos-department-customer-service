/**
 * UOS Customer Service — Action Executor
 * Executes autonomous actions based on triage results and customer profiles.
 * Validates each action against the policy engine before execution.
 */

import type {
  AutonomousAction,
  TriageResult,
  CustomerProfile,
  PolicyDecision,
} from '../types.js';
import { DEFAULT_AUTONOMOUS_POLICY } from '../policy/policy-engine.js';

// ----------------------------------------------------------------------------
// Capability Registry Types
// ----------------------------------------------------------------------------

export interface Capability {
  actionType: string;
  description: string;
  maxConfidenceThreshold?: number;
}

export type CapabilityRegistry = Record<string, Capability>;

// ----------------------------------------------------------------------------
// Action Executor Result
// ----------------------------------------------------------------------------

export interface ActionExecutorResult {
  success: boolean;
  action: AutonomousAction;
  policyDecision: PolicyDecision;
  executedAt: string; // ISO timestamp
}

// ----------------------------------------------------------------------------
// Action Executor
// ----------------------------------------------------------------------------

/**
 * ActionExecutor evaluates and executes autonomous actions.
 *
 * It validates each action against the DEFAULT_AUTONOMOUS_POLICY rules
 * before execution, ensuring all autonomous operations stay within
 * configured guardrails.
 */
export class ActionExecutor {
  private capabilityRegistry: CapabilityRegistry;

  constructor() {
    this.capabilityRegistry = this.buildCapabilityRegistry();
  }

  /**
   * Build the default capability registry for all supported autonomous actions.
   */
  private buildCapabilityRegistry(): CapabilityRegistry {
    return {
      send_response_draft: {
        actionType: 'send_response_draft',
        description: 'Send an AI-generated response draft to the customer',
        maxConfidenceThreshold: 0.8,
      },
      update_ticket_status: {
        actionType: 'update_ticket_status',
        description: 'Update the status of a support ticket',
        maxConfidenceThreshold: 0.8,
      },
      add_internal_note: {
        actionType: 'add_internal_note',
        description: 'Add an internal note to a ticket for agent context',
      },
      create_kb_article: {
        actionType: 'create_kb_article',
        description: 'Create a knowledge base article from ticket resolution',
      },
      route_to_team: {
        actionType: 'route_to_team',
        description: 'Route the ticket to a specialized team',
      },
      issue_credit: {
        actionType: 'issue_credit',
        description: 'Issue a credit to the customer account',
      },
      issue_refund: {
        actionType: 'issue_refund',
        description: 'Issue a refund to the customer',
      },
    };
  }

  /**
   * Determines whether an action can be executed based on the policy,
   * triage result, and customer profile.
   *
   * Uses DEFAULT_AUTONOMOUS_POLICY to evaluate:
   * - Category restrictions
   * - Confidence thresholds
   * - Amount limits for refunds/credits
   * - Customer risk level
   */
  canExecute(
    action: AutonomousAction,
    triage: TriageResult,
    profile: CustomerProfile,
  ): PolicyDecision {
    // Check if action type is in capability registry
    const capability = this.capabilityRegistry[action.type];
    if (!capability) {
      return {
        allowed: false,
        reason: `Action type '${action.type}' is not in the capability registry.`,
        requiresHumanApproval: true,
      };
    }

    // Check confidence threshold if applicable
    if (capability.maxConfidenceThreshold !== undefined) {
      if (triage.confidence < capability.maxConfidenceThreshold) {
        return {
          allowed: false,
          reason: `Confidence ${(triage.confidence * 100).toFixed(0)}% is below the threshold of ${(capability.maxConfidenceThreshold * 100).toFixed(0)}% for '${action.type}'.`,
          requiresHumanApproval: true,
        };
      }
    }

    // Apply policy-based checks using DEFAULT_AUTONOMOUS_POLICY
    const policy = DEFAULT_AUTONOMOUS_POLICY;

    // Check always-require-human categories
    const alwaysRequireHumanLower = policy.alwaysRequireHuman.map((c) =>
      c.toLowerCase(),
    );
    if (alwaysRequireHumanLower.includes(triage.category.toLowerCase())) {
      return {
        allowed: false,
        reason: `Category '${triage.category}' always requires human approval.`,
        requiresHumanApproval: true,
      };
    }

    // Check churn risk escalation
    const riskOrder: CustomerProfile['churnRisk'][] = [
      'low',
      'medium',
      'high',
      'critical',
    ];
    const policySeverity = riskOrder.indexOf(policy.autoEscalateOnChurnRisk);
    const customerSeverity = riskOrder.indexOf(profile.churnRisk);
    if (customerSeverity >= policySeverity) {
      return {
        allowed: false,
        reason: `Customer churn risk is '${profile.churnRisk}' which requires human review per policy.`,
        requiresHumanApproval: true,
      };
    }

    // Check autonomous categories for routing, notes, KB creation
    if (
      action.type === 'route_to_team' ||
      action.type === 'add_internal_note' ||
      action.type === 'create_kb_article'
    ) {
      const autonomousCategoriesLower = policy.autonomousCategories.map((c) =>
        c.toLowerCase(),
      );
      if (!autonomousCategoriesLower.includes(triage.category.toLowerCase())) {
        return {
          allowed: false,
          reason: `Category '${triage.category}' is not in the autonomous categories list.`,
          requiresHumanApproval: true,
          overrideCategories: policy.autonomousCategories,
        };
      }
    }

    // Check amount limits for refunds and credits
    if (action.type === 'issue_refund') {
      const maxRefund = this.getEffectiveLimit(
        policy.maxAutonomousRefund,
        profile,
        policy.highValueAccountMultiplier,
      );
      if (action.amount > maxRefund) {
        return {
          allowed: false,
          reason: `Refund amount $${action.amount} exceeds max autonomous refund of $${maxRefund}.`,
          requiresHumanApproval: true,
          maxAmount: maxRefund,
        };
      }
    }

    if (action.type === 'issue_credit') {
      const maxCredit = this.getEffectiveLimit(
        policy.maxAutonomousCredit,
        profile,
        policy.highValueAccountMultiplier,
      );
      if (action.amount > maxCredit) {
        return {
          allowed: false,
          reason: `Credit amount $${action.amount} exceeds max autonomous credit of $${maxCredit}.`,
          requiresHumanApproval: true,
          maxAmount: maxCredit,
        };
      }
    }

    // All checks passed
    return {
      allowed: true,
      reason: 'Action is permitted under the current autonomous policy.',
      requiresHumanApproval: false,
    };
  }

  /**
   * Executes an autonomous action if permitted by policy.
   *
   * Returns an ActionExecutorResult with the outcome, including the
   * policy decision and timestamp.
   */
  async executeAction(
    action: AutonomousAction,
    triage: TriageResult,
    profile: CustomerProfile,
  ): Promise<ActionExecutorResult> {
    const policyDecision = this.canExecute(action, triage, profile);

    const result: ActionExecutorResult = {
      success: policyDecision.allowed,
      action,
      policyDecision,
      executedAt: new Date().toISOString(),
    };

    if (!policyDecision.allowed) {
      return result;
    }

    // Execute the action based on type
    await this.executeActionByType(action);

    return result;
  }

  /**
   * Returns the current capability registry, mapping action types
   * to their capabilities and constraints.
   */
  getCapabilityRegistry(): CapabilityRegistry {
    return { ...this.capabilityRegistry };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Calculate effective spending limit for a customer based on their tier.
   */
  private getEffectiveLimit(
    baseLimit: number,
    profile: CustomerProfile,
    multiplier: number,
  ): number {
    const isHighValue =
      profile.slaTier === 'enterprise' ||
      profile.planTier.toLowerCase().includes('vip');
    return isHighValue ? baseLimit * multiplier : baseLimit;
  }

  /**
   * Route execution to the appropriate action handler.
   */
  private async executeActionByType(action: AutonomousAction): Promise<void> {
    switch (action.type) {
      case 'send_response_draft':
        await this.executeSendResponseDraft(action);
        break;
      case 'update_ticket_status':
        await this.executeUpdateTicketStatus(action);
        break;
      case 'add_internal_note':
        await this.executeAddInternalNote(action);
        break;
      case 'create_kb_article':
        await this.executeCreateKBArticle(action);
        break;
      case 'route_to_team':
        await this.executeRouteToTeam(action);
        break;
      case 'issue_credit':
        await this.executeIssueCredit(action);
        break;
      case 'issue_refund':
        await this.executeIssueRefund(action);
        break;
      default:
        throw new Error(`Unknown action type: ${(action as AutonomousAction).type}`);
    }
  }

  private async executeSendResponseDraft(
    action: Extract<AutonomousAction, { type: 'send_response_draft' }>,
  ): Promise<void> {
    // Placeholder: would integrate with messaging platform
    console.log(`[ActionExecutor] Sending response draft for ticket ${action.ticketId}`);
  }

  private async executeUpdateTicketStatus(
    action: Extract<AutonomousAction, { type: 'update_ticket_status' }>,
  ): Promise<void> {
    // Placeholder: would integrate with ticket management system
    console.log(`[ActionExecutor] Updating ticket ${action.ticketId} status to ${action.status}`);
  }

  private async executeAddInternalNote(
    action: Extract<AutonomousAction, { type: 'add_internal_note' }>,
  ): Promise<void> {
    // Placeholder: would integrate with ticket management system
    console.log(`[ActionExecutor] Adding internal note to ticket ${action.ticketId}`);
  }

  private async executeCreateKBArticle(
    action: Extract<AutonomousAction, { type: 'create_kb_article' }>,
  ): Promise<void> {
    // Placeholder: would integrate with knowledge base system
    console.log(`[ActionExecutor] Creating KB article for ticket ${action.ticketId}`);
  }

  private async executeRouteToTeam(
    action: Extract<AutonomousAction, { type: 'route_to_team' }>,
  ): Promise<void> {
    // Placeholder: would integrate with routing system
    console.log(`[ActionExecutor] Routing ticket ${action.ticketId} to ${action.team}`);
  }

  private async executeIssueCredit(
    action: Extract<AutonomousAction, { type: 'issue_credit' }>,
  ): Promise<void> {
    // Placeholder: would integrate with billing system
    console.log(`[ActionExecutor] Issuing $${action.amount} credit to customer ${action.customerId}`);
  }

  private async executeIssueRefund(
    action: Extract<AutonomousAction, { type: 'issue_refund' }>,
  ): Promise<void> {
    // Placeholder: would integrate with billing/refund system
    console.log(`[ActionExecutor] Issuing $${action.amount} refund to customer ${action.customerId}`);
  }
}
