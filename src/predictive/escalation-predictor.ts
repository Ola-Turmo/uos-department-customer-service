/**
 * Escalation Predictor
 * VAL-DEPT-CS-PREDICTIVE: Predicts whether a ticket will be escalated before it happens
 *
 * Uses triage results, customer profile, SLA status, and sentiment signals
 * to predict escalation probability and recommend preemptive actions.
 */

import type {
  TriageResult,
  AIEnrichedTriageResult,
  EscalationPrediction,
  EscalationLevel,
  SentimentResult,
  IntentClassificationResult,
  IssuePriority,
  IssueCategory,
} from "../types.js";

import { policyEngine, AUTONOMOUS_POLICY } from "../policy/policy-engine.js";
import type { CustomerProfile } from "../customer/customer-profile.js";
import { slaEngine } from "../sla/sla-engine.js";

// ============================================
// Types
// ============================================

export interface EscalationSignal {
  factor: string;
  contribution: number; // 0-1, how much this adds to risk
  direction: "increases" | "decreases";
}

export interface EscalationPredictorInput {
  triageResult: TriageResult;
  customerProfile: CustomerProfile;
  currentSLAStatus?: "healthy" | "at_risk" | "warning" | "breached";
  timeUntilSLABreachMinutes?: number;
}

// ============================================
// Helper Functions
// ============================================

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// ============================================
// Escalation Predictor
// ============================================

export class EscalationPredictor {
  /**
   * Predict whether a ticket will be escalated
   */
  predict(input: EscalationPredictorInput): EscalationPrediction {
    const { triageResult, customerProfile, currentSLAStatus, timeUntilSLABreachMinutes } = input;

    // Compute all signals
    const signals = this.computeSignals(input);

    // Calculate probability from signals
    const probability = this.computeProbability(signals);

    // Determine predicted escalation level
    const predictedLevel = this.predictLevel(probability, triageResult.escalationLevel);

    // Get recommended actions based on probability and signals
    const recommendedActions = this.getRecommendedActions(probability, signals);

    // Determine confidence based on number of signals
    const confidence = this.determineConfidence(signals);

    return {
      issueId: triageResult.issueId,
      escalationProbability: probability,
      riskFactors: signals.map((s) => ({
        factor: s.factor,
        contribution: s.contribution,
        direction: s.direction,
      })),
      predictedLevel,
      recommendedActions,
      confidence,
      modelVersion: "escalation-predictor-v1",
      predictedAt: new Date().toISOString(),
    };
  }

