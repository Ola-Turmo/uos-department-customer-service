import { z } from 'zod';

// ============== Core Enums ==============

export const SentimentSchema = z.enum(['positive', 'negative', 'neutral', 'mixed']);
export type Sentiment = z.infer<typeof SentimentSchema>;

export const EscalationLevelSchema = z.enum(['none', 'low', 'medium', 'high', 'critical']);
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;

export const IntentCategorySchema = z.enum([
  // Billing & Payments
  'billing_inquiry',
  'payment_issue',
  'refund_request',
  'subscription_change',
  'invoice_request',
  // Technical Support
  'technical_issue',
  'account_access',
  'connectivity_problem',
  'feature_not_working',
  'data_export',
  // Product Information
  'product_inquiry',
  'pricing_info',
  'comparison_request',
  'demo_request',
  'trial_extension',
  // Account Management
  'account_creation',
  'account_deletion',
  'profile_update',
  'password_reset',
  'two_factor_auth',
  // Shipping & Delivery
  'shipping_inquiry',
  'delivery_delay',
  'lost_package',
  'address_change',
  'return_request',
  // Complaints
  'complaint_general',
  'complaint_quality',
  'complaint_service',
  'complaint_shipping',
  'complaint_billing',
  // Feedback
  'feedback_positive',
  'feedback_negative',
  'feature_request',
  'bug_report',
  // General
  'general_inquiry',
  'contact_request',
  'partnership_inquiry',
  'press_inquiry',
  'other'
]);
export type IntentCategory = z.infer<typeof IntentCategorySchema>;

// ============== Intent Schema ==============

export const ConfidenceScoreSchema = z.object({
  score: z.number().min(0).max(1),
  isAmbiguous: z.boolean(),
  alternatives: z.array(z.object({
    category: IntentCategorySchema,
    score: z.number().min(0).max(1),
  })).optional(),
});

export const IntentSchema = z.object({
  id: z.string(),
  category: IntentCategorySchema,
  confidence: ConfidenceScoreSchema,
  sentiment: SentimentSchema,
  multiIntent: z.boolean().optional(),
  subIntents: z.array(z.string()).optional(),
  extractedEntities: z.record(z.unknown()).optional(),
  rawText: z.string(),
  timestamp: z.string().datetime(),
});

export type Intent = z.infer<typeof IntentSchema>;
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

// ============== Ticket Schema ==============

export const TicketStatusSchema = z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated']);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const TicketChannelSchema = z.enum(['email', 'chat', 'phone', 'social', 'web', 'mobile', 'api']);
export type TicketChannel = z.infer<typeof TicketChannelSchema>;

export const TicketSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  subject: z.string(),
  description: z.string(),
  channel: TicketChannelSchema,
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  intent: IntentSchema.optional(),
  sentiment: SentimentSchema.optional(),
  escalationLevel: EscalationLevelSchema,
  assignedAgentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  slaDeadline: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Ticket = z.infer<typeof TicketSchema>;

// ============== Customer Schema ==============

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  tier: z.enum(['free', 'basic', 'premium', 'enterprise']),
  totalTickets: z.number().int().nonnegative(),
  resolvedTickets: z.number().int().nonnegative(),
  openTickets: z.number().int().nonnegative(),
  satisfactionScore: z.number().min(0).max(5).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  lastContactAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// ============== Agent Schema ==============

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  team: z.string().optional(),
  role: z.enum(['agent', 'senior_agent', 'team_lead', 'manager']),
  status: z.enum(['available', 'busy', 'away', 'offline']),
  currentTickets: z.array(z.string()),
  maxConcurrentTickets: z.number().int().positive(),
  specialties: z.array(IntentCategorySchema).optional(),
  performanceScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

// ============== Workflow Schema ==============

export const WorkflowConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
  value: z.unknown(),
});

