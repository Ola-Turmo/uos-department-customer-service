/**
 * Task Flow Engine
 * VAL-DEPT-CS-TASK-FLOWS: Handle complex multi-step autonomous task completion
 *
 * Task flows are state machines that execute multi-step resolutions
 * across multiple systems (Stripe, Zendesk, email, etc.)
 */

import type { IssueCategory, IssuePriority } from "../types.js";
import { refundEngine } from "../billing/refund-engine.js";
import type { CustomerProfile } from "../customer/customer-profile.js";

// ============================================
// Types
// ============================================

export type FlowStatus = "pending" | "running" | "paused" | "completed" | "failed" | "rolled_back";
export type FlowType =
  | "cancel_subscription_and_refund"
  | "account_recovery"
  | "duplicate_billing_fix"
  | "mfa_reset"
  | "usage_dispute"
  | "plan_change"
  | "partial_refund";

export interface FlowStep {
  stepId: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "rolled_back";
  executedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
  rollbackAvailable: boolean;
  rollbackStepId?: string; // step to execute on rollback
}

export interface TaskFlow {
  flowId: string;
  flowType: FlowType;
  status: FlowStatus;
  customerId: string;
  issueId: string;
  steps: FlowStep[];
  currentStepIndex: number;
  context: Record<string, unknown>; // shared flow state
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  rollbackHistory: Array<{ stepId: string; rolledBackAt: string }>;
}

export interface FlowExecutionResult {
  flowId: string;
  success: boolean;
  stepsExecuted: number;
  stepsCompleted: number;
  stepsFailed: number;
  result?: Record<string, unknown>; // final outcome
  error?: string;
  canRollback: boolean;
}

export interface StepAction {
  system: "stripe" | "zendesk" | "email" | "shopify" | "intercom" | "internal";
  action: string; // e.g., "cancel_subscription", "issue_refund", "send_email"
  params: Record<string, unknown>;
  onSuccess?: string; // next stepId
  onFailure?: string; // stepId to execute on failure
  rollbackAction?: string; // action to undo this step
  rollbackParams?: Record<string, unknown>;
}

// ============================================
// Flow Definitions
// ============================================

interface FlowDefinition {
  type: FlowType;
  name: string;
  description: string;
  applicableCategories: IssueCategory[];
  minConfidence: number;
  steps: Array<{
    stepId: string;
    name: string;
    description: string;
    action: StepAction;
    rollbackStepId?: string;
  }>;
}

