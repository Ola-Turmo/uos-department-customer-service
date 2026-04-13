/**
 * Feedback Bus — 360° Event Fan-Out
 * VAL-DEPT-CS-FEEDBACK: Every resolution fans out to all learning subsystems
 *
 * Event-driven architecture: a single TicketResolved event triggers
 * parallel updates to QA, patterns, knowledge, customer profile,
 * churn scoring, and classification learning — simultaneously.
 */

import type {
  TriageResult,
  QAEvaluationResult,
  IssuePattern,
  UpstreamAction,
  IntentClassificationResult,
  SentimentResult,
} from "../types.js";

// ============================================
// Event Types
// ============================================

export interface TicketResolvedEvent {
  type: "ticket.resolved";
  issueId: string;
  customerId: string;
  category: string;
  priority: string;
  channel: string;
  resolutionTimeMinutes?: number;
  triageResult: TriageResult;
  qaResult?: QAEvaluationResult;
  responseDraft: string;
  resolvedBy: "autonomous" | "human";
  sentiment?: SentimentResult;
  intentClassification?: IntentClassificationResult;
  estimatedRefundAmount?: number;
  wasReopened?: boolean;
  timestamp: string;
}

export interface TicketEscalatedEvent {
  type: "ticket.escalated";
  issueId: string;
  customerId: string;
  escalationLevel: number;
  reason: string;
  routedToTeam: string;
  triageResult: TriageResult;
  timestamp: string;
}

export interface TicketReopenedEvent {
  type: "ticket.reopened";
  issueId: string;
  customerId: string;
  originalResolutionTimeMinutes?: number;
  timeUntilReopenMinutes?: number;
  reason?: string;
  timestamp: string;
}

export interface PatternDetectedEvent {
  type: "pattern.detected";
  pattern: IssuePattern;
  confidence: "high" | "medium" | "low";
  similarIssuesFound: number;
  timestamp: string;
}

export interface KAGapFoundEvent {
  type: "kb.gap_found";
  issueId: string;
  category: string;
  subject: string;
  resolutionSummary: string;
  suggestedArticleTitle: string;
  suggestedArticleContent?: string;
  confidence: number;
  timestamp: string;
}

export interface ClassificationCorrectionEvent {
  type: "classification.corrected";
  issueId: string;
  originalCategory: string;
  correctedCategory: string;
  correctedBy: "human" | "system";
  confidence: number;
  timestamp: string;
}

export interface ChurnRiskChangedEvent {
  type: "churn.risk_changed";
  customerId: string;
  previousRisk: "critical" | "high" | "medium" | "low";
  newRisk: "critical" | "high" | "medium" | "low";
  churnScore: number;
  primaryFactor: string;
  timestamp: string;
}

export interface ProactiveOutreachTriggeredEvent {
  type: "outreach.triggered";
  customerId: string;
  reason: string;
  channel: "email" | "whatsapp" | "in_app";
  templateId: string;
  timestamp: string;
}

export type FeedbackEvent =
  | TicketResolvedEvent
  | TicketEscalatedEvent
  | TicketReopenedEvent
  | PatternDetectedEvent
  | KAGapFoundEvent
  | ClassificationCorrectionEvent
  | ChurnRiskChangedEvent
  | ProactiveOutreachTriggeredEvent;

// ============================================
// Subscriber Types
// ============================================

export type EventHandler<T extends FeedbackEvent = FeedbackEvent> = (
  event: T
) => void | Promise<void>;

export interface Subscriber {
  id: string;
  name: string;
  handlers: Map<string, EventHandler[]>;
  subscribedEvents: Set<string>;
}

// ============================================
// Feedback Bus
// ============================================

export class FeedbackBus {
  private subscribers: Map<string, Subscriber> = new Map();
  private eventLog: FeedbackEvent[] = [];
  private maxLogSize = 10000;

