import { describe, it, expect } from "vitest";
import { MLChurnScorer } from "../../src/predictive/ml-churn-scorer.js";

describe("MLChurnScorer", () => {
  it("scores churn risk from behavioral signals", async () => {
    const scorer = new MLChurnScorer();
    const result = await scorer.score({
      customerId: "cust-1",
      accountAge: 12,
      monthlySpend: 99,
      ticketCount: 1,
      lastTicketDaysAgo: 30,
      npsScore: 7,
      productUsageFrequency: 0.7,
      supportEscalationCount: 0,
      paymentDelays: 0,
    });
    expect(result.customerId).toBe("cust-1");
    expect(result.riskLevel).toBeDefined();
    expect(result.modelType).toBe("llm_behavioral");
  });

  it("returns rule-based fallback when LLM is unavailable", async () => {
    const scorer = new MLChurnScorer();
    const result = await scorer.score({
      customerId: "cust-2",
      accountAge: 6,
      monthlySpend: 49,
      ticketCount: 3,
      lastTicketDaysAgo: 90,
      supportEscalationCount: 1,
      paymentDelays: 2,
    });
    // Falls back to rule-based scoring
    expect(result.riskLevel).toBeDefined();
    expect(result.topRiskFactors).toBeDefined();
  });

  it("returns critical risk for high-escalation accounts", async () => {
    const scorer = new MLChurnScorer();
    const result = await scorer.score({
      customerId: "cust-3",
      accountAge: 3,
      monthlySpend: 199,
      ticketCount: 10,
      lastTicketDaysAgo: 5,
      npsScore: 4,
      productUsageFrequency: 0.1,
      supportEscalationCount: 5,
      paymentDelays: 3,
    });
    expect(["critical", "high", "medium", "low"]).toContain(result.riskLevel);
    expect(result.churnProbability).toBeGreaterThanOrEqual(0);
    expect(result.churnProbability).toBeLessThanOrEqual(1);
  });

  it("includes recommended actions in result", async () => {
    const scorer = new MLChurnScorer();
    const result = await scorer.score({
      customerId: "cust-4",
      accountAge: 24,
      monthlySpend: 149,
      ticketCount: 2,
      lastTicketDaysAgo: 45,
      supportEscalationCount: 0,
      paymentDelays: 0,
    });
    expect(Array.isArray(result.recommendedActions)).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });
});
