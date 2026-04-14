import { z } from 'zod';
import {
  IntentCategorySchema,
  IntentSchema,
  SentimentSchema,
  type Intent,
  type IntentCategory,
  type Sentiment,
} from '../types';

// Keyword maps for heuristic fallback (LLM-ready structure)
const INTENT_KEYWORDS: Record<IntentCategory, string[]> = {
  billing_inquiry: ['bill', 'billing', 'invoice', 'charge', 'statement', 'payment method'],
  payment_issue: ['payment', 'pay', 'paid', 'transaction', 'credit card', 'debit', 'refund'],
  refund_request: ['refund', 'money back', 'return', 'reimburse', 'reimbursement'],
  subscription_change: ['subscription', 'upgrade', 'downgrade', 'plan', 'cancel subscription', 'change plan'],
  invoice_request: ['invoice', 'receipt', 'billing statement', 'pdf', 'download invoice'],
  technical_issue: ['bug', 'error', 'crash', 'not working', 'broken', 'issue', 'problem', 'technical'],
  account_access: ['access', 'login', 'log in', 'sign in', 'locked out', 'forgot password', 'cant access'],
  connectivity_problem: ['connect', 'connection', 'network', 'internet', 'disconnect', 'offline', 'unstable'],
  feature_not_working: ['feature', 'function', 'doesnt work', 'not working', 'broken', 'malfunction'],
  data_export: ['export', 'download', 'data', 'csv', 'backup', 'extract'],
  product_inquiry: ['product', 'what is', 'how does', 'tell me about', 'details', 'information'],
  pricing_info: ['price', 'cost', 'pricing', 'how much', 'expensive', 'cheap', 'afford'],
  comparison_request: ['compare', 'comparison', 'difference between', 'vs', 'versus', 'better'],
  demo_request: ['demo', 'demonstration', 'show me', 'walkthrough', 'presentation'],
  trial_extension: ['trial', 'extend', 'extension', 'more time', 'free trial'],
  account_creation: ['create account', 'sign up', 'register', 'new account', 'join'],
  account_deletion: ['delete account', 'remove account', 'close account', 'cancel account', 'deactivate'],
  profile_update: ['profile', 'update', 'edit', 'change name', 'change email', 'settings'],
  password_reset: ['password', 'reset', 'forgot', 'change password', 'new password'],
  two_factor_auth: ['two factor', '2fa', 'authenticator', 'verification code', 'mfa', 'two-factor'],
  shipping_inquiry: ['shipping', 'ship', 'deliver', 'delivery', 'when will', 'track'],
  delivery_delay: ['delay', 'late', 'delayed', 'taking long', 'waiting', 'still not received'],
  lost_package: ['lost', 'missing', 'where is', 'never arrived', 'lost package', 'disappeared'],
  address_change: ['address', 'change address', 'shipping address', 'deliver to', 'new address'],
  return_request: ['return', 'send back', 'return item', 'exchange', '退回'],
  complaint_general: ['complaint', 'unhappy', 'dissatisfied', 'disappointed', 'not happy'],
  complaint_quality: ['quality', 'poor quality', 'defective', 'damaged', 'broken', 'faulty'],
  complaint_service: ['service', 'support', 'service issue', 'bad service', 'rude', 'slow'],
  complaint_shipping: ['shipping', 'delivery', 'late delivery', 'wrong item', 'damaged shipping'],
  complaint_billing: ['billing', 'overcharged', 'wrong charge', 'billing error', 'hidden fee'],
  feedback_positive: ['thank', 'thanks', 'great', 'excellent', 'love', 'amazing', 'fantastic', 'wonderful', 'best'],
  feedback_negative: ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'disappointed'],
  feature_request: ['feature', 'request', 'would like', 'suggest', 'add', 'could you add', 'wish'],
  bug_report: ['bug', 'error', 'crash', 'glitch', 'issue', 'problem', 'defect'],
  general_inquiry: ['question', 'wondering', 'curious', 'how do i', 'what is', 'can i'],
  contact_request: ['contact', 'reach', 'speak to', 'talk to', 'get in touch', 'phone', 'email'],
  partnership_inquiry: ['partner', 'partnership', 'business', 'collaborate', 'affiliate', 'reseller'],
  press_inquiry: ['press', 'media', 'journalist', 'news', 'interview', 'article', 'publication'],
  other: [],
};

function classifyByKeywords(text: string): { category: IntentCategory; score: number; alternatives: Array<{ category: IntentCategory; score: number }> } {
  const lowerText = text.toLowerCase();
  const scores: Array<{ category: IntentCategory; score: number }> = [];

  for (const [category, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (category === 'other') continue;
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const score = Math.min(0.9, 0.3 + matchCount * 0.15);
      scores.push({ category: category as IntentCategory, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return { category: 'other', score: 0.5, alternatives: [] };
  }

  const top = scores[0];
  const alternatives = scores.slice(1, 4).map(s => ({ category: s.category, score: s.score }));

  return { category: top.category, score: top.score, alternatives };
}

/**
 * LLM-powered intent classifier.
 * Currently uses keyword heuristics as fallback, but structure is ready for LLM integration.
 */
export async function detectIntent(text: string): Promise<Intent> {
  const id = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

  // Simulate LLM classification with keyword fallback
  // In production, replace with actual LLM call:
  // const llmResult = await llmClassify(text);
  const { category, score, alternatives } = classifyByKeywords(text);

  const isAmbiguous = score < 0.6;

  const intent: Intent = {
    id,
    category,
    confidence: {
      score,
      isAmbiguous,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    },
    sentiment: 'neutral', // sentiment will be filled by sentiment analyzer
    rawText: text,
    timestamp,
  };

  return intent;
}

/**
 * Re-classify with a provided sentiment (useful after sentiment analysis).
 */
export function enrichIntent(intent: Intent, sentiment: Sentiment): Intent {
  return {
    ...intent,
    sentiment,
  };
}
