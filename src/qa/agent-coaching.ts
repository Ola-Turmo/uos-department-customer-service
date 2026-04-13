/**
 * Agent Coaching Engine
 * VAL-DEPT-CS-AGENT-COACHING: Per-agent coaching recommendations instead of aggregate QA
 *
 * Instead of aggregate QA, generates per-agent coaching recommendations.
 * Tracks per-agent: QA scores by criterion over time, strongest/weakest criteria,
 * common failure modes, sentiment trajectory, escalation rate vs team average.
 */

import type { SentimentResult } from "../types.js";

// ============================================
// Types
// ============================================

export interface AgentPerformanceRecord {
  agentId: string;
  agentName: string;
  ticketIds: string[];
  evaluationPeriod: { from: string; to: string };
  overallQA: {
    averageScore: number; // 0-1
    sampleSize: number;
    trend: "improving" | "stable" | "declining";
  };
  criteria: Array<{
    criterion: string;
    averageScore: number;
    trend: "improving" | "stable" | "declining";
    comparisonToTeam: number; // difference from team average (+ = better, - = worse)
    weakestSignal: string; // keyword/phrase that most drags the score
    strongestSignal: string;
  }>;
  escalationRate: number; // 0-1 ratio of tickets escalated
  sentimentTrajectory: "improving" | "stable" | "declining";
  avgResolutionTimeMinutes?: number;
  topFailureModes: string[]; // e.g., "misses second question part", "policy reference missing"
  coachingTips: string[]; // personalized tips
  trainingRecommendations: string[]; // broader training suggestions
  generatedAt: string;
}

export interface CoachingTip {
  agentId: string;
  criterion: string;
  tip: string;
  confidence: number; // 0-1
  basedOnSampleSize: number;
  exampleIssue?: string;
}

export interface AgentTeamSummary {
  period: { from: string; to: string };
  agentCount: number;
  overallTeamQA: number;
  criteriaAverages: Record<string, number>;
  topCrossTeamFailureModes: string[];
  agentsNeedingAttention: Array<{ agentId: string; reason: string; severity: "critical" | "high" | "medium" }>;
  generatedAt: string;
}

// Evaluation record stored per agent
interface StoredEvaluation {
  evaluationId: string;
  ticketId: string;
  timestamp: string;
  agentId: string;
  overallScore: number;
  criteriaScores: Record<string, number>; // criterion → score 0-1
  sentiment?: SentimentResult;
  wasEscalated: boolean;
  csatScore?: number;
}

// ============================================
// Coaching Engine
// ============================================

export class AgentCoachingEngine {
  private agentEvaluations: Map<string, StoredEvaluation[]> = new Map();
  private agentInfo: Map<string, { name: string }> = new Map();
  private maxHistoryPerAgent = 500;

  // --- Public API ---

  /**
   * Register an evaluation for an agent
   * Called after QA review of a ticket handled by a specific agent
   */
  registerEvaluation(eval_: {
    evaluationId: string;
    ticketId: string;
    timestamp: string;
    agentId: string;
    agentName: string;
    overallScore: number;
    criteriaScores: Record<string, number>;
    sentiment?: SentimentResult;
    wasEscalated: boolean;
    csatScore?: number;
  }): void {
    const { agentId } = eval_;

    // Store agent name
    this.agentInfo.set(agentId, { name: eval_.agentName });

    // Get existing evaluations or create new array
    const existing = this.agentEvaluations.get(agentId) ?? [];

    // Add new evaluation
    existing.push({
      evaluationId: eval_.evaluationId,
      ticketId: eval_.ticketId,
      timestamp: eval_.timestamp,
      agentId: eval_.agentId,
      overallScore: eval_.overallScore,
      criteriaScores: eval_.criteriaScores,
      sentiment: eval_.sentiment,
      wasEscalated: eval_.wasEscalated,
      csatScore: eval_.csatScore,
    });

    // Cap history at maxHistoryPerAgent (keep most recent)
    if (existing.length > this.maxHistoryPerAgent) {
      existing.splice(0, existing.length - this.maxHistoryPerAgent);
    }

    this.agentEvaluations.set(agentId, existing);
  }

