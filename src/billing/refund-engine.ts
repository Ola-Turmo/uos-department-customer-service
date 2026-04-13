import type { RefundRequest, RefundLedgerEntry, CustomerProfile, TriageResult } from '../types.js';

export default class RefundEngine {
  ledger: RefundLedgerEntry[] = [];

  /**
   * Validates whether the given amount is permissible for the customer profile.
   * Uses churn risk and account tier to determine eligibility.
   */
  validateAmount(amount: number, profile: CustomerProfile): boolean {
    if (amount <= 0) {
      return false;
    }

    // High churn risk customers require human approval for any refund
    if (profile.churnRisk === 'critical' || profile.churnRisk === 'high') {
      return false;
    }

    // Enterprise/slaTier priority customers have higher tolerance
    const maxAllowed = profile.slaTier === 'enterprise' ? 500 : profile.slaTier === 'priority' ? 200 : 100;

    return amount <= maxAllowed;
  }

  /**
   * Creates a RefundRequest based on triage result and customer profile.
   * The request is marked as approved if it passes validation.
   */
  createRefundRequest(
    ticketId: string,
    customerId: string,
    amount: number,
    reason: string,
    category: 'billing' | 'refund' | 'credit',
    triageResult: TriageResult,
    profile: CustomerProfile
  ): RefundRequest {
    const isApproved = this.validateAmount(amount, profile);

    return {
      ticketId,
      customerId,
      amount,
      reason,
      category,
      approved: isApproved,
      approvedBy: isApproved ? 'system' : undefined,
    };
  }

  /**
   * Adds a ledger entry to the refund ledger for audit and tracking.
   */
  addEntry(entry: RefundLedgerEntry): void {
    this.ledger.push(entry);
  }
}
