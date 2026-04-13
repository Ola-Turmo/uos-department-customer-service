/**
 * Refund Engine — Autonomous Billing Actions
 * VAL-DEPT-CS-BILLING: Issue refunds and credits within policy guardrails
 */

import type { IssueCategory, IssuePriority } from "../types.js";
import { policyEngine, AUTONOMOUS_POLICY, AccountTier } from "../policy/policy-engine.js";
import type { CustomerProfile } from "../customer/customer-profile.js";

// ============================================
// Types
// ============================================

export type RefundStatus =
  | "auto_approved"
  | "auto_approved_notification"
  | "requires_human_approval"
  | "approved_by_human"
  | "rejected"
  | "issued"
  | "failed";

export interface RefundRequest {
  customerId: string;
  amount: number; // cents
  currency: string; // ISO 4217 e.g. "USD"
  reason: string;
  category: IssueCategory;
  priority: IssuePriority;
  stripeChargeId?: string;
  invoiceId?: string;
  customerEmail: string;
  orderId?: string;
  previousRefundsCount: number;
  previousRefundsTotalCents: number;
  notes?: string;
}

export interface RefundApproval {
  refundId: string;
  request: RefundRequest;
  status: RefundStatus;
  approvedAmount: number; // may be less than requested
  approvalType: "autonomous" | "human" | "pending_human" | "none";
  policyReason: string;
  humanReviewerId?: string;
  humanReviewDeadline?: string; // ISO datetime for pending reviews
  createdAt: string;
  decidedAt?: string;
  issuedAt?: string;
  stripeRefundId?: string;
  failureReason?: string;
}

export interface RefundLedgerEntry {
  refundId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  refundType: "refund" | "credit";
  category: IssueCategory;
  approvedBy: "autonomous" | "human";
  stripeRefundId?: string;
  createdAt: string;
  issuedAt?: string;
}

// ============================================
// Helper
// ============================================

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// ============================================
// Refund Engine
// ============================================

export class RefundEngine {
  private ledger: Map<string, RefundLedgerEntry> = new Map();
  private approvalStore: Map<string, RefundApproval> = new Map();

