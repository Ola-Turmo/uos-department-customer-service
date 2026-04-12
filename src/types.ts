/**
 * Customer Service Department Types
 * VAL-DEPT-CS-001: Incoming issues are triaged, evidenced, and routed correctly
 * VAL-DEPT-CS-002: Recurring support patterns create upstream product or knowledge actions
 */

// ============================================
// Issue Triage Types
// ============================================

export type IssueCategory =
  | "bug"
  | "billing"
  | "account"
  | "feature-request"
  | "how-to"
  | "complaint"
  | "refund"
  | "technical"
  | "other";

export type IssuePriority = "critical" | "high" | "medium" | "low";

export type IssueStatus = "open" | "in-progress" | "pending-customer" | "resolved" | "closed";

export type EscalationLevel = 0 | 1 | 2 | 3; // 0 = no escalation, 3 = most severe

export interface TriageEvidence {
  id: string;
  type: "policy" | "product" | "billing" | "account" | "knowledge" | "previous-case";
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  relevanceScore: number; // 0-1
  collectedAt: string;
  confidence: "high" | "medium" | "low";
}

export interface TriageResult {
  issueId: string;
  category: IssueCategory;
  priority: IssuePriority;
  confidence: "high" | "medium" | "low";
  routingRecommendation: {
    team: string;
    specialistRoleKey?: string;
    channel?: string;
  };
  escalationLevel: EscalationLevel;
  escalationRationale?: string;
  evidence: TriageEvidence[];
  suggestedResponseDraft?: ResponseDraft;
  tags: string[];
  processedAt: string;
}

export interface ResponseDraft {
  id: string;
  tone: "empathetic" | "informative" | "apologetic" | "neutral";
  content: string;
  citations: {
    evidenceId: string;
    quote: string;
  }[];
  confidence: "high" | "medium" | "low";
  policyCompliant: boolean;
  createdAt: string;
}

// ============================================
// Escalation Types
// ============================================

export interface EscalationRecord {
  id: string;
  issueId: string;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  reason: string;
  routedToRoleKey?: string;
  routedToTeam?: string;
  status: "pending" | "accepted" | "resolved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  notes: string[];
}

// ============================================
// Recurring Pattern Types
// ============================================

export interface IssuePattern {
  id: string;
  patternKey: string; // e.g., "billing-stripe-failure", "login-google-403"
  title: string;
  description: string;
  category: IssueCategory;
  frequency: number; // occurrences in detection window
  affectedCustomers: number;
  impactScore: number; // 0-100 based on frequency and affected customers
  firstSeenAt: string;
  lastSeenAt: string;
  linkedIssueIds: string[];
  tags: string[];
  status: "detected" | "investigating" | "action-created" | "resolved" | "ignored";
}

export interface UpstreamAction {
  id: string;
  title: string;
  description: string;

  // Classification
  kind: "product-fix" | "bug-fix" | "knowledge-update" | "process-improvement" | "feature-request";

  // Linkage to pattern
  sourcePatternId: string;
  sourceIssueIds: string[];

  // Status tracking
  status: "proposed" | "approved" | "in-progress" | "completed" | "rejected";
  ownerRoleKey?: string;
  ownerTeam?: string;

  // Priority based on impact
  priority: IssuePriority;
  impactScore: number; // 0-100 based on frequency and affected customers

  // Timeline
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  completedAt?: string;

  // Evidence
  evidenceIds: string[];

  // External tracking
  externalRef?: string; // e.g., Jira ticket, GitHub issue
  externalUrl?: string;

  // Notes
  notes: string[];
}

export interface PatternDetectionResult {
  pattern: IssuePattern;
  detectedAt: string;
  confidence: "high" | "medium" | "low";
  similarIssuesFound: number;
  suggestedActionKind: UpstreamAction["kind"];
}

// ============================================
// Service State Types
// ============================================

export interface TriageState {
  triageResults: Record<string, TriageResult>; // issueId -> result
  escalationRecords: Record<string, EscalationRecord>; // issueId -> record
  lastUpdated: string;
}

export interface RecurringPatternState {
  patterns: Record<string, IssuePattern>; // patternId -> pattern
  upstreamActions: Record<string, UpstreamAction>; // actionId -> action
  issueIndex: Record<string, string[]>; // issueKey -> patternIds (for reverse lookup)
  lastUpdated: string;
}

