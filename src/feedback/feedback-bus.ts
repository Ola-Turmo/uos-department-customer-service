import { FeedbackEvent, FeedbackEventType } from '../types.js';

type EventHandler = (event: FeedbackEvent) => void;

interface Subscription {
  eventType: FeedbackEventType;
  handler: EventHandler;
}

/**
 * Event-driven feedback bus for the customer service system.
 * Provides pub/sub capabilities for tracking and responding to
 * system events like ticket resolution, escalations, and SLA breaches.
 */
export class FeedbackBus {
  private handlers: Map<FeedbackEventType, Set<EventHandler>> = new Map();
  private eventHistory: FeedbackEvent[] = [];
  private subscriptions: Subscription[] = [];

  /**
   * Subscribe a handler to receive events of a specific type.
   * @param eventType - The type of event to subscribe to
   * @param handler - Callback function invoked when matching events are published
   * @returns void
   */
  subscribe(eventType: FeedbackEventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    this.subscriptions.push({ eventType, handler });
  }

  /**
   * Publish an event to the feedback bus.
   * The event is stored in history and all matching handlers are invoked.
   * @param event - The feedback event to publish
   * @returns void
   */
  publish(event: FeedbackEvent): void {
    // Store in event history
    this.eventHistory.push(event);

    // Invoke all handlers for this event type
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in feedback handler for event ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe all handlers from the feedback bus.
   * Clears all subscriptions and event history.
   * @returns void
   */
  unsubscribe(): void {
    this.handlers.clear();
    this.subscriptions = [];
  }

  /**
   * Get the complete event history.
   * @returns Array of all published feedback events
   */
  getEventHistory(): FeedbackEvent[] {
    return [...this.eventHistory];
  }
}
