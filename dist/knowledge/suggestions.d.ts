import { Ticket } from '../types';
import { KnowledgeGraphService } from './graph';
import { SuggestionResult } from '../types';
/**
 * Generate a suggestion for a ticket based on similar resolved issues
 */
export declare function getSuggestion(ticket: Ticket, graph: KnowledgeGraphService): SuggestionResult | null;
//# sourceMappingURL=suggestions.d.ts.map