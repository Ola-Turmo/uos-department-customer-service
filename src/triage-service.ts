/**
 * Triage Service
 * VAL-DEPT-CS-001: Incoming issues are triaged, evidenced, and routed correctly
 * 
 * Classifies incoming support issues, drafts evidence-backed responses,
 * and routes escalations according to risk and issue type.
 */

import type {
  TriageIssueParams,
  TriageResult,
  TriageEvidence,
  TriageState,
  IssueCategory,
  IssuePriority,
  EscalationLevel,
  ResponseDraft,
  CreateEscalationParams,
  EscalationRecord,
  ResolveEscalationParams,
} from "./types.js";

import { intentClassifier, mapToIssueCategory } from "./triage/intent-classifier.js";
import { sentimentAnalyzer } from "./triage/sentiment-analyzer.js";
import type {
  AIEnrichedTriageResult,
  IntentClassificationResult,
  SentimentResult,
} from "./types.js";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Keyword-based issue classifier with confidence scoring
 */
function classifyIssue(
  subject: string,
  description: string
): { category: IssueCategory; confidence: "high" | "medium" | "low"; tags: string[] } {
  const text = `${subject} ${description}`.toLowerCase();
  const tags: string[] = [];

  // Billing patterns
  if (
    text.includes("invoice") ||
    text.includes("billing") ||
    text.includes("charge") ||
    text.includes("payment") ||
    text.includes("refund") ||
    text.includes("subscription")
  ) {
    tags.push("billing");
    if (text.includes("refund")) {
      return { category: "refund", confidence: "high", tags };
    }
    return { category: "billing", confidence: "high", tags };
  }

  // Bug patterns
  if (
    text.includes("bug") ||
    text.includes("crash") ||
    text.includes("error") ||
    text.includes("broken") ||
    text.includes("not working") ||
    text.includes("doesn't work") ||
    text.includes("fail") ||
    text.includes("issue") ||
    text.includes("problem")
  ) {
    tags.push("bug");
    if (
      text.includes("login") ||
      text.includes("auth") ||
      text.includes("password") ||
      text.includes("403") ||
      text.includes("401")
    ) {
      tags.push("authentication");
    }
    return { category: "bug", confidence: "medium", tags };
  }

  // Account patterns
  if (
    text.includes("account") ||
    text.includes("profile") ||
    text.includes("password") ||
    text.includes("login") ||
    text.includes("access") ||
    text.includes("permission") ||
    text.includes("settings")
  ) {
    tags.push("account");
    return { category: "account", confidence: "high", tags };
  }

  // Technical patterns
  if (
    text.includes("api") ||
    text.includes("integration") ||
    text.includes("webhook") ||
    text.includes("technical") ||
    text.includes("code") ||
    text.includes("developer")
  ) {
    tags.push("technical");
    return { category: "technical", confidence: "high", tags };
  }

  // Feature request patterns
  if (
    text.includes("feature") ||
    text.includes("request") ||
    text.includes("suggestion") ||
    text.includes("would be nice") ||
    text.includes("could you add") ||
    text.includes("missing")
  ) {
    tags.push("feature-request");
    return { category: "feature-request", confidence: "medium", tags };
  }

  // Complaint patterns
  if (
    text.includes("complaint") ||
    text.includes("unhappy") ||
    text.includes("dissatisfied") ||
    text.includes("frustrated") ||
    text.includes("angry") ||
    text.includes("terrible")
  ) {
    tags.push("complaint");
    return { category: "complaint", confidence: "medium", tags };
  }

  // How-to patterns
  if (
    text.includes("how do i") ||
    text.includes("how to") ||
    text.includes("can you explain") ||
    text.includes("?") ||
    text.includes("guide") ||
    text.includes("tutorial") ||
    text.includes("documentation")
  ) {
    tags.push("how-to");
    return { category: "how-to", confidence: "medium", tags };
  }

  return { category: "other", confidence: "low", tags: [] };
}

/**
 * Determine priority based on category and content
 */
