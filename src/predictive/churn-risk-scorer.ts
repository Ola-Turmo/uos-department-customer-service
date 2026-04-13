/**
 * Churn Risk Scorer
 * VAL-DEPT-CS-CHURN: Scores customer churn risk on every interaction
 *
 * Uses customer profile data, ticket history, sentiment, and usage patterns
 * to calculate churn probability and recommend retention actions.
 */

import type {
  SentimentResult,
  IssueCategory,
} from "../types.js";

import type { CustomerProfile } from "../customer/customer-profile.js";

// ============================================
// Types
// ============================================

export type RetentionAction =
  | "satisfaction_check_in"
  | "customer_success_outreach"
  | "manager_review"
  | "executive_handoff"
  | "retention_credit"
  | "none";

export interface ChurnRiskScore {
  customerId: string;
  churnScore: number; // 0-100 (higher = more likely to churn)
  riskLevel: "critical" | "high" | "medium" | "low";
  factors: Array<{ factor: string; contribution: number; direction: "increases" | "decreases" }>;
  recommendedAction: RetentionAction;
  recommendedActionRationale: string;
  updatedAt: string;
}

export interface ChurnRiskScorerInput {
  customerProfile: CustomerProfile;
  latestTicketSentiment?: SentimentResult;
  latestTicketCategory?: IssueCategory;
  escalationCount30d: number;
  reopenedTickets30d: number;
  csatScores30d?: number[]; // array of CSAT scores (1-5)
  daysSinceLastPurchase?: number;
  usageDropPercent30d?: number; // % drop in usage over 30 days
}

// ============================================
// Helper Functions
// ============================================

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// ============================================
// Churn Risk Scorer
// ============================================

