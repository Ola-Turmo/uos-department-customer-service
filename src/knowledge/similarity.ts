import { KnowledgeGraphService } from './graph';
import { SimilarIssueResult, KnowledgeNode } from '../types';

/**
 * Calculate similarity score between query and a knowledge node
 * Uses keyword matching on title and content
 */
function calculateSimilarity(query: string, node: KnowledgeNode): { score: number; matchedFields: string[] } {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const titleLower = node.title.toLowerCase();
  const contentLower = node.content.toLowerCase();

  let score = 0;
  const matchedFields: string[] = [];

  // Check for exact phrase match in title (highest weight)
  if (titleLower.includes(queryLower)) {
    score += 0.5;
    matchedFields.push('title');
  }

  // Check for exact phrase match in content
  if (contentLower.includes(queryLower)) {
    score += 0.3;
    matchedFields.push('content');
  }

  // Check for individual keyword matches
  let titleMatchCount = 0;
  let contentMatchCount = 0;

  for (const word of queryWords) {
    if (titleLower.includes(word)) {
      titleMatchCount++;
    }
    if (contentLower.includes(word)) {
      contentMatchCount++;
    }
  }

  // Calculate keyword match score
  if (queryWords.length > 0) {
    const titleKeywordScore = titleMatchCount / queryWords.length;
    const contentKeywordScore = contentMatchCount / queryWords.length;

    // Title matches are weighted higher
    score += titleKeywordScore * 0.15;
    score += contentKeywordScore * 0.05;

    if (titleKeywordScore > 0) {
      matchedFields.push('title_keywords');
    }
    if (contentKeywordScore > 0) {
      matchedFields.push('content_keywords');
    }
  }

  // Cap score at 1.0
  score = Math.min(score, 1.0);

  return { score, matchedFields };
}

/**
 * Find similar issues in the knowledge graph based on a query
 * Returns sorted by similarity score descending
 */
export function findSimilarIssues(
  graph: KnowledgeGraphService,
  query: string,
  limit: number = 5
): SimilarIssueResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const allNodes = graph.getAllNodes();

  // Calculate similarity for each node
  const results: SimilarIssueResult[] = [];

  for (const node of allNodes) {
    // Skip document and faq types for issue similarity
    if (node.type === 'document' || node.type === 'faq') {
      continue;
    }

    const { score, matchedFields } = calculateSimilarity(query, node);

    if (score > 0) {
      results.push({
        knowledgeNode: node,
        similarityScore: score,
        matchedFields,
      });
    }
  }

  // Sort by similarity score descending
  results.sort((a, b) => b.similarityScore - a.similarityScore);

  // Apply limit
  return results.slice(0, limit);
}
