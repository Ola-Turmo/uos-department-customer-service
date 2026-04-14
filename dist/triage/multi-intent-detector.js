"use strict";
/**
 * Multi-intent detector.
 * Detects conjunctions that signal multiple intents in a single ticket.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectMultiIntent = detectMultiIntent;
const CONJUNCTION_MARKERS = [
    /\band\b/i,
    /\balso\b/i,
    /\bplus\b/i,
    /\band also\b/i,
    /\bfurthermore\b/i,
    /\badditionally\b/i,
    /\bbesides\b/i,
    /\bmoreover\b/i,
];
const CONJUNCTION_SPLIT_REGEX = /\s*(?:,?\s*(?:and|also|plus|and also|furthermore|additionally|besides|moreover)\s*)+/i;
/**
 * Detect if a ticket contains multiple intents.
 * Returns whether it's multi-intent and the list of detected sub-intent texts.
 */
function detectMultiIntent(text) {
    const trimmedText = text.trim();
    // Check for conjunction markers
    let hasConjunction = false;
    for (const marker of CONJUNCTION_MARKERS) {
        if (marker.test(trimmedText)) {
            hasConjunction = true;
            break;
        }
    }
    if (!hasConjunction) {
        return { isMultiIntent: false, subIntents: [] };
    }
    // Split by conjunction markers
    const parts = trimmedText.split(CONJUNCTION_SPLIT_REGEX);
    // Filter out empty strings and very short fragments
    const subIntents = parts
        .map(p => p.trim())
        .filter(p => p.length > 10)
        .map(p => p.replace(/^[,;\s]+|[,;\s]+$/g, '').trim())
        .filter(p => p.length > 0);
    return {
        isMultiIntent: subIntents.length > 1,
        subIntents,
    };
}
//# sourceMappingURL=multi-intent-detector.js.map