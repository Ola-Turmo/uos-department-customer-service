import { describe, it, expect } from "vitest";
import { LLMResponseDrafter } from "../../src/autonomous-resolution/llm-response-draft.js";

describe("LLMResponseDrafter", () => {
  it("drafts a response with the given tone", async () => {
    const drafter = new LLMResponseDrafter();
    const result = await drafter.draft({
      ticket: { subject: "Cannot access account", body: "I am locked out" },
      triage: { category: "account", priority: "p1", sentiment: "frustrated", intent: "account_access", recommendedAction: "reset_password", urgency: "same_day", confidence: 0.8, source: "llm" },
      tone: "empathetic",
    });
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.tone).toBe("empathetic");
    // Confidence reflects triage confidence; falls back to 0.3 when LLM unavailable
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("falls back to a template when LLM is unavailable", async () => {
    const drafter = new LLMResponseDrafter();
    const result = await drafter.draft({
      ticket: { subject: "Test", body: undefined },
      triage: { category: "general", priority: "p3", sentiment: "neutral", intent: "information", recommendedAction: "provide_documentation", urgency: "1_week", confidence: 0.3, source: "llm" },
    });
    expect(result.body).toBeDefined();
    expect(result.confidence).toBeLessThan(1);
  });

  it("accepts customer name in draft", async () => {
    const drafter = new LLMResponseDrafter();
    const result = await drafter.draft({
      ticket: { subject: "Help needed", body: "Question", customerName: "Alice" },
      triage: { category: "general", priority: "p2", sentiment: "neutral", intent: "information", recommendedAction: "provide_documentation", urgency: "3_days", confidence: 0.7, source: "llm" },
      tone: "friendly",
    });
    expect(result.tone).toBe("friendly");
  });
});
