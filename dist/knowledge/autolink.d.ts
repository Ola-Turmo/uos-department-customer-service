import { Ticket } from '../types';
import { KnowledgeGraphService } from './graph';
/**
 * Auto-link a ticket to relevant documentation nodes
 * Returns array of doc/node IDs that are relevant to the ticket
 * Only includes nodes with matchScore >= 0.3
 */
export declare function autoLinkToDocs(ticket: Ticket, graph: KnowledgeGraphService): string[];
//# sourceMappingURL=autolink.d.ts.map