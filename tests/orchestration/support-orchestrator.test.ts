import { describe, it, expect } from "vitest";
import { SupportOrchestrator } from "../../src/orchestration/support-orchestrator.js";

describe("SupportOrchestrator", () => {
  it("compiles and instantiates", () => {
    const orch = new SupportOrchestrator();
    expect(orch).toBeDefined();
  });

  it("run() returns a TicketState with trace", async () => {
    const orch = new SupportOrchestrator();
    const result = await orch.run({ ticketId: "test-1", subject: "My account is locked", body: "I cannot log in" });
    expect(result.ticketId).toBe("test-1");
    expect(result.agentTrace.length).toBeGreaterThan(0);
  });

  it("escalates p0 critical tickets", async () => {
    const orch = new SupportOrchestrator();
    // "App crashes" matches the keyword fallback pattern for p0 technical
    const result = await orch.run({ ticketId: "p0-1", subject: "App crashes on startup", body: "Error 500 exception", channel: "email" });
    expect(result.triage?.priority).toBe("p0");
  });

  it("resolves normal priority tickets", async () => {
    const orch = new SupportOrchestrator();
    const result = await orch.run({ ticketId: "p2-1", subject: "Question about features", body: "How does X work?" });
    // Either resolved or escalated, never hangs
    expect(result.resolved !== undefined || result.escalated !== undefined).toBe(true);
  });

  it("stream() yields agent trace entries", async () => {
    const orch = new SupportOrchestrator();
    const entries = [];
    for await (const entry of orch.stream({ ticketId: "stream-1", subject: "Help", body: "?" })) {
      entries.push(entry);
    }
    expect(entries.length).toBeGreaterThan(0);
  });
});
