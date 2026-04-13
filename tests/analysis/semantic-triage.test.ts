import { describe, it, expect } from "vitest";
import { SemanticTriageEngine } from "../../src/analysis/semantic-triage.js";

describe("SemanticTriageEngine", () => {
  it("classifies billing tickets", async () => {
    const engine = new SemanticTriageEngine();
    const result = await engine.classify({ subject: "I want a refund", body: "I was charged twice", channel: "email" });
    expect(["billing", "refund"]).toContain(result.category);
  });

  it("classifies technical tickets", async () => {
    const engine = new SemanticTriageEngine();
    const result = await engine.classify({ subject: "App crashes on startup", body: "Error 500", channel: "chat" });
    expect(["technical", "general"]).toContain(result.category);
  });

  it("returns keyword fallback on LLM failure", async () => {
    const engine = new SemanticTriageEngine();
    // When LLM returns empty (no API key), should return keyword fallback
    const result = await engine.classify({ subject: "I need a refund", body: "charge me twice please" });
    expect(result.source).toBe("keyword_fallback");
    expect(result.category).toBe("billing");
  });
});
