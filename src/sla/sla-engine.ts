/**
 * SLA Management Engine
 * VAL-DEPT-CS-SLA: Automatic SLA deadline tracking with breach prevention
 *
 * Per-category, per-tier SLA definitions with real-time countdown,
 * pre-breach alerts, and automatic escalation on breach risk.
 */

import type { IssuePriority, IssueCategory } from "../types.js";
import { AccountTier, ACCOUNT_TIER_CONFIGS } from "../policy/policy-engine.js";

// ============================================
// SLA Types
// ============================================

export type SLAStatus = "healthy" | "at_risk" | "warning" | "breached" | "met";

export interface SLADeadline {
  issueId: string;
  priority: IssuePriority;
  category: IssueCategory;
  accountTier: AccountTier;
  createdAt: string;
  deadlineMinutes: number;
  warningAtMinutes: number; // 50% of time elapsed
  criticalAtMinutes: number; // 75% of time elapsed
  respondedAt?: string;
  resolvedAt?: string;
  currentStatus: SLAStatus;
}

export interface SLAHealthReport {
  generatedAt: string;
  period: string;
  totalTickets: number;
  breachedCount: number;
  metCount: number;
  atRiskCount: number;
  breachRate: number;
  avgResponseMinutes: number;
  avgResolutionMinutes: number;
  byPriority: Record<IssuePriority, {
    total: number;
    breached: number;
    met: number;
    breachRate: number;
    avgResponseMinutes: number;
    avgResolutionMinutes: number;
  }>;
  topBreachedCategories: Array<{ category: IssueCategory; breachRate: number; count: number }>;
}

// ============================================
// SLA Definitions (configurable)
// ============================================

export const SLA_DEFINITIONS = {
  // First response time by priority (minutes)
  firstResponseMinutes: {
    critical: 15,
    high: 60,
    medium: 240,
    low: 1440,
  } as Record<IssuePriority, number>,

  // Resolution time by priority (minutes)
  resolutionMinutes: {
    critical: 60,
    high: 240,
    medium: 1440,
    low: 10080, // 7 days
  } as Record<IssuePriority, number>,

  // Category modifiers (multipliers to priority SLA)
  categoryModifiers: {
    billing: 0.5, // stricter SLA
    refund: 0.5,
    account: 0.75,
    complaint: 0.75,
    bug: 1.0,
    technical: 1.0,
    "account-recovery": 0.5,
    "security": 0.25, // fastest
    "data-privacy": 0.5,
    "legal": 0.25,
  } as Partial<Record<IssueCategory, number>>,

  // Warning thresholds (% of elapsed time)
  warningThreshold: 0.5, // 50%
  criticalThreshold: 0.75, // 75%
  breachThreshold: 1.0, // 100%
} as const;

// ============================================
// SLA Engine
// ============================================

export class SLAEngine {
  private activeSLAs: Map<string, SLADeadline> = new Map();

  /**
   * Register a new ticket for SLA tracking
   */
  registerTicket(params: {
    issueId: string;
    priority: IssuePriority;
    category: IssueCategory;
    accountTier: AccountTier;
    createdAt?: string;
  }): SLADeadline {
    const { issueId, priority, category, accountTier, createdAt } = params;

    const tierConfig = ACCOUNT_TIER_CONFIGS[accountTier];
    const categoryModifier = SLA_DEFINITIONS.categoryModifiers[category] ?? 1.0;

    const baseFirstResponse = SLA_DEFINITIONS.firstResponseMinutes[priority];
    const baseResolution = SLA_DEFINITIONS.resolutionMinutes[priority];

    // Apply tier multiplier (enterprise = faster SLA = smaller number)
    const tierMultiplier = tierConfig.slaMultiplier;

    // Apply category modifier
    const firstResponseMinutes = Math.round(
      baseFirstResponse * categoryModifier * tierMultiplier
    );
    const resolutionMinutes = Math.round(
      baseResolution * categoryModifier * tierMultiplier
    );

    const deadline: SLADeadline = {
      issueId,
      priority,
      category,
      accountTier,
      createdAt: createdAt ?? new Date().toISOString(),
      deadlineMinutes: resolutionMinutes,
      warningAtMinutes: Math.round(resolutionMinutes * SLA_DEFINITIONS.warningThreshold),
      criticalAtMinutes: Math.round(resolutionMinutes * SLA_DEFINITIONS.criticalThreshold),
      currentStatus: "healthy",
    };

    this.activeSLAs.set(issueId, deadline);
    return deadline;
  }

