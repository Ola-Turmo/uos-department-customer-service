// src/qa/resolution-tracker.ts
// Tracks resolution quality and closes the feedback loop.

export interface ResolutionOutcome {
  ticketId: string;
  agentId: string;
  responseDrafted: string;
  triageCategory: string;
  churnRisk?: string;
  timestamp: string;
  customerFeedback?: { csat?: number; nps?: number; tags?: string[] };
  qualityScore?: number;  // 0-1
  resolutionQuality: "excellent" | "good" | "adequate" | "poor";
  feedbackUsed: boolean;
}

export interface QualityInsight {
  category: string;
  avgQuality: number;
  issueCount: number;
  topIssues: string[];
}

/**
 * Tracks resolution quality and provides insights for continuous improvement.
 * Acts as the feedback loop between outcomes and agent performance.
 */
export class ResolutionTracker {
  private outcomes: ResolutionOutcome[] = [];

  record(outcome: Omit<ResolutionOutcome, "qualityScore" | "resolutionQuality">): ResolutionOutcome {
    const scored = this.scoreOutcome(outcome);
    this.outcomes.push(scored);
    return scored;
  }

  private scoreOutcome(outcome: Omit<ResolutionOutcome, "qualityScore" | "resolutionQuality">): ResolutionOutcome {
    let qualityScore = 0.5;  // baseline
    
    if (outcome.customerFeedback?.csat) qualityScore += (outcome.customerFeedback.csat - 3) * 0.15;
    if (outcome.customerFeedback?.nps) qualityScore += (outcome.customerFeedback.nps - 7) * 0.05;
    if (outcome.responseDrafted.length > 100) qualityScore += 0.05;
    if (outcome.churnRisk === "critical" && outcome.responseDrafted.length < 50) qualityScore -= 0.2;
    
    qualityScore = Math.max(0, Math.min(1, qualityScore));
    const resolutionQuality: ResolutionOutcome["resolutionQuality"] =
      qualityScore > 0.8 ? "excellent" :
      qualityScore > 0.6 ? "good" :
      qualityScore > 0.4 ? "adequate" : "poor";

    return { ...outcome, qualityScore, resolutionQuality, feedbackUsed: false };
  }

  getInsights(startDate?: string, endDate?: string): QualityInsight[] {
    const filtered = this.outcomes.filter(o => {
      if (startDate && o.timestamp < startDate) return false;
      if (endDate && o.timestamp > endDate) return false;
      return true;
    });

    const byCategory = new Map<string, { total: number; scores: number[]; issues: string[] }>();
    for (const o of filtered) {
      if (!byCategory.has(o.triageCategory)) byCategory.set(o.triageCategory, { total: 0, scores: [], issues: [] });
      const entry = byCategory.get(o.triageCategory)!;
      entry.total++;
      if (o.qualityScore !== undefined) entry.scores.push(o.qualityScore);
      if (o.resolutionQuality === "poor" || o.resolutionQuality === "adequate") {
        entry.issues.push(`low_csat_ticket:${o.ticketId}`);
      }
    }

    return Array.from(byCategory.entries()).map(([category, data]) => ({
      category,
      avgQuality: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      issueCount: data.issues.length,
      topIssues: data.issues.slice(0, 5),
    }));
  }

  getAgentLeaderboard(): Array<{ agentId: string; avgQuality: number; ticketCount: number; resolutionRate: number }> {
    const byAgent = new Map<string, { scores: number[]; total: number; resolved: number }>();
    for (const o of this.outcomes) {
      if (!byAgent.has(o.agentId)) byAgent.set(o.agentId, { scores: [], total: 0, resolved: 0 });
      const entry = byAgent.get(o.agentId)!;
      if (o.qualityScore !== undefined) entry.scores.push(o.qualityScore);
      entry.total++;
      if (o.resolutionQuality !== "poor") entry.resolved++;
    }
    return Array.from(byAgent.entries()).map(([agentId, data]) => ({
      agentId,
      avgQuality: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      ticketCount: data.total,
      resolutionRate: data.resolved / data.total,
    })).sort((a, b) => b.avgQuality - a.avgQuality);
  }
}
