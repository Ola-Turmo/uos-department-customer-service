/**
 * Multi-intent detector.
 * Detects conjunctions that signal multiple intents in a single ticket.
 */
/**
 * Detect if a ticket contains multiple intents.
 * Returns whether it's multi-intent and the list of detected sub-intent texts.
 */
export declare function detectMultiIntent(text: string): {
    isMultiIntent: boolean;
    subIntents: string[];
};
//# sourceMappingURL=multi-intent-detector.d.ts.map