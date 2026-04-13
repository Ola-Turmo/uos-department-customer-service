import { callMiniMaxLLM } from "../llm-client.js";

export interface SemanticTriageResult {
  category: "billing" | "technical" | "account" | "feature_request" | "complaint" | "general";
  priority: "p0" | "p1" | "p2" | "p3";
  sentiment: "angry" | "frustrated" | "neutral" | "satisfied" | "happy";
  intent: string;
  recommendedAction: string;
  urgency: "immediate" | "same_day" | "3_days" | "1_week";
  confidence: number;
  source: "llm" | "keyword_fallback";
}

export class SemanticTriageEngine {
  async classify(ticket: { subject: string; body?: string; channel?: string }): Promise<SemanticTriageResult> {
    const prompt = `Classify this support ticket. Return JSON only:
{
  "category": "billing|technical|account|feature_request|complaint|general",
  "priority": "p0|p1|p2|p3",
  "sentiment": "angry|frustrated|neutral|satisfied|happy",
  "intent": "refund|technical_support|account_access|upgrade|cancellation|information",
  "recommendedAction": "refund|escalate_engineer|reset_password|ship_feature|offer_discount|provide_documentation",
  "urgency": "immediate|same_day|3_days|1_week",
  "confidence": 0.0-1.0
}
Ticket: Subject: ${ticket.subject}\nBody: ${ticket.body?.slice(0, 800) ?? "(none)"}`;

    const response = await callMiniMaxLLM({
      prompt,
      system: "You are a customer support classification engine. Return valid JSON only.",
      maxTokens: 250,
      temperature: 0.2,
    });
    if (!response) return this.keywordFallback(ticket);
    try {
      const parsed = JSON.parse(response);
      return { ...parsed, source: "llm" as const, confidence: parsed.confidence ?? 0.7 };
    } catch { return this.keywordFallback(ticket); }
  }

  private keywordFallback(ticket: { subject: string; body?: string }): SemanticTriageResult {
    const text = `${ticket.subject} ${ticket.body ?? ""}`.toLowerCase();
    if (/refund|billing|charge|invoice|payment/.test(text)) return { category: "billing", priority: "p1", sentiment: "neutral", intent: "refund", recommendedAction: "refund", urgency: "same_day", confidence: 0.6, source: "keyword_fallback" };
    if (/crash|error|bug|not working|500|exception/.test(text)) return { category: "technical", priority: "p0", sentiment: "frustrated", intent: "technical_support", recommendedAction: "escalate_engineer", urgency: "immediate", confidence: 0.7, source: "keyword_fallback" };
    if (/password|login|access|locked/.test(text)) return { category: "account", priority: "p1", sentiment: "frustrated", intent: "account_access", recommendedAction: "reset_password", urgency: "same_day", confidence: 0.65, source: "keyword_fallback" };
    return { category: "general", priority: "p2", sentiment: "neutral", intent: "information", recommendedAction: "provide_documentation", urgency: "3_days", confidence: 0.5, source: "keyword_fallback" };
  }
}