  /**
   * Generate a coaching report for a specific agent
   */
  generateAgentReport(agentId: string, from?: string, to?: string): AgentPerformanceRecord | null {
    const samples = this.getAgentSamples(agentId, from, to);

    if (samples.length === 0) {
      return null;
    }

    const agentName = this.agentInfo.get(agentId)?.name ?? agentId;
    const ticketIds = samples.map(s => s.ticketId);

    // Sort by timestamp for trend computation
    const sortedSamples = [...samples].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Overall QA
    const overallScores = sortedSamples.map(s => s.overallScore);
    const averageScore = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
    const overallTrend = this.computeTrend(overallScores);

    // Criteria analysis
    const allCriteria = this.getAllCriteria(samples);
    const teamCriteriaAverages = this.getTeamCriteriaAverages(samples, allCriteria);

    const criteria = allCriteria.map(criterion => {
      const agentScores = sortedSamples.map(s => s.criteriaScores[criterion] ?? 0);
      const avg = agentScores.reduce((a, b) => a + b, 0) / agentScores.length;
      const trend = this.computeTrend(agentScores);
      const teamAvg = teamCriteriaAverages[criterion] ?? 0.5;
      const comparisonToTeam = avg - teamAvg;

      // Determine weakest and strongest signals based on score
      const weakestSignal = this.getWeakestSignal(criterion, avg, comparisonToTeam);
      const strongestSignal = this.getStrongestSignal(criterion, avg, comparisonToTeam);

      return {
        criterion,
        averageScore: avg,
        trend,
        comparisonToTeam,
        weakestSignal,
        strongestSignal,
      };
    });

    // Escalation rate
    const escalatedCount = samples.filter(s => s.wasEscalated).length;
    const escalationRate = escalatedCount / samples.length;

    // Sentiment trajectory based on last 10 sentiment scores
    const sentimentTrajectory = this.computeSentimentTrajectory(sortedSamples);

    // Average resolution time (if csatScore available as proxy)
    const avgResolutionTimeMinutes = undefined; // Not tracked in current schema

    // Top failure modes
    const latestCriteriaScores = sortedSamples[sortedSamples.length - 1].criteriaScores;
    const topFailureModes = this.detectFailureModes(latestCriteriaScores);

    // Coaching tips (top 3)
    const coachingTips = this.getCoachingTips(agentId, 3).map(t => t.tip);

    // Training recommendations
    const trainingRecommendations = this.generateTrainingRecommendations(agentId, samples, criteria);

    // Evaluation period
    const timestamps = sortedSamples.map(s => s.timestamp);
    const period = {
      from: timestamps[0],
      to: timestamps[timestamps.length - 1],
    };

    return {
      agentId,
      agentName,
      ticketIds,
      evaluationPeriod: period,
      overallQA: {
        averageScore,
        sampleSize: samples.length,
        trend: overallTrend,
      },
      criteria,
      escalationRate,
      sentimentTrajectory,
      avgResolutionTimeMinutes,
      topFailureModes,
      coachingTips,
      trainingRecommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get coaching tips for an agent
   */
  getCoachingTips(agentId: string, limit: number = 10): CoachingTip[] {
    const samples = this.getAgentSamples(agentId);
    if (samples.length === 0) {
      return [];
    }

    const allSamples = this.getAllSamples();
    const allCriteria = this.getAllCriteria(samples);
    const teamCriteriaAverages = this.getTeamCriteriaAverages(allSamples, allCriteria);

    const tips: CoachingTip[] = [];

    for (const criterion of allCriteria) {
      const agentScores = samples.map(s => s.criteriaScores[criterion] ?? 0);
      const agentAvg = agentScores.reduce((a, b) => a + b, 0) / agentScores.length;
      const teamAvg = teamCriteriaAverages[criterion] ?? 0.5;

      if (agentAvg < teamAvg - 0.15) {
        const tip = this.generateTip(agentId, criterion, agentAvg, teamAvg, samples.length);
        tips.push(tip);
      }
    }

    // Sort by confidence descending and limit
    return tips.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  /**
   * Get team summary report
   */
  getTeamSummary(from?: string, to?: string): AgentTeamSummary {
    const allSamples = this.getAllSamples(from, to);
    const agentIds = Array.from(this.agentEvaluations.keys());

    // Compute per-agent summaries
    const summaries: AgentPerformanceRecord[] = [];
    for (const agentId of agentIds) {
      const report = this.generateAgentReport(agentId, from, to);
      if (report) {
        summaries.push(report);
      }
    }

    // Overall team QA (mean of all agents' average scores)
    const overallTeamQA = summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.overallQA.averageScore, 0) / summaries.length
      : 0;

    // Criteria averages across team
    const allCriteria = new Set<string>();
    for (const s of summaries) {
      for (const c of s.criteria) {
        allCriteria.add(c.criterion);
      }
    }

    const criteriaAverages: Record<string, number> = {};
    for (const criterion of Array.from(allCriteria)) {
      const allScores = summaries.map(s => {
        const found = s.criteria.find(c => c.criterion === criterion);
        return found?.averageScore ?? 0;
      });
      if (allScores.length > 0) {
        criteriaAverages[criterion] = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      }
    }

    // Top cross-team failure modes
    const failureModeCounts = new Map<string, number>();
    for (const s of summaries) {
      for (const mode of s.topFailureModes) {
        failureModeCounts.set(mode, (failureModeCounts.get(mode) ?? 0) + 1);
      }
    }

    const topCrossTeamFailureModes = Array.from(failureModeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mode]) => mode);

    // Agents needing attention
    const agentsNeedingAttention = this.detectAgentsNeedingAttention(summaries);

    // Period
    let periodFrom = "";
    let periodTo = "";
    if (allSamples.length > 0) {
      const timestamps = allSamples.map(s => s.timestamp).sort();
      periodFrom = timestamps[0];
      periodTo = timestamps[timestamps.length - 1];
    }

    return {
      period: { from: periodFrom, to: periodTo },
      agentCount: agentIds.length,
      overallTeamQA,
      criteriaAverages,
      topCrossTeamFailureModes,
      agentsNeedingAttention,
      generatedAt: new Date().toISOString(),
    };
  }

