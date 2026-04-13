import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeRetriever } from "../../src/rag/knowledge-retriever.js";

describe("KnowledgeRetriever", () => {
  let retriever: KnowledgeRetriever;

  beforeEach(() => { retriever = new KnowledgeRetriever(); });

  it("adds documents to the index", async () => {
    retriever.addDocuments([{ id: "doc1", content: "How to reset password", source: "kb_article", metadata: { category: "account" } }]);
    await retriever.embedAll();
    // Retrieval should find it
    const results = await retriever.retrieve("password reset", 1);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe("doc1");
  });

  it("returns top-K results ranked by score", async () => {
    retriever.addDocuments([
      { id: "d1", content: "Billing invoice tutorial", source: "kb_article", metadata: {} },
      { id: "d2", content: "Password reset guide", source: "kb_article", metadata: {} },
      { id: "d3", content: "Account deletion steps", source: "kb_article", metadata: {} },
    ]);
    await retriever.embedAll();
    const results = await retriever.retrieve("reset my password", 2);
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
  });

  it("extracts query term highlights", async () => {
    retriever.addDocuments([{ id: "d1", content: "To reset your password, go to settings and click reset.", source: "kb_article", metadata: {} }]);
    await retriever.embedAll();
    const results = await retriever.retrieve("password reset", 1);
    expect(results[0].highlights.length).toBeGreaterThan(0);
    expect(results[0].highlights[0]).toContain("password");
  });

  it("removes documents", async () => {
    retriever.addDocuments([{ id: "d1", content: "Test document", source: "kb_article", metadata: {} }]);
    await retriever.embedAll();
    retriever.removeDocument("d1");
    const results = await retriever.retrieve("test", 5);
    expect(results.map(r => r.document.id)).not.toContain("d1");
  });
});
