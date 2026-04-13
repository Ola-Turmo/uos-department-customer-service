/**
 * UOS Customer Service — Policy Engine
 * Guardrails for autonomous actions: determines what the AI can do
 * without human approval based on category, confidence, amounts, and customer context.
 */
import type { AutonomousPolicy, PolicyDecision, AutonomousAction, TriageResult, CustomerProfile } from '../types.js';
/**
 * Default autonomous policy configuration.
 * In production these would be environment-configured per deployment.
 */
export declare const DEFAULT_AUTONOMOUS_POLICY: AutonomousPolicy;
/**
 * PolicyEngine evaluates whether an autonomous action is permitted given
 * the current policy rules, triage result, and customer profile.
 *
 * Every autonomous action (send_response_draft, issue_refund, route_to_team,
 * etc.) must pass through check() before execution.
 */
export declare class PolicyEngine {
    private policy;
    constructor(policy?: AutonomousPolicy);
    /**
     * Get the effective policy (useful for debugging / audit).
     */
    getPolicy(): Readonly<AutonomousPolicy>;
    /**
     * Replace the current policy at runtime (e.g. when a human admin updates
     * thresholds). Returns the previous policy so it can be restored.
     */
    updatePolicy(newPolicy: Partial<AutonomousPolicy>): AutonomousPolicy;
    /**
     * Primary guardrail check — every autonomous action calls this before execution.
     *
     * Returns a PolicyDecision with:
     *  - allowed: boolean — can this action proceed autonomously?
     *  - reason: string — human-readable explanation of the decision
     *  - requiresHumanApproval: boolean — shortcut to "not allowed"
     *  - maxAmount?: number — when disallowed due to amount, the current cap
     */
    check(action: AutonomousAction, triageResult: TriageResult, customer: CustomerProfile): PolicyDecision;
    /**
     * Convenience: checks whether a category is allowed for fully autonomous
     * handling (no specific action, just category + confidence check).
     * Useful for deciding "should we attempt autonomous resolution at all?"
     */
    canAutonomouslyHandle(triageResult: TriageResult, customer: CustomerProfile): PolicyDecision;
    /**
     * Returns the effective spending limit for a given customer and action type.
     * Useful for UI to show agents what the current caps are.
     */
    getSpendingLimit(actionType: 'refund' | 'credit', customer: CustomerProfile): number;
}
//# sourceMappingURL=policy-engine.d.ts.map