function determinePriority(
  category: IssueCategory,
  subject: string,
  description: string
): IssuePriority {
  const text = `${subject} ${description}`.toLowerCase();

  // Critical indicators
  if (
    text.includes("critical") ||
    text.includes("urgent") ||
    text.includes("down") ||
    text.includes("outage") ||
    text.includes("emergency")
  ) {
    return "critical";
  }

  // High priority categories
  if (category === "refund" || category === "complaint") {
    if (text.includes("first") || text.includes("new customer") || text.includes("promised")) {
      return "high";
    }
    return "medium";
  }

  if (category === "bug") {
    if (
      text.includes("cannot access") ||
      text.includes("blocked") ||
      text.includes("urgent")
    ) {
      return "high";
    }
    return "medium";
  }

  if (category === "billing") {
    return "medium";
  }

  return "low";
}

/**
 * Determine escalation level based on category, priority, and content
 */
function determineEscalationLevel(
  category: IssueCategory,
  priority: IssuePriority,
  subject: string,
  description: string
): { level: EscalationLevel; rationale?: string } {
  const text = `${subject} ${description}`.toLowerCase();

  // Account recovery and critical issues escalate immediately
  if (
    text.includes("account locked") ||
    text.includes("cannot login") ||
    text.includes("locked out") ||
    (priority === "critical")
  ) {
    return {
      level: 3,
      rationale: "Critical priority or account access issue requiring senior specialist",
    };
  }

  // Refund requests over threshold
  if (category === "refund") {
    if (text.includes("large") || text.includes("significant") || text.includes("$500")) {
      return {
        level: 2,
        rationale: "High-value refund requiring manager approval",
      };
    }
    return { level: 1, rationale: "Standard refund request" };
  }

  // Complaints and billing issues
  if (category === "complaint" || category === "billing") {
    return {
      level: 1,
      rationale: "Customer dissatisfaction risk or financial impact",
    };
  }

  // Technical bugs that block work
  if (category === "bug" && priority === "high") {
    return {
      level: 2,
      rationale: "High-priority bug affecting multiple users",
    };
  }

  return { level: 0, rationale: undefined };
}

/**
 * Get routing recommendation based on category
 */
function getRoutingRecommendation(
  category: IssueCategory,
  channel?: string
): { team: string; specialistRoleKey?: string; channel?: string } {
  switch (category) {
    case "billing":
    case "refund":
      return {
        team: "billing-specialist",
        specialistRoleKey: "customer-email-resolution-specialist",
      };
    case "bug":
    case "technical":
      return {
        team: "technical-support",
        specialistRoleKey: "customer-chat-resolution-specialist",
      };
    case "account":
      return {
        team: "account-management",
        specialistRoleKey: "customer-email-resolution-specialist",
      };
    case "complaint":
      return {
        team: "customer-success",
        specialistRoleKey: "customer-support-lead",
      };
    case "feature-request":
      return {
        team: "product-feedback",
      };
    case "how-to":
      return {
        team: "self-service",
        specialistRoleKey: "customer-knowledge-automation-lead",
      };
    default:
      return {
        team: "general-support",
        specialistRoleKey: "customer-chat-resolution-specialist",
      };
  }
}

/**
 * Collect evidence for the issue based on category
 */
function collectEvidence(
  issueId: string,
  category: IssueCategory,
  subject: string,
  description: string
): TriageEvidence[] {
  const evidence: TriageEvidence[] = [];
  const now = new Date().toISOString();

  // Category-specific policy evidence
  if (category === "billing" || category === "refund") {
    evidence.push({
      id: generateId(),
      type: "policy",
      title: "Billing and Refund Policy",
      description: "Standard billing handling procedures and refund eligibility guidelines",
      source: "Customer Service Policy KB-001",
      relevanceScore: 0.9,
      collectedAt: now,
      confidence: "high",
    });
  }

  if (category === "account") {
    evidence.push({
      id: generateId(),
      type: "policy",
      title: "Account Recovery Procedures",
      description: "Procedures for account access recovery and identity verification",
      source: "Account Security Policy KB-002",
      relevanceScore: 0.95,
      collectedAt: now,
      confidence: "high",
    });
  }

  // Knowledge base evidence for how-to
  if (category === "how-to") {
    evidence.push({
      id: generateId(),
      type: "knowledge",
      title: "Knowledge Base Search",
      description: `Search KB for: ${subject}`,
      source: "Knowledge Base",
      relevanceScore: 0.85,
      collectedAt: now,
      confidence: "medium",
    });
  }

  // Previous similar cases
  evidence.push({
    id: generateId(),
    type: "previous-case",
    title: "Similar Case History",
    description: "Check for resolved similar cases in the ticketing system",
    source: "Historical Cases",
    relevanceScore: 0.6,
    collectedAt: now,
    confidence: "low",
  });

  // Product documentation for bugs
  if (category === "bug") {
    evidence.push({
      id: generateId(),
      type: "product",
      title: "Product Documentation",
      description: "Relevant product docs and known issues",
      source: "Product Documentation",
      relevanceScore: 0.7,
      collectedAt: now,
      confidence: "medium",
    });
  }

  return evidence;
}

