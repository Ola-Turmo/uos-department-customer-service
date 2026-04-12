/**
 * Sentiment Analyzer Service
 * Analyzes customer message sentiment for escalation risk scoring
 */

import type { SentimentResult, SentimentSignal } from "../types.js";

// Keyword-based sentiment signals
const POSITIVE_WORDS: { word: string; intensity: number }[] = [
  { word: "thank", intensity: 0.6 },
  { word: "thanks", intensity: 0.6 },
  { word: "appreciate", intensity: 0.7 },
  { word: "grateful", intensity: 0.8 },
  { word: "wonderful", intensity: 0.9 },
  { word: "excellent", intensity: 0.9 },
  { word: "amazing", intensity: 0.9 },
  { word: "great", intensity: 0.7 },
  { word: "good", intensity: 0.5 },
  { word: "helpful", intensity: 0.7 },
  { word: "best", intensity: 0.7 },
  { word: "love", intensity: 0.8 },
  { word: "happy", intensity: 0.7 },
  { word: "pleased", intensity: 0.7 },
  { word: "satisfied", intensity: 0.7 },
  { word: "perfect", intensity: 0.9 },
  { word: "awesome", intensity: 0.8 },
  { word: "fantastic", intensity: 0.9 },
];

const NEGATIVE_WORDS: { word: string; intensity: number }[] = [
  { word: "angry", intensity: 0.95 },
  { word: "furious", intensity: 1.0 },
  { word: "frustrated", intensity: 0.85 },
  { word: "upset", intensity: 0.8 },
  { word: "disappointed", intensity: 0.8 },
  { word: "terrible", intensity: 0.95 },
  { word: "horrible", intensity: 0.95 },
  { word: "awful", intensity: 0.9 },
  { word: "worst", intensity: 0.9 },
  { word: "bad", intensity: 0.6 },
  { word: "unacceptable", intensity: 0.85 },
  { word: "outrageous", intensity: 0.9 },
  { word: "ridiculous", intensity: 0.8 },
  { word: "pathetic", intensity: 0.85 },
  { word: "useless", intensity: 0.8 },
  { word: "waste", intensity: 0.7 },
  { word: "refuse", intensity: 0.7 },
  { word: "never", intensity: 0.6 },
  { word: "complaint", intensity: 0.7 },
  { word: "unhappy", intensity: 0.8 },
  { word: "dissatisfied", intensity: 0.8 },
  { word: "annoyed", intensity: 0.7 },
  { word: "irritated", intensity: 0.75 },
  { word: "livid", intensity: 0.95 },
  { word: "betrayed", intensity: 0.9 },
  { word: "deceived", intensity: 0.9 },
  { word: "scammed", intensity: 0.95 },
  { word: "fraud", intensity: 0.95 },
  { word: "theft", intensity: 1.0 },
  { word: "stolen", intensity: 0.9 },
  { word: "illegal", intensity: 0.9 },
  { word: "lawsuit", intensity: 0.95 },
  { word: "lawyer", intensity: 0.9 },
  { word: "urgent", intensity: 0.7 },
  { word: "critical", intensity: 0.8 },
  { word: "emergency", intensity: 0.85 },
  { word: "asap", intensity: 0.7 },
  { word: "immediately", intensity: 0.7 },
];

// Escalation risk indicators
const ESCALATION_INDICATORS: { pattern: RegExp; weight: number }[] = [
  { pattern: /cancel\s+(my\s+)?(account|subscription|membership)/i, weight: 0.6 },
  { pattern: /speak\s+to\s+(a\s+)?(manager|supervisor|escalat)/i, weight: 0.5 },
  { pattern: /legal\s+(action|advice|counsel)/i, weight: 0.8 },
  { pattern: /report\s+you\s+to|complain\s+to\s+(the|your)/i, weight: 0.5 },
  { pattern: /social\s+media|twitter|facebook|review\s+site/i, weight: 0.4 },
  { pattern: /charged\s+without|didn't\s+authorize/i, weight: 0.6 },
  { pattern: /multiple\s+times|still\s+(not|working)|again/i, weight: 0.4 },
  { pattern: /first\s+time|new\s+customer|first\s+experience/i, weight: 0.3 },
];

function analyzeText(text: string): { signals: SentimentSignal[]; polarity: "positive" | "negative" | "neutral"; avgIntensity: number } {
  const signals: SentimentSignal[] = [];
  const lower = text.toLowerCase();

  for (const { word, intensity } of POSITIVE_WORDS) {
    if (lower.includes(word)) {
      signals.push({ keyword: word, polarity: "positive", intensity });
    }
  }

  for (const { word, intensity } of NEGATIVE_WORDS) {
    if (lower.includes(word)) {
      signals.push({ keyword: word, polarity: "negative", intensity });
    }
  }

  let positiveCount = signals.filter(s => s.polarity === "positive").length;
  let negativeCount = signals.filter(s => s.polarity === "negative").length;

  let polarity: "positive" | "negative" | "neutral";
  if (positiveCount > negativeCount * 1.5) polarity = "positive";
  else if (negativeCount > positiveCount * 1.5) polarity = "negative";
  else polarity = "neutral";

  const allIntensities = signals.map(s => s.intensity);
  const avgIntensity = allIntensities.length > 0
    ? allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length
    : 0;

  return { signals, polarity, avgIntensity };
}

function computeEscalationRisk(
  text: string,
  polarity: "positive" | "negative" | "neutral",
  intensity: number,
  signals: SentimentSignal[]
): number {
  let risk = 0;

  if (polarity === "negative" && intensity > 0.7) risk += 0.4;
  else if (polarity === "negative" && intensity > 0.4) risk += 0.2;

  for (const { pattern, weight } of ESCALATION_INDICATORS) {
    if (pattern.test(text)) {
      risk += weight;
    }
  }

  const negativeSignals = signals.filter(s => s.polarity === "negative").length;
  if (negativeSignals >= 3) risk += 0.3;
  else if (negativeSignals >= 1) risk += 0.15;

  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.3 && text.length > 20) risk += 0.2;

  if (/!{2,}|\?{2,}/.test(text)) risk += 0.15;

  return Math.min(1, risk);
}

function computeUrgency(polarity: "positive" | "negative" | "neutral", intensity: number, escalationRisk: number): SentimentResult["urgencyLevel"] {
  if (escalationRisk > 0.7 || (polarity === "negative" && intensity > 0.85)) return "critical";
  if (escalationRisk > 0.4 || (polarity === "negative" && intensity > 0.6)) return "high";
  if (escalationRisk > 0.2 || polarity === "negative" || intensity > 0.4) return "medium";
  return "low";
}

export class SentimentAnalyzer {
  analyze(text: string): SentimentResult {
    const { signals, polarity, avgIntensity } = analyzeText(text);
    const escalationRisk = computeEscalationRisk(text, polarity, avgIntensity, signals);
    const urgencyLevel = computeUrgency(polarity, avgIntensity, escalationRisk);

    const summaries: Record<string, string> = {
      "critical-negative": "Highly emotional negative message with strong escalation indicators. Treat as urgent.",
      "high-negative": "Negative sentiment with significant frustration. Elevated priority recommended.",
      "medium-negative": "Moderately negative tone. Standard handling with attention to sentiment.",
      low: "Neutral or positive message. Standard processing.",
    };

    const key = `${urgencyLevel}-${polarity}`;
    const summary = summaries[key] ?? summaries["low"];

    return {
      polarity,
      intensity: avgIntensity,
      signals,
      escalationRisk,
      urgencyLevel,
      summary,
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