// All flow definitions
const FLOW_DEFINITIONS: FlowDefinition[] = [
  {
    type: "cancel_subscription_and_refund",
    name: "Cancel Subscription & Refund Last Charge",
    description: "Authenticate → verify no pending orders → cancel subscription → refund last charge → send confirmation → create KB update",
    applicableCategories: ["billing", "refund"],
    minConfidence: 0.8,
    steps: [
      {
        stepId: "authenticate",
        name: "Authenticate account",
        description: "Verify customer owns the account and subscription",
        action: { system: "internal", action: "authenticate_customer", params: {} },
      },
      {
        stepId: "check_pending_orders",
        name: "Check for pending orders",
        description: "Verify no active orders that would conflict with cancellation",
        action: { system: "shopify", action: "list_pending_orders", params: {} },
      },
      {
        stepId: "cancel_subscription",
        name: "Cancel subscription in Stripe",
        description: "Cancel the active subscription",
        action: { system: "stripe", action: "cancel_subscription", params: {} },
        rollbackStepId: "reactivate_subscription",
      },
      {
        stepId: "issue_refund",
        name: "Issue refund for last charge",
        description: "Refund the most recent charge",
        action: { system: "stripe", action: "issue_refund", params: {} },
        rollbackStepId: "reverse_refund",
      },
      {
        stepId: "send_confirmation",
        name: "Send cancellation confirmation email",
        description: "Email customer with cancellation details and refund amount",
        action: { system: "email", action: "send_template", params: {} },
      },
      {
        stepId: "update_kb",
        name: "Create KB update if new cancellation pattern",
        description: "Flag if this is a recurring cancellation reason for KB article",
        action: { system: "internal", action: "flag_kb_update", params: {} },
      },
    ],
  },
  {
    type: "account_recovery",
    name: "Account Recovery Flow",
    description: "Check account status → unlock if locked → send password reset → reset MFA if needed → confirm",
    applicableCategories: ["account"],
    minConfidence: 0.75,
    steps: [
      {
        stepId: "check_account_status",
        name: "Check account lock status",
        description: "Determine if account is locked and why",
        action: { system: "internal", action: "check_account_status", params: {} },
      },
      {
        stepId: "unlock_account",
        name: "Unlock account",
        description: "Remove lock if present",
        action: { system: "internal", action: "unlock_account", params: {} },
        rollbackStepId: "relock_account",
      },
      {
        stepId: "send_password_reset",
        name: "Send password reset email",
        description: "Send password reset link",
        action: { system: "email", action: "send_password_reset", params: {} },
      },
      {
        stepId: "reset_mfa",
        name: "Reset MFA if needed",
        description: "If MFA issue detected, reset MFA device",
        action: { system: "internal", action: "reset_mfa", params: {} },
        rollbackStepId: "restore_mfa",
      },
      {
        stepId: "send_security_confirmation",
        name: "Send security confirmation",
        description: "Email customer confirming account recovery completed",
        action: { system: "email", action: "send_security_confirmation", params: {} },
      },
    ],
  },
  {
    type: "duplicate_billing_fix",
    name: "Duplicate Billing Fix",
    description: "Pull Stripe history → verify duplicate → issue partial refund → adjust account → confirm",
    applicableCategories: ["billing"],
    minConfidence: 0.85,
    steps: [
      {
        stepId: "pull_payment_history",
        name: "Pull Stripe payment history",
        description: "Get customer's recent payment history to identify duplicates",
        action: { system: "stripe", action: "list_charges", params: {} },
      },
      {
        stepId: "verify_duplicate",
        name: "Verify duplicate charges",
        description: "Confirm charges are truly duplicate",
        action: { system: "internal", action: "verify_duplicate", params: {} },
      },
      {
        stepId: "issue_partial_refund",
        name: "Issue partial refund for duplicate",
        description: "Refund the duplicate charge amount",
        action: { system: "stripe", action: "issue_refund", params: {} },
        rollbackStepId: "reverse_refund",
      },
      {
        stepId: "log_billing_adjustment",
        name: "Log billing adjustment",
        description: "Record the billing adjustment for audit",
        action: { system: "internal", action: "log_adjustment", params: {} },
      },
      {
        stepId: "send_explanation",
        name: "Send explanation email",
        description: "Apologize and explain the duplicate charge was refunded",
        action: { system: "email", action: "send_billing_explanation", params: {} },
      },
    ],
  },
  {
    type: "mfa_reset",
    name: "MFA Reset Flow",
    description: "Verify identity → disable MFA → send backup codes → confirm",
    applicableCategories: ["account"],
    minConfidence: 0.8,
    steps: [
      {
        stepId: "verify_identity",
        name: "Verify customer identity",
        description: "Confirm account ownership via email verification",
        action: { system: "internal", action: "verify_identity", params: {} },
      },
      {
        stepId: "disable_mfa",
        name: "Disable current MFA",
        description: "Remove the existing MFA device",
        action: { system: "internal", action: "disable_mfa", params: {} },
        rollbackStepId: "restore_mfa",
      },
      {
        stepId: "send_backup_codes",
        name: "Send backup codes",
        description: "Email backup recovery codes",
        action: { system: "email", action: "send_backup_codes", params: {} },
      },
    ],
  },
  {
    type: "plan_change",
    name: "Plan Change Flow",
    description: "Verify plan → prorate if upgrading → update subscription → send confirmation",
    applicableCategories: ["billing"],
    minConfidence: 0.8,
    steps: [
      {
        stepId: "verify_current_plan",
        name: "Verify current plan",
        description: "Check current subscription tier",
        action: { system: "stripe", action: "get_subscription", params: {} },
      },
      {
        stepId: "calculate_proration",
        name: "Calculate proration",
        description: "Calculate credit for unused time on current plan",
        action: { system: "internal", action: "calculate_proration", params: {} },
      },
      {
        stepId: "update_subscription",
        name: "Update subscription in Stripe",
        description: "Change to new plan",
        action: { system: "stripe", action: "update_subscription", params: {} },
        rollbackStepId: "restore_subscription",
      },
      {
        stepId: "send_plan_confirmation",
        name: "Send plan change confirmation",
        description: "Email customer with new plan details",
        action: { system: "email", action: "send_plan_confirmation", params: {} },
      },
    ],
  },
  {
    type: "usage_dispute",
    name: "Usage Billing Dispute",
    description: "Pull usage data → compare to charges → apply credit if overage → confirm",
    applicableCategories: ["billing"],
    minConfidence: 0.75,
    steps: [
      {
        stepId: "pull_usage_data",
        name: "Pull usage data",
        description: "Get detailed usage records for billing period",
        action: { system: "internal", action: "get_usage_records", params: {} },
      },
      {
        stepId: "compare_to_charges",
        name: "Compare usage to charges",
        description: "Verify charges match actual usage",
        action: { system: "internal", action: "compare_usage_charges", params: {} },
      },
      {
        stepId: "apply_credit",
        name: "Apply credit if overage found",
        description: "Issue account credit for overage",
        action: { system: "stripe", action: "create_credit", params: {} },
        rollbackStepId: "reverse_credit",
      },
      {
        stepId: "send_dispute_resolution",
        name: "Send dispute resolution email",
        description: "Explain the dispute resolution to customer",
        action: { system: "email", action: "send_dispute_resolution", params: {} },
      },
    ],
  },
  {
    type: "partial_refund",
    name: "Partial Refund Flow",
    description: "Verify charge → calculate partial amount → issue partial refund → log → confirm",
    applicableCategories: ["billing", "refund"],
    minConfidence: 0.8,
    steps: [
      {
        stepId: "verify_charge",
        name: "Verify charge exists",
        description: "Confirm the charge in Stripe",
        action: { system: "stripe", action: "get_charge", params: {} },
      },
      {
        stepId: "calculate_partial",
        name: "Calculate partial refund amount",
        description: "Determine fair partial refund based on issue",
        action: { system: "internal", action: "calculate_partial_refund", params: {} },
      },
      {
        stepId: "issue_partial_refund",
        name: "Issue partial refund",
        description: "Issue the calculated partial refund",
        action: { system: "stripe", action: "issue_refund", params: {} },
        rollbackStepId: "reverse_refund",
      },
      {
        stepId: "log_refund",
        name: "Log refund for audit",
        description: "Record in refund ledger",
        action: { system: "internal", action: "log_refund", params: {} },
      },
    ],
  },
];

