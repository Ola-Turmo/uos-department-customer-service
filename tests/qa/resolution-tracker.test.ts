import { describe, it, expect } from "vitest";
import { ResolutionTracker } from "../../src/qa/resolution-tracker.js";

describe("ResolutionTracker", () => {
  it("records and scores outcomes", () => {
    const tracker = new ResolutionTracker();
    const outcome = tracker.record({
      ticketId: "t1", agentId: "agent-1", responseDrafted: "Here is the answer to your question.", triageCategory: "technical",
      timestamp: new Date().toISOString(),
    });
    expect(outcome.qualityScore).toBeGreaterThan(0);
    expect(outcome.resolutionQuality).toBeDefined();
  });

  it("penalizes critical churn tickets with short responses", () => {
    const tracker = new ResolutionTracker();
    const outcome = tracker.record({
      ticketId: "t2", agentId: "agent-1", responseDrafted: "Ok.", triageCategory: "account", churnRisk: "critical",
      timestamp: new Date().toISOString(),
    });
    expect(outcome.qualityScore).toBeLessThan(0.5);
  });

  it("getInsights() aggregates by category", () => {
    const tracker = new ResolutionTracker();
    for (let i = 0; i < 5; i++) {
      tracker.record({ ticketId: `t${i}`, agentId: "agent-1", responseDrafted: "Response text here.", triageCategory: "billing", timestamp: new Date().toISOString() });
    }
    const insights = tracker.getInsights();
    const billing = insights.find(i => i.category === "billing");
    expect(billing?.avgQuality).toBeGreaterThan(0);
  });

  it("getAgentLeaderboard() ranks agents", () => {
    const tracker = new ResolutionTracker();
    tracker.record({ ticketId: "t1", agentId: "alice", responseDrafted: "Great detailed response here.", triageCategory: "general", timestamp: new Date().toISOString() });
    tracker.record({ ticketId: "t2", agentId: "bob", responseDrafted: "Ok.", triageCategory: "general", timestamp: new Date().toISOString() });
    const leaderboard = tracker.getAgentLeaderboard();
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(leaderboard[0].agentId).toBeDefined();
  });
});
