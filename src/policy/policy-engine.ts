/**
 * Policy Engine — Autonomous Action Guardrails
 * VAL-DEPT-CS-POLICY: Every autonomous action is checked against this policy
 *
 * Defines what the autonomous system is allowed to do without human approval,
 * and what always requires a human specialist.
 */

import type { IssueCategory, IssuePriority } from "../types.js";

// ============================================
// Policy Configuration
// ============================================

export const AUTONOMOUS_POLICY = {
  // Financial thresholds (USD)
  maxAutonomousRefund: 50,
  maxAutonomousCredit: 25,
  highValueAccountMultiplier: 2, // VIP/enterprise tiers get 2x thresholds
  mediumValueAccountMultiplier: 1.5, // mid-tier gets 1.5x

  // Confidence thresholds
  maxAutonomousCloseConfidence: 0.8, // below this, always route to human
  minAutonomousCloseConfidence: 0.6, // below this, never close even if allowed category

  // Categories that can be autonomously closed
  autonomousCloseCategories: [
    "how-to",
    "faq",
    "documentation",
    "guide",
    "tutorial",
    "feature-request",
    "feedback",
    "praise",
  ] as IssueCategory[],

  // Categories that can be autonomously acknowledged + routed
  autonomousAcknowledgeCategories: [
    "bug",
    "technical",
    "account",
    "billing",
    "refund",
    "account-recovery",
  ] as IssueCategory[],

  // Categories that ALWAYS require human specialist
  alwaysRequireHuman: [
    "legal",
    "regulatory",
    "executive",
    "media",
    "security-breach",
  ] as unknown as IssueCategory[],

  // Priority levels that increase autonomy restrictions
  priorityRestrictions: {
    critical: { multiplier: 0, refundRequiresHumanAbove: 0 },
    high: { multiplier: 0.25, refundRequiresHumanAbove: 25 },
    medium: { multiplier: 1.0, refundRequiresHumanAbove: 50 },
    low: { multiplier: 1.0, refundRequiresHumanAbove: 50 },
  } as Record<IssuePriority, { multiplier: number; refundRequiresHumanAbove: number }>,

  // SLA thresholds (minutes) — auto-escalate to human if breached
  slaEscalationThreshold: {
    critical: 15,
    high: 60,
    medium: 240,
    low: 1440,
  } as Record<IssuePriority, number>,

  // De-escalation offer thresholds
  deescalationOfferThreshold: 0.6, // offer de-escalation when escalation risk > 0.6
} as const;

// ============================================
// Account Tier Detection
// ============================================

export type AccountTier = "standard" | "medium" | "high" | "enterprise";

export interface AccountTierConfig {
  tier: AccountTier;
  refundMultiplier: number;
  slaMultiplier: number;
  creditLimit: number;
}

export const ACCOUNT_TIER_CONFIGS: Record<AccountTier, AccountTierConfig> = {
  standard: {
    tier: "standard",
    refundMultiplier: 1.0,
    slaMultiplier: 1.0,
    creditLimit: 25,
  },
  medium: {
    tier: "medium",
    refundMultiplier: 1.5,
    slaMultiplier: 0.75, // faster SLA
    creditLimit: 50,
  },
  high: {
    tier: "high",
    refundMultiplier: 2.0,
    slaMultiplier: 0.5,
    creditLimit: 100,
  },
  enterprise: {
    tier: "enterprise",
    refundMultiplier: 2.0,
    slaMultiplier: 0.25,
    creditLimit: 200,
  },
};

// ============================================
// Policy Decision Types
// ============================================

export type AutonomousAction =
  | "autonomous_close"
  | "autonomous_acknowledge"
  | "autonomous_route"
  | "autonomous_refund"
  | "autonomous_credit"
  | "autonomous_draft_only"
  | "require_human";

export interface PolicyEvaluation {
  allowed: boolean;
  action: AutonomousAction;
  reason: string;
  confidenceRequired: number;
  conditions: PolicyCondition[];
  overrides: PolicyOverride[];
  auditTrail: PolicyAuditEntry[];
}

export interface PolicyCondition {
  type: "category" | "confidence" | "amount" | "priority" | "sla" | "tier" | "sentiment";
  passed: boolean;
  detail: string;
}

export interface PolicyOverride {
  reason: string;
  source: "safety" | "sla" | "sentiment" | "tier" | "churn_risk";
  approvedBy?: "system" | "human";
}

export interface PolicyAuditEntry {
  timestamp: string;
  decision: string;
  reason: string;
}

// ============================================
// Policy Engine
// ============================================