  /**
   * Evaluate and approve/reject a refund request
   */
  evaluateRefund(request: RefundRequest, customerProfile: CustomerProfile): RefundApproval {
    const now = new Date().toISOString();
    const refundId = generateId("refund");

    // Policy rule 1: Category must be billing/refund/account for billing issues
    const allowedCategories: IssueCategory[] = ["billing", "refund", "account"];
    if (!allowedCategories.includes(request.category)) {
      const approval: RefundApproval = {
        refundId,
        request,
        status: "rejected",
        approvedAmount: 0,
        approvalType: "none",
        policyReason: `Category '${request.category}' is not eligible for autonomous refund. Allowed: ${allowedCategories.join(", ")}`,
        createdAt: now,
        decidedAt: now,
      };
      this.approvalStore.set(refundId, approval);
      return approval;
    }

    // Policy rule 9: Enterprise tier - human approval required for any refund (company policy)
    if (customerProfile.accountTier === "enterprise") {
      const approval: RefundApproval = {
        refundId,
        request,
        status: "requires_human_approval",
        approvedAmount: 0,
        approvalType: "pending_human",
        policyReason: "Enterprise tier requires human approval for all refunds per company policy",
        humanReviewDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
      };
      this.approvalStore.set(refundId, approval);
      return approval;
    }

    // Policy rule 7: If customer is churn risk = critical → requires_human_approval
    if (customerProfile.health.churnRisk === "critical") {
      const approval: RefundApproval = {
        refundId,
        request,
        status: "requires_human_approval",
        approvedAmount: 0,
        approvalType: "pending_human",
        policyReason: "Critical churn risk detected - human review required to avoid revenue loss",
        humanReviewDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
      };
      this.approvalStore.set(refundId, approval);
      return approval;
    }

    // Check refund limits
    const limitsCheck = this.hasHitRefundLimits(request, customerProfile);
    if (limitsCheck.hit) {
      const approval: RefundApproval = {
        refundId,
        request,
        status: "requires_human_approval",
        approvedAmount: 0,
        approvalType: "pending_human",
        policyReason: limitsCheck.reason,
        humanReviewDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
      };
      this.approvalStore.set(refundId, approval);
      return approval;
    }

    // Policy rule 8: If amount > $500 → requires_human_approval (always too large)
    const amountDollars = request.amount / 100;
    if (amountDollars > 500) {
      const approval: RefundApproval = {
        refundId,
        request,
        status: "requires_human_approval",
        approvedAmount: 0,
        approvalType: "pending_human",
        policyReason: `Refund amount $${amountDollars.toFixed(2)} exceeds $500 threshold - requires human approval`,
        humanReviewDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
      };
      this.approvalStore.set(refundId, approval);
      return approval;
    }

    // Get tier multiplier
    const tierMultiplier = this.getTierMultiplier(customerProfile.accountTier);

    // Policy rules 2-4: Check amount against maxAutonomousRefund * tierMultiplier
    const maxAutonomousRefundCents = AUTONOMOUS_POLICY.maxAutonomousRefund * 100 * tierMultiplier;

    if (request.amount > maxAutonomousRefundCents) {
      // Policy rule 2: amount > maxAutonomousRefund * tierMultiplier → requires_human_approval
      const approval: RefundApproval = {
        refundId,
        request,
        status: "requires_human_approval",
        approvedAmount: 0,
        approvalType: "pending_human",
        policyReason: `Refund amount $${amountDollars.toFixed(2)} exceeds max autonomous refund $${(maxAutonomousRefundCents / 100).toFixed(2)} for ${customerProfile.accountTier} tier`,
        humanReviewDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
      };
      this.approvalStore.set(refundId, approval);
      return approval;
    }

    // Policy rule 3 & 4: amount <= maxAutonomousRefund * tierMultiplier
    // Confidence assumed 0.8 for billing/refund category
    const confidence = 0.8;

    if (confidence >= 0.8) {
      // Policy rule 3: auto_approved
      const approvedAmount = this.computeApprovedAmount(request, customerProfile);
      const approval: RefundApproval = {
        refundId,
        request,
        status: "auto_approved",
        approvedAmount,
        approvalType: "autonomous",
        policyReason: `Auto-approved: confidence ${(confidence * 100).toFixed(0)}% meets threshold`,
        createdAt: now,
        decidedAt: now,
      };
      this.approvalStore.set(refundId, approval);

      // Create ledger entry
      const ledgerEntry: RefundLedgerEntry = {
        refundId,
        customerId: request.customerId,
        amount: approvedAmount,
        currency: request.currency,
        status: "auto_approved",
        refundType: "refund",
        category: request.category,
        approvedBy: "autonomous",
        createdAt: now,
      };
      this.ledger.set(refundId, ledgerEntry);

      return approval;
    } else {
      // Policy rule 4: auto_approved_notification (notify human, can veto)
      const approvedAmount = this.computeApprovedAmount(request, customerProfile);
      const approval: RefundApproval = {
        refundId,
        request,
        status: "auto_approved_notification",
        approvedAmount,
        approvalType: "autonomous",
        policyReason: `Auto-approved with notification: confidence ${(confidence * 100).toFixed(0)}% below 80% - human notified, can veto`,
        humanReviewDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
        decidedAt: now,
      };
      this.approvalStore.set(refundId, approval);

      // Create ledger entry
      const ledgerEntry: RefundLedgerEntry = {
        refundId,
        customerId: request.customerId,
        amount: approvedAmount,
        currency: request.currency,
        status: "auto_approved_notification",
        refundType: "refund",
        category: request.category,
        approvedBy: "autonomous",
        createdAt: now,
      };
      this.ledger.set(refundId, ledgerEntry);

      return approval;
    }
  }

