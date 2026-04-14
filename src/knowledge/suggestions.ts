import { Ticket } from '../types';
import { KnowledgeGraphService } from './graph';
import { findSimilarIssues } from './similarity';
import { SuggestionResult } from '../types';

/**
 * Generate a suggestion for a ticket based on similar resolved issues
 */
export function getSuggestion(
  ticket: Ticket,
  graph: KnowledgeGraphService
): SuggestionResult | null {
  // Combine subject and description for the query
  const query = `${ticket.subject} ${ticket.description}`;

  // Find similar issues
  const similarIssues = findSimilarIssues(graph, query, 3);

  if (similarIssues.length === 0) {
    return null;
  }

  // Get the best match
  const bestMatch = similarIssues[0];
  const bestMatchNode = bestMatch.knowledgeNode;

  // Build the suggestion based on the best matching node
  let suggestion: string;
  let reasoning: string;
  let confidence: number;

  if (bestMatchNode.type === 'resolution') {
    // Use the resolution directly
    suggestion = bestMatchNode.content;
    reasoning = `This suggestion is based on a resolved issue with similar keywords. ` +
      `The matching score was ${(bestMatch.similarityScore * 100).toFixed(0)}% based on ` +
      `matches in: ${bestMatch.matchedFields.join(', ')}. ` +
      `This resolution has been used successfully ${bestMatchNode.resolutionCount || 0} times.`;
    confidence = bestMatch.similarityScore * (bestMatchNode.successRate || 0.8);
  } else if (bestMatchNode.type === 'issue') {
    // Look for related resolution nodes
    const relatedNodes = graph.getRelatedNodes(bestMatchNode.id);
    const resolutionNodes = relatedNodes.filter(n => n.type === 'resolution');

    if (resolutionNodes.length > 0) {
      const resolution = resolutionNodes[0];
      suggestion = resolution.content;
      reasoning = `This suggestion is based on a similar issue "${bestMatchNode.title}" ` +
        `that was resolved with a known solution. ` +
        `The match was ${(bestMatch.similarityScore * 100).toFixed(0)}% based on ` +
        `${bestMatch.matchedFields.join(' and ')}. ` +
        `This resolution has a ${((resolution.successRate || 0.8) * 100).toFixed(0)}% success rate ` +
        `and has been applied ${resolution.resolutionCount || 0} times.`;
      confidence = bestMatch.similarityScore * (resolution.successRate || 0.8);
    } else {
      // No resolution found, provide guidance based on the issue description
      suggestion = bestMatchNode.content;
      reasoning = `While no direct resolution was found, this issue description ` +
        `may be related: "${bestMatchNode.title}". ` +
        `Consider reviewing similar cases or escalating to a specialist.`;
      confidence = bestMatch.similarityScore * 0.5;
    }
  } else if (bestMatchNode.type === 'faq' || bestMatchNode.type === 'document') {
    suggestion = bestMatchNode.content;
    reasoning = `This suggestion is based on documentation: "${bestMatchNode.title}". ` +
      `The relevance score was ${(bestMatch.similarityScore * 100).toFixed(0)}%.`;
    confidence = bestMatch.similarityScore * 0.7;
  } else {
    suggestion = bestMatchNode.content;
    reasoning = `This suggestion is based on the most relevant knowledge entry: "${bestMatchNode.title}". ` +
      `Match score: ${(bestMatch.similarityScore * 100).toFixed(0)}%.`;
    confidence = bestMatch.similarityScore * 0.6;
  }

  // Ensure confidence is within bounds
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    suggestion,
    confidence,
    sourceNodeId: bestMatchNode.id,
    reasoning,
  };
}