  /**
   * Compute all escalation signals based on input data
   */
  private computeSignals(input: EscalationPredictorInput): EscalationSignal[] {
    const { triageResult, customerProfile, currentSLAStatus, timeUntilSLABreachMinutes } = input;
    const signals: EscalationSignal[] = [];

    // Get AI enriched data if available (cast to access intent/sentiment)
    const enriched = triageResult as AIEnrichedTriageResult;
    const intentClassification: IntentClassificationResult | undefined = enriched?.intentClassification;
    const sentiment: SentimentResult | undefined = enriched?.sentiment;

    // 1. Sentiment escalation risk > 0.7 → contribution 0.3, direction "increases"
    if (sentiment && sentiment.escalationRisk > 0.7) {
      signals.push({
        factor: "high_sentiment_escalation_risk",
        contribution: 0.3,
        direction: "increases",
      });
    }

    // 2. SLA at risk → contribution 0.2, direction "increases"
    if (currentSLAStatus === "at_risk" || currentSLAStatus === "warning") {
      signals.push({
        factor: "sla_at_risk",
        contribution: 0.2,
        direction: "increases",
      });
    }

    // 3. SLA breach imminent (<30 min) → contribution 0.4, direction "increases"
    if (timeUntilSLABreachMinutes !== undefined && timeUntilSLABreachMinutes < 30) {
      signals.push({
        factor: "sla_breach_imminent",
        contribution: 0.4,
        direction: "increases",
      });
    }

    // 4. Billing/refund category + negative sentiment → contribution 0.25, direction "increases"
    if (
      (triageResult.category === "billing" || triageResult.category === "refund") &&
      sentiment?.polarity === "negative"
    ) {
      signals.push({
        factor: "billing_refund_negative_sentiment",
        contribution: 0.25,
        direction: "increases",
      });
    }

    // 5. Complaint category → contribution 0.2, direction "increases"
    if (triageResult.category === "complaint") {
      signals.push({
        factor: "complaint_category",
        contribution: 0.2,
        direction: "increases",
      });
    }

    // 6. Account tier = "enterprise" OR "high" → contribution 0.15, direction "increases"
    if (customerProfile.accountTier === "enterprise" || customerProfile.accountTier === "high") {
      signals.push({
        factor: "high_value_account_tier",
        contribution: 0.15,
        direction: "increases",
      });
    }

    // 7. Previous escalations in last 30d ≥ 3 → contribution 0.25, direction "increases"
    if (customerProfile.health.escalationCount30d >= 3) {
      signals.push({
        factor: "multiple_recent_escalations",
        contribution: 0.25,
        direction: "increases",
      });
    }

    // 8. Intent is ambiguous (isAmbiguous=true) → contribution 0.15, direction "increases"
    if (intentClassification?.isAmbiguous) {
      signals.push({
        factor: "ambiguous_intent",
        contribution: 0.15,
        direction: "increases",
      });
    }

    // 9. Priority = critical → contribution 0.3, direction "increases"
    if (triageResult.priority === "critical") {
      signals.push({
        factor: "critical_priority",
        contribution: 0.3,
        direction: "increases",
      });
    }

    // 10. Priority = high → contribution 0.15, direction "increases"
    if (triageResult.priority === "high") {
      signals.push({
        factor: "high_priority",
        contribution: 0.15,
        direction: "increases",
      });
    }

    // 11. Ticket reopened before → contribution 0.3, direction "increases"
    if (customerProfile.health.reopenedTicketsCount30d > 0) {
      signals.push({
        factor: "reopened_ticket",
        contribution: 0.3,
        direction: "increases",
      });
    }

    // 12. Churn risk = critical → contribution 0.25, direction "increases"
    if (customerProfile.health.churnRisk === "critical") {
      signals.push({
        factor: "critical_churn_risk",
        contribution: 0.25,
        direction: "increases",
      });
    }

    // 13. Response time > 24h for high priority → contribution 0.2, direction "increases"
    // Note: This would need response time data - using SLA status as proxy for now
    if (triageResult.priority === "high" && currentSLAStatus === "at_risk") {
      signals.push({
        factor: "high_priority_sla_at_risk",
        contribution: 0.2,
        direction: "increases",
      });
    }

    // 14. Negative sentiment declining trajectory → contribution 0.2, direction "increases"
    if (sentiment?.polarity === "negative" && customerProfile.health.sentimentTrajectory === "declining") {
      signals.push({
        factor: "declining_negative_sentiment",
        contribution: 0.2,
        direction: "increases",
      });
    }

    // 15. Medium/high confidence triage → contribution -0.1, direction "decreases" (baseline is lower risk when confident)
    if (triageResult.confidence === "medium" || triageResult.confidence === "high") {
      signals.push({
        factor: "high_triage_confidence",
        contribution: 0.1,
        direction: "decreases",
      });
    }

    // 16. How-to or faq category → contribution -0.15, direction "decreases"
    if (triageResult.category === "how-to") {
      signals.push({
        factor: "howto_category_low_risk",
        contribution: 0.15,
        direction: "decreases",
      });
    }

    // 17. Positive sentiment trajectory → contribution -0.1, direction "decreases"
    if (customerProfile.health.sentimentTrajectory === "improving") {
      signals.push({
        factor: "improving_sentiment_trajectory",
        contribution: 0.1,
        direction: "decreases",
      });
    }

    return signals;
  }