  /**
   * Issue an approved refund (simulated — no real Stripe calls)
   */
  issueRefund(refundId: string): { success: boolean; stripeRefundId?: string; failureReason?: string } {
    const approval = this.approvalStore.get(refundId);

    if (!approval) {
      return { success: false, failureReason: `Refund approval '${refundId}' not found` };
    }

    if (approval.status !== "auto_approved" && approval.status !== "approved_by_human") {
      return { success: false, failureReason: `Refund status '${approval.status}' is not approved for issuance` };
    }

    // Simulate Stripe API call
    const stripeRefundId = `re_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Update approval
    approval.status = "issued";
    approval.issuedAt = new Date().toISOString();
    approval.stripeRefundId = stripeRefundId;
    this.approvalStore.set(refundId, approval);

    // Update ledger entry
    const ledgerEntry = this.ledger.get(refundId);
    if (ledgerEntry) {
      ledgerEntry.status = "issued";
      ledgerEntry.issuedAt = new Date().toISOString();
      ledgerEntry.stripeRefundId = stripeRefundId;
      this.ledger.set(refundId, ledgerEntry);
    }

    return { success: true, stripeRefundId };
  }

  /**
   * Get refund history for a customer
   */
  getCustomerRefunds(customerId: string): RefundLedgerEntry[] {
    return Array.from(this.ledger.values()).filter(
      (entry) => entry.customerId === customerId
    );
  }

  /**
   * Get refund summary for a customer
   */
  getCustomerRefundSummary(customerId: string): {
    totalRefunds: number;
    totalAmountCents: number;
    refundCount30d: number;
    refundAmount30dCents: number;
    averageAmountCents: number;
  } {
    const customerRefunds = this.getCustomerRefunds(customerId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalRefunds = customerRefunds.length;
    const totalAmountCents = customerRefunds.reduce((sum, r) => sum + r.amount, 0);

    const recentRefunds = customerRefunds.filter(
      (r) => new Date(r.createdAt) >= thirtyDaysAgo
    );
    const refundCount30d = recentRefunds.length;
    const refundAmount30dCents = recentRefunds.reduce((sum, r) => sum + r.amount, 0);

    const averageAmountCents = totalRefunds > 0 ? Math.round(totalAmountCents / totalRefunds) : 0;

    return {
      totalRefunds,
      totalAmountCents,
      refundCount30d,
      refundAmount30dCents,
      averageAmountCents,
    };
  }

  /**
   * Check if customer has hit refund limits
   */
  private hasHitRefundLimits(
    request: RefundRequest,
    customerProfile: CustomerProfile
  ): { hit: boolean; reason: string } {
    // Policy rule 5: If previousRefundsCount > 3 in 30d → requires_human_approval
    if (request.previousRefundsCount > 3) {
      return {
        hit: true,
        reason: `Customer has ${request.previousRefundsCount} refunds in last 30 days (max 3 allowed for autonomous)`,
      };
    }

    // Policy rule 6: If previousRefundsTotalCents > $500 in 30d → requires_human_approval
    if (request.previousRefundsTotalCents > 500 * 100) {
      return {
        hit: true,
        reason: `Customer has $${(request.previousRefundsTotalCents / 100).toFixed(2)} refunded in last 30 days (max $500 allowed for autonomous)`,
      };
    }

    return { hit: false, reason: "" };
  }

  /**
   * Get the approved amount (may be less than requested based on policy)
   */
  private computeApprovedAmount(
    request: RefundRequest,
    customerProfile: CustomerProfile
  ): number {
    const tierMultiplier = this.getTierMultiplier(customerProfile.accountTier);
    const maxAutonomousRefundCents = AUTONOMOUS_POLICY.maxAutonomousRefund * 100 * tierMultiplier;

    // Policy rule 10: approvedAmount = min(request.amount, maxAutonomousRefund * tierMultiplier) if auto-approved
    return Math.min(request.amount, maxAutonomousRefundCents);
  }

  /**
   * Get tier multiplier for refund calculations
   */
  private getTierMultiplier(tier: AccountTier): number {
    switch (tier) {
      case "enterprise":
        return 0; // No autonomous refunds for enterprise
      case "high":
        return 2;
      case "medium":
        return 1.5;
      case "standard":
      default:
        return 1;
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const refundEngine = new RefundEngine();
