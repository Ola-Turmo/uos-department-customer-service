"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardMetricsSchema = exports.JourneyEventSchema = exports.ChannelSwitchEventSchema = exports.SLAPolicySchema = exports.DeEscalationActionSchema = exports.EscalationPredictionSchema = exports.AgentPerformanceSchema = exports.QAEvaluationSchema = exports.QACategorySchema = exports.KnowledgeGraphSchema = exports.KnowledgeNodeSchema = exports.KnowledgeEdgeSchema = exports.KnowledgeNodeTypeSchema = exports.WorkflowSchema = exports.WorkflowNodeSchema = exports.WorkflowActionSchema = exports.WorkflowConditionSchema = exports.AgentSchema = exports.CustomerSchema = exports.TicketSchema = exports.TicketChannelSchema = exports.TicketPrioritySchema = exports.TicketStatusSchema = exports.IntentSchema = exports.ConfidenceScoreSchema = exports.IntentCategorySchema = exports.EscalationLevelSchema = exports.SentimentSchema = void 0;
const zod_1 = require("zod");
// ============== Core Enums ==============
exports.SentimentSchema = zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']);
exports.EscalationLevelSchema = zod_1.z.enum(['none', 'low', 'medium', 'high', 'critical']);
exports.IntentCategorySchema = zod_1.z.enum([
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
// ============== Intent Schema ==============
exports.ConfidenceScoreSchema = zod_1.z.object({
    score: zod_1.z.number().min(0).max(1),
    isAmbiguous: zod_1.z.boolean(),
    alternatives: zod_1.z.array(zod_1.z.object({
        category: exports.IntentCategorySchema,
        score: zod_1.z.number().min(0).max(1),
    })).optional(),
});
exports.IntentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    category: exports.IntentCategorySchema,
    confidence: exports.ConfidenceScoreSchema,
    sentiment: exports.SentimentSchema,
    multiIntent: zod_1.z.boolean().optional(),
    subIntents: zod_1.z.array(zod_1.z.string()).optional(),
    extractedEntities: zod_1.z.record(zod_1.z.unknown()).optional(),
    rawText: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
});
// ============== Ticket Schema ==============
exports.TicketStatusSchema = zod_1.z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated']);
exports.TicketPrioritySchema = zod_1.z.enum(['low', 'normal', 'high', 'urgent']);
exports.TicketChannelSchema = zod_1.z.enum(['email', 'chat', 'phone', 'social', 'web', 'mobile', 'api']);
exports.TicketSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    subject: zod_1.z.string(),
    description: zod_1.z.string(),
    channel: exports.TicketChannelSchema,
    status: exports.TicketStatusSchema,
    priority: exports.TicketPrioritySchema,
    intent: exports.IntentSchema.optional(),
    sentiment: exports.SentimentSchema.optional(),
    escalationLevel: exports.EscalationLevelSchema,
    assignedAgentId: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    resolvedAt: zod_1.z.string().datetime().optional(),
    slaDeadline: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============== Customer Schema ==============
exports.CustomerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    tier: zod_1.z.enum(['free', 'basic', 'premium', 'enterprise']),
    totalTickets: zod_1.z.number().int().nonnegative(),
    resolvedTickets: zod_1.z.number().int().nonnegative(),
    openTickets: zod_1.z.number().int().nonnegative(),
    satisfactionScore: zod_1.z.number().min(0).max(5).optional(),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    lastContactAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============== Agent Schema ==============
exports.AgentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    team: zod_1.z.string().optional(),
    role: zod_1.z.enum(['agent', 'senior_agent', 'team_lead', 'manager']),
    status: zod_1.z.enum(['available', 'busy', 'away', 'offline']),
    currentTickets: zod_1.z.array(zod_1.z.string()),
    maxConcurrentTickets: zod_1.z.number().int().positive(),
    specialties: zod_1.z.array(exports.IntentCategorySchema).optional(),
    performanceScore: zod_1.z.number().min(0).max(100).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============== Workflow Schema ==============