/**
 * Generate a response draft based on category and evidence
 */
function generateResponseDraft(
  issueId: string,
  category: IssueCategory,
  subject: string,
  evidence: TriageEvidence[]
): ResponseDraft {
  const now = new Date().toISOString();
  const citations = evidence.map((e) => ({
    evidenceId: e.id,
    quote: e.description.substring(0, 100),
  }));

  let tone: ResponseDraft["tone"] = "informative";
  let content: string;

  switch (category) {
    case "complaint":
      tone = "empathetic";
      content = `Thank you for bringing this to our attention. I completely understand your frustration, and I want to assure you that we're taking this seriously. Let me look into this for you and get back to you with a resolution.`;
      break;
    case "refund":
      tone = "apologetic";
      content = `I understand your concern about your refund request. Let me review the details of your case and ensure this is processed correctly. Our goal is to resolve refund requests within 5-7 business days.`;
      break;
    case "bug":
      tone = "informative";
      content = `Thank you for reporting this issue. I've categorized this as a technical bug and our engineering team has been notified. For your reference, this has been logged as: ${subject}. You can expect updates within 24-48 hours.`;
      break;
    case "account":
      tone = "empathetic";
      content = `I understand you're having trouble with your account access. Let me help you resolve this. Account-related issues are typically resolved within a few minutes to a few hours, depending on the verification required.`;
      break;
    case "billing":
      tone = "informative";
      content = `Thank you for reaching out about your billing concern. I'm reviewing your account now to understand the issue. You may find it helpful to review your billing history in your account settings.`;
      break;
    case "how-to":
      tone = "informative";
      content = `I'd be happy to help you with this! Let me provide some guidance based on your question about: ${subject}.`;
      break;
    case "feature-request":
      tone = "informative";
      content = `Thank you for your feature suggestion! We really appreciate hearing from our customers about how we can improve. I've logged your request and our product team will review it. While we can't respond to every suggestion individually, your feedback helps shape our roadmap.`;
      break;
    default:
      tone = "neutral";
      content = `Thank you for contacting us. I'm reviewing your message and will get back to you shortly with more information.`;
  }

  return {
    id: generateId(),
    tone,
    content,
    citations,
    confidence: "medium",
    policyCompliant: true,
    createdAt: now,
  };
}

export class TriageService {
  private state: TriageState;

