"use strict";
/**
 * UOS Customer Service — Policy Engine
 * Guardrails for autonomous actions: determines what the AI can do
 * without human approval based on category, confidence, amounts, and customer context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = exports.DEFAULT_AUTONOMOUS_POLICY = void 0;
// ----------------------------------------------------------------------------
// Default Policy Constants
// ----------------------------------------------------------------------------
/**
 * Default autonomous policy configuration.
 * In production these would be environment-configured per deployment.
 */
exports.DEFAULT_AUTONOMOUS_POLICY = {
    maxAutonomousRefund: 50, // $50 — above requires approval
    maxAutonomousCredit: 25, // $25 — above requires approval
    highValueAccountMultiplier: 2, // VIP/enterprise tier = 2× thresholds
    alwaysRequireHuman: [
        'legal',
        'regulatory',
        'executive',
        'media',
        'security-breach',
    ],
    autonomousCategories: [
        'how-to',
        'faq',
        'documentation',
        'guide',
        'tutorial',
        'feature-request',
        'feedback',
        'praise',
        'account-recovery',
    ],
    maxAutonomousCloseConfidence: 0.8, // below this, always human
    autoEscalateOnChurnRisk: 'critical', // critical churn risk → always human
};
// ----------------------------------------------------------------------------
// Internal Helpers
// ----------------------------------------------------------------------------
/**
 * Returns true for enterprise or VIP plan customers who get 2× thresholds.
 */
function isHighValueAccount(customer) {
    return (customer.slaTier === 'enterprise' ||
        customer.planTier.toLowerCase().includes('vip'));
}
/**
 * Returns the effective max autonomous refund for a customer.
 * VIP/enterprise customers get highValueAccountMultiplier × the base limit.
 */
function getMaxAutonomousRefund(policy, customer) {
    const base = policy.maxAutonomousRefund;
    if (isHighValueAccount(customer)) {
        return base * policy.highValueAccountMultiplier;
    }
    return base;
}
/**
 * Returns the effective max autonomous credit for a customer.
 * VIP/enterprise customers get highValueAccountMultiplier × the base limit.
 */
function getMaxAutonomousCredit(policy, customer) {
    const base = policy.maxAutonomousCredit;
    if (isHighValueAccount(customer)) {
        return base * policy.highValueAccountMultiplier;
    }
    return base;
}
/**
 * Case-insensitive check against the alwaysRequireHuman category list.
 */
function isAlwaysRequireHumanCategory(category, policy) {
    const lower = category.toLowerCase();
    return policy.alwaysRequireHuman.some((c) => c.toLowerCase() === lower);
}
/**
 * Case-insensitive check against the autonomousCategories list.
 */
function isAutonomousCategory(category, policy) {
    const lower = category.toLowerCase();
    return policy.autonomousCategories.some((c) => c.toLowerCase() === lower);
}
// ----------------------------------------------------------------------------
// PolicyEngine
// ----------------------------------------------------------------------------
/**
 * PolicyEngine evaluates whether an autonomous action is permitted given
 * the current policy rules, triage result, and customer profile.
 *
 * Every autonomous action (send_response_draft, issue_refund, route_to_team,
 * etc.) must pass through check() before execution.
 */
