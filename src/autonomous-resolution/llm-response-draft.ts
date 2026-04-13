import { callMiniMaxLLM } from "../llm-client.js";
import type { SemanticTriageResult } from "../analysis/semantic-triage.js";

export interface DraftResult { body: string; confidence: number; tone: string; }

export class LLMResponseDrafter {
  async draft(params: {
    ticket: { subject: string; body?: string; customerName?: string };
    triage: SemanticTriageResult;
    tone?: "empathetic" | "professional" | "friendly";
  }): Promise<DraftResult> {
    const { ticket, triage, tone = "professional" } = params;
    const prompt = `Write a ${tone} response to this support ticket.

Subject: ${ticket.subject}
Body: ${ticket.body ?? "(none)"}
Classification: ${triage.category} / ${triage.priority} / ${triage.sentiment} / ${triage.intent}

Keep it under 200 words. Be specific to the customer's situation. Include next steps.`;

    const response = await callMiniMaxLLM({
      prompt,
      system: "You are an expert support response writer.",
      maxTokens: 350,
      temperature: 0.6,
    });
    if (!response) return { body: `Hi${ticket.customerName ? ` ${ticket.customerName}` : ""},\n\nThank you for reaching out. We'll respond within 24 hours.\n\nBest,\nSupport`, confidence: 0.3, tone };
    return { body: response, confidence: triage.confidence, tone };
  }
}
