import { KnowledgeGraphService } from './graph';
import { SimilarIssueResult } from '../types';
/**
 * Find similar issues in the knowledge graph based on a query
 * Returns sorted by similarity score descending
 */
export declare function findSimilarIssues(graph: KnowledgeGraphService, query: string, limit?: number): SimilarIssueResult[];
//# sourceMappingURL=similarity.d.ts.map