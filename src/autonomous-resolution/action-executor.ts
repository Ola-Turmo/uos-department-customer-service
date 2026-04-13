/**
 * Autonomous Action Executor
 * VAL-DEPT-CS-AUTO: Executes deterministic resolution playbooks within policy guardrails
 *
 * Takes a triage result + customer profile + policy evaluation and executes
 * the appropriate autonomous action (close, acknowledge, route, refund, etc.)
 */

import type {
  TriageResult,
  AIEnrichedTriageResult,
  ResponseDraft,
  IssueCategory,
  IssuePriority,
} from "../types.js";
import {
  policyEngine,
  PolicyEvaluation,
  AccountTier,
  AUTONOMOUS_POLICY,
} from "../policy/policy-engine.js";
import { CustomerProfile } from "../customer/customer-profile.js";
import { slaEngine } from "../sla/sla-engine.js";
import { feedbackBus } from "../feedback/feedback-bus.js";

// ============================================
// Action Result Types
// ============================================

export type ActionOutcome =
  | "autonomous_close"
  | "autonomous_acknowledge"
  | "autonomous_route"
  | "autonomous_refund_issued"
  | "autonomous_refund_pending"
  | "autonomous_draft_ready"
  | "deescalation_offer_sent"
  | "require_human"
  | "error";

export interface ActionResult {
  outcome: ActionOutcome;
  issueId: string;
  action: string;
  reason: string;
  policyEvaluation: PolicyEvaluation;
  responseDraft?: ResponseDraft;
  refundApproved?: {
    amount: number;
    approved: boolean;
    type: "autonomous" | "notification_required" | "manual_required";
  };
  slaDeadline?: {
    deadlineMinutes: number;
    remainingMinutes: number | null;
    status: string;
  };
  errors: string[];
  executedAt: string;
}

export interface ActionContext {
  issueId: string;
  customerId: string;
  channel: "email" | "chat" | "whatsapp" | "phone" | "twitter" | "app";
  triageResult: TriageResult | AIEnrichedTriageResult;
  responseDraft?: ResponseDraft;
  customerProfile?: CustomerProfile;
  estimatedRefundAmount?: number;
  resolvedBy?: "autonomous" | "human";
}

// ============================================
// Response Templates
// ============================================

const AUTONOMOUS_CLOSE_MESSAGES: Record<IssueCategory, (subject: string) => string> = {
  "how-to": (s) =>
    `Hi there! Thanks for reaching out. I wanted to make sure you have the answer to your question about "${s}":\n\n[AI response draft ready — insert KB article or guide here]\n\nLet us know if you need anything else!`,
  "feature-request": (s) =>
    `Hi! Thank you for your feature suggestion — we really appreciate you taking the time to share ideas about "${s}". Our product team reviews every suggestion and uses them to shape our roadmap. While we can't respond to every suggestion individually, yours has been logged.\n\nIf this is urgent or you'd like to discuss directly, reply and let us know!`,
  other: () =>
    `Hi! Thanks for reaching out. We're looking into your question and will get back to you shortly.`,
  // Categories that don't auto-close (empty string = no autonomous close)
  bug: () => "",
  technical: () => "",
  account: () => "",
  billing: () => "",
  refund: () => "",
  complaint: () => "",
};

const DEESCALATION_OFFERS = [
  "I completely understand this is frustrating, and I want to make this right. As a gesture of goodwill, I'd like to offer you [credit/refund] — please let me know if that would help.",
  "I'm sorry you're experiencing this issue. To show our appreciation for your patience, we'd like to offer [credit] on your account. Would that work for you?",
  "I can see this has been a poor experience, and I sincerely apologize. Let me personally make sure this gets resolved — I've flagged it for immediate attention from our team.",
];

// ============================================
// Autonomous Action Executor
// ============================================