  /**
   * Record first response for a ticket
   */
  recordResponse(issueId: string, respondedAt?: string): SLADeadline | undefined {
    const sla = this.activeSLAs.get(issueId);
    if (!sla) return undefined;

    sla.respondedAt = respondedAt ?? new Date().toISOString();
    this.recalculateStatus(sla);
    return sla;
  }

  /**
   * Record resolution for a ticket
   */
  recordResolution(issueId: string, resolvedAt?: string): SLADeadline | undefined {
    const sla = this.activeSLAs.get(issueId);
    if (!sla) return undefined;

    sla.resolvedAt = resolvedAt ?? new Date().toISOString();
    this.recalculateStatus(sla);
    return sla;
  }

  /**
   * Get current SLA status for a ticket
   */
  getStatus(issueId: string): SLAStatus {
    const sla = this.activeSLAs.get(issueId);
    if (!sla) return "healthy";
    return this.recalculateStatus(sla);
  }

  /**
   * Check all active SLAs and return those at risk
   */
  checkAll(asOf?: string): SLADeadline[] {
    const now = asOf ? new Date(asOf).getTime() : Date.now();
    const atRisk: SLADeadline[] = [];

    for (const sla of Array.from(this.activeSLAs.values())) {
      if (sla.resolvedAt) continue; // Skip resolved

      const createdMs = new Date(sla.createdAt).getTime();
      const elapsedMs = now - createdMs;
      const elapsedMinutes = elapsedMs / (1000 * 60);

      // Update status
      const status = this.computeStatus(elapsedMinutes, sla.deadlineMinutes, sla.warningAtMinutes, sla.criticalAtMinutes);
      sla.currentStatus = status;

      if (status === "at_risk" || status === "warning" || status === "breached") {
        atRisk.push(sla);
      }
    }

    return atRisk.sort((a, b) => {
      // Sort by urgency: breached first, then critical, then warning
      const priorityOrder: Record<SLAStatus, number> = { breached: 0, warning: 1, at_risk: 2, healthy: 3, met: 4 };
      return (priorityOrder[a.currentStatus] ?? 6) - (priorityOrder[b.currentStatus] ?? 6);
    });
  }

  /**
   * Get tickets approaching SLA breach (for alerting)
   */
  getTicketsNeedingAttention(): SLADeadline[] {
    return this.checkAll().filter(
      (sla) => sla.currentStatus === "warning" || sla.currentStatus === "at_risk"
    );
  }

  /**
   * Get breached tickets
   */
  getBreachedTickets(): SLADeadline[] {
    return this.checkAll().filter((sla) => sla.currentStatus === "breached");
  }

  /**
   * Get deadline info for a specific ticket
   */
  getDeadlineInfo(issueId: string): {
    deadline: SLADeadline | undefined;
    elapsedMinutes: number;
    remainingMinutes: number | null;
    percentElapsed: number;
  } {
    const deadline = this.activeSLAs.get(issueId);
    if (!deadline) {
      return { deadline: undefined, elapsedMinutes: 0, remainingMinutes: null, percentElapsed: 0 };
    }

    const now = Date.now();
    const createdMs = new Date(deadline.createdAt).getTime();
    const elapsedMs = now - createdMs;
    const elapsedMinutes = elapsedMs / (1000 * 60);

    const remainingMinutes = deadline.resolvedAt
      ? null
      : Math.max(0, deadline.deadlineMinutes - elapsedMinutes);

    const percentElapsed = deadline.deadlineMinutes > 0
      ? Math.min(1, elapsedMinutes / deadline.deadlineMinutes)
      : 1;

    return { deadline, elapsedMinutes, remainingMinutes, percentElapsed };
  }

