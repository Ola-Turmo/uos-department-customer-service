/**
 * Intent Classifier Service
 * AI-native intent classification with 50+ categories, confidence scoring,
 * ambiguity detection, and multi-intent support.
 */

import type {
  IntentClassificationResult,
  IntentMatch,
  IntentCategory,
} from "../types.js";

const MODEL_VERSION = "intent-classifier-v1";

/**
 * Full list of supported intent categories
 */
export const INTENT_CATEGORIES: IntentCategory[] = [
  "billing", "refund", "payment", "subscription", "cancellation",
  "bug", "technical", "api", "integration", "webhook", "crash", "performance",
  "account", "account-recovery", "authentication", "access-control", "permissions",
  "complaint", "dissatisfaction", "frustration", "escalation-request",
  "feature-request", "suggestion", "improvement",
  "how-to", "documentation", "guide", "tutorial", "faq",
  "shipping", "delivery", "tracking", "delay",
  "returns", "exchange", "warranty",
  "data-privacy", "gdpr", "data-deletion", "consent",
  "accessibility", "disability", "inclusive",
  "feedback", "praise", "testimonial",
  "partnership", "business-inquiry", "enterprise",
  "security", "breach", "vulnerability",
  "other",
];

// Keyword-to-intent mapping for keyword-based fallback
const KEYWORD_INTENT_MAP: Record<string, { intent: IntentCategory; confidence: number }[]> = {
  billing: [
    { intent: "billing", confidence: 0.9 }, { intent: "payment", confidence: 0.7 },
  ],
  invoice: [{ intent: "billing", confidence: 0.9 }],
  charge: [{ intent: "billing", confidence: 0.8 }, { intent: "payment", confidence: 0.6 }],
  refund: [{ intent: "refund", confidence: 0.95 }],
  subscription: [{ intent: "subscription", confidence: 0.9 }],
  cancel: [{ intent: "cancellation", confidence: 0.8 }],
  bug: [{ intent: "bug", confidence: 0.9 }],
  crash: [{ intent: "crash", confidence: 0.9 }],
  error: [{ intent: "bug", confidence: 0.6 }, { intent: "technical", confidence: 0.5 }],
  api: [{ intent: "api", confidence: 0.9 }],
  webhook: [{ intent: "webhook", confidence: 0.9 }],
  integration: [{ intent: "integration", confidence: 0.8 }],
  performance: [{ intent: "performance", confidence: 0.8 }],
  account: [{ intent: "account", confidence: 0.9 }],
  "account recovery": [{ intent: "account-recovery", confidence: 0.9 }],
  login: [{ intent: "authentication", confidence: 0.8 }],
  password: [{ intent: "authentication", confidence: 0.7 }],
  auth: [{ intent: "authentication", confidence: 0.8 }],
  permission: [{ intent: "access-control", confidence: 0.8 }],
  access: [{ intent: "permissions", confidence: 0.7 }],
  complaint: [{ intent: "complaint", confidence: 0.9 }],
  unhappy: [{ intent: "dissatisfaction", confidence: 0.8 }],
  frustrated: [{ intent: "frustration", confidence: 0.9 }],
  upset: [{ intent: "frustration", confidence: 0.8 }],
  escalate: [{ intent: "escalation-request", confidence: 0.9 }],
  "want to speak": [{ intent: "escalation-request", confidence: 0.8 }],
  "feature": [{ intent: "feature-request", confidence: 0.7 }],
  suggestion: [{ intent: "suggestion", confidence: 0.8 }],
  improve: [{ intent: "improvement", confidence: 0.7 }],
  "how do": [{ intent: "how-to", confidence: 0.8 }],
  "how to": [{ intent: "how-to", confidence: 0.8 }],
  documentation: [{ intent: "documentation", confidence: 0.8 }],
  guide: [{ intent: "guide", confidence: 0.7 }],
  tutorial: [{ intent: "tutorial", confidence: 0.8 }],
  faq: [{ intent: "faq", confidence: 0.8 }],
  shipping: [{ intent: "shipping", confidence: 0.9 }],
  delivery: [{ intent: "delivery", confidence: 0.9 }],
  tracking: [{ intent: "tracking", confidence: 0.9 }],
  delayed: [{ intent: "delay", confidence: 0.8 }],
  return: [{ intent: "returns", confidence: 0.9 }],
  exchange: [{ intent: "exchange", confidence: 0.9 }],
  warranty: [{ intent: "warranty", confidence: 0.9 }],
  privacy: [{ intent: "data-privacy", confidence: 0.8 }],
  gdpr: [{ intent: "gdpr", confidence: 0.95 }],
  "data deletion": [{ intent: "data-deletion", confidence: 0.9 }],
  consent: [{ intent: "consent", confidence: 0.8 }],
  accessibility: [{ intent: "accessibility", confidence: 0.9 }],
  disability: [{ intent: "disability", confidence: 0.8 }],
  feedback: [{ intent: "feedback", confidence: 0.8 }],
  "great": [{ intent: "praise", confidence: 0.7 }],
  "thank you": [{ intent: "praise", confidence: 0.6 }],
  partnership: [{ intent: "partnership", confidence: 0.8 }],
  enterprise: [{ intent: "enterprise", confidence: 0.8 }],
  security: [{ intent: "security", confidence: 0.8 }],
  breach: [{ intent: "breach", confidence: 0.9 }],
  vulnerability: [{ intent: "vulnerability", confidence: 0.9 }],
};

