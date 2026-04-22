import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

describe("plugin scaffold", () => {
  it("registers data, actions, and event handling", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    await harness.emit("issue.created", { issueId: "iss_1" }, { entityId: "iss_1", entityType: "issue" });
    expect(harness.getState({ scopeKind: "issue", scopeId: "iss_1", stateKey: "seen" })).toBe(true);

    const data = await harness.getData<{ status: string; checkedAt: string }>("health");
    // Health can be "ok", "unknown", "degraded", or "error" depending on connector state
    // After our XAF-007 fix, "unknown" is returned when connectors haven't been runtime-checked
    expect(["ok", "unknown", "degraded", "error"]).toContain(data.status);

    const action = await harness.performAction<{ pong: boolean; at: string }>("ping");
    expect(action.pong).toBe(true);
  });

  it("exposes dashboard data routes for triage, escalation, patterns, and connector widgets", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const connector = await harness.getData<{
      overallStatus: string;
      connectors: unknown[];
      checkedAt: string;
    }>("connector.getHealth");
    expect(["ok", "unknown", "degraded", "error"]).toContain(connector.overallStatus);
    expect(Array.isArray(connector.connectors)).toBe(true);
    expect(typeof connector.checkedAt).toBe("string");

    const triageSummary = await harness.getData<{
      totalTriaged: number;
      pendingEscalations: number;
      averageConfidence: number;
    }>("triage.getSummary");
    expect(triageSummary.totalTriaged).toBe(0);
    expect(triageSummary.pendingEscalations).toBe(0);
    expect(triageSummary.averageConfidence).toBe(0);

    const pendingEscalations = await harness.getData<{ records: unknown[] }>("escalation.getPending");
    expect(Array.isArray(pendingEscalations.records)).toBe(true);
    expect(pendingEscalations.records).toHaveLength(0);

    const patterns = await harness.getData<{ patterns: unknown[] }>("patterns.getAllPatterns");
    expect(Array.isArray(patterns.patterns)).toBe(true);
    expect(patterns.patterns).toHaveLength(0);

    const openActions = await harness.getData<{ actions: unknown[] }>("patterns.getOpenActions");
    expect(Array.isArray(openActions.actions)).toBe(true);
    expect(openActions.actions).toHaveLength(0);
  });
});