exports.WorkflowConditionSchema = zod_1.z.object({
    field: zod_1.z.string(),
    operator: zod_1.z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
    value: zod_1.z.unknown(),
});
exports.WorkflowActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['assign_agent', 'notify', 'escalate', 'tag', 'priority_change', 'status_change', 'sla_adjust', 'webhook']),
    params: zod_1.z.record(zod_1.z.unknown()),
});
exports.WorkflowNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['trigger', 'condition', 'action', 'router', 'sla']),
    name: zod_1.z.string(),
    config: zod_1.z.record(zod_1.z.unknown()),
    conditions: zod_1.z.array(exports.WorkflowConditionSchema).optional(),
    actions: zod_1.z.array(exports.WorkflowActionSchema).optional(),
    nextNodeId: zod_1.z.string().optional(),
    branchNodeIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.WorkflowSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string(),
    isActive: zod_1.z.boolean(),
    triggerType: zod_1.z.enum(['ticket_created', 'ticket_updated', 'sentiment_change', 'sla_breach', 'manual']),
    nodes: zod_1.z.array(exports.WorkflowNodeSchema),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string(),
});
// ============== Knowledge Graph Schema ==============
exports.KnowledgeNodeTypeSchema = zod_1.z.enum(['issue', 'resolution', 'customer', 'product', 'document', 'faq']);
exports.KnowledgeEdgeSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    relationship: zod_1.z.enum(['related_to', 'causes', 'resolves', 'part_of', 'similar_to', 'depends_on']),
    weight: zod_1.z.number().min(0).max(1).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.KnowledgeNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.KnowledgeNodeTypeSchema,
    title: zod_1.z.string(),
    content: zod_1.z.string(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    issueCategory: exports.IntentCategorySchema.optional(),
    resolutionCount: zod_1.z.number().int().nonnegative().optional(),
    successRate: zod_1.z.number().min(0).max(1).optional(),
    lastUpdated: zod_1.z.string().datetime(),
    createdAt: zod_1.z.string().datetime(),
});
exports.KnowledgeGraphSchema = zod_1.z.object({
    nodes: zod_1.z.array(exports.KnowledgeNodeSchema),
    edges: zod_1.z.array(exports.KnowledgeEdgeSchema),
    stats: zod_1.z.object({
        totalNodes: zod_1.z.number().int().nonnegative(),
        totalEdges: zod_1.z.number().int().nonnegative(),
        issueCount: zod_1.z.number().int().nonnegative(),
        resolutionCount: zod_1.z.number().int().nonnegative(),
    }),
});
// ============== QA Schema ==============
exports.QACategorySchema = zod_1.z.enum([
    'response_quality',
    'empathy',
    'accuracy',
    'completeness',
    'professionalism',
    'timeliness',
    'resolution_effectiveness',
    'customer_satisfaction',
]);
exports.QAEvaluationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    ticketId: zod_1.z.string(),
    agentId: zod_1.z.string(),
    evaluatorType: zod_1.z.enum(['llm', 'human', 'hybrid']),
    scores: zod_1.z.record(zod_1.z.number().min(0).max(100)),
    overallScore: zod_1.z.number().min(0).max(100),
    strengths: zod_1.z.array(zod_1.z.string()),
    weaknesses: zod_1.z.array(zod_1.z.string()),
    coachingSuggestions: zod_1.z.array(zod_1.z.string()),
    explanation: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    confirmedByHuman: zod_1.z.boolean().optional(),
});
exports.AgentPerformanceSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    period: zod_1.z.enum(['daily', 'weekly', 'monthly']),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    averageScore: zod_1.z.number().min(0).max(100),
    ticketCount: zod_1.z.number().int().nonnegative(),
    resolvedCount: zod_1.z.number().int().nonnegative(),
    escalatedCount: zod_1.z.number().int().nonnegative(),
    customerSatisfactionAvg: zod_1.z.number().min(0).max(5).optional(),
    trend: zod_1.z.enum(['improving', 'stable', 'declining']).optional(),
});
// ============== Escalation Schema ==============
exports.EscalationPredictionSchema = zod_1.z.object({
    ticketId: zod_1.z.string(),
    predictedLevel: exports.EscalationLevelSchema,
    confidence: zod_1.z.number().min(0).max(1),
    riskFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        weight: zod_1.z.number().min(0).max(1),
        description: zod_1.z.string(),
    })),
    recommendedActions: zod_1.z.array(zod_1.z.string()),
    shouldEscalate: zod_1.z.boolean(),
    timestamp: zod_1.z.string().datetime(),
});
exports.DeEscalationActionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['apologize', 'compensate', 'priority_boost', 'agent_escalation', 'satisfaction_guarantee']),
    message: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.unknown()).optional(),
    successProbability: zod_1.z.number().min(0).max(1),
});
// ============== SLA Schema ==============
exports.SLAPolicySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    priority: exports.TicketPrioritySchema,
    responseTimeMinutes: zod_1.z.number().int().nonnegative(),
    resolutionTimeMinutes: zod_1.z.number().int().nonnegative(),
    businessHoursOnly: zod_1.z.boolean(),
    escalationThresholds: zod_1.z.array(zod_1.z.object({
        percentage: zod_1.z.number().min(0).max(100),
        escalateTo: zod_1.z.string(),
    })),
});
// ============== Dashboard Schema ==============
exports.ChannelSwitchEventSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    fromChannel: exports.TicketChannelSchema,
    toChannel: exports.TicketChannelSchema,
    ticketId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
});
exports.JourneyEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    ticketId: zod_1.z.string(),
    eventType: zod_1.z.enum(['created', 'assigned', 'status_changed', 'intent_detected', 'escalated', 'resolved', 'channel_switch']),
    timestamp: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.DashboardMetricsSchema = zod_1.z.object({
    totalTickets: zod_1.z.number().int().nonnegative(),
    openTickets: zod_1.z.number().int().nonnegative(),
    avgResponseTimeMinutes: zod_1.z.number().min(0),
    avgResolutionTimeMinutes: zod_1.z.number().min(0),
    slaComplianceRate: zod_1.z.number().min(0).max(1),
    customerSatisfactionAvg: zod_1.z.number().min(0).max(5),
    escalationRate: zod_1.z.number().min(0).max(1),
    firstContactResolutionRate: zod_1.z.number().min(0).max(1),
    channelDistribution: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    sentimentDistribution: zod_1.z.record(zod_1.z.number().int().nonnegative()),
    timestamp: zod_1.z.string().datetime(),
});
//# sourceMappingURL=types.js.map