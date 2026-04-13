/**
 * UOS Customer Service — Core Type System
 * Foundational types for the Maximally Autonomous Customer Service Brain
 */
export type Channel = 'email' | 'chat' | 'whatsapp' | 'phone' | 'zendesk' | 'intercom';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type EscalationLevel = 0 | 1 | 2 | 3;
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export interface EvidenceItem {
    source: 'policy' | 'product' | 'kb' | 'previous-cases';
    content: string;
    relevance: number;
    url?: string;
}
export interface TriageResult {
    category: string;
    confidence: number;
    sentiment: Sentiment;
    sentimentIntensity: number;
    escalationLevel: EscalationLevel;
    urgencyLevel: UrgencyLevel;
    routingHint: string;
    evidence: EvidenceItem[];
    responseDraft: string;
    intent: string;
    multiIntent?: string[];
    ambiguityDetected: boolean;
}
export type ChurnRisk = 'critical' | 'high' | 'medium' | 'low';
export type SentimentTrajectory = 'improving' | 'stable' | 'declining';
export type SLATier = 'standard' | 'priority' | 'enterprise';
export interface CustomerProfile {
    customerId: string;
    channels: Channel[];
    lifetimeValue: number;
    churnRisk: ChurnRisk;
    sentimentTrajectory: SentimentTrajectory;
    lastContactAt: string;
    totalTickets: number;
    openTickets: number;
    avgResolutionTime: string;
    planTier: string;
    accountTenureDays: number;
    keyPatterns: string[];
    recentEscalations: number;
    preferredLanguage: string;
    slaTier: SLATier;
}
export interface SLAPolicy {
    firstResponse?: number;
    resolution?: number;
    nextBreachAt?: number;
}
export type SLABreachRisk = 'none' | 'warning' | 'critical';
export interface SLAStatus {
    ticketId: string;
    slaTier: SLATier;
    deadline: string;
    percentUsed: number;
    breachRisk: SLABreachRisk;
    timeRemaining: string;
    policy: SLAPolicy;
}
export type AutonomousAction = {
    type: 'send_response_draft';
    ticketId: string;
    draft: string;
} | {
    type: 'update_ticket_status';
    ticketId: string;
    status: 'open' | 'pending' | 'solved' | 'closed';
} | {
    type: 'add_internal_note';
    ticketId: string;
    note: string;
} | {
    type: 'create_kb_article';
    ticketId: string;
    title: string;
    content: string;
} | {
    type: 'route_to_team';
    ticketId: string;
    team: string;
    reason: string;
} | {
    type: 'issue_credit';
    ticketId: string;
    customerId: string;
    amount: number;
    reason: string;
} | {
    type: 'issue_refund';
    ticketId: string;
    customerId: string;
    amount: number;
    reason: string;
};
export interface PolicyDecision {
    allowed: boolean;
    reason: string;
    requiresHumanApproval: boolean;
    maxAmount?: number;
    overrideCategories?: string[];
}
export interface AutonomousPolicy {
    maxAutonomousRefund: number;
    maxAutonomousCredit: number;
    highValueAccountMultiplier: number;
    alwaysRequireHuman: string[];
    autonomousCategories: string[];
    maxAutonomousCloseConfidence: number;
    autoEscalateOnChurnRisk: 'critical' | 'high' | 'medium';
}
export interface KBArticle {
    id: string;
    title: string;
    content: string;
    category: string;
    confidence: number;
    sources: string[];
    lastUpdated: string;
}
export interface KnowledgeGap {
    ticketId: string;
    resolutionSummary: string;
    existingArticleIds: string[];
    gapDescription: string;
    suggestedTitle: string;
    suggestedContent: string;
    confidence: number;
    autoPublish: boolean;
}
export type ChurnRiskScore = 'critical' | 'high' | 'medium' | 'low';
export interface ChurnRiskResult {
    customerId: string;
    score: ChurnRiskScore;
    factors: string[];
    recommendedActions: string[];
    retentionPlaybook: string;
}
export interface EscalationPrediction {
    ticketId: string;
    probability: number;
    signals: string[];
    recommendedAction: string;
    priorityUpgrade?: boolean;
}
export type RefundCategory = 'billing' | 'refund' | 'credit';
export type ApprovalSource = 'system' | 'human';
export interface RefundRequest {
    ticketId: string;
    customerId: string;
    amount: number;
    reason: string;
    category: RefundCategory;
    approved: boolean;
    approvedBy?: ApprovalSource;
    stripeRefundId?: string;
}
export interface RefundLedgerEntry {
    id: string;
    ticketId: string;
    customerId: string;
    amount: number;
    category: RefundCategory;
    status: 'pending' | 'approved' | 'rejected' | 'executed';
    approvedBy: ApprovalSource;
    stripeRefundId?: string;
    timestamp: string;
    auditNote?: string;
}
export interface QARubric {
    id: string;
    name: string;
    criteria: QACriterion[];
}
export interface QACriterion {
    name: string;
    description: string;
    weight: number;
    keywords: string[];
}
export interface QAEvaluation {
    ticketId: string;
    agentId: string;
    scores: Record<string, number>;
    overallScore: number;
    reasoning: string;
    timestamp: string;
}
export interface AgentPerformance {
    agentId: string;
    period: string;
    avgQAScore: number;
    criteriaScores: Record<string, number>;
    escalationRate: number;
    ticketsResolved: number;
    avgResolutionTime: string;
    strongestCriteria: string[];
    weakestCriteria: string[];
    coachingTips: string[];
}
export type FixType = 'code' | 'config' | 'policy' | 'kb';
export interface RootCauseReport {
    patternId: string;
    surfaceIssue: string;
    suspectedRootCause: string;
    confidence: number;
    recommendedInvestigation: string[];
    expectedFixType: FixType;
    causalChain: string[];
}
export interface TaskFlowContext {
    ticketId: string;
    customerId: string;
    category: string;
    triageResult: TriageResult;
    customerProfile: CustomerProfile;
    [key: string]: unknown;
}
export interface TaskFlowStepResult {
    stepId: string;
    success: boolean;
    output?: unknown;
    error?: string;
}
export interface TaskFlow {
    flowId: string;
    name: string;
    category: string;
    steps: TaskFlowStepDefinition[];
    maxRetries: number;
    rollbackOnFailure: boolean;
}
export interface TaskFlowStepDefinition {
    stepId: string;
    name: string;
    description: string;
    execute: (ctx: TaskFlowContext) => Promise<TaskFlowStepResult>;
    rollback?: (ctx: TaskFlowContext) => Promise<void>;
}
export interface ChannelMessage {
    channel: Channel;
    messageId: string;
    timestamp: string;
    content: string;
    direction: 'inbound' | 'outbound';
}
export interface UnifiedIssueContext {
    triageResult: TriageResult;
    customerProfile: CustomerProfile;
    allChannelHistory: ChannelMessage[];
}
export interface CrossChannelSession {
    sessionId: string;
    customerId: string;
    channels: Channel[];
    messages: ChannelMessage[];
    unifiedContext: UnifiedIssueContext;
    channelPreference: Channel;
}
export interface HandoffPackage {
    ticketId: string;
    triageResult: TriageResult;
    customerProfile: CustomerProfile;
    suggestedSpecialistRole: string;
    suggestedSpecialistRoleReason: string;
    draftedResponse: string;
    similarCasesResolved: string[];
    recommendedResolutionPath: string[];
    sentimentSummary: string;
    fullEvidence: EvidenceItem[];
}
export type FeedbackEventType = 'ticket.resolved' | 'ticket.escalated' | 'ticket.reopened' | 'customer.sentiment_declined' | 'sla.breach_risk' | 'pattern.detected' | 'kb.gap_found' | 'churn_risk_changed' | 'autonomous_action_taken' | 'human_override';
export interface FeedbackEvent {
    type: FeedbackEventType;
    timestamp: string;
    payload: Record<string, unknown>;
    source: string;
}
export type PatternAction = 'bug-fix' | 'knowledge-update' | 'process-improvement';
export interface RecurringPattern {
    patternId: string;
    description: string;
    frequency: number;
    affectedCustomers: number;
    impactScore: number;
    relatedCategory: string;
    upstreamAction?: PatternAction;
    lastDetectedAt: string;
}
export type ConnectorName = 'zendesk' | 'intercom' | 'gmail' | 'shopify' | 'stripe' | 'whatsapp' | 'google_drive' | 'slack' | 'hubspot' | 'paperclip';
export interface ConnectorHealth {
    name: ConnectorName;
    status: 'healthy' | 'degraded' | 'down';
    lastCheckedAt: string;
    latencyMs?: number;
    errorMessage?: string;
}
export type TicketId = string;
export type CustomerId = string;
export type AgentId = string;
export type KBArticleId = string;
export type SessionId = string;
export type PatternId = string;
//# sourceMappingURL=types.d.ts.map