export class PolicyEngine {
  /**
   * Evaluate whether an issue can be handled autonomously
   */
  evaluate(params: {
    category: IssueCategory;
    priority: IssuePriority;
    confidence: number;
    estimatedRefundAmount?: number;
    accountTier?: AccountTier;
    escalationRisk?: number;
    sentimentPolarity?: "positive" | "negative" | "neutral";
    sentimentIntensity?: number;
    slaBreachMinutes?: number;
    isReopened?: boolean;
    previousHumanEscalations?: number;
  }): PolicyEvaluation {
    const {
      category,
      priority,
      confidence,
      estimatedRefundAmount = 0,
      accountTier = "standard",
      escalationRisk = 0,
      sentimentPolarity = "neutral",
      sentimentIntensity = 0,
      slaBreachMinutes,
      isReopened = false,
      previousHumanEscalations = 0,
    } = params;

    const conditions: PolicyCondition[] = [];
    const overrides: PolicyOverride[] = [];
    const auditTrail: PolicyAuditEntry[] = [];
    const now = new Date().toISOString();

    const tierConfig = ACCOUNT_TIER_CONFIGS[accountTier];

    // ============================================
    // Check 1: Always-require-human categories
    // ============================================
    if (AUTONOMOUS_POLICY.alwaysRequireHuman.includes(category)) {
      auditTrail.push({
        timestamp: now,
        decision: "require_human",
        reason: `Category '${category}' is always require-human`,
      });
      return {
        allowed: false,
        action: "require_human",
        reason: `${category} issues always require human specialist`,
        confidenceRequired: 1.0,
        conditions,
        overrides: [],
        auditTrail,
      };
    }

    // ============================================
    // Check 2: Confidence threshold
    // ============================================
    const minConfidence = AUTONOMOUS_POLICY.minAutonomousCloseConfidence;
    const passesConfidence = confidence >= minConfidence;
    conditions.push({
      type: "confidence",
      passed: passesConfidence,
      detail: `confidence ${(confidence * 100).toFixed(0)}% ${passesConfidence ? "≥" : "<"} min ${(minConfidence * 100).toFixed(0)}%`,
    });

    // ============================================
    // Check 3: SLA breach risk
    // ============================================
    if (slaBreachMinutes !== undefined) {
      const slaThreshold = AUTONOMOUS_POLICY.slaEscalationThreshold[priority];
      const slaPass = slaBreachMinutes < slaThreshold;
      conditions.push({
        type: "sla",
        passed: slaPass,
        detail: `${slaBreachMinutes}min ${slaPass ? "<" : "≥"} threshold ${slaThreshold}min`,
      });
      if (!slaPass) {
        overrides.push({
          reason: `SLA breach imminent (${slaBreachMinutes}min > ${slaThreshold}min)`,
          source: "sla",
          approvedBy: "system",
        });
      }
    }

    // ============================================
    // Check 4: Reopened ticket — always human
    // ============================================
    if (isReopened && previousHumanEscalations > 0) {
      auditTrail.push({
        timestamp: now,
        decision: "require_human",
        reason: "Ticket was reopened after human resolution — requires human review",
      });
      return {
        allowed: false,
        action: "require_human",
        reason: "Reopened ticket requires human review",
        confidenceRequired: 1.0,
        conditions,
        overrides,
        auditTrail,
      };
    }

    // ============================================
    // Check 5: Sentiment escalation risk
    // ============================================
    if (sentimentPolarity === "negative" && sentimentIntensity > 0.8) {
      conditions.push({
        type: "sentiment",
        passed: false,
        detail: `High-negative intensity ${(sentimentIntensity * 100).toFixed(0)}% — escalate to human`,
      });
      overrides.push({
        reason: `Critical negative sentiment (intensity ${(sentimentIntensity * 100).toFixed(0)}%)`,
        source: "sentiment",
        approvedBy: "system",
      });
    }

    // ============================================
    // Check 6: Financial amounts (refunds/credits)
    // ============================================
    if (estimatedRefundAmount > 0) {
      const effectiveMax = AUTONOMOUS_POLICY.maxAutonomousRefund * tierConfig.refundMultiplier;
      const refundPass = estimatedRefundAmount <= effectiveMax;
      conditions.push({
        type: "amount",
        passed: refundPass,
        detail: `refund $${estimatedRefundAmount} ${refundPass ? "≤" : ">"} max $${effectiveMax.toFixed(0)} for ${accountTier}`,
      });
      if (!refundPass) {
        auditTrail.push({
          timestamp: now,
          decision: "autonomous_refund",
          reason: `Refund $${estimatedRefundAmount} exceeds autonomous threshold $${effectiveMax.toFixed(0)}`,
        });
      }
    }

    // ============================================
    // Decision: Determine autonomous action
    // ============================================

    // High escalation risk → route to human with draft
    if (escalationRisk > AUTONOMOUS_POLICY.deescalationOfferThreshold && overrides.some(o => o.source === "sentiment")) {
      auditTrail.push({
        timestamp: now,
        decision: "autonomous_route",
        reason: "High escalation risk + negative sentiment → route to senior specialist",
      });
      return {
        allowed: true,
        action: "autonomous_route",
        reason: "High escalation risk — route to senior specialist with draft",
        confidenceRequired: 0.5,
        conditions,
        overrides,
        auditTrail,
      };
    }

    // Can autonomously close
    if (
      passesConfidence &&
      AUTONOMOUS_POLICY.autonomousCloseCategories.includes(category)
    ) {
      auditTrail.push({
        timestamp: now,
        decision: "autonomous_close",
        reason: `Category '${category}' in autonomous-close list, confidence ${(confidence * 100).toFixed(0)}%`,
      });
      return {
        allowed: true,
        action: "autonomous_close",
        reason: `Autonomous close approved for ${category} (confidence ${(confidence * 100).toFixed(0)}%)`,
        confidenceRequired: minConfidence,
        conditions,
        overrides,
        auditTrail,
      };
    }

    // Can acknowledge autonomously but must route
    if (
      passesConfidence &&
      AUTONOMOUS_POLICY.autonomousAcknowledgeCategories.includes(category)
    ) {
      auditTrail.push({
        timestamp: now,
        decision: "autonomous_acknowledge",
        reason: `Category '${category}' acknowledged autonomously, routed to specialist`,
      });
      return {
        allowed: true,
        action: "autonomous_acknowledge",
        reason: `Acknowledge + route for ${category} — full resolution requires specialist`,
        confidenceRequired: minConfidence,
        conditions,
        overrides,
        auditTrail,
      };
    }

    // Confidence too low — draft only, human sends
    auditTrail.push({
      timestamp: now,
      decision: "autonomous_draft_only",
      reason: `Confidence ${(confidence * 100).toFixed(0)}% below threshold for autonomous close`,
    });
    return {
      allowed: true,
      action: "autonomous_draft_only",
      reason: "Draft response approved — human reviews and sends",
      confidenceRequired: minConfidence,
      conditions,
      overrides,
      auditTrail,
    };
  }