// ============================================
// Task Flow Engine
// ============================================

export class TaskFlowEngine {
  private activeFlows: Map<string, TaskFlow> = new Map();
  private flowHistory: Map<string, TaskFlow> = new Map();
  private maxHistorySize = 500;

  /**
   * Determine which flow type applies to an issue (if any)
   */
  matchFlow(
    category: IssueCategory,
    subject: string,
    description: string,
    confidence: number
  ): FlowType | null {
    // Simple keyword + category matching
    for (const def of FLOW_DEFINITIONS) {
      if (!def.applicableCategories.includes(category)) continue;
      if (confidence < def.minConfidence) continue;

      const text = `${subject} ${description}`.toLowerCase();

      switch (def.type) {
        case "cancel_subscription_and_refund":
          if (text.includes("cancel") && (text.includes("refund") || text.includes("subscription")))
            return "cancel_subscription_and_refund";
          break;
        case "account_recovery":
          if (text.includes("account") && (text.includes("recover") || text.includes("can't access") || text.includes("locked")))
            return "account_recovery";
          break;
        case "duplicate_billing_fix":
          if (text.includes("duplicate") || text.includes("charged twice") || text.includes("double charge"))
            return "duplicate_billing_fix";
          break;
        case "mfa_reset":
          if (text.includes("mfa") || text.includes("2fa") || text.includes("authenticator") || text.includes("two-factor"))
            return "mfa_reset";
          break;
        case "plan_change":
          if (text.includes("plan") || text.includes("upgrade") || text.includes("downgrade") || text.includes("change"))
            return "plan_change";
          break;
        case "usage_dispute":
          if (text.includes("usage") && text.includes("charge"))
            return "usage_dispute";
          break;
        case "partial_refund":
          if (text.includes("partial") && (text.includes("refund") || text.includes("partial")))
            return "partial_refund";
          break;
      }
    }
    return null;
  }