  /**
   * Compute escalation probability from signals
   * Sum of contributions clamped to [0, 1]
   */
  private computeProbability(signals: EscalationSignal[]): number {
    let probability = 0;

    for (const signal of signals) {
      if (signal.direction === "increases") {
        probability += signal.contribution;
      } else {
        probability -= signal.contribution;
      }
    }

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Predict escalation level based on probability and current level
   * Higher probability tends to increase level, but respects current level minimum
   */
  private predictLevel(probability: number, currentLevel: EscalationLevel): EscalationLevel {
    // Map probability to escalation level
    // 0-0.25: level 0
    // 0.25-0.5: level 1
    // 0.5-0.75: level 2
    // >0.75: level 3
    let predictedLevel: EscalationLevel;
    if (probability < 0.25) {
      predictedLevel = 0;
    } else if (probability < 0.5) {
      predictedLevel = 1;
    } else if (probability < 0.75) {
      predictedLevel = 2;
    } else {
      predictedLevel = 3;
    }

    // Return the higher of predicted and current level
    return Math.max(predictedLevel, currentLevel) as EscalationLevel;
  }

  /**
   * Get recommended actions based on probability and signals
   */
  private getRecommendedActions(
    probability: number,
    signals: EscalationSignal[]
  ): Array<{ action: string; rationale: string; expectedImpact: number }> {
    const actions: Array<{ action: string; rationale: string; expectedImpact: number }> = [];
    const signalFactors = signals.map((s) => s.factor);

    // Threshold actions (when probability >= AUTONOMOUS_POLICY.deescalationOfferThreshold)
    if (probability >= AUTONOMOUS_POLICY.deescalationOfferThreshold) {
      // "auto_upgrade_priority": if predictedLevel > currentLevel
      // This will be determined by the caller based on predictedLevel comparison

      // "send_proactive_message": "I noticed you may still have questions about..."
      actions.push({
        action: "send_proactive_message",
        rationale: "Customer shows elevated escalation risk - proactive outreach can prevent escalation",
        expectedImpact: 0.3,
      });

      // "assign_senior_specialist": for enterprise/high tier
      if (signalFactors.includes("high_value_account_tier")) {
        actions.push({
          action: "assign_senior_specialist",
          rationale: "High-value customer with elevated risk requires senior specialist attention",
          expectedImpact: 0.5,
        });
      }

      // "trigger_deescalation_offer": compensation, apology, or priority
      if (signalFactors.includes("billing_refund_negative_sentiment")) {
        actions.push({
          action: "trigger_deescalation_offer",
          rationale: "Billing/refund issue with negative sentiment - deescalation offer can preserve customer relationship",
          expectedImpact: 0.4,
        });
      } else if (signalFactors.includes("complaint_category")) {
        actions.push({
          action: "trigger_deescalation_offer",
          rationale: "Complaint category issue - apology and compensation offer can deescalate",
          expectedImpact: 0.45,
        });
      }
    }

    // Additional action for critical churn risk
    if (signalFactors.includes("critical_churn_risk")) {
      actions.push({
        action: "assign_senior_specialist",
        rationale: "Critical churn risk requires immediate senior attention to retain customer",
        expectedImpact: 0.6,
      });
    }

    // Action for multiple recent escalations
    if (signalFactors.includes("multiple_recent_escalations")) {
      actions.push({
        action: "auto_upgrade_priority",
        rationale: "Customer has multiple recent escalations - upgrading priority ensures proper attention",
        expectedImpact: 0.4,
      });
    }

    // If no escalation risk, add a low-priority check-in action
    if (probability < 0.2 && !actions.some((a) => a.action === "send_proactive_message")) {
      actions.push({
        action: "send_proactive_message",
        rationale: "Low escalation risk but monitoring recommended",
        expectedImpact: 0.1,
      });
    }

    return actions;
  }

  /**
   * Determine confidence based on number of signals present
   * ≥6 signals = high confidence (0.8)
   * 3-5 signals = medium confidence (0.5)
   * <3 signals = low confidence (0.3)
   */
  private determineConfidence(signals: EscalationSignal[]): number {
    const count = signals.length;
    if (count >= 6) {
      return 0.8;
    } else if (count >= 3) {
      return 0.5;
    } else {
      return 0.3;
    }
  }
}

// Singleton export
export const escalationPredictor = new EscalationPredictor();