export class ChurnRiskScorer {
  /**
   * Score customer churn risk
   */
  score(input: ChurnRiskScorerInput): ChurnRiskScore {
    const {
      customerProfile,
      latestTicketSentiment,
      latestTicketCategory,
      escalationCount30d,
      reopenedTickets30d,
      csatScores30d,
      daysSinceLastPurchase,
      usageDropPercent30d,
    } = input;

    const factors: Array<{ factor: string; contribution: number; direction: "increases" | "decreases" }> = [];
    let churnScore = 0;

    // 1. Sentiment trajectory declining → +25
    if (customerProfile.health.sentimentTrajectory === "declining") {
      churnScore += 25;
      factors.push({
        factor: "declining_sentiment_trajectory",
        contribution: 25,
        direction: "increases",
      });
    }

    // 2. Escalation count 30d ≥ 3 → +20, = 2 → +12, = 1 → +5
    if (escalationCount30d >= 3) {
      churnScore += 20;
      factors.push({
        factor: "multiple_escalations",
        contribution: 20,
        direction: "increases",
      });
    } else if (escalationCount30d === 2) {
      churnScore += 12;
      factors.push({
        factor: "two_escalations",
        contribution: 12,
        direction: "increases",
      });
    } else if (escalationCount30d === 1) {
      churnScore += 5;
      factors.push({
        factor: "one_escalation",
        contribution: 5,
        direction: "increases",
      });
    }

    // 3. Reopened tickets 30d ≥ 2 → +20, = 1 → +10
    if (reopenedTickets30d >= 2) {
      churnScore += 20;
      factors.push({
        factor: "multiple_reopened_tickets",
        contribution: 20,
        direction: "increases",
      });
    } else if (reopenedTickets30d === 1) {
      churnScore += 10;
      factors.push({
        factor: "one_reopened_ticket",
        contribution: 10,
        direction: "increases",
      });
    }

    // 4. Average CSAT < 3 → +30, < 4 → +15, <= 4.5 → +5
    if (csatScores30d && csatScores30d.length > 0) {
      const avgCsat = csatScores30d.reduce((a, b) => a + b, 0) / csatScores30d.length;
      if (avgCsat < 3) {
        churnScore += 30;
        factors.push({
          factor: "very_low_csat",
          contribution: 30,
          direction: "increases",
        });
      } else if (avgCsat < 4) {
        churnScore += 15;
        factors.push({
          factor: "low_csat",
          contribution: 15,
          direction: "increases",
        });
      } else if (avgCsat <= 4.5) {
        churnScore += 5;
        factors.push({
          factor: "moderate_csat",
          contribution: 5,
          direction: "increases",
        });
      }
    }

    // 5. Churn risk from customerProfile = "critical" → +25, = "high" → +15, = "medium" → +8
    if (customerProfile.health.churnRisk === "critical") {
      churnScore += 25;
      factors.push({
        factor: "critical_churn_risk_profile",
        contribution: 25,
        direction: "increases",
      });
    } else if (customerProfile.health.churnRisk === "high") {
      churnScore += 15;
      factors.push({
        factor: "high_churn_risk_profile",
        contribution: 15,
        direction: "increases",
      });
    } else if (customerProfile.health.churnRisk === "medium") {
      churnScore += 8;
      factors.push({
        factor: "medium_churn_risk_profile",
        contribution: 8,
        direction: "increases",
      });
    }

    // 6. Billing issue with negative sentiment → +20
    if (
      latestTicketCategory === "billing" &&
      latestTicketSentiment?.polarity === "negative"
    ) {
      churnScore += 20;
      factors.push({
        factor: "billing_issue_negative_sentiment",
        contribution: 20,
        direction: "increases",
      });
    }

    // 7. Days since last purchase > 60 → +15, > 30 → +8
    if (daysSinceLastPurchase !== undefined) {
      if (daysSinceLastPurchase > 60) {
        churnScore += 15;
        factors.push({
          factor: "long_time_since_purchase",
          contribution: 15,
          direction: "increases",
        });
      } else if (daysSinceLastPurchase > 30) {
        churnScore += 8;
        factors.push({
          factor: "moderate_time_since_purchase",
          contribution: 8,
          direction: "increases",
        });
      }
    }

    // 8. Usage drop > 50% → +20, > 30% → +12, > 15% → +5
    if (usageDropPercent30d !== undefined) {
      if (usageDropPercent30d > 50) {
        churnScore += 20;
        factors.push({
          factor: "severe_usage_drop",
          contribution: 20,
          direction: "increases",
        });
      } else if (usageDropPercent30d > 30) {
        churnScore += 12;
        factors.push({
          factor: "moderate_usage_drop",
          contribution: 12,
          direction: "increases",
        });
      } else if (usageDropPercent30d > 15) {
        churnScore += 5;
        factors.push({
          factor: "mild_usage_drop",
          contribution: 5,
          direction: "increases",
        });
      }
    }

    // 9. Account tier = "low" (lowest tier) → +10
    if (customerProfile.accountTier === "standard") {
      churnScore += 10;
      factors.push({
        factor: "standard_tier",
        contribution: 10,
        direction: "increases",
      });
    }

    // 10. Negative latest sentiment → +10
    if (latestTicketSentiment?.polarity === "negative") {
      churnScore += 10;
      factors.push({
        factor: "negative_latest_sentiment",
        contribution: 10,
        direction: "increases",
      });
    }

    // 11. Complaint category latest → +15
    if (latestTicketCategory === "complaint") {
      churnScore += 15;
      factors.push({
        factor: "complaint_category_ticket",
        contribution: 15,
        direction: "increases",
      });
    }

    // 12. Very new account (< 30 days) → +10 (higher risk during onboarding failure)
    if (customerProfile.billing.accountAgeDays < 30) {
      churnScore += 10;
      factors.push({
        factor: "new_account_onboarding_risk",
        contribution: 10,
        direction: "increases",
      });
    }

    // ========== DECREASING FACTORS ==========

    // 13. Sentiment trajectory improving → -15
    if (customerProfile.health.sentimentTrajectory === "improving") {
      churnScore -= 15;
      factors.push({
        factor: "improving_sentiment_trajectory",
        contribution: 15,
        direction: "decreases",
      });
    }

    // 14. Positive latest sentiment → -8
    if (latestTicketSentiment?.polarity === "positive") {
      churnScore -= 8;
      factors.push({
        factor: "positive_latest_sentiment",
        contribution: 8,
        direction: "decreases",
      });
    }

    // 15. CSAT all 5s → -10
    if (csatScores30d && csatScores30d.length > 0 && csatScores30d.every((s) => s === 5)) {
      churnScore -= 10;
      factors.push({
        factor: "all_csat_5s",
        contribution: 10,
        direction: "decreases",
      });
    }

    // 16. Long-time customer (>1 year) → -10
    if (customerProfile.billing.accountAgeDays > 365) {
      churnScore -= 10;
      factors.push({
        factor: "longtime_customer",
        contribution: 10,
        direction: "decreases",
      });
    }

    // 17. Enterprise/high tier → -15 (high switching cost)
    if (customerProfile.accountTier === "enterprise" || customerProfile.accountTier === "high") {
      churnScore -= 15;
      factors.push({
        factor: "high_value_tier_switching_cost",
        contribution: 15,
        direction: "decreases",
      });
    }

    // Clamp final score to [0, 100]
    churnScore = Math.max(0, Math.min(100, churnScore));

    // Determine risk level
    const riskLevel = this.scoreToRiskLevel(churnScore);

    // Determine recommended action
    const { recommendedAction, recommendedActionRationale } = this.getRecommendedAction(
      riskLevel,
      latestTicketCategory,
      churnScore
    );

    return {
      customerId: customerProfile.customerId,
      churnScore,
      riskLevel,
      factors,
      recommendedAction,
      recommendedActionRationale,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert score to risk level
   * critical: score >= 70
   * high: score >= 50
   * medium: score >= 30
   * low: score < 30
   */
  private scoreToRiskLevel(score: number): "critical" | "high" | "medium" | "low" {
    if (score >= 70) return "critical";
    if (score >= 50) return "high";
    if (score >= 30) return "medium";
    return "low";
  }

  /**
   * Determine recommended retention action based on risk level
   */
  private getRecommendedAction(
    riskLevel: "critical" | "high" | "medium" | "low",
    latestTicketCategory?: IssueCategory,
    churnScore?: number
  ): { recommendedAction: RetentionAction; recommendedActionRationale: string } {
    // For billing/refund issues in high/critical risk → add "retention_credit" recommendation
    const hasBillingIssue = latestTicketCategory === "billing" || latestTicketCategory === "refund";

    switch (riskLevel) {
      case "critical":
        if (hasBillingIssue) {
          return {
            recommendedAction: "retention_credit",
            recommendedActionRationale:
              "Critical churn risk with billing issue - retention credit recommended to preserve customer relationship",
          };
        }
        return {
          recommendedAction: "executive_handoff",
          recommendedActionRationale:
            "Critical churn risk requires executive-level attention and immediate retention efforts",
        };

      case "high":
        if (hasBillingIssue) {
          return {
            recommendedAction: "retention_credit",
            recommendedActionRationale:
              "High churn risk with billing issue - retention credit recommended to prevent churn",
          };
        }
        return {
          recommendedAction: "customer_success_outreach",
          recommendedActionRationale:
            "High churn risk - customer success team should reach out proactively to understand concerns",
        };

      case "medium":
        return {
          recommendedAction: "satisfaction_check_in",
          recommendedActionRationale:
            "Medium churn risk - schedule a satisfaction check-in after ticket resolution",
        };

      case "low":
      default:
        return {
          recommendedAction: "none",
          recommendedActionRationale:
            "Low churn risk - no immediate retention action required",
        };
    }
  }
}

// Singleton export
export const churnRiskScorer = new ChurnRiskScorer();
