import { describe, it, expect, beforeEach } from "vitest";
import { SimilarTicketRetriever } from "../../src/rag/similar-ticket-retriever.js";

describe("SimilarTicketRetriever", () => {
  let retriever: SimilarTicketRetriever;

  beforeEach(() => { retriever = new SimilarTicketRetriever(); });

  it("indexes and retrieves similar tickets", async () => {
    retriever.indexTickets([
      { id: "t1", subject: "Password reset help", body: "Cannot reset my password", resolution: "Sent reset email", category: "account", resolvedAt: new Date().toISOString() },
      { id: "t2", subject: "Billing question", body: "How do I update my card?", resolution: "Updated payment method", category: "billing", resolvedAt: new Date().toISOString() },
    ]);
    const results = await retriever.findSimilar({ subject: "Forgot password", body: "I need to reset" }, 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ticket.id).toBeDefined();
  });

  it("marks high-similarity tickets as applicable", async () => {
    retriever.indexTickets([
      { id: "t1", subject: "Login issue", body: "Cannot log in", resolution: "Cleared cache", category: "technical", resolvedAt: new Date().toISOString(), csat: 5 },
    ]);
    const results = await retriever.findSimilar({ subject: "Login problem", body: "Having trouble logging in" }, 1);
    expect(results[0].resolutionApplicable).toBe(true);
  });

  it("returns empty when no tickets indexed", async () => {
    const results = await retriever.findSimilar({ subject: "Test", body: "Test body" }, 5);
    expect(results.length).toBe(0);
  });
});