  /**
   * Evaluate refund eligibility
   */
  evaluateRefund(params: {
    amount: number;
    accountTier?: AccountTier;
    reason: string;
    previousRefundsCount?: number;
    previousRefundsTotal?: number;
  }): {
    approved: boolean;
    approvedAmount: number;
    requiresApprovalAbove: number;
    reason: string;
    approvalType: "autonomous" | "notification_required" | "manual_required";
  } {
    const {
      amount,
      accountTier = "standard",
      previousRefundsCount = 0,
      previousRefundsTotal = 0,
    } = params;

    const tierConfig = ACCOUNT_TIER_CONFIGS[accountTier];
    const maxRefund = AUTONOMOUS_POLICY.maxAutonomousRefund * tierConfig.refundMultiplier;

    // Check for refund abuse pattern
    if (previousRefundsCount > 5 && previousRefundsTotal > amount * 3) {
      return {
        approved: false,
        approvedAmount: 0,
        requiresApprovalAbove: 0,
        reason: "Potential refund abuse pattern detected",
        approvalType: "manual_required",
      };
    }

    if (amount <= maxRefund) {
      return {
        approved: true,
        approvedAmount: amount,
        requiresApprovalAbove: maxRefund,
        reason: `Refund $${amount} approved autonomously (max $${maxRefund.toFixed(0)} for ${accountTier})`,
        approvalType: "autonomous",
      };
    }

    const notificationThreshold = maxRefund * 2;
    if (amount <= notificationThreshold) {
      return {
        approved: true,
        approvedAmount: amount,
        requiresApprovalAbove: notificationThreshold,
        reason: `Refund $${amount} approved with notification (above autonomous but below manual threshold)`,
        approvalType: "notification_required",
      };
    }

    return {
      approved: false,
      approvedAmount: 0,
      requiresApprovalAbove: notificationThreshold,
      reason: `Refund $${amount} exceeds notification threshold — requires manual approval`,
      approvalType: "manual_required",
    };
  }

  /**
   * Get SLA deadline for an issue
   */
  getSLADeadline(params: {
    priority: IssuePriority;
    category: IssueCategory;
    accountTier?: AccountTier;
    createdAt?: string;
  }): { deadlineMinutes: number; warningAtMinutes: number; criticalAtMinutes: number } {
    const { priority, accountTier = "standard" } = params;
    const tierConfig = ACCOUNT_TIER_CONFIGS[accountTier];
    const baseMinutes = AUTONOMOUS_POLICY.slaEscalationThreshold[priority];
    const deadlineMinutes = Math.round(baseMinutes * tierConfig.slaMultiplier);

    return {
      deadlineMinutes,
      warningAtMinutes: Math.round(deadlineMinutes * 0.5),
      criticalAtMinutes: Math.round(deadlineMinutes * 0.75),
    };
  }

  /**
   * Check if an action is permitted under current policy
   */
  isActionPermitted(action: AutonomousAction): boolean {
    return action !== "require_human";
  }
}

// Singleton export
export const policyEngine = new PolicyEngine();