export class AutonomousActionExecutor {
  /**
   * Execute the appropriate autonomous action for an issue
   */
  async execute(context: ActionContext): Promise<ActionResult> {
    const { issueId, customerId, channel, triageResult, responseDraft, customerProfile, estimatedRefundAmount = 0 } = context;
    const errors: string[] = [];
    const now = new Date().toISOString();

    // Get intent + sentiment if AI-enriched
    const intentClassification = "intentClassification" in triageResult ? triageResult.intentClassification : undefined;
    const sentiment = "sentiment" in triageResult ? triageResult.sentiment : undefined;

    // Build policy evaluation
    const policyEval = policyEngine.evaluate({
      category: triageResult.category,
      priority: triageResult.priority,
      confidence: triageResult.confidence === "high" ? 0.9 : triageResult.confidence === "medium" ? 0.6 : 0.3,
      estimatedRefundAmount,
      accountTier: customerProfile?.accountTier ?? "standard",
      escalationRisk: sentiment?.escalationRisk ?? 0,
      sentimentPolarity: sentiment?.polarity,
      sentimentIntensity: sentiment?.intensity,
      slaBreachMinutes: this.getSLABreachMinutes(issueId, triageResult.priority),
      isReopened: false,
      previousHumanEscalations: customerProfile?.health.escalationCount30d ?? 0,
    });

    // Register SLA tracking
    const slaDeadline = this.registerAndCheckSLA(issueId, triageResult, customerProfile);

    // ============================================
    // Route based on policy decision
    // ============================================

    // HIGH ESCALATION RISK → de-escalation offer + human route
    if (
      policyEval.overrides.some((o) => o.source === "sentiment") &&
      (sentiment?.escalationRisk ?? 0) > AUTONOMOUS_POLICY.deescalationOfferThreshold
    ) {
      return this.handleDeescalation({
        issueId,
        triageResult,
        sentiment,
        policyEval,
        errors,
        now,
        slaDeadline,
      });
    }

    // REQUIRE HUMAN → route to specialist with full package
    if (policyEval.action === "require_human") {
      return {
        outcome: "require_human",
        issueId,
        action: "require_human",
        reason: policyEval.reason,
        policyEvaluation: policyEval,
        slaDeadline,
        errors,
        executedAt: now,
      };
    }

    // AUTONOMOUS CLOSE
    if (policyEval.action === "autonomous_close") {
      return this.handleAutonomousClose({
        issueId,
        triageResult,
        responseDraft,
        policyEval,
        customerProfile,
        errors,
        now,
        slaDeadline,
      });
    }

    // AUTONOMOUS ACKNOWLEDGE + ROUTE
    if (policyEval.action === "autonomous_acknowledge") {
      return this.handleAutonomousAcknowledge({
        issueId,
        triageResult,
        responseDraft,
        customerId,
        channel,
        policyEval,
        errors,
        now,
        slaDeadline,
      });
    }

    // AUTONOMOUS DRAFT ONLY
    return {
      outcome: "autonomous_draft_ready",
      issueId,
      action: "autonomous_draft_only",
      reason: policyEval.reason,
      policyEvaluation: policyEval,
      responseDraft,
      slaDeadline,
      errors,
      executedAt: now,
    };
  }

  /**
   * Handle autonomous close (how-to, faq, feedback, praise, feature-request)
   */
  private handleAutonomousClose(params: {
    issueId: string;
    triageResult: TriageResult;
    responseDraft?: ResponseDraft;
    policyEval: PolicyEvaluation;
    customerProfile?: CustomerProfile;
    errors: string[];
    now: string;
    slaDeadline?: { deadlineMinutes: number; remainingMinutes: number | null; status: string };
  }): ActionResult {
    const { issueId, triageResult, responseDraft, customerProfile, errors, now, slaDeadline } = params;

    const templateFn = AUTONOMOUS_CLOSE_MESSAGES[triageResult.category] ?? AUTONOMOUS_CLOSE_MESSAGES.other;
    const autoMessage = templateFn(triageResult.category === "other" ? triageResult.issueId : triageResult.issueId);

    // Use AI draft if available, otherwise template
    const finalDraft = responseDraft?.content ?? autoMessage;
    const finalResponseDraft: ResponseDraft = responseDraft ?? {
      id: `auto-${issueId}`,
      tone: "neutral",
      content: finalDraft,
      citations: [],
      confidence: triageResult.confidence,
      policyCompliant: true,
      createdAt: now,
    };

    // Mark SLA as resolved
    if (slaDeadline) {
      slaEngine.recordResolution(issueId);
    }

    return {
      outcome: "autonomous_close",
      issueId,
      action: `Autonomously closed ${triageResult.category} issue`,
      reason: `Category '${triageResult.category}' with confidence ${triageResult.confidence} — policy approved`,
      policyEvaluation: params.policyEval,
      responseDraft: finalResponseDraft,
      slaDeadline,
      errors,
      executedAt: now,
    };
  }

