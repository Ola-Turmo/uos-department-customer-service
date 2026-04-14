// uos-department-customer-service
// AI-Native Customer Experience Engine

// Core Types
export {
  // Enums
  SentimentSchema,
  EscalationLevelSchema,
  IntentCategorySchema,
  TicketStatusSchema,
  TicketPrioritySchema,
  TicketChannelSchema,
  WorkflowConditionSchema,
  WorkflowActionSchema,
  WorkflowNodeSchema,
  KnowledgeNodeTypeSchema,
  QACategorySchema,
  // Types
  type Sentiment,
  type EscalationLevel,
  type IntentCategory,
  type TicketStatus,
  type TicketPriority,
  type TicketChannel,
  type WorkflowCondition,
  type WorkflowAction,
  type WorkflowNode,
  type KnowledgeNodeType,
  type QACategory,
  // Schemas
  ConfidenceScoreSchema,
  IntentSchema,
  TicketSchema,
  CustomerSchema,
  AgentSchema,
  WorkflowSchema,
  KnowledgeNodeSchema,
  KnowledgeEdgeSchema,
  KnowledgeGraphSchema,
  QAEvaluationSchema,
  AgentPerformanceSchema,
  EscalationPredictionSchema,
  DeEscalationActionSchema,
  SLAPolicySchema,
  ChannelSwitchEventSchema,
  JourneyEventSchema,
  DashboardMetricsSchema,
  // Inferred Types
  type Intent,
  type ConfidenceScore,
  type Ticket,
  type Customer,
  type Agent,
  type Workflow,
  type KnowledgeNode,
  type KnowledgeEdge,
  type KnowledgeGraph,
  type QAEvaluation,
  type AgentPerformance,
  type EscalationPrediction,
  type DeEscalationAction,
  type SLAPolicy,
  type ChannelSwitchEvent,
  type JourneyEvent,
  type DashboardMetrics,
  // Service Interfaces
  type TriageResult,
  type SimilarIssueResult,
  type SuggestionResult,
} from './types';

// Re-export Zod for convenience
import { z } from 'zod';
export { z };

// Module Information
export const MODULE_NAME = 'uos-department-customer-service';
export const MODULE_VERSION = '0.1.0';