  /**
   * Start a new task flow
   */
  startFlow(params: {
    flowType: FlowType;
    customerId: string;
    issueId: string;
    context?: Record<string, unknown>;
  }): TaskFlow {
    const def = FLOW_DEFINITIONS.find(f => f.type === params.flowType);
    if (!def) throw new Error(`Unknown flow type: ${params.flowType}`);

    const flowId = `flow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const flow: TaskFlow = {
      flowId,
      flowType: params.flowType,
      status: "pending",
      customerId: params.customerId,
      issueId: params.issueId,
      steps: def.steps.map(s => ({
        stepId: s.stepId,
        name: s.name,
        description: s.description,
        status: "pending",
        rollbackAvailable: !!s.rollbackStepId,
        rollbackStepId: s.rollbackStepId,
      })),
      currentStepIndex: -1,
      context: params.context ?? {},
      startedAt: new Date().toISOString(),
      rollbackHistory: [],
    };

    this.activeFlows.set(flowId, flow);
    return flow;
  }

  /**
   * Execute the next step in a flow
   */
  executeNextStep(flowId: string): TaskFlow {
    const flow = this.activeFlows.get(flowId);
    if (!flow) throw new Error(`Flow not found: ${flowId}`);
    if (flow.status !== "pending" && flow.status !== "running")
      throw new Error(`Flow ${flowId} is ${flow.status}, cannot execute`);

    flow.status = "running";
    const def = FLOW_DEFINITIONS.find(f => f.type === flow.flowType);
    if (!def) throw new Error(`Flow definition not found for: ${flow.flowType}`);

    const nextIndex = flow.currentStepIndex + 1;
    if (nextIndex >= flow.steps.length) {
      flow.status = "completed";
      flow.completedAt = new Date().toISOString();
      this.archiveFlow(flow);
      return flow;
    }

    const step = flow.steps[nextIndex];
    const stepDef = def.steps.find(s => s.stepId === step.stepId);
    if (!stepDef) throw new Error(`Step definition not found: ${step.stepId}`);

    flow.currentStepIndex = nextIndex;
    step.status = "running";

    // Execute the action (simulated)
    try {
      const result = this.executeAction(stepDef.action, flow);
      step.status = "completed";
      step.executedAt = new Date().toISOString();
      step.result = result;
    } catch (err) {
      step.status = "failed";
      step.error = err instanceof Error ? err.message : String(err);
      flow.status = "failed";
      flow.failedAt = new Date().toISOString();
      // Auto-rollback available steps
      this.rollbackAvailable(flowId);
    }

    if (step.status === "completed" && flow.currentStepIndex === flow.steps.length - 1) {
      flow.status = "completed";
      flow.completedAt = new Date().toISOString();
      this.archiveFlow(flow);
    }

    return flow;
  }

  /**
   * Roll back a specific step
   */
  rollbackStep(flowId: string, stepId: string): TaskFlow {
    const flow = this.activeFlows.get(flowId);
    if (!flow) throw new Error(`Flow not found: ${flowId}`);
    if (flow.status === "rolled_back") throw new Error("Flow already fully rolled back");

    const step = flow.steps.find(s => s.stepId === stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);
    if (!step.rollbackAvailable) throw new Error(`Step ${stepId} has no rollback`);

    const def = FLOW_DEFINITIONS.find(f => f.type === flow.flowType);
    const stepDef = def?.steps.find(s => s.stepId === stepId);
    if (!stepDef?.action.rollbackAction) throw new Error(`Rollback not defined for ${stepId}`);

    // Execute rollback action
    const rollbackParams = stepDef.action.rollbackParams ?? {};
    this.executeAction({
      ...stepDef.action,
      action: stepDef.action.rollbackAction,
      params: rollbackParams,
    }, flow);

    flow.rollbackHistory.push({ stepId, rolledBackAt: new Date().toISOString() });
    step.status = "rolled_back";

    return flow;
  }

  /**
   * Auto-rollback all failed flow's reversible steps
   */
  rollbackAvailable(flowId: string): void {
    const flow = this.activeFlows.get(flowId);
    if (!flow) return;
    for (const step of flow.steps) {
      if (step.status === "completed" && step.rollbackAvailable) {
        try { this.rollbackStep(flowId, step.stepId); } catch { /* ignore */ }
      }
    }
    flow.status = "rolled_back";
    this.archiveFlow(flow);
  }

  /**
   * Get active flow by ID
   */
  getFlow(flowId: string): TaskFlow | undefined {
    return this.activeFlows.get(flowId) ?? this.flowHistory.get(flowId);
  }

  /**
   * Get all active flows for a customer
   */
  getActiveFlowsForCustomer(customerId: string): TaskFlow[] {
    return Array.from(this.activeFlows.values()).filter(f => f.customerId === customerId);
  }

  /**
   * Get flow execution summary
   */
  getExecutionSummary(flowId: string): FlowExecutionResult {
    const flow = this.getFlow(flowId);
    if (!flow) throw new Error(`Flow not found: ${flowId}`);

    const stepsCompleted = flow.steps.filter(s => s.status === "completed").length;
    const stepsFailed = flow.steps.filter(s => s.status === "failed").length;
    const canRollback = flow.steps.some(s => s.status === "completed" && s.rollbackAvailable);

    return {
      flowId,
      success: flow.status === "completed",
      stepsExecuted: flow.currentStepIndex + 1,
      stepsCompleted,
      stepsFailed,
      result: flow.context,
      error: flow.steps.find(s => s.status === "failed")?.error,
      canRollback,
    };
  }

  // --- Private ---

  private executeAction(action: StepAction, flow: TaskFlow): Record<string, unknown> {
    // Simulated action execution — returns mock result
    // In production this would call real APIs (Stripe, Zendesk, etc.)
    const result: Record<string, unknown> = { action: action.action, system: action.system, executed: true };

    switch (action.system) {
      case "stripe":
        if (action.action === "cancel_subscription") {
          flow.context["subscriptionCancelled"] = true;
          result["subscriptionId"] = "sub_test_123";
          result["cancelledAt"] = new Date().toISOString();
        } else if (action.action === "issue_refund") {
          result["refundId"] = `re_${Date.now()}`;
          result["amount"] = flow.context["refundAmount"] ?? 5000;
          result["status"] = "succeeded";
        } else if (action.action === "get_charge") {
          result["chargeId"] = "ch_test_123";
          result["amount"] = 9900;
        } else if (action.action === "create_credit") {
          result["creditId"] = `credit_${Date.now()}`;
          result["amount"] = flow.context["creditAmount"] ?? 1000;
        } else if (action.action === "update_subscription") {
          result["subscriptionId"] = "sub_test_123";
          result["newPlan"] = flow.context["newPlan"] ?? "pro";
        }
        break;

      case "email":
        result["emailId"] = `email_${Date.now()}`;
        result["sentTo"] = flow.context["customerEmail"] ?? "customer@example.com";
        result["sentAt"] = new Date().toISOString();
        break;

      case "zendesk":
        result["ticketId"] = `zen_${Date.now()}`;
        result["status"] = "updated";
        break;

      case "shopify":
        result["orders"] = [];
        break;

      case "internal":
        result["internalAction"] = action.action;
        result["completed"] = true;
        break;
    }

    return result;
  }

  private archiveFlow(flow: TaskFlow): void {
    this.activeFlows.delete(flow.flowId);
    this.flowHistory.set(flow.flowId, flow);
    if (this.flowHistory.size > this.maxHistorySize) {
      const oldest = this.flowHistory.keys().next().value;
      if (oldest) this.flowHistory.delete(oldest);
    }
  }
}

// Export singleton
export const taskFlowEngine = new TaskFlowEngine();
