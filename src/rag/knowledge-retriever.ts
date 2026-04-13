// src/rag/knowledge-retriever.ts
// RAG knowledge base — stores embeddings in-memory, retrieves top-K relevant docs.

export interface KnowledgeDocument {
  id: string;
  content: string;
  source: "kb_article" | "resolved_ticket" | "policy_doc";
  metadata: Record<string, string | number | boolean>;
  embedding?: number[];  // populated after embed()
}

export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;
  highlights: string[];
}

/**
 * Simple in-memory RAG retriever.
 * Uses BM25 + embedding similarity (cosine) hybrid ranking.
 * Production would use Pinecone/Chroma — this is the TypeScript-native version.
 */
export class KnowledgeRetriever {
  private documents: KnowledgeDocument[] = [];
  private embedCache = new Map<string, number[]>();

  // ── Document Management ──────────────────────────────────────────────────

  addDocuments(docs: Omit<KnowledgeDocument, "embedding">[]): void {
    for (const doc of docs) {
      const existing = this.documents.find(d => d.id === doc.id);
      if (!existing) this.documents.push({ ...doc, embedding: undefined });
    }
  }

  removeDocument(id: string): void {
    this.documents = this.documents.filter(d => d.id !== id);
  }

  async embedDocument(doc: KnowledgeDocument): Promise<number[]> {
    if (doc.embedding) return doc.embedding;
    const cached = this.embedCache.get(doc.id);
    if (cached) return cached;
    // Generate a deterministic embedding from content hash (pseudo-embedding)
    // Production: call OpenAI/Cohere embeddings API
    const embedding = this.pseudoEmbed(doc.content);
    this.embedCache.set(doc.id, embedding);
    doc.embedding = embedding;
    return embedding;
  }

  async embedAll(): Promise<void> {
    await Promise.all(this.documents.map(d => this.embedDocument(d)));
  }

  // ── Retrieval ─────────────────────────────────────────────────────────────

  async retrieve(query: string, topK = 5): Promise<RetrievalResult[]> {
    const queryEmb = this.pseudoEmbed(query);
    const scored = await Promise.all(
      this.documents.map(async doc => {
        const emb = await this.embedDocument(doc);
        const bm25 = this.bm25Score(query, doc.content);
        const cosine = this.cosine(queryEmb, emb);
        // Hybrid: 0.4 * BM25 + 0.6 * cosine
        const score = 0.4 * bm25 + 0.6 * cosine;
        const highlights = this.extractHighlights(query, doc.content);
        return { document: doc, score, highlights };
      })
    );
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  // ── BM25 ─────────────────────────────────────────────────────────────────

  private bm25Score(query: string, doc: string): number {
    const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const docTerms = doc.toLowerCase().split(/\W+/).filter(Boolean);
    const docSet = new Set(docTerms);
    let score = 0;
    for (const term of queryTerms) {
      if (docSet.has(term)) score += 1 / docTerms.length;
    }
    return Math.min(1, score);
  }

  // ── Cosine Similarity ─────────────────────────────────────────────────────

  private cosine(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  // ── Pseudo Embeddings ─────────────────────────────────────────────────────

  private pseudoEmbed(text: string): number[] {
    // Lightweight hash-based pseudo-embedding (384-dim)
    // In production: replace with real embedding API call
    const DIM = 384;
    const result = new Float32Array(DIM);
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    for (let i = 0; i < DIM; i++) {
      for (let j = 0; j < words.length; j++) {
        const hash = this.simpleHash(words[j] + i);
        result[i] += (hash % 1000) / 1000 * (1 / (j + 1));
      }
    }
    // Normalize
    let norm = 0;
    for (let i = 0; i < DIM; i++) norm += result[i] * result[i];
    norm = Math.sqrt(norm) + 1e-10;
    for (let i = 0; i < DIM; i++) result[i] /= norm;
    return Array.from(result);
  }

  private simpleHash(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  // ── Highlights ─────────────────────────────────────────────────────────────

  private extractHighlights(query: string, content: string): string[] {
    const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    return sentences
      .filter(s => queryTerms.some(t => s.toLowerCase().includes(t)))
      .slice(0, 3)
      .map(s => s.trim());
  }
}