// ============================================
// Action Parameters
// ============================================

export interface TriageIssueParams {
  issueId: string;
  subject: string;
  description: string;
  customerId?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEscalationParams {
  issueId: string;
  reason: string;
  routedToRoleKey?: string;
  routedToTeam?: string;
}

export interface ResolveEscalationParams {
  escalationId: string;
  resolution: string;
  status: "resolved" | "rejected";
}

export interface DetectPatternsParams {
  lookbackDays?: number;
  minFrequency?: number;
  category?: IssueCategory;
}

export interface CreateUpstreamActionParams {
  patternId: string;
  title: string;
  description: string;
  kind: UpstreamAction["kind"];
  priority?: UpstreamAction["priority"];
  ownerRoleKey?: string;
  ownerTeam?: string;
  dueDate?: string;
  externalRef?: string;
  externalUrl?: string;
}

export interface LinkPatternToIssueParams {
  patternId: string;
  issueId: string;
}

export interface UpdatePatternStatusParams {
  patternId: string;
  status: IssuePattern["status"];
  notes?: string[];
}

export interface UpdateUpstreamActionStatusParams {
  actionId: string;
  status: UpstreamAction["status"];
  notes?: string[];
  externalRef?: string;
  externalUrl?: string;
}

export interface GetPatternsByIssueParams {
  issueId: string;
}

export interface GetActionsByPatternParams {
  patternId: string;
}

export interface GetRecurringIssuesReportParams {
  lookbackDays?: number;
  category?: IssueCategory;
  status?: IssuePattern["status"];
}

// ============================================
// Connector Health Types (XAF-007)
// ============================================

export type ConnectorHealthStatus = "ok" | "degraded" | "error" | "unknown";

export interface ConnectorHealthState {
  toolkitId: string;
  status: ConnectorHealthStatus;
  lastChecked: string;
  error?: string;
  limitationMessage?: string;
}

export interface ToolkitLimitation {
  toolkitId: string;
  displayName: string;
  limitationMessage: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedWorkflows: string[];
  suggestedAction: string;
}

export interface ConnectorHealthSummary {
  overallStatus: ConnectorHealthStatus;
  checkedAt: string;
  connectors: ConnectorHealthState[];
  limitations: ToolkitLimitation[];
  hasLimitations: boolean;
}

export interface SetConnectorHealthParams {
  toolkitId: string;
  status: ConnectorHealthStatus;
  error?: string;
}

export interface GetConnectorHealthParams {
  toolkitId?: string;
}

// ============================================
// QA Review Types (VAL-DEPT-CS-003)
// ============================================

export interface QAEvaluationParams {
  agentResponseId: string;
  agentResponse: string;
  expectedCriteria?: string[];
  context?: string;
  agentId?: string;
}

export interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  passed: boolean;
  details: string;
}

export interface QAEvaluationResult {
  id: string;
  agentResponseId: string;
  overallScore: number;
  passed: boolean;
  rubricScores: RubricScore[];
  feedback: string;
  evaluatedAt: string;
}

export type QARubric = Record<string, number>; // criterion -> weight (0-100, should sum to 100)

export interface QASummary {
  totalEvaluated: number;
  passCount: number;
  failCount: number;
  passRate: number; // 0-1
  averageScore: number;
  byCriterion: Record<string, number>;
}

// ============================================
// AI Intent Classification Types
// ============================================

export type IntentCategory =
  | "billing" | "refund" | "payment" | "subscription" | "cancellation"
  | "bug" | "technical" | "api" | "integration" | "webhook" | "crash" | "performance"
  | "account" | "account-recovery" | "authentication" | "access-control" | "permissions"
  | "complaint" | "dissatisfaction" | "frustration" | "escalation-request"
  | "feature-request" | "suggestion" | "improvement"
  | "how-to" | "documentation" | "guide" | "tutorial" | "faq"
  | "shipping" | "delivery" | "tracking" | "delay"
  | "returns" | "exchange" | "warranty"
  | "data-privacy" | "gdpr" | "data-deletion" | "consent"
  | "accessibility" | "disability" | "inclusive"
  | "feedback" | "praise" | "testimonial"
  | "partnership" | "business-inquiry" | "enterprise"
  | "security" | "breach" | "vulnerability"
  | "other";

