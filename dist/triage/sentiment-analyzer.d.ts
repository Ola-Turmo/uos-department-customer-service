import { type Sentiment } from '../types';
export interface SentimentResult {
    sentiment: Sentiment;
    confidence: number;
}
/**
 * Detect sentiment from text using keyword-based heuristics.
 * Returns sentiment and confidence (0.5-1.0 based on keyword count).
 */
export declare function detectSentiment(text: string): SentimentResult;
//# sourceMappingURL=sentiment-analyzer.d.ts.map