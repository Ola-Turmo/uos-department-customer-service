"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSentiment = detectSentiment;
const types_1 = require("../types");
const POSITIVE_WORDS = [
    'thanks', 'thank', 'great', 'excellent', 'love', 'appreciate',
    'amazing', 'fantastic', 'wonderful', 'best', 'awesome', 'helpful',
    'perfect', 'good', 'happy', 'pleased', 'satisfied', 'brilliant',
];
const NEGATIVE_WORDS = [
    'angry', 'frustrated', 'terrible', 'awful', 'hate', 'worst',
    'horrible', 'poor', 'disappointed', 'upset', 'annoyed', 'ridiculous',
    'unacceptable', 'outrageous', 'pathetic', 'useless', 'broken',
    'never', 'still', 'cant', "can't", 'cannot', 'stuck', 'impossible',
];
/**
 * Detect sentiment from text using keyword-based heuristics.
 * Returns sentiment and confidence (0.5-1.0 based on keyword count).
 */
function detectSentiment(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    for (const word of words) {
        const cleanWord = word.replace(/[^a-z']/g, '');
        if (POSITIVE_WORDS.includes(cleanWord)) {
            positiveCount++;
        }
        if (NEGATIVE_WORDS.includes(cleanWord)) {
            negativeCount++;
        }
    }
    // Also check for negation patterns and intensity modifiers
    const hasNegation = /\b(not|never|no|don't|don't|doesnt|isn't|aren't|wasn't|weren't)\b/.test(lowerText);
    const hasIntensifiers = /\b(very|really|extremely|absolutely|totally|completely)\b/.test(lowerText);
    let sentiment;
    let confidence;
    const totalKeywords = positiveCount + negativeCount;
    if (positiveCount > 0 && negativeCount === 0) {
        sentiment = 'positive';
        confidence = Math.min(0.95, 0.5 + positiveCount * 0.1 + (hasIntensifiers ? 0.1 : 0));
    }
    else if (negativeCount > 0 && positiveCount === 0) {
        sentiment = 'negative';
        confidence = Math.min(0.95, 0.5 + negativeCount * 0.1 + (hasNegation ? 0.1 : 0) + (hasIntensifiers ? 0.1 : 0));
    }
    else if (positiveCount > 0 && negativeCount > 0) {
        sentiment = 'mixed';
        confidence = Math.min(0.85, 0.5 + totalKeywords * 0.08);
    }
    else {
        sentiment = 'neutral';
        confidence = 0.5;
    }
    // Validate against schema
    const validated = types_1.SentimentSchema.parse(sentiment);
    return {
        sentiment: validated,
        confidence: Math.round(confidence * 100) / 100,
    };
}
//# sourceMappingURL=sentiment-analyzer.js.map