export interface IntentMatch {
  intent: IntentCategory;
  confidence: number; // 0-1
  reasoning?: string;
}

export interface IntentClassificationResult {
  primaryIntent: IntentMatch;
  secondaryIntents: IntentMatch[]; // multi-intent detection
  isAmbiguous: boolean; // true when top 2 intents have close confidence
  ambiguityScore: number; // 0-1, how ambiguous
  allMatches: IntentMatch[];
  modelVersion: string;
  classifiedAt: string;
}

// ============================================
// AI Sentiment Analysis Types
// ============================================

export interface SentimentSignal {
  keyword: string;
  polarity: "positive" | "negative" | "neutral";
  intensity: number; // 0-1
}

export interface SentimentResult {
  polarity: "positive" | "negative" | "neutral";
  intensity: number; // 0-1 overall emotional intensity
  signals: SentimentSignal[];
  escalationRisk: number; // 0-1, likelihood to escalate
  urgencyLevel: "low" | "medium" | "high" | "critical";
  summary: string;
  analyzedAt: string;
}

// ============================================
// AI-Enriched Triage Types
// ============================================

export interface AIEnrichedTriageResult extends TriageResult {
  intentClassification: IntentClassificationResult;
  sentiment: SentimentResult;
  multiIssueDetected: boolean;
  suggestedPriorityAdjustment?: {
    adjustedPriority: IssuePriority;
    reason: string;
    confidence: number;
  };
}

// ============================================
// QA Learning Loop Types
// ============================================

export interface QALearningEntry {
  id: string;
  agentResponseId: string;
  issueId: string;
  issueCategory: IssueCategory;
  initialEvaluationId: string;
  confirmedScore: number; // human-confirmed score
  agentId?: string;
  createdAt: string;
  confirmedAt: string;
}

export interface QAAgentScore {
  agentId: string;
  totalEvaluations: number;
  averageScore: number;
  passRate: number;
  lastEvaluatedAt: string;
}

export interface LLMEvaluationResult extends Omit<QAEvaluationResult, "id" | "evaluatedAt"> {
  reasoning: Record<string, string>; // criterion -> reasoning
  model: string;
  modelConfidence: number; // 0-1
  suggestedImprovements: string[];
}

// ============================================
// Escalation Prediction Types
// ============================================

export interface EscalationPrediction {
  issueId: string;
  escalationProbability: number; // 0-1
  riskFactors: {
    factor: string;
    contribution: number; // 0-1, how much this factor adds to risk
    direction: "increases" | "decreases";
  }[];
  predictedLevel: EscalationLevel;
  recommendedActions: {
    action: string;
    rationale: string;
    expectedImpact: number; // 0-1
  }[];
  confidence: number; // 0-1 in the prediction
  modelVersion: string;
  predictedAt: string;
}

export interface DeescalationOffer {
  issueId: string;
  offerType: "compensation" | "apology" | "priority" | "credit" | "refund";
  offerText: string;
  threshold: number; // only show if escalation probability > threshold
  expectedEffectiveness: number; // 0-1
}

export interface SLAOptimization {
  issueId: string;
  category: IssueCategory;
  priority: IssuePriority;
  optimalResponseTime: string; // ISO duration
  optimalResolutionTime: string;
  escalationDeadlines: {
    level: EscalationLevel;
    deadline: string; // ISO datetime
  }[];
  channelRecommendation?: string;
}

// ============================================
// Knowledge Graph Types
// ============================================

export interface KnowledgeNode {
  id: string;
  type: "issue" | "resolution" | "article" | "policy" | "product";
  title: string;
  content: string;
  category?: IssueCategory;
  tags: string[];
  resolution?: string;
  linkedNodeIds: string[];
  createdAt: string;
  updatedAt: string;
  resolveCount: number; // how many times this resolution helped
  satisfactionScore: number; // 0-1 average customer satisfaction
}

export interface SimilarIssueResult {
  sourceIssueId: string;
  similarNodes: {
    node: KnowledgeNode;
    similarityScore: number; // 0-1
    matchedKeywords: string[];
  }[];
  suggestedResolution?: string;
}

export interface KnowledgeGraphQuery {
  query: string;
  category?: IssueCategory;
  limit?: number;
}