  /**
   * Handle autonomous acknowledge + route to specialist
   */
  private handleAutonomousAcknowledge(params: {
    issueId: string;
    triageResult: TriageResult;
    responseDraft?: ResponseDraft;
    customerId: string;
    channel: string;
    policyEval: PolicyEvaluation;
    errors: string[];
    now: string;
    slaDeadline?: { deadlineMinutes: number; remainingMinutes: number | null; status: string };
  }): ActionResult {
    const { issueId, triageResult, responseDraft, customerId, channel, policyEval, errors, now, slaDeadline } = params;

    // Acknowledge to customer immediately
    const ackMessage = `Hi! Thanks for reaching out. We've received your message about ${triageResult.category} and someone from our team will be with you shortly. Here's a preview of what we're working on:\n\n${responseDraft?.content ?? "[Draft being prepared]"}\n\nWe'll follow up with a full response within SLA.`;

    const finalDraft: ResponseDraft = responseDraft ?? {
      id: `ack-${issueId}`,
      tone: "empathetic",
      content: ackMessage,
      citations: triageResult.evidence.map((e) => ({
        evidenceId: e.id,
        quote: e.description.substring(0, 100),
      })),
      confidence: triageResult.confidence,
      policyCompliant: true,
      createdAt: now,
    };

    // Route to specialist
    const team = triageResult.routingRecommendation.team;
    const roleKey = triageResult.routingRecommendation.specialistRoleKey;

    return {
      outcome: "autonomous_route",
      issueId,
      action: `Acknowledged and routed to ${team}${roleKey ? ` (${roleKey})` : ""}`,
      reason: `${triageResult.category} requires specialist — acknowledged with draft`,
      policyEvaluation: policyEval,
      responseDraft: finalDraft,
      slaDeadline,
      errors,
      executedAt: now,
    };
  }

  /**
   * Handle de-escalation scenario
   */
  private handleDeescalation(params: {
    issueId: string;
    triageResult: TriageResult;
    sentiment: any;
    policyEval: PolicyEvaluation;
    errors: string[];
    now: string;
    slaDeadline?: { deadlineMinutes: number; remainingMinutes: number | null; status: string };
  }): ActionResult {
    const { issueId, triageResult, sentiment, policyEval, errors, now, slaDeadline } = params;

    const deescalationMessage =
      DEESCALATION_OFFERS[Math.floor(Math.random() * DEESCALATION_OFFERS.length)];

    const responseDraft: ResponseDraft = {
      id: `deesc-${issueId}`,
      tone: "empathetic",
      content: deescalationMessage,
      citations: [],
      confidence: sentiment?.escalationRisk ?? 0.5,
      policyCompliant: true,
      createdAt: now,
    };

    return {
      outcome: "deescalation_offer_sent",
      issueId,
      action: "De-escalation offer sent + routed to senior specialist",
      reason: `High escalation risk (${((sentiment?.escalationRisk ?? 0) * 100).toFixed(0)}%) + negative sentiment`,
      policyEvaluation: policyEval,
      responseDraft,
      slaDeadline,
      errors,
      executedAt: now,
    };
  }

  private getSLABreachMinutes(issueId: string, priority: IssuePriority): number | undefined {
    const info = slaEngine.getDeadlineInfo(issueId);
    if (info.remainingMinutes === null) return undefined;
    const remaining = info.remainingMinutes;
    return remaining < 0 ? Math.abs(remaining) : 0;
  }

  private registerAndCheckSLA(
    issueId: string,
    triageResult: TriageResult,
    customerProfile?: CustomerProfile
  ): { deadlineMinutes: number; remainingMinutes: number | null; status: string } {
    slaEngine.registerTicket({
      issueId,
      priority: triageResult.priority,
      category: triageResult.category,
      accountTier: customerProfile?.accountTier ?? "standard",
    });

    const info = slaEngine.getDeadlineInfo(issueId);
    return {
      deadlineMinutes: info.deadline?.deadlineMinutes ?? 0,
      remainingMinutes: info.remainingMinutes,
      status: info.deadline?.currentStatus ?? "healthy",
    };
  }
}

// Singleton
export const autonomousActionExecutor = new AutonomousActionExecutor();
