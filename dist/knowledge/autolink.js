"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoLinkToDocs = autoLinkToDocs;
/**
 * Calculate match score between ticket and a document node
 */
function calculateMatchScore(ticket, node) {
    const ticketText = `${ticket.subject} ${ticket.description}`.toLowerCase();
    const nodeText = `${node.title} ${node.content}`.toLowerCase();
    // Split into words and filter meaningful ones
    const ticketWords = new Set(ticketText.split(/\s+/).filter(w => w.length > 2));
    const nodeWords = nodeText.split(/\s+/).filter(w => w.length > 2);
    if (nodeWords.length === 0) {
        return 0;
    }
    // Count matching words
    let matchCount = 0;
    for (const word of nodeWords) {
        if (ticketWords.has(word) || ticketText.includes(word)) {
            matchCount++;
        }
    }
    // Calculate score based on proportion of matching words
    let score = matchCount / nodeWords.length;
    // Also check for exact phrase matches
    const ticketWordsArray = Array.from(ticketWords);
    for (const word of ticketWordsArray) {
        if (nodeText.includes(word)) {
            score += 0.05; // Bonus for each matching word
        }
    }
    return Math.min(score, 1.0);
}
/**
 * Auto-link a ticket to relevant documentation nodes
 * Returns array of doc/node IDs that are relevant to the ticket
 * Only includes nodes with matchScore >= 0.3
 */
function autoLinkToDocs(ticket, graph) {
    const allNodes = graph.getAllNodes();
    const matchedIds = [];
    for (const node of allNodes) {
        // Only consider document and faq types
        if (node.type !== 'document' && node.type !== 'faq') {
            continue;
        }
        const score = calculateMatchScore(ticket, node);
        if (score >= 0.3) {
            matchedIds.push({ id: node.id, score });
        }
    }
    // Sort by score descending
    matchedIds.sort((a, b) => b.score - a.score);
    // Return just the IDs
    return matchedIds.map(m => m.id);
}
//# sourceMappingURL=autolink.js.map