  /**
   * Generate SLA health report
   */
  generateReport(periodStart: string, periodEnd: string): SLAHealthReport {
    const startMs = new Date(periodStart).getTime();
    const endMs = new Date(periodEnd).getTime();
    const now = new Date().toISOString();

    const tickets: SLADeadline[] = [];

    for (const sla of Array.from(this.activeSLAs.values())) {
      const createdMs = new Date(sla.createdAt).getTime();
      if (createdMs >= startMs && createdMs <= endMs) {
        tickets.push(sla);
      }
    }

    let breachedCount = 0;
    let metCount = 0;
    let atRiskCount = 0;
    let totalResponseMinutes = 0;
    let totalResolutionMinutes = 0;
    let responseCount = 0;
    let resolutionCount = 0;

    const byPriority: SLAHealthReport["byPriority"] = {
      critical: { total: 0, breached: 0, met: 0, breachRate: 0, avgResponseMinutes: 0, avgResolutionMinutes: 0 },
      high: { total: 0, breached: 0, met: 0, breachRate: 0, avgResponseMinutes: 0, avgResolutionMinutes: 0 },
      medium: { total: 0, breached: 0, met: 0, breachRate: 0, avgResponseMinutes: 0, avgResolutionMinutes: 0 },
      low: { total: 0, breached: 0, met: 0, breachRate: 0, avgResponseMinutes: 0, avgResolutionMinutes: 0 },
    };

    const categoryBreaches = new Map<IssueCategory, { breached: number; total: number }>();

    for (const sla of tickets) {
      byPriority[sla.priority].total++;

      const elapsedMs = Date.now() - new Date(sla.createdAt).getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);
      const remainingMinutes = sla.deadlineMinutes - elapsedMinutes;

      if (sla.resolvedAt) {
        const resolvedMs = new Date(sla.resolvedAt).getTime() - new Date(sla.createdAt).getTime();
        const resolutionMinutes = resolvedMs / (1000 * 60);
        totalResolutionMinutes += resolutionMinutes;
        resolutionCount++;

        if (remainingMinutes >= 0) {
          metCount++;
          byPriority[sla.priority].met++;
        } else {
          breachedCount++;
          byPriority[sla.priority].breached++;
        }

        if (sla.respondedAt) {
          const respondedMs = new Date(sla.respondedAt).getTime() - new Date(sla.createdAt).getTime();
          totalResponseMinutes += respondedMs / (1000 * 60);
          responseCount++;
        }
      } else {
        // Unresolved
        if (remainingMinutes < 0) {
          breachedCount++;
          byPriority[sla.priority].breached++;
        } else if (remainingMinutes < sla.warningAtMinutes) {
          atRiskCount++;
        }
      }

      // Category tracking
      if (!categoryBreaches.has(sla.category)) {
        categoryBreaches.set(sla.category, { breached: 0, total: 0 });
      }
      const cat = categoryBreaches.get(sla.category)!;
      cat.total++;
      if (sla.currentStatus === "breached") cat.breached++;
    }

    // Compute breach rates
    for (const priority of ["critical", "high", "medium", "low"] as IssuePriority[]) {
      const p = byPriority[priority];
      if (p.total > 0) {
        p.breachRate = p.breached / p.total;
        p.avgResponseMinutes = responseCount > 0 ? Math.round(totalResponseMinutes / resolutionCount) : 0;
        p.avgResolutionMinutes = resolutionCount > 0 ? Math.round(totalResolutionMinutes / resolutionCount) : 0;
      }
    }

    const topBreachedCategories = Array.from(categoryBreaches.entries())
      .map(([category, data]) => ({
        category,
        count: data.total,
        breachRate: data.total > 0 ? data.breached / data.total : 0,
      }))
      .filter((c) => c.count >= 3) // Only categories with enough data
      .sort((a, b) => b.breachRate - a.breachRate)
      .slice(0, 5);

    return {
      generatedAt: now,
      period: `${periodStart} to ${periodEnd}`,
      totalTickets: tickets.length,
      breachedCount,
      metCount,
      atRiskCount,
      breachRate: tickets.length > 0 ? breachedCount / tickets.length : 0,
      avgResponseMinutes: responseCount > 0 ? Math.round(totalResponseMinutes / responseCount) : 0,
      avgResolutionMinutes: resolutionCount > 0 ? Math.round(totalResolutionMinutes / resolutionCount) : 0,
      byPriority,
      topBreachedCategories,
    };
  }

  /**
   * Remove a ticket from tracking
   */
  unregister(issueId: string): boolean {
    return this.activeSLAs.delete(issueId);
  }

  private recalculateStatus(sla: SLADeadline): SLAStatus {
    if (sla.resolvedAt) {
      const resolvedMs = new Date(sla.resolvedAt).getTime() - new Date(sla.createdAt).getTime();
      const elapsedMinutes = resolvedMs / (1000 * 60);
      sla.currentStatus = elapsedMinutes <= sla.deadlineMinutes ? "met" : "breached";
    } else {
      const now = Date.now();
      const elapsedMs = now - new Date(sla.createdAt).getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);
      sla.currentStatus = this.computeStatus(
        elapsedMinutes,
        sla.deadlineMinutes,
        sla.warningAtMinutes,
        sla.criticalAtMinutes
      );
    }
    return sla.currentStatus;
  }

  private computeStatus(
    elapsedMinutes: number,
    deadlineMinutes: number,
    warningAtMinutes: number,
    criticalAtMinutes: number
  ): SLAStatus {
    if (elapsedMinutes > deadlineMinutes) return "breached";
    if (elapsedMinutes > criticalAtMinutes) return "at_risk";
    if (elapsedMinutes > warningAtMinutes) return "warning";
    return "healthy";
  }
}

// Singleton
export const slaEngine = new SLAEngine();
