import { type Intent, type Sentiment } from '../types';
/**
 * LLM-powered intent classifier.
 * Currently uses keyword heuristics as fallback, but structure is ready for LLM integration.
 */
export declare function detectIntent(text: string): Promise<Intent>;
/**
 * Re-classify with a provided sentiment (useful after sentiment analysis).
 */
export declare function enrichIntent(intent: Intent, sentiment: Sentiment): Intent;
//# sourceMappingURL=intent-classifier.d.ts.map