export const WorkflowActionSchema = z.object({
  type: z.enum(['assign_agent', 'notify', 'escalate', 'tag', 'priority_change', 'status_change', 'sla_adjust', 'webhook']),
  params: z.record(z.unknown()),
});

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'condition', 'action', 'router', 'sla']),
  name: z.string(),
  config: z.record(z.unknown()),
  conditions: z.array(WorkflowConditionSchema).optional(),
  actions: z.array(WorkflowActionSchema).optional(),
  nextNodeId: z.string().optional(),
  branchNodeIds: z.array(z.string()).optional(),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  isActive: z.boolean(),
  triggerType: z.enum(['ticket_created', 'ticket_updated', 'sentiment_change', 'sla_breach', 'manual']),
  nodes: z.array(WorkflowNodeSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;
export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;

// ============== Knowledge Graph Schema ==============

export const KnowledgeNodeTypeSchema = z.enum(['issue', 'resolution', 'customer', 'product', 'document', 'faq']);
export type KnowledgeNodeType = z.infer<typeof KnowledgeNodeTypeSchema>;

export const KnowledgeEdgeSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  relationship: z.enum(['related_to', 'causes', 'resolves', 'part_of', 'similar_to', 'depends_on']),
  weight: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const KnowledgeNodeSchema = z.object({
  id: z.string(),
  type: KnowledgeNodeTypeSchema,
  title: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: z.record(z.unknown()).optional(),
  issueCategory: IntentCategorySchema.optional(),
  resolutionCount: z.number().int().nonnegative().optional(),
  successRate: z.number().min(0).max(1).optional(),
  lastUpdated: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export const KnowledgeGraphSchema = z.object({
  nodes: z.array(KnowledgeNodeSchema),
  edges: z.array(KnowledgeEdgeSchema),
  stats: z.object({
    totalNodes: z.number().int().nonnegative(),
    totalEdges: z.number().int().nonnegative(),
    issueCount: z.number().int().nonnegative(),
    resolutionCount: z.number().int().nonnegative(),
  }),
});

export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;
export type KnowledgeEdge = z.infer<typeof KnowledgeEdgeSchema>;

// ============== QA Schema ==============

export const QACategorySchema = z.enum([
  'response_quality',
  'empathy',
  'accuracy',
  'completeness',
  'professionalism',
  'timeliness',
  'resolution_effectiveness',
  'customer_satisfaction',
]);

export const QAEvaluationSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  agentId: z.string(),
  evaluatorType: z.enum(['llm', 'human', 'hybrid']),
  scores: z.record(z.number().min(0).max(100)),
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  coachingSuggestions: z.array(z.string()),
  explanation: z.string(),
  timestamp: z.string().datetime(),
  confirmedByHuman: z.boolean().optional(),
});

export type QAEvaluation = z.infer<typeof QAEvaluationSchema>;

export const AgentPerformanceSchema = z.object({
  agentId: z.string(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  averageScore: z.number().min(0).max(100),
  ticketCount: z.number().int().nonnegative(),
  resolvedCount: z.number().int().nonnegative(),
  escalatedCount: z.number().int().nonnegative(),
  customerSatisfactionAvg: z.number().min(0).max(5).optional(),
  trend: z.enum(['improving', 'stable', 'declining']).optional(),
});

export type AgentPerformance = z.infer<typeof AgentPerformanceSchema>;

// ============== Escalation Schema ==============

export const EscalationPredictionSchema = z.object({
  ticketId: z.string(),
  predictedLevel: EscalationLevelSchema,
  confidence: z.number().min(0).max(1),
  riskFactors: z.array(z.object({
    factor: z.string(),
    weight: z.number().min(0).max(1),
    description: z.string(),
  })),
  recommendedActions: z.array(z.string()),
  shouldEscalate: z.boolean(),
  timestamp: z.string().datetime(),
});

export type EscalationPrediction = z.infer<typeof EscalationPredictionSchema>;

export const DeEscalationActionSchema = z.object({
  id: z.string(),
  type: z.enum(['apologize', 'compensate', 'priority_boost', 'agent_escalation', 'satisfaction_guarantee']),
  message: z.string(),
  parameters: z.record(z.unknown()).optional(),
  successProbability: z.number().min(0).max(1),
});

export type DeEscalationAction = z.infer<typeof DeEscalationActionSchema>;

// ============== SLA Schema ==============

export const SLAPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  priority: TicketPrioritySchema,
  responseTimeMinutes: z.number().int().nonnegative(),
  resolutionTimeMinutes: z.number().int().nonnegative(),
  businessHoursOnly: z.boolean(),
  escalationThresholds: z.array(z.object({
    percentage: z.number().min(0).max(100),
    escalateTo: z.string(),
  })),
});

export type SLAPolicy = z.infer<typeof SLAPolicySchema>;

// ============== Dashboard Schema ==============

export const ChannelSwitchEventSchema = z.object({
  customerId: z.string(),
  fromChannel: TicketChannelSchema,
  toChannel: TicketChannelSchema,
  ticketId: z.string(),
  timestamp: z.string().datetime(),
});

export type ChannelSwitchEvent = z.infer<typeof ChannelSwitchEventSchema>;

export const JourneyEventSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  ticketId: z.string(),
  eventType: z.enum(['created', 'assigned', 'status_changed', 'intent_detected', 'escalated', 'resolved', 'channel_switch']),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type JourneyEvent = z.infer<typeof JourneyEventSchema>;

export const DashboardMetricsSchema = z.object({
  totalTickets: z.number().int().nonnegative(),
  openTickets: z.number().int().nonnegative(),
  avgResponseTimeMinutes: z.number().min(0),
  avgResolutionTimeMinutes: z.number().min(0),
  slaComplianceRate: z.number().min(0).max(1),
  customerSatisfactionAvg: z.number().min(0).max(5),
  escalationRate: z.number().min(0).max(1),
  firstContactResolutionRate: z.number().min(0).max(1),
  channelDistribution: z.record(z.number().int().nonnegative()),
  sentimentDistribution: z.record(z.number().int().nonnegative()),
  timestamp: z.string().datetime(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

// ============== Service Exports ==============

export interface TriageResult {
  intent: Intent;
  routingRecommendation: {
    targetTeam: string;
    priority: TicketPriority;
    urgency: 'low' | 'normal' | 'high' | 'critical';
  };
}

export interface SimilarIssueResult {
  knowledgeNode: KnowledgeNode;
  similarityScore: number;
  matchedFields: string[];
}

export interface SuggestionResult {
  suggestion: string;
  confidence: number;
  sourceNodeId: string;
  reasoning: string;
}
