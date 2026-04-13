/**
 * SLA Engine — Clock, breach prevention, and dashboard
 */

import { SLAStatus, SLAPolicy, SLABreachRisk, SLATier } from '../types.js';

/**
 * SLA Engine for tracking SLA deadlines, calculating breach risk,
 * and formatting time remaining for dashboard display.
 */
export class SLAEngine {
  /**
   * Check the current SLA status for a ticket.
   * @param ticketId - The ticket identifier
   * @param slaTier - The SLA tier (standard, priority, enterprise)
   * @param deadline - ISO timestamp for the SLA deadline
   * @param policy - The SLA policy with resolution/response times
   * @returns SLAStatus with breach risk and time remaining
   */
  checkStatus(ticketId: string, slaTier: SLATier, deadline: string, policy: SLAPolicy): SLAStatus {
    const now = Date.now();
    const deadlineMs = new Date(deadline).getTime();
    const timeRemainingMs = deadlineMs - now;
    const totalWindowMs = policy.resolution ? policy.resolution * 60 * 1000 : 60 * 60 * 1000;

    // Calculate percent of SLA time used (0-1)
    const percentUsed = totalWindowMs > 0
      ? Math.min(1, Math.max(0, 1 - (timeRemainingMs / totalWindowMs)))
      : 1;

    const breachRisk = this.getBreachRisk(percentUsed);
    const timeRemaining = this.formatTimeRemaining(Math.max(0, timeRemainingMs));

    return {
      ticketId,
      slaTier,
      deadline,
      percentUsed,
      breachRisk,
      timeRemaining,
      policy,
    };
  }

  /**
   * Calculate breach risk based on percentage of SLA time used.
   * @param percentUsed - Percentage of SLA time used (0-1)
   * @returns SLABreachRisk level
   */
  getBreachRisk(percentUsed: number): SLABreachRisk {
    if (percentUsed >= 0.9) {
      return 'critical';
    }
    if (percentUsed >= 0.7) {
      return 'warning';
    }
    return 'none';
  }

  /**
   * Format milliseconds into a human-readable time remaining string.
   * @param ms - Milliseconds remaining
   * @returns Human-readable string (e.g., "2h 15m", "30m", "5m")
   */
  formatTimeRemaining(ms: number): string {
    if (ms <= 0) {
      return '0m';
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }
}