  // --- Internal methods ---

  private computeTrend(scores: number[]): "improving" | "stable" | "declining" {
    if (scores.length < 3) {
      return "stable";
    }

    const third = Math.max(1, Math.floor(scores.length / 3));
    const firstThird = scores.slice(0, third);
    const lastThird = scores.slice(-third);

    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

    const diff = lastAvg - firstAvg;

    if (diff > 0.1) {
      return "improving";
    } else if (diff < -0.1) {
      return "declining";
    }
    return "stable";
  }

  private detectFailureModes(criteriaScores: Record<string, number>): string[] {
    const failureModes: Array<{ mode: string; severity: number }> = [];

    if (criteriaScores["accuracy"] !== undefined && criteriaScores["accuracy"] < 0.6) {
      failureModes.push({ mode: "may lack verification of facts", severity: 0.6 - criteriaScores["accuracy"] });
    }
    if (criteriaScores["empathy"] !== undefined && criteriaScores["empathy"] < 0.6) {
      failureModes.push({ mode: "needs more emotional acknowledgment", severity: 0.6 - criteriaScores["empathy"] });
    }
    if (criteriaScores["completeness"] !== undefined && criteriaScores["completeness"] < 0.6) {
      failureModes.push({ mode: "leaves secondary questions unaddressed", severity: 0.6 - criteriaScores["completeness"] });
    }
    if (criteriaScores["tone"] !== undefined && criteriaScores["tone"] < 0.6) {
      failureModes.push({ mode: "language may come across as too direct", severity: 0.6 - criteriaScores["tone"] });
    }
    if (criteriaScores["policy"] !== undefined && criteriaScores["policy"] < 0.6) {
      failureModes.push({ mode: "missing policy references or disclaimers", severity: 0.6 - criteriaScores["policy"] });
    }

    // Sort by severity descending and take top 3
    return failureModes
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3)
      .map(f => f.mode);
  }

  private generateTip(
    agentId: string,
    criterion: string,
    agentScore: number,
    teamScore: number,
    sampleSize: number
  ): CoachingTip {
    const diff = teamScore - agentScore;
    const confidence = Math.min(1, sampleSize / 20); // Higher confidence with more samples

    let tip: string;
    let exampleIssue: string | undefined;

    switch (criterion.toLowerCase()) {
      case "accuracy":
        tip = `Your accuracy scores are ${(diff * 100).toFixed(0)} points below team average — try adding more verification language ('I confirmed...', 'I verified...')`;
        exampleIssue = "Statements without verification cues";
        break;
      case "empathy":
        tip = `Your empathy scores are ${(diff * 100).toFixed(0)} points below team average — try phrases like 'I completely understand how frustrating that must be'`;
        exampleIssue = "Missing emotional acknowledgment";
        break;
      case "completeness":
        tip = "You're leaving secondary questions unaddressed on average — try adding 'Additionally...' or 'Also...'";
        exampleIssue = "Secondary concerns not addressed";
        break;
      case "tone":
        tip = "Your tone reads as too direct — softening with 'kindly', 'please' can help";
        exampleIssue = "Language perceived as harsh";
        break;
      case "policy":
        tip = "Remember to reference policy when rejecting requests: 'Our policy states...'";
        exampleIssue = "Policy not cited when appropriate";
        break;
      default:
        tip = `Your ${criterion} scores are ${(diff * 100).toFixed(0)} points below team average. Consider reviewing your approach.`;
    }

    return {
      agentId,
      criterion,
      tip,
      confidence,
      basedOnSampleSize: sampleSize,
      exampleIssue,
    };
  }

  private getAgentSamples(agentId: string, from?: string, to?: string): StoredEvaluation[] {
    const samples = this.agentEvaluations.get(agentId) ?? [];

    return samples.filter(s => {
      if (from && s.timestamp < from) return false;
      if (to && s.timestamp > to) return false;
      return true;
    });
  }

  private getAllSamples(from?: string, to?: string): StoredEvaluation[] {
    const all: StoredEvaluation[] = [];

    for (const samples of Array.from(this.agentEvaluations.values())) {
      for (const s of samples) {
        if (from && s.timestamp < from) continue;
        if (to && s.timestamp > to) continue;
        all.push(s);
      }
    }

    return all;
  }

  private getAllCriteria(samples: StoredEvaluation[]): string[] {
    const criteria = new Set<string>();
    for (const s of samples) {
      for (const c of Object.keys(s.criteriaScores)) {
        criteria.add(c);
      }
    }
    return Array.from(criteria);
  }

  private getTeamCriteriaAverages(samples: StoredEvaluation[], criteria: string[]): Record<string, number> {
    const result: Record<string, number> = {};

    for (const criterion of criteria) {
      const scores = samples
        .map(s => s.criteriaScores[criterion])
        .filter((score): score is number => score !== undefined);

      if (scores.length > 0) {
        result[criterion] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }

    return result;
  }

  private computeSentimentTrajectory(sortedSamples: StoredEvaluation[]): "improving" | "stable" | "declining" {
    // Get last 10 sentiment intensity scores
    const sentimentScores = sortedSamples
      .slice(-10)
      .map(s => s.sentiment?.intensity ?? 0.5)
      .filter(score => score > 0);

    if (sentimentScores.length < 2) {
      return "stable";
    }

    return this.computeTrend(sentimentScores);
  }

  private getWeakestSignal(criterion: string, avgScore: number, comparisonToTeam: number): string {
    // Signals that would drag the score down
    switch (criterion.toLowerCase()) {
      case "accuracy":
        return avgScore < 0.7 ? "missing verification language" : "occasional factual gaps";
      case "empathy":
        return avgScore < 0.7 ? "insufficient emotional acknowledgment" : "moments lacking warmth";
      case "completeness":
        return avgScore < 0.7 ? "secondary questions unaddressed" : "occasional missing details";
      case "tone":
        return avgScore < 0.7 ? "perceived as too direct" : "occasional bluntness";
      case "policy":
        return avgScore < 0.7 ? "missing policy references" : "occasionally missing disclaimers";
      default:
        return comparisonToTeam < 0 ? `below team average by ${(Math.abs(comparisonToTeam) * 100).toFixed(0)}%` : "within acceptable range";
    }
  }

  private getStrongestSignal(criterion: string, avgScore: number, comparisonToTeam: number): string {
    // Signals that are strongest
    switch (criterion.toLowerCase()) {
      case "accuracy":
        return avgScore >= 0.8 ? "clear verification statements" : "generally accurate";
      case "empathy":
        return avgScore >= 0.8 ? "warm and understanding tone" : "shows occasional warmth";
      case "completeness":
        return avgScore >= 0.8 ? "addresses all questions thoroughly" : "mostly covers concerns";
      case "tone":
        return avgScore >= 0.8 ? "professional and approachable" : "generally appropriate tone";
      case "policy":
        return avgScore >= 0.8 ? "policy properly cited" : "usually references guidelines";
      default:
        return comparisonToTeam >= 0 ? `at or above team average` : "needs improvement";
    }
  }

  private generateTrainingRecommendations(
    agentId: string,
    _samples: StoredEvaluation[],
    criteria: AgentPerformanceRecord["criteria"]
  ): string[] {
    const recommendations: string[] = [];

    // Find weakest criteria
    const weakest = criteria
      .filter(c => c.averageScore < 0.7)
      .sort((a, b) => a.averageScore - b.averageScore);

    if (weakest.length > 0) {
      recommendations.push(`Focus on improving ${weakest[0].criterion} skills — this is your lowest-scoring area.`);
    }

    // Find top-performing agent for potential shadowing
    const allSamples = this.getAllSamples();
    const agentReports: Array<{ agentId: string; avgScore: number }> = [];

    for (const id of Array.from(this.agentEvaluations.keys())) {
      const report = this.generateAgentReport(id);
      if (report && report.agentId !== agentId) {
        agentReports.push({ agentId: id, avgScore: report.overallQA.averageScore });
      }
    }

    if (agentReports.length > 0) {
      agentReports.sort((a, b) => b.avgScore - a.avgScore);
      const topAgentId = agentReports[0].agentId;
      const topAgentName = this.agentInfo.get(topAgentId)?.name ?? topAgentId;
      recommendations.push(`Consider shadowing ${topAgentName} to observe best practices.`);
    }

    // Check for declining trend
    const latestTrend = criteria.length > 0 ? criteria[0].trend : "stable";
    if (latestTrend === "declining") {
      recommendations.push("Your scores are trending downward — consider requesting additional coaching support.");
    }

    // Escalation check
    const samples = this.getAgentSamples(agentId);
    const escalatedCount = samples.filter(s => s.wasEscalated).length;
    const escalationRate = samples.length > 0 ? escalatedCount / samples.length : 0;

    if (escalationRate > 0.2) {
      recommendations.push("Your escalation rate is above team average — review handling of complex cases.");
    }

    // Limit to top 3 recommendations
    return recommendations.slice(0, 3);
  }

  private detectAgentsNeedingAttention(
    summaries: AgentPerformanceRecord[]
  ): AgentTeamSummary["agentsNeedingAttention"] {
    if (summaries.length === 0) {
      return [];
    }

    const teamAvg = summaries.reduce((sum, s) => sum + s.overallQA.averageScore, 0) / summaries.length;
    const needsAttention: AgentTeamSummary["agentsNeedingAttention"] = [];

    for (const summary of summaries) {
      const reasons: string[] = [];
      let severity: "critical" | "high" | "medium" = "medium";

      // Check overall QA vs team average
      if (summary.overallQA.averageScore < teamAvg - 0.2) {
        reasons.push(`QA score ${(summary.overallQA.averageScore * 100).toFixed(0)}% is 20+ points below team average`);
        severity = "high";
      }

      // Check escalation rate
      if (summary.escalationRate > 0.3) {
        reasons.push(`Escalation rate ${(summary.escalationRate * 100).toFixed(0)}% exceeds 30%`);
        severity = "critical";
      } else if (summary.escalationRate > 0.2) {
        reasons.push(`Escalation rate ${(summary.escalationRate * 100).toFixed(0)}% is elevated`);
        severity = "high";
      }

      // Check declining trend
      if (summary.overallQA.trend === "declining") {
        reasons.push("Scores are trending downward");
        if (severity !== "critical") severity = "high";
      }

      // Check sentiment trajectory
      if (summary.sentimentTrajectory === "declining") {
        reasons.push("Customer sentiment is declining");
        if (severity !== "critical") severity = "high";
      }

      if (reasons.length > 0) {
        needsAttention.push({
          agentId: summary.agentId,
          reason: reasons.join("; "),
          severity,
        });
      }
    }

    // Sort by severity descending
    return needsAttention.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 };
      return order[a.severity] - order[b.severity];
    });
  }
}