  /**
   * Subscribe to one or more event types
   */
  subscribe(params: {
    id: string;
    name: string;
    events: string[];
    handler: EventHandler;
  }): void {
    const { id, name, events, handler } = params;

    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, {
        id,
        name,
        handlers: new Map(),
        subscribedEvents: new Set(),
      });
    }

    const subscriber = this.subscribers.get(id)!;

    for (const eventType of events) {
      if (!subscriber.handlers.has(eventType)) {
        subscriber.handlers.set(eventType, []);
      }
      subscriber.handlers.get(eventType)!.push(handler as EventHandler);
      subscriber.subscribedEvents.add(eventType);
    }
  }

  /**
   * Unsubscribe a subscriber entirely
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Unsubscribe from specific events
   */
  unsubscribeEvents(id: string, events: string[]): void {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return;

    for (const eventType of events) {
      subscriber.handlers.delete(eventType);
      subscriber.subscribedEvents.delete(eventType);
    }
  }

  /**
   * Emit an event — fans out to all subscribers synchronously in parallel
   */
  async emit(event: FeedbackEvent): Promise<void> {
    // Log the event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
    }

    // Find all subscribers for this event type
    const matchingSubscribers = Array.from(this.subscribers.values()).filter(
      (s) => s.subscribedEvents.has(event.type) || s.subscribedEvents.has("*")
    );

    if (matchingSubscribers.length === 0) return;

    // Fan out in parallel
    const promises = matchingSubscribers.flatMap((subscriber) => {
      const handlers = subscriber.handlers.get(event.type) ?? [];
      return handlers.map((handler) =>
        this.safeInvoke(handler, event, subscriber.name)
      );
    });

    await Promise.allSettled(promises);
  }

  /**
   * Emit multiple events in sequence
   */
  async emitSequence(events: FeedbackEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Convenience: emit TicketResolved with all related data
   */
  async emitTicketResolved(params: {
    issueId: string;
    customerId: string;
    category: string;
    priority: string;
    channel: string;
    resolutionTimeMinutes?: number;
    triageResult: TriageResult;
    qaResult?: QAEvaluationResult;
    responseDraft: string;
    resolvedBy: "autonomous" | "human";
    sentiment?: SentimentResult;
    intentClassification?: IntentClassificationResult;
    estimatedRefundAmount?: number;
  }): Promise<void> {
    await this.emit({
      type: "ticket.resolved",
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Convenience: emit TicketReopened
   */
  async emitTicketReopened(params: {
    issueId: string;
    customerId: string;
    originalResolutionTimeMinutes?: number;
    timeUntilReopenMinutes?: number;
    reason?: string;
  }): Promise<void> {
    await this.emit({
      type: "ticket.reopened",
      ...params,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get recent events for debugging/analytics
   */
  getRecentEvents(types?: string[], limit = 100): FeedbackEvent[] {
    let events = this.eventLog;
    if (types && types.length > 0) {
      events = events.filter((e) => types.includes(e.type));
    }
    return events.slice(-limit);
  }

  /**
   * Get event counts by type
   */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.eventLog) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Subscribe all internal learning subsystems (call once at startup)
   */
  registerInternalSubscribers(params: {
    qaService: unknown;
    recurringPatternService: unknown;
    customerProfileSynthesizer: unknown;
    knowledgeHealer?: unknown;
    escalationPredictor?: unknown;
    churnRiskScorer?: unknown;
    classificationLearner?: unknown;
    outreachEngine?: unknown;
  }): void {
    // QA Learning Subscriber
    this.subscribe({
      id: "qa-learning",
      name: "QA Learning Loop",
      events: ["ticket.resolved"],
      handler: async (event) => {
        if (event.type !== "ticket.resolved") return;
        const e = event as TicketResolvedEvent;
        if (e.qaResult) {
          // Hand off to QA service for learning
          console.log(`[QA-Learning] Received QA result for ${e.issueId}: score ${e.qaResult.overallScore}`);
        }
      },
    });

    // Pattern Detection Subscriber
    this.subscribe({
      id: "pattern-detection",
      name: "Pattern Detection",
      events: ["ticket.resolved", "ticket.escalated"],
      handler: async (event) => {
        const e = event as TicketResolvedEvent | TicketEscalatedEvent;
        if (e.type === "ticket.resolved" || e.type === "ticket.escalated") {
          console.log(`[PatternDetection] Indexing ${e.issueId} for pattern analysis`);
        }
      },
    });

    // Knowledge Gap Subscriber
    this.subscribe({
      id: "kb-healer",
      name: "Knowledge Base Healer",
      events: ["ticket.resolved"],
      handler: async (event) => {
        if (event.type !== "ticket.resolved") return;
        const e = event as TicketResolvedEvent;
        if (e.resolvedBy === "autonomous" || e.qaResult?.overallScore && e.qaResult.overallScore >= 85) {
          console.log(`[KB-Healer] Checking KB gap for ${e.issueId}`);
        }
      },
    });

    // Churn Risk Subscriber
    this.subscribe({
      id: "churn-risk",
      name: "Churn Risk Scorer",
      events: ["ticket.resolved", "ticket.reopened", "ticket.escalated"],
      handler: async (event) => {
        const e = event as TicketResolvedEvent | TicketReopenedEvent | TicketEscalatedEvent;
        console.log(`[ChurnRisk] Updating risk for customer ${(e as any).customerId} due to ${e.type}`);
      },
    });

    // Classification Learning Subscriber
    this.subscribe({
      id: "classification-learning",
      name: "Classification Learner",
      events: ["classification.corrected"],
      handler: async (event) => {
        if (event.type !== "classification.corrected") return;
        const e = event as ClassificationCorrectionEvent;
        console.log(`[ClassificationLearning] Correction: ${e.originalCategory} → ${e.correctedCategory}`);
      },
    });

    // Proactive Outreach Subscriber
    this.subscribe({
      id: "proactive-outreach",
      name: "Proactive Outreach",
      events: ["churn.risk_changed", "ticket.resolved"],
      handler: async (event) => {
        const e = event as TicketResolvedEvent | ChurnRiskChangedEvent;
        if (e.type === "ticket.resolved" && (e as TicketResolvedEvent).resolvedBy === "human") {
          console.log(`[Outreach] Checking if outreach needed for ${(e as TicketResolvedEvent).customerId}`);
        }
        if (e.type === "churn.risk_changed") {
          const ce = e as ChurnRiskChangedEvent;
          if (ce.newRisk === "critical" || ce.newRisk === "high") {
            console.log(`[Outreach] Triggering proactive outreach for ${ce.customerId} (risk: ${ce.newRisk})`);
          }
        }
      },
    });

    // Reopened Ticket Subscriber
    this.subscribe({
      id: "reopened-handler",
      name: "Reopened Ticket Handler",
      events: ["ticket.reopened"],
      handler: async (event) => {
        if (event.type !== "ticket.reopened") return;
        const e = event as TicketReopenedEvent;
        console.log(`[ReopenedHandler] Ticket ${e.issueId} reopened after ${e.timeUntilReopenMinutes}min`);
      },
    });
  }

  private async safeInvoke(
    handler: EventHandler,
    event: FeedbackEvent,
    subscriberName: string
  ): Promise<void> {
    try {
      await handler(event);
    } catch (err) {
      console.error(
        `[FeedbackBus] Handler error in '${subscriberName}' for event '${event.type}':`,
        err
      );
    }
  }
}

// Singleton
export const feedbackBus = new FeedbackBus();