class PolicyEngine {
    policy;
    constructor(policy = exports.DEFAULT_AUTONOMOUS_POLICY) {
        this.policy = { ...policy };
    }
    /**
     * Get the effective policy (useful for debugging / audit).
     */
    getPolicy() {
        return { ...this.policy };
    }
    /**
     * Replace the current policy at runtime (e.g. when a human admin updates
     * thresholds). Returns the previous policy so it can be restored.
     */
    updatePolicy(newPolicy) {
        const previous = { ...this.policy };
        this.policy = { ...this.policy, ...newPolicy };
        return previous;
    }
    /**
     * Primary guardrail check — every autonomous action calls this before execution.
     *
     * Returns a PolicyDecision with:
     *  - allowed: boolean — can this action proceed autonomously?
     *  - reason: string — human-readable explanation of the decision
     *  - requiresHumanApproval: boolean — shortcut to "not allowed"
     *  - maxAmount?: number — when disallowed due to amount, the current cap
     */
    check(action, triageResult, customer) {
        // ------------------------------------------------------------------
        // 1. Hard blocks: always require human regardless of confidence
        // ------------------------------------------------------------------
        if (isAlwaysRequireHumanCategory(triageResult.category, this.policy)) {
            return {
                allowed: false,
                reason: `Category '${triageResult.category}' is in the always-require-human list.`,
                requiresHumanApproval: true,
            };
        }
        if (shouldEscalateOnChurnRisk(customer.churnRisk, this.policy.autoEscalateOnChurnRisk)) {
            return {
                allowed: false,
                reason: `Customer churn risk is '${customer.churnRisk}'. Policy requires human review for this risk level.`,
                requiresHumanApproval: true,
            };
        }
        // ------------------------------------------------------------------
        // 2. Category gate — most actions require the category to be in
        //    the autonomous list (routing, KB creation, internal notes, etc.)
        // ------------------------------------------------------------------
        if (action.type === 'route_to_team' ||
            action.type === 'add_internal_note' ||
            action.type === 'create_kb_article') {
            if (!isAutonomousCategory(triageResult.category, this.policy)) {
                return {
                    allowed: false,
                    reason: `Category '${triageResult.category}' is not in the autonomous categories list. Route to team requires human approval.`,
                    requiresHumanApproval: true,
                    overrideCategories: this.policy.autonomousCategories,
                };
            }
        }
        // ------------------------------------------------------------------
        // 3. Confidence gate — send_response_draft and update_ticket_status
        //    need sufficient confidence to close autonomously.
        // ------------------------------------------------------------------
        if (action.type === 'send_response_draft' ||
            action.type === 'update_ticket_status') {
            if (triageResult.confidence < this.policy.maxAutonomousCloseConfidence) {
                return {
                    allowed: false,
                    reason: `Confidence ${(triageResult.confidence * 100).toFixed(0)}% is below the autonomous-close threshold of ${(this.policy.maxAutonomousCloseConfidence * 100).toFixed(0)}%.`,
                    requiresHumanApproval: true,
                };
            }
        }
        // ------------------------------------------------------------------
        // 4. Amount gates — refund and credit actions
        // ------------------------------------------------------------------
        if (action.type === 'issue_refund') {
            const maxRefund = getMaxAutonomousRefund(this.policy, customer);
            if (action.amount > maxRefund) {
                return {
                    allowed: false,
                    reason: `Refund amount $${action.amount} exceeds the max autonomous refund of $${maxRefund} for this account.`,
                    requiresHumanApproval: true,
                    maxAmount: maxRefund,
                };
            }
        }
        if (action.type === 'issue_credit') {
            const maxCredit = getMaxAutonomousCredit(this.policy, customer);
            if (action.amount > maxCredit) {
                return {
                    allowed: false,
                    reason: `Credit amount $${action.amount} exceeds the max autonomous credit of $${maxCredit} for this account.`,
                    requiresHumanApproval: true,
                    maxAmount: maxCredit,
                };
            }
        }
        // ------------------------------------------------------------------
        // 5. All gates passed — action is allowed autonomously
        // ------------------------------------------------------------------
        return {
            allowed: true,
            reason: 'Action is permitted under the current autonomous policy.',
            requiresHumanApproval: false,
        };
    }
    /**
     * Convenience: checks whether a category is allowed for fully autonomous
     * handling (no specific action, just category + confidence check).
     * Useful for deciding "should we attempt autonomous resolution at all?"
     */
    canAutonomouslyHandle(triageResult, customer) {
        // Hard blocks
        if (isAlwaysRequireHumanCategory(triageResult.category, this.policy)) {
            return {
                allowed: false,
                reason: `Category '${triageResult.category}' always requires human.`,
                requiresHumanApproval: true,
            };
        }
        if (shouldEscalateOnChurnRisk(customer.churnRisk, this.policy.autoEscalateOnChurnRisk)) {
            return {
                allowed: false,
                reason: `Customer churn risk is '${customer.churnRisk}' — requires human review.`,
                requiresHumanApproval: true,
            };
        }
        if (!isAutonomousCategory(triageResult.category, this.policy)) {
            return {
                allowed: false,
                reason: `Category '${triageResult.category}' is not in the autonomous categories list.`,
                requiresHumanApproval: true,
                overrideCategories: this.policy.autonomousCategories,
            };
        }
        if (triageResult.confidence < this.policy.maxAutonomousCloseConfidence) {
            return {
                allowed: false,
                reason: `Confidence ${(triageResult.confidence * 100).toFixed(0)}% below threshold ${(this.policy.maxAutonomousCloseConfidence * 100).toFixed(0)}%.`,
                requiresHumanApproval: true,
            };
        }
        return {
            allowed: true,
            reason: 'Category and confidence are within autonomous handling policy.',
            requiresHumanApproval: false,
        };
    }
    /**
     * Returns the effective spending limit for a given customer and action type.
     * Useful for UI to show agents what the current caps are.
     */
    getSpendingLimit(actionType, customer) {
        if (actionType === 'refund') {
            return getMaxAutonomousRefund(this.policy, customer);
        }
        return getMaxAutonomousCredit(this.policy, customer);
    }
}
exports.PolicyEngine = PolicyEngine;
// ----------------------------------------------------------------------------
// Standalone helper (no class instance needed)
// ----------------------------------------------------------------------------
function shouldEscalateOnChurnRisk(churnRisk, autoEscalateOnChurnRisk) {
    const riskOrder = [
        'low',
        'medium',
        'high',
        'critical',
    ];
    const policySeverity = riskOrder.indexOf(autoEscalateOnChurnRisk);
    const customerSeverity = riskOrder.indexOf(churnRisk);
    // escalate if customer risk is >= policy threshold
    return customerSeverity >= policySeverity;
}
//# sourceMappingURL=policy-engine.js.map