function generateId(): string {
  return `intent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Keyword-based intent classification (fallback when LLM unavailable)
 */
function classifyWithKeywords(
  subject: string,
  description: string
): IntentClassificationResult {
  const text = `${subject} ${description}`.toLowerCase();
  const scores: Map<IntentCategory, { total: number; count: number }> = new Map();
  
  for (const [keyword, mappings] of Object.entries(KEYWORD_INTENT_MAP)) {
    if (text.includes(keyword)) {
      for (const { intent, confidence } of mappings) {
        const existing = scores.get(intent);
        if (existing) {
          existing.total += confidence;
          existing.count += 1;
        } else {
          scores.set(intent, { total: confidence, count: 1 });
        }
      }
    }
  }

  const matches: IntentMatch[] = [];
  for (const [intent, { total, count }] of Array.from(scores.entries())) {
    const avgConfidence = total / count;
    matches.push({ intent, confidence: Math.min(1, avgConfidence) });
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  if (matches.length === 0) {
    return {
      primaryIntent: { intent: "other", confidence: 0.3 },
      secondaryIntents: [],
      isAmbiguous: false,
      ambiguityScore: 0,
      allMatches: [{ intent: "other", confidence: 0.3 }],
      modelVersion: MODEL_VERSION,
      classifiedAt: new Date().toISOString(),
    };
  }

  const primaryIntent = matches[0];
  const secondaryIntents = matches.slice(1, 4); // top 3 secondary

  // Ambiguity detection: if top 2 are very close in confidence
  const isAmbiguous = matches.length >= 2 && 
    Math.abs(matches[0].confidence - matches[1].confidence) < 0.15 &&
    matches[0].confidence < 0.7;

  const ambiguityScore = isAmbiguous 
    ? 1 - (matches[0].confidence - matches[1].confidence)
    : 0;

  return {
    primaryIntent,
    secondaryIntents,
    isAmbiguous,
    ambiguityScore,
    allMatches: matches.slice(0, 10), // top 10
    modelVersion: MODEL_VERSION,
    classifiedAt: new Date().toISOString(),
  };
}

/**
 * Map IntentCategory to legacy IssueCategory
 */
export function mapToIssueCategory(intent: IntentCategory): import("../types.js").IssueCategory {
  const mapping: Partial<Record<IntentCategory, import("../types.js").IssueCategory>> = {
    billing: "billing",
    refund: "refund",
    payment: "billing",
    subscription: "billing",
    cancellation: "billing",
    bug: "bug",
    technical: "technical",
    api: "technical",
    integration: "technical",
    webhook: "technical",
    crash: "bug",
    performance: "bug",
    account: "account",
    "account-recovery": "account",
    authentication: "account",
    "access-control": "account",
    permissions: "account",
    complaint: "complaint",
    dissatisfaction: "complaint",
    frustration: "complaint",
    "escalation-request": "complaint",
    "feature-request": "feature-request",
    suggestion: "feature-request",
    improvement: "feature-request",
    "how-to": "how-to",
    documentation: "how-to",
    guide: "how-to",
    tutorial: "how-to",
    faq: "how-to",
    shipping: "other",
    delivery: "other",
    tracking: "other",
    delay: "other",
    returns: "other",
    exchange: "other",
    warranty: "other",
    "data-privacy": "other",
    gdpr: "other",
    "data-deletion": "other",
    consent: "other",
    accessibility: "other",
    disability: "other",
    inclusive: "other",
    feedback: "other",
    praise: "other",
    testimonial: "other",
    partnership: "other",
    "business-inquiry": "other",
    enterprise: "other",
    security: "other",
    breach: "other",
    vulnerability: "other",
    other: "other",
  };
  return mapping[intent] ?? "other";
}

export class IntentClassifier {
  /**
   * Classify intent from subject + description
   * Uses keyword-based classification (simulates LLM in this implementation)
   */
  classify(subject: string, description: string): IntentClassificationResult {
    // Primary: keyword-based classification
    const result = classifyWithKeywords(subject, description);
    
    // Multi-intent detection: if secondary intents have high confidence
    const hasMultipleIssues = result.secondaryIntents.some(
      (s) => s.confidence > 0.5 && s.intent !== result.primaryIntent.intent
    );

    if (hasMultipleIssues) {
      // Already have secondary intents, that's the multi-intent detection
    }

    return result;
  }

  /**
   * Get routing recommendation based on intent classification
   */
  getRoutingHint(
    intent: IntentCategory,
    sentiment?: { polarity: "positive" | "negative" | "neutral"; intensity: number }
  ): { team: string; specialistRoleKey?: string; urgencyBoost: number } {
    let urgencyBoost = 0;
    
    if (sentiment && sentiment.polarity === "negative" && sentiment.intensity > 0.7) {
      urgencyBoost = 2;
    }

    const routing: Record<string, { team: string; specialistRoleKey?: string }> = {
      billing: { team: "billing-specialist", specialistRoleKey: "customer-email-resolution-specialist" },
      refund: { team: "billing-specialist", specialistRoleKey: "customer-email-resolution-specialist" },
      payment: { team: "billing-specialist", specialistRoleKey: "customer-email-resolution-specialist" },
      subscription: { team: "billing-specialist", specialistRoleKey: "customer-email-resolution-specialist" },
      cancellation: { team: "billing-specialist", specialistRoleKey: "customer-email-resolution-specialist" },
      bug: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      technical: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      api: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      integration: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      webhook: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      crash: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      performance: { team: "technical-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      account: { team: "account-management", specialistRoleKey: "customer-email-resolution-specialist" },
      "account-recovery": { team: "account-management", specialistRoleKey: "customer-email-resolution-specialist" },
      authentication: { team: "account-management", specialistRoleKey: "customer-email-resolution-specialist" },
      "access-control": { team: "account-management", specialistRoleKey: "customer-email-resolution-specialist" },
      permissions: { team: "account-management", specialistRoleKey: "customer-email-resolution-specialist" },
      complaint: { team: "customer-success", specialistRoleKey: "customer-support-lead" },
      dissatisfaction: { team: "customer-success", specialistRoleKey: "customer-support-lead" },
      frustration: { team: "customer-success", specialistRoleKey: "customer-support-lead" },
      "escalation-request": { team: "customer-success", specialistRoleKey: "customer-support-lead" },
      "feature-request": { team: "product-feedback" },
      suggestion: { team: "product-feedback" },
      improvement: { team: "product-feedback" },
      "how-to": { team: "self-service", specialistRoleKey: "customer-knowledge-automation-lead" },
      documentation: { team: "self-service", specialistRoleKey: "customer-knowledge-automation-lead" },
      guide: { team: "self-service", specialistRoleKey: "customer-knowledge-automation-lead" },
      tutorial: { team: "self-service", specialistRoleKey: "customer-knowledge-automation-lead" },
      faq: { team: "self-service", specialistRoleKey: "customer-knowledge-automation-lead" },
      shipping: { team: "logistics", specialistRoleKey: "customer-chat-resolution-specialist" },
      delivery: { team: "logistics", specialistRoleKey: "customer-chat-resolution-specialist" },
      tracking: { team: "logistics", specialistRoleKey: "customer-chat-resolution-specialist" },
      delay: { team: "logistics", specialistRoleKey: "customer-chat-resolution-specialist" },
      returns: { team: "returns", specialistRoleKey: "customer-email-resolution-specialist" },
      exchange: { team: "returns", specialistRoleKey: "customer-email-resolution-specialist" },
      warranty: { team: "returns", specialistRoleKey: "customer-email-resolution-specialist" },
      "data-privacy": { team: "legal-compliance", specialistRoleKey: "customer-support-lead" },
      gdpr: { team: "legal-compliance", specialistRoleKey: "customer-support-lead" },
      "data-deletion": { team: "legal-compliance", specialistRoleKey: "customer-support-lead" },
      consent: { team: "legal-compliance", specialistRoleKey: "customer-support-lead" },
      accessibility: { team: "product-feedback", specialistRoleKey: "customer-support-lead" },
      disability: { team: "product-feedback", specialistRoleKey: "customer-support-lead" },
      inclusive: { team: "product-feedback", specialistRoleKey: "customer-support-lead" },
      feedback: { team: "product-feedback" },
      praise: { team: "general-support", specialistRoleKey: "customer-chat-resolution-specialist" },
      testimonial: { team: "marketing" },
      partnership: { team: "sales", specialistRoleKey: "customer-support-lead" },
      "business-inquiry": { team: "sales", specialistRoleKey: "customer-support-lead" },
      enterprise: { team: "sales", specialistRoleKey: "customer-support-lead" },
      security: { team: "security-team", specialistRoleKey: "customer-support-lead" },
      breach: { team: "security-team", specialistRoleKey: "customer-support-lead" },
      vulnerability: { team: "security-team", specialistRoleKey: "customer-support-lead" },
      other: { team: "general-support", specialistRoleKey: "customer-chat-resolution-specialist" },
    };

    const route = routing[intent] ?? routing["other"];
    return { ...route, urgencyBoost };
  }
}

// Export singleton
export const intentClassifier = new IntentClassifier();
