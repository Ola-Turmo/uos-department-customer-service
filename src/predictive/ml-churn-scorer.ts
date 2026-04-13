import { callMiniMaxLLM } from "../llm-client.js";

export interface MLChurnPrediction {
  customerId: string;
  churnProbability: number; // 0-1
  riskLevel: "critical" | "high" | "medium" | "low";
  topRiskFactors: string[];
  recommendedActions: string[];
  confidence: number;
  modelType: "llm_behavioral";
}

export class MLChurnScorer {
  /**
   * Score churn risk using LLM behavioral analysis.
   * More powerful than rule-based scoring — understands patterns.
   */
  async score(params: {
    customerId: string;
    accountAge: number; // months
    monthlySpend: number;
    ticketCount: number;
    lastTicketDaysAgo: number;
    npsScore?: number;
    productUsageFrequency?: number; // 0-1
    supportEscalationCount: number;
    paymentDelays: number;
    featureAdoptionRate?: number; // 0-1
    notes?: string[];
  }): Promise<MLChurnPrediction> {
    const { customerId, accountAge, monthlySpend, ticketCount, lastTicketDaysAgo, npsScore, productUsageFrequency, supportEscalationCount, paymentDelays, featureAdoptionRate, notes } = params;

    const prompt = `Analyze this customer's churn risk based on behavioral signals.

Customer ${customerId}:
- Account age: ${accountAge} months
- Monthly spend: $${monthlySpend}
- Support tickets: ${ticketCount} (last: ${lastTicketDaysAgo} days ago)
- NPS: ${npsScore ?? "N/A"}
- Product usage frequency: ${productUsageFrequency != null ? `${(productUsageFrequency * 100).toFixed(0)}%` : "N/A"}
- Escalations: ${supportEscalationCount}
- Payment delays: ${paymentDelays}
- Feature adoption: ${featureAdoptionRate != null ? `${(featureAdoptionRate * 100).toFixed(0)}%` : "N/A"}
${notes ? `- Notes: ${notes.join("; ")}` : ""}

Return JSON:
{
  "churnProbability": 0.0-1.0,
  "riskLevel": "critical|high|medium|low",
  "topRiskFactors": ["factor1", "factor2"],
  "recommendedActions": ["action1", "action2"],
  "confidence": 0.0-1.0
}`;
    const response = await callMiniMaxLLM({
      prompt,
      system: "You are a churn risk analyst. Be specific and evidence-based.",
      maxTokens: 300,
      temperature: 0.3,
    });

    if (!response) return this.ruleBasedScore(customerId, params);

    try {
      const parsed = JSON.parse(response);
      return {
        customerId,
        churnProbability: Math.max(0, Math.min(1, parsed.churnProbability ?? 0.5)),
        riskLevel: ["critical", "high", "medium", "low"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
        topRiskFactors: Array.isArray(parsed.topRiskFactors) ? parsed.topRiskFactors : [],
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
        modelType: "llm_behavioral",
      };
    } catch { return this.ruleBasedScore(customerId, params); }
  }

  private ruleBasedScore(customerId: string, p: {
    supportEscalationCount: number;
    paymentDelays: number;
    lastTicketDaysAgo: number;
    npsScore?: number;
    productUsageFrequency?: number;
  }): MLChurnPrediction {
    let risk = 0.3;
    if (p.supportEscalationCount > 2) risk += 0.2;
    if (p.paymentDelays > 1) risk += 0.15;
    if (p.lastTicketDaysAgo > 60) risk += 0.15;
    if (p.npsScore != null && p.npsScore < 6) risk += 0.15;
    if (p.productUsageFrequency != null && p.productUsageFrequency < 0.3) risk += 0.15;
    risk = Math.min(1, risk);
    const riskLevel: MLChurnPrediction["riskLevel"] = risk > 0.7 ? "critical" : risk > 0.5 ? "high" : risk > 0.3 ? "medium" : "low";
    return { customerId, churnProbability: risk, riskLevel, topRiskFactors: ["rule-based fallback"], recommendedActions: ["review account health"], confidence: 0.4, modelType: "llm_behavioral" };
  }
}
