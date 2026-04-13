// src/rag/similar-ticket-retriever.ts
// Find similar resolved tickets to inform new ticket resolution.

import { KnowledgeRetriever } from "./knowledge-retriever.js";

export interface ResolvedTicket {
  id: string;
  subject: string;
  body: string;
  resolution: string;
  category: string;
  resolvedAt: string;
  csat?: number;
}

export interface SimilarTicketResult {
  ticket: ResolvedTicket;
  similarity: number;
  resolutionApplicable: boolean;
}

/**
 * Find similar resolved tickets using BM25 + embedding hybrid search.
 */
export class SimilarTicketRetriever {
  private tickets: ResolvedTicket[] = [];
  private retriever = new KnowledgeRetriever();

  indexTickets(tickets: ResolvedTicket[]): void {
    this.tickets = tickets;
    this.retriever.addDocuments(tickets.map(t => ({
      id: t.id,
      content: `${t.subject} ${t.body} ${t.resolution}`,
      source: "resolved_ticket" as const,
      metadata: { category: t.category, csat: t.csat ?? 0, resolvedAt: t.resolvedAt },
    })));
  }

  async findSimilar(newTicket: { subject: string; body: string }, topK = 5): Promise<SimilarTicketResult[]> {
    await this.retriever.embedAll();
    const results = await this.retriever.retrieve(`${newTicket.subject} ${newTicket.body}`, topK);
    return results.map(r => ({
      ticket: this.tickets.find(t => t.id === r.document.id)!,
      similarity: r.score,
      resolutionApplicable: r.score > 0.6,
    })).filter(r => r.ticket);
  }
}