  constructor(initialState?: TriageState) {
    this.state = initialState ?? {
      triageResults: {},
      escalationRecords: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Triage an incoming issue
   * VAL-DEPT-CS-001
   */
  triageIssue(params: TriageIssueParams): TriageResult {
    const now = new Date().toISOString();
    const { category, confidence: categoryConfidence, tags } = classifyIssue(
      params.subject,
      params.description
    );
    const priority = determinePriority(category, params.subject, params.description);
    const { level: escalationLevel, rationale: escalationRationale } = determineEscalationLevel(
      category,
      priority,
      params.subject,
      params.description
    );
    const routingRecommendation = getRoutingRecommendation(category, params.channel);
    const evidence = collectEvidence(params.issueId, category, params.subject, params.description);
    const suggestedResponseDraft = generateResponseDraft(
      params.issueId,
      category,
      params.subject,
      evidence
    );

    const result: TriageResult = {
      issueId: params.issueId,
      category,
      priority,
      confidence: categoryConfidence,
      routingRecommendation,
      escalationLevel,
      escalationRationale,
      evidence,
      suggestedResponseDraft,
      tags: [...tags, category],
      processedAt: now,
    };

    this.state.triageResults[params.issueId] = result as TriageResult;
    this.state.lastUpdated = now;

    return result;
  }

  /**
   * AI-powered triage using intent classification and sentiment analysis
   * VAL-DEPT-CS-001 (upgraded from keyword-based)
   */
  triageIssueAI(params: TriageIssueParams): AIEnrichedTriageResult {
    const now = new Date().toISOString();

    // Run intent classification and sentiment analysis
    const intentResult = intentClassifier.classify(params.subject, params.description);
    const sentiment = sentimentAnalyzer.analyze(`${params.subject} ${params.description}`);
    const legacyCategory = mapToIssueCategory(intentResult.primaryIntent.intent);

    // Determine priority with AI/sentiment boost
    const priority = this.determinePriorityWithSentiment(
      legacyCategory, params.subject, params.description, sentiment
    );

    // Determine escalation with AI insight
    const { level: escalationLevel, rationale: escalationRationale } =
      this.determineEscalationLevelWithAI(
        legacyCategory, priority, params.subject, params.description, intentResult, sentiment
      );

    // AI-enhanced routing
    const routingHint = intentClassifier.getRoutingHint(
      intentResult.primaryIntent.intent,
      { polarity: sentiment.polarity, intensity: sentiment.intensity }
    );
    const routingRecommendation = {
      team: routingHint.team,
      specialistRoleKey: routingHint.specialistRoleKey,
      channel: routingHint.urgencyBoost >= 2 ? "chat" : undefined,
    };

    // Collect evidence with AI layer
    const evidence = this.collectEvidenceWithAI(
      params.issueId, legacyCategory, params.subject, params.description, intentResult, sentiment
    );

    // Generate AI-aware response draft
    const suggestedResponseDraft = this.generateDraftAI(
      params.issueId, legacyCategory, intentResult, sentiment, params.subject
    );

    // Multi-issue detection
    const multiIssueDetected = intentResult.secondaryIntents.length > 0 &&
      intentResult.secondaryIntents[0].confidence > 0.5;

    // Priority adjustment suggestion
    const suggestedPriorityAdjustment = this.suggestPriorityAdjustment(priority, sentiment);

    const confidence: "high" | "medium" | "low" =
      intentResult.primaryIntent.confidence >= 0.7 ? "high" :
      intentResult.primaryIntent.confidence >= 0.4 ? "medium" : "low";

    const result: AIEnrichedTriageResult = {
      issueId: params.issueId,
      category: legacyCategory,
      priority,
      confidence,
      routingRecommendation,
      escalationLevel,
      escalationRationale,
      evidence,
      suggestedResponseDraft,
      tags: Array.from(new Set([...Array.from(this.extractTags(intentResult)), legacyCategory])),
      processedAt: now,
      intentClassification: intentResult,
      sentiment,
      multiIssueDetected,
      suggestedPriorityAdjustment,
    };

    this.state.triageResults[params.issueId] = result as any;
    this.state.lastUpdated = now;

    return result;
  }

  private determinePriorityWithSentiment(
    category: IssueCategory,
    subject: string,
    description: string,
    sentiment: SentimentResult
  ): IssuePriority {
    // Use base priority logic
    const base = determinePriority(category, subject, description);

    // Sentiment escalation boost
    if (sentiment.urgencyLevel === "critical") return "critical";
    if (sentiment.urgencyLevel === "high" && base !== "critical") return "high";
    if (sentiment.urgencyLevel === "medium" && base === "low") return "medium";

    return base;
  }

  private determineEscalationLevelWithAI(
    category: IssueCategory,
    priority: IssuePriority,
    subject: string,
    description: string,
    intentResult: IntentClassificationResult,
    sentiment: SentimentResult
  ): { level: EscalationLevel; rationale?: string } {
    const base = determineEscalationLevel(category, priority, subject, description);

    if (sentiment.escalationRisk > 0.7) {
      return {
        level: Math.min(3, base.level + 1) as EscalationLevel,
        rationale: base.rationale
          ? `${base.rationale} + AI escalation: sentiment risk ${(sentiment.escalationRisk * 100).toFixed(0)}%`
          : `AI escalation: sentiment risk ${(sentiment.escalationRisk * 100).toFixed(0)}%`,
      };
    }

    if (intentResult.isAmbiguous) {
      return {
        level: Math.min(3, base.level + 1) as EscalationLevel,
        rationale: base.rationale
          ? `${base.rationale} + ambiguous intent may need specialist`
          : "Ambiguous intent: specialist review recommended",
      };
    }

    return base;
  }

  private collectEvidenceWithAI(
    issueId: string,
    category: IssueCategory,
    subject: string,
    description: string,
    intentResult: IntentClassificationResult,
    sentiment: SentimentResult
  ): TriageEvidence[] {
    const evidence = collectEvidence(issueId, category, subject, description);

    evidence.unshift({
      id: generateId(),
      type: "knowledge",
      title: "AI Intent Classification",
      description: `Primary: ${intentResult.primaryIntent.intent} (${(intentResult.primaryIntent.confidence * 100).toFixed(0)}% conf)` +
        (intentResult.secondaryIntents.length > 0
          ? ` | Secondary: ${intentResult.secondaryIntents.slice(0, 2).map(i => `${i.intent} (${(i.confidence * 100).toFixed(0)}%)`).join(", ")}`
          : ""),
      source: "Intent Classifier v1",
      relevanceScore: intentResult.primaryIntent.confidence,
      collectedAt: new Date().toISOString(),
      confidence: intentResult.primaryIntent.confidence > 0.7 ? "high" : intentResult.primaryIntent.confidence > 0.4 ? "medium" : "low",
    });

    if (intentResult.isAmbiguous) {
      evidence.push({
        id: generateId(),
        type: "knowledge",
        title: "Ambiguity Detected",
        description: `Multiple intents possible: ${intentResult.allMatches.slice(0, 3).map(i => i.intent).join(", ")}`,
        source: "Intent Classifier v1",
        relevanceScore: intentResult.ambiguityScore,
        collectedAt: new Date().toISOString(),
        confidence: "medium",
      });
    }

    if (sentiment.escalationRisk > 0.5) {
      evidence.push({
        id: generateId(),
        type: "knowledge",
        title: "Sentiment Risk Alert",
        description: `Escalation risk: ${(sentiment.escalationRisk * 100).toFixed(0)}% | Urgency: ${sentiment.urgencyLevel}`,
        source: "Sentiment Analyzer v1",
        relevanceScore: sentiment.escalationRisk,
        collectedAt: new Date().toISOString(),
        confidence: "high",
      });
    }

    return evidence;
  }

  private generateDraftAI(
    issueId: string,
    category: IssueCategory,
    intentResult: IntentClassificationResult,
    sentiment: SentimentResult,
    subject: string
  ): ResponseDraft {
    const base = generateResponseDraft(issueId, category, subject, []);

    let tone: ResponseDraft["tone"] = base.tone;
    if (sentiment.polarity === "negative" && sentiment.intensity > 0.6) {
      tone = "empathetic";
    }

    let content = base.content;

    if (sentiment.polarity === "negative" && sentiment.intensity > 0.6) {
      content = "I completely understand this is frustrating, and I want to help resolve this as quickly as possible. " + content.charAt(0).toLowerCase() + content.slice(1);
    }

    if (intentResult.secondaryIntents.length > 0 && intentResult.secondaryIntents[0].confidence > 0.4) {
      content += `\n\n[Note: This may also relate to ${intentResult.secondaryIntents[0].intent}.]`;
    }

    return { ...base, tone, content };
  }

  private extractTags(intentResult: IntentClassificationResult): string[] {
    const tags: string[] = [intentResult.primaryIntent.intent];
    for (const match of intentResult.secondaryIntents) {
      if (match.confidence > 0.4) tags.push(match.intent);
    }
    return tags;
  }

  private suggestPriorityAdjustment(
    currentPriority: IssuePriority,
    sentiment: SentimentResult
  ): { adjustedPriority: IssuePriority; reason: string; confidence: number } | undefined {
    if (sentiment.urgencyLevel === "critical" && currentPriority !== "critical") {
      return {
        adjustedPriority: "critical",
        reason: "AI detected critical urgency from sentiment",
        confidence: sentiment.intensity,
      };
    }
    if (sentiment.urgencyLevel === "high" && (currentPriority === "medium" || currentPriority === "low")) {
      return {
        adjustedPriority: "high",
        reason: "AI upgraded priority based on negative sentiment intensity",
        confidence: sentiment.intensity,
      };
    }
    return undefined;
  }

  /**
   * Get a triage result by issue ID
   */
  getTriageResult(issueId: string): TriageResult | undefined {
    return this.state.triageResults[issueId];
  }

  /**
   * Get all triage results
   */
  getAllTriageResults(): TriageResult[] {
    return Object.values(this.state.triageResults);
  }

  /**
   * Get triage results by category
   */
  getTriageResultsByCategory(category: IssueCategory): TriageResult[] {
    return Object.values(this.state.triageResults).filter(
      (result) => result.category === category
    );
  }

  /**
   * Get triage results by priority
   */
  getTriageResultsByPriority(priority: IssuePriority): TriageResult[] {
    return Object.values(this.state.triageResults).filter(
      (result) => result.priority === priority
    );
  }

  /**
   * Get issues requiring escalation at a given level
   */
  getIssuesForEscalation(minLevel: EscalationLevel): TriageResult[] {
    return Object.values(this.state.triageResults).filter(
      (result) => result.escalationLevel >= minLevel
    );
  }

  /**
   * Create an escalation record
   * VAL-DEPT-CS-001
   */
  createEscalation(params: CreateEscalationParams): EscalationRecord | undefined {
    const triageResult = this.state.triageResults[params.issueId];
    if (!triageResult) return undefined;

    const now = new Date().toISOString();
    const record: EscalationRecord = {
      id: generateId(),
      issueId: params.issueId,
      fromLevel: triageResult.escalationLevel,
      toLevel: Math.min(triageResult.escalationLevel + 1, 3) as EscalationLevel,
      reason: params.reason,
      routedToRoleKey: params.routedToRoleKey ?? triageResult.routingRecommendation.specialistRoleKey,
      routedToTeam: params.routedToTeam ?? triageResult.routingRecommendation.team,
      status: "pending",
      createdAt: now,
      notes: [],
    };

    this.state.escalationRecords[params.issueId] = record;

    // Update the triage result with the new escalation level
    triageResult.escalationLevel = record.toLevel;

    this.state.lastUpdated = now;
    return record;
  }

  /**
   * Get an escalation record by issue ID
   */
  getEscalationRecord(issueId: string): EscalationRecord | undefined {
    return this.state.escalationRecords[issueId];
  }

  /**
   * Get all escalation records
   */
  getAllEscalationRecords(): EscalationRecord[] {
    return Object.values(this.state.escalationRecords);
  }

  /**
   * Get pending escalations
   */
  getPendingEscalations(): EscalationRecord[] {
    return Object.values(this.state.escalationRecords).filter(
      (record) => record.status === "pending"
    );
  }

  /**
   * Resolve an escalation
   * VAL-DEPT-CS-001
   */
  resolveEscalation(params: ResolveEscalationParams): EscalationRecord | undefined {
    const record = Object.values(this.state.escalationRecords).find(
      (r) => r.id === params.escalationId
    );
    if (!record) return undefined;

    const now = new Date().toISOString();
    record.status = params.status;
    record.resolvedAt = now;
    record.notes.push(params.resolution);

    this.state.lastUpdated = now;
    return record;
  }

  /**
   * Add note to an escalation record
   */
  addEscalationNote(escalationId: string, note: string): EscalationRecord | undefined {
    const record = Object.values(this.state.escalationRecords).find(
      (r) => r.id === escalationId
    );
    if (!record) return undefined;

    record.notes.push(note);
    this.state.lastUpdated = new Date().toISOString();
    return record;
  }

  /**
   * Get current state for persistence
   */
  getState(): TriageState {
    return this.state;
  }

  /**
   * Load state from persistence
   */
  loadState(state: TriageState): void {
    this.state = state;
  }

  /**
   * Generate a triage summary report
   */
  generateTriageSummary(): {
    totalTriaged: number;
    byCategory: Record<IssueCategory, number>;
    byPriority: Record<IssuePriority, number>;
    pendingEscalations: number;
    averageConfidence: number;
  } {
    const results = Object.values(this.state.triageResults);

    const byCategory: Record<IssueCategory, number> = {
      bug: 0,
      billing: 0,
      account: 0,
      "feature-request": 0,
      "how-to": 0,
      complaint: 0,
      refund: 0,
      technical: 0,
      other: 0,
    };

    const byPriority: Record<IssuePriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let confidenceSum = 0;
    for (const result of results) {
      byCategory[result.category]++;
      byPriority[result.priority]++;
      confidenceSum += result.confidence === "high" ? 1 : result.confidence === "medium" ? 0.6 : 0.3;
    }

    return {
      totalTriaged: results.length,
      byCategory,
      byPriority,
      pendingEscalations: this.getPendingEscalations().length,
      averageConfidence: results.length > 0 ? confidenceSum / results.length : 0,
    };
  }
}
