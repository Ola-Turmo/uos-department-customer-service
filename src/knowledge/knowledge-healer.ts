import { KBArticle, KnowledgeGap, TriageResult } from '../types.js';

/**
 * KnowledgeHealer
 *
 * Detects gaps in the knowledge base by analyzing triage results and existing articles.
 * Generates new KB articles to fill identified gaps and determines auto-publish eligibility.
 */
export class KnowledgeHealer {
  /**
   * Confidence threshold below which a gap is considered significant.
   */
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Minimum evidence relevance to consider an article as covering a topic.
   */
  private readonly MIN_EVIDENCE_RELEVANCE = 0.5;

  /**
   * Detects whether a knowledge gap exists for a given ticket based on triage results
   * and existing KB articles.
   *
   * @param ticketId - Unique identifier for the ticket
   * @param triage - The triage result for the ticket
   * @param existingArticles - Array of existing KB articles to check coverage against
   * @returns A KnowledgeGap if one is detected, null otherwise
   */
  detectGap(
    ticketId: string,
    triage: TriageResult,
    existingArticles: KBArticle[]
  ): KnowledgeGap | null {
    // If triage confidence is low, flag as a potential gap
    if (triage.confidence < this.CONFIDENCE_THRESHOLD) {
      return this.createGap(ticketId, triage, existingArticles);
    }

    // Check if KB evidence is sufficient
    const kbEvidence = triage.evidence.filter(
      (e) => e.source === 'kb' && e.relevance >= this.MIN_EVIDENCE_RELEVANCE
    );

    // If no KB evidence or low relevance, there's a gap
    if (kbEvidence.length === 0) {
      return this.createGap(ticketId, triage, existingArticles);
    }

    // Check if existing articles actually cover the intent/category
    const isCovered = existingArticles.some(
      (article) =>
        article.category === triage.category &&
        article.confidence >= this.CONFIDENCE_THRESHOLD
    );

    if (!isCovered) {
      return this.createGap(ticketId, triage, existingArticles);
    }

    // Ambiguity detected may also indicate a gap
    if (triage.ambiguityDetected && triage.confidence < 0.85) {
      return this.createGap(ticketId, triage, existingArticles);
    }

    return null;
  }

  /**
   * Generates a KB article from a detected knowledge gap.
   *
   * @param gap - The knowledge gap to generate an article from
   * @returns A newly generated KBArticle
   */
  generateArticle(gap: KnowledgeGap): KBArticle {
    const now = new Date().toISOString();

    return {
      id: `kb-${gap.ticketId}-${Date.now()}`,
      title: gap.suggestedTitle,
      content: gap.suggestedContent,
      category: gap.resolutionSummary.split(' ')[0] || 'general',
      confidence: gap.confidence,
      sources: gap.existingArticleIds,
      lastUpdated: now,
    };
  }

  /**
   * Determines whether a knowledge gap should be automatically published
   * based on its confidence level.
   *
   * @param gap - The knowledge gap to evaluate
   * @returns true if confidence >= 0.95, false otherwise
   */
  autoPublish(gap: KnowledgeGap): boolean {
    return gap.confidence >= 0.95;
  }

  /**
   * Helper method to create a KnowledgeGap object.
   */
  private createGap(
    ticketId: string,
    triage: TriageResult,
    existingArticles: KBArticle[]
  ): KnowledgeGap {
    const existingArticleIds = existingArticles
      .filter((a) => a.category === triage.category)
      .map((a) => a.id);

    const kbEvidence = triage.evidence.filter(
      (e) => e.source === 'kb' && e.relevance >= this.MIN_EVIDENCE_RELEVANCE
    );

    const gapDescription = this.deriveGapDescription(triage, kbEvidence);
    const suggestedTitle = this.deriveSuggestedTitle(triage);
    const suggestedContent = this.deriveSuggestedContent(triage);
    const confidence = this.calculateGapConfidence(triage, kbEvidence);

    return {
      ticketId,
      resolutionSummary: triage.responseDraft.substring(0, 100),
      existingArticleIds,
      gapDescription,
      suggestedTitle,
      suggestedContent,
      confidence,
      autoPublish: confidence >= 0.95,
    };
  }

  /**
   * Derives a description of the knowledge gap.
   */
  private deriveGapDescription(
    triage: TriageResult,
    kbEvidence: typeof triage.evidence
  ): string {
    if (kbEvidence.length === 0) {
      return `No KB articles found for category '${triage.category}' with intent '${triage.intent}'.`;
    }
    return `Insufficient KB coverage for '${triage.category}' - intent '${triage.intent}' has low confidence (${triage.confidence.toFixed(2)}).`;
  }

  /**
   * Derives a suggested title for a new KB article.
   */
  private deriveSuggestedTitle(triage: TriageResult): string {
    return `${triage.category}: ${triage.intent}`;
  }

  /**
   * Derives suggested content for a new KB article.
   */
  private deriveSuggestedContent(triage: TriageResult): string {
    const evidenceSummary = triage.evidence
      .map((e) => `- ${e.content} (${e.source})`)
      .join('\n');

    return `# ${triage.intent}\n\n## Category\n${triage.category}\n\n## Summary\n${triage.responseDraft}\n\n## Evidence\n${evidenceSummary}\n\n## Routing\n${triage.routingHint}\n`;
  }

  /**
   * Calculates the confidence level for a detected gap.
   */
  private calculateGapConfidence(
    triage: TriageResult,
    kbEvidence: typeof triage.evidence
  ): number {
    let confidence = triage.confidence;

    // Penalize for lack of KB evidence
    if (kbEvidence.length === 0) {
      confidence *= 0.8;
    }

    // Penalize for ambiguity
    if (triage.ambiguityDetected) {
      confidence *= 0.85;
    }

    // Boost for high triage confidence
    if (triage.confidence >= 0.9) {
      confidence = Math.min(confidence * 1.1, 1.0);
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
