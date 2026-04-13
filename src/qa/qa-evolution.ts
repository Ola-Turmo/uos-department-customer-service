/**
 * QA Rubric Auto-Evolution
 * VAL-DEPT-CS-QA-EVOLUTION: QA rubric doesn't stay static — evolves based on customer feedback
 *
 * The rubric evolves through:
 * 1. Human QA review → delta between AI score and human score captured
 * 2. Systematic drift detection → auto-adjust keyword weights
 * 3. CSAT correlation → criteria that predict CSAT are weighted higher
 * 4. Monthly review report generation
 */

import type { SentimentResult } from "../types.js";

// ============================================
// Types
// ============================================

export interface QACriterion {
  key: string; // e.g., "empathy", "accuracy", "completeness"
  label: string;
  description: string;
  weight: number; // 0-1, starts at 0.2 each (equal weight), evolves based on CSAT correlation
  keywordWeights: Record<string, number>; // keyword → weight contribution
  lastUpdated: string;
}

export interface QAEvaluationDelta {
  evaluationId: string;
  ticketId: string;
  timestamp: string;
  aiScores: Record<string, number>; // criterion → AI score (0-1)
  humanScores: Record<string, number>; // criterion → human score (0-1)
  deltas: Record<string, number>; // criterion → (human - ai)
  agentId?: string;
  csatScore?: number; // 1-5, if available
}

export interface RubricDriftEvent {
  criterion: string;
  direction: "under_scored" | "over_scored" | "stable";
  averageDelta: number; // positive = AI under-scoring, negative = AI over-scoring
  sampleSize: number;
  confidence: "high" | "medium" | "low";
  detectedAt: string;
  autoAdjustment?: number; // amount of weight adjustment applied
}

export interface CriterionCSATCorrelation {
  criterion: string;
  correlationCoefficient: number; // -1 to 1 (Pearson-like)
  sampleSize: number;
  isSignificant: boolean; // p < 0.05
  direction: "positive" | "negative" | "none";
}

export interface RubricEvolutionReport {
  period: { from: string; to: string };
  totalEvaluations: number;
  driftEvents: RubricDriftEvent[];
  csatCorrelations: CriterionCSATCorrelation[];
  weightAdjustments: Array<{ criterion: string; oldWeight: number; newWeight: number; reason: string }>;
  recommendations: string[]; // human-readable improvement suggestions
  generatedAt: string;
}

// ============================================
// Rubric Definition
// ============================================

const INITIAL_RUBRIC: QACriterion[] = [
  {
    key: "empathy",
    label: "Empathy & Tone",
    description: "Response acknowledges customer's emotional state and shows understanding",
    weight: 0.2,
    keywordWeights: {
      "sorry": 0.15, "understand": 0.12, "appreciate": 0.1, "frustrating": 0.12,
      "happy to help": 0.08, "completely": 0.08, "recognize": 0.08,
      "acknowledge": 0.1, "hear you": 0.1, "we apologize": 0.12,
      "that's a valid concern": 0.12, "I can see why": 0.1,
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    key: "accuracy",
    label: "Accuracy & Correctness",
    description: "Response provides factually correct information and solutions",
    weight: 0.2,
    keywordWeights: {
      "verified": 0.15, "confirmed": 0.12, "checked": 0.1, "accurate": 0.1,
      "correct": 0.1, "here's what": 0.12, "according to": 0.1,
      "specifically": 0.1, "in your case": 0.12,
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    key: "completeness",
    label: "Completeness",
    description: "Response addresses all parts of the customer's question/concern",
    weight: 0.2,
    keywordWeights: {
      "additionally": 0.1, "also": 0.08, "furthermore": 0.08, "as well": 0.08,
      "in addition": 0.1, "moreover": 0.08, "covering": 0.08, "answering": 0.1,
      "to summarize": 0.12, "in short": 0.1,
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    key: "tone",
    label: "Professional Tone",
    description: "Response maintains appropriate professional language and style",
    weight: 0.2,
    keywordWeights: {
      "kindly": 0.12, "please": 0.12, "would": 0.1, "could": 0.1,
      "appreciate": 0.1, "grateful": 0.1, "happy": 0.1, "wonderful": 0.08,
    },
    lastUpdated: new Date().toISOString(),
  },
  {
    key: "policy",
    label: "Policy Compliance",
    description: "Response follows company policy and terms of service",
    weight: 0.2,
    keywordWeights: {
      "our policy": 0.15, "according to our": 0.12, "unfortunately": 0.1,
      "not able to": 0.12, "unable to": 0.1, "policy": 0.08, "terms": 0.08,
      "violation": 0.1, "however": 0.08,
    },
    lastUpdated: new Date().toISOString(),
  },
];

// ============================================
// Engine
// ============================================

export class QAEvolutionEngine {
  private rubric: QACriterion[] = INITIAL_RUBRIC.map(r => ({ ...r }));
  private evaluationHistory: QAEvaluationDelta[] = [];
  private maxHistorySize = 1000;

  /**
   * Record a delta between AI evaluation and human review
   * Called after human QA review completes
   */
  recordDelta(delta: QAEvaluationDelta): void {
    this.evaluationHistory.push(delta);
    // Auto-trim oldest if over limit
    if (this.evaluationHistory.length > this.maxHistorySize) {
      this.evaluationHistory = this.evaluationHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Detect drift across all criteria
   * Analyzes recent evaluation history for systematic AI scoring errors
   */
  detectDrift(sampleWindow: number = 50): RubricDriftEvent[] {
    const samples = this.getSamples(sampleWindow);
    const events: RubricDriftEvent[] = [];

    for (const criterion of this.rubric) {
      const criterionDeltas = samples
        .map(s => s.deltas[criterion.key])
        .filter(d => d !== undefined && !isNaN(d));

      const sampleSize = criterionDeltas.length;

      if (sampleSize < 20) {
        continue;
      }

      const averageDelta = this.computeAverageDelta(criterion.key, sampleWindow);

      // If |averageDelta| > 0.15 AND sampleSize >= 20 → drift detected
      if (Math.abs(averageDelta) > 0.15) {
        const direction: RubricDriftEvent["direction"] =
          averageDelta > 0 ? "under_scored" : "over_scored";

        let confidence: RubricDriftEvent["confidence"];
        if (sampleSize >= 50) {
          confidence = "high";
        } else if (sampleSize >= 20) {
          confidence = "medium";
        } else {
          confidence = "low";
        }

        let autoAdjustment: number | undefined;
        if (direction === "under_scored") {
          autoAdjustment = 0.05;
        } else {
          autoAdjustment = -0.05;
        }

        events.push({
          criterion: criterion.key,
          direction,
          averageDelta,
          sampleSize,
          confidence,
          detectedAt: new Date().toISOString(),
          autoAdjustment,
        });
      }
    }

    return events;
  }

  /**
   * Compute CSAT correlations per criterion
   * Analyzes which criteria scores most predict customer satisfaction
   */
  computeCSATCorrelations(): CriterionCSATCorrelation[] {
    const correlations: CriterionCSATCorrelation[] = [];

    for (const criterion of this.rubric) {
      // Only evaluate criteria where we have >= 10 data points with CSAT scores
      const samplesWithCSAT = this.evaluationHistory.filter(
        s => s.csatScore !== undefined && s.aiScores[criterion.key] !== undefined
      );

      if (samplesWithCSAT.length < 10) {
        continue;
      }

      const aiScores = samplesWithCSAT.map(s => s.aiScores[criterion.key]);
      const csatScores = samplesWithCSAT.map(s => (s.csatScore! - 1) / 4); // normalize 1-5 to 0-1

      const correlationCoefficient = this.computeCorrelation(aiScores, csatScores);
      const sampleSize = samplesWithCSAT.length;

      // isSignificant: |correlation| > 0.3 AND sampleSize >= 20
      const isSignificant = Math.abs(correlationCoefficient) > 0.3 && sampleSize >= 20;

      let direction: CriterionCSATCorrelation["direction"];
      if (correlationCoefficient > 0.1) {
        direction = "positive";
      } else if (correlationCoefficient < -0.1) {
        direction = "negative";
      } else {
        direction = "none";
      }

      correlations.push({
        criterion: criterion.key,
        correlationCoefficient,
        sampleSize,
        isSignificant,
        direction,
      });
    }

    return correlations;
  }

  /**
   * Auto-adjust rubric based on detected drift
   * Only adjusts if drift confidence is high and sample size is sufficient
   */
  autoEvolve(): Array<{ criterion: string; oldWeight: number; newWeight: number; reason: string }> {
    const adjustments: Array<{ criterion: string; oldWeight: number; newWeight: number; reason: string }> = [];

    // Detect drift
    const driftEvents = this.detectDrift();

    // For each drift event where confidence == "high" AND sampleSize >= 30
    for (const event of driftEvents) {
      if (event.confidence === "high" && event.sampleSize >= 30 && event.autoAdjustment !== undefined) {
        const criterion = this.rubric.find(r => r.key === event.criterion);
        if (criterion) {
          const oldWeight = criterion.weight;
          const newWeight = Math.max(0.05, Math.min(0.5, oldWeight + event.autoAdjustment));
          const reason = `Drift detected: AI ${event.direction === "under_scored" ? "under-scoring" : "over-scoring"} (avg delta: ${event.averageDelta.toFixed(3)})`;

          this.adjustWeight(event.criterion, newWeight - oldWeight);
          adjustments.push({ criterion: event.criterion, oldWeight, newWeight, reason });
        }
      }
    }

    // Check CSAT correlations
    const csatCorrelations = this.computeCSATCorrelations();

    for (const corr of csatCorrelations) {
      const criterion = this.rubric.find(r => r.key === corr.criterion);
      if (!criterion) continue;

      // If criterion has strong positive correlation (≥0.5): increase weight by 0.05 (cap at 0.5)
      if (corr.correlationCoefficient >= 0.5) {
        const oldWeight = criterion.weight;
        const newWeight = Math.min(0.5, oldWeight + 0.05);
        if (newWeight > oldWeight) {
          const reason = `Strong positive CSAT correlation (${corr.correlationCoefficient.toFixed(3)}) - customers who rate high CSAT tend to get better ${corr.criterion} scores`;
          this.adjustWeight(corr.criterion, newWeight - oldWeight);
          adjustments.push({ criterion: corr.criterion, oldWeight, newWeight, reason });
        }
      }

      // If criterion has strong negative correlation (≤-0.5): decrease weight by 0.05 (floor at 0.05)
      if (corr.correlationCoefficient <= -0.5) {
        const oldWeight = criterion.weight;
        const newWeight = Math.max(0.05, oldWeight - 0.05);
        if (newWeight < oldWeight) {
          const reason = `Strong negative CSAT correlation (${corr.correlationCoefficient.toFixed(3)}) - high ${corr.criterion} scores don't translate to customer satisfaction`;
          this.adjustWeight(corr.criterion, newWeight - oldWeight);
          adjustments.push({ criterion: corr.criterion, oldWeight, newWeight, reason });
        }
      }
    }

    // Renormalize weights to sum to 1.0
    this.renormalizeWeights();

    return adjustments;
  }

  /**
   * Get current rubric state
   */
  getRubric(): QACriterion[] {
    return this.rubric.map(r => ({ ...r }));
  }

  /**
   * Get evaluation history
   */
  getHistory(limit?: number): QAEvaluationDelta[] {
    if (limit !== undefined) {
      return this.evaluationHistory.slice(-limit);
    }
    return [...this.evaluationHistory];
  }

  /**
   * Generate a full evolution report for a time period
   */
  generateReport(from?: string, to?: string): RubricEvolutionReport {
    const now = new Date();
    const toDate = to ? new Date(to) : now;
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Filter evaluations in period
    const evaluationsInPeriod = this.evaluationHistory.filter(e => {
      const evalDate = new Date(e.timestamp);
      return evalDate >= fromDate && evalDate <= toDate;
    });

    const driftEvents = this.detectDrift();
    const csatCorrelations = this.computeCSATCorrelations();
    const weightAdjustments = this.autoEvolve();

    // Generate recommendations
    const recommendations: string[] = [];

    for (const event of driftEvents) {
      if (event.direction === "under_scored") {
        const criterion = this.rubric.find(r => r.key === event.criterion);
        recommendations.push(
          `${criterion?.label ?? event.criterion} scores trending down vs human review (delta: ${event.averageDelta.toFixed(3)}). Consider adding more ${event.criterion}-related phrases to improve AI evaluation alignment.`
        );
      } else if (event.direction === "over_scored") {
        const criterion = this.rubric.find(r => r.key === event.criterion);
        recommendations.push(
          `${criterion?.label ?? event.criterion} AI scores running higher than human reviews (delta: ${event.averageDelta.toFixed(3)}). Review scoring criteria for potential inflation.`
        );
      }
    }

    for (const corr of csatCorrelations) {
      if (corr.isSignificant && corr.direction === "positive") {
        const criterion = this.rubric.find(r => r.key === corr.criterion);
        recommendations.push(
          `${criterion?.label ?? corr.criterion} strongly predicts CSAT (r=${corr.correlationCoefficient.toFixed(3)}). Consider emphasizing this criterion in agent training.`
        );
      }
    }

    // Check for criteria that need attention
    const lowWeightCriteria = this.rubric.filter(r => r.weight < 0.1);
    if (lowWeightCriteria.length > 0) {
      recommendations.push(
        `The following criteria have very low weights and may need review: ${lowWeightCriteria.map(c => c.label).join(", ")}.`
      );
    }

    return {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totalEvaluations: evaluationsInPeriod.length,
      driftEvents,
      csatCorrelations,
      weightAdjustments,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  // --- Internal methods ---

  /**
   * Compute average delta for a criterion over the sample window
   */
  private computeAverageDelta(criterion: string, window?: number): number {
    const samples = this.getSamples(window);
    const deltas = samples
      .map(s => s.deltas[criterion])
      .filter(d => d !== undefined && !isNaN(d));

    if (deltas.length === 0) return 0;

    const sum = deltas.reduce((acc, d) => acc + d, 0);
    return sum / deltas.length;
  }

  /**
   * Compute Pearson correlation coefficient between two arrays
   */
  private computeCorrelation(scores1: number[], scores2: number[]): number {
    if (scores1.length !== scores2.length || scores1.length < 2) {
      return 0;
    }

    const n = scores1.length;
    const mean1 = scores1.reduce((a, b) => a + b, 0) / n;
    const mean2 = scores2.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = scores1[i] - mean1;
      const diff2 = scores2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Adjust weight for a criterion by a given amount
   * Clamps to [0.05, 0.5]
   */
  private adjustWeight(criterion: string, adjustment: number): void {
    const crit = this.rubric.find(r => r.key === criterion);
    if (crit) {
      crit.weight = Math.max(0.05, Math.min(0.5, crit.weight + adjustment));
      crit.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Renormalize all weights to sum to 1.0
   */
  private renormalizeWeights(): void {
    const totalWeight = this.rubric.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight > 0) {
      for (const r of this.rubric) {
        r.weight = r.weight / totalWeight;
        r.lastUpdated = new Date().toISOString();
      }
    }
  }

  /**
   * Get samples from the evaluation history
   */
  private getSamples(window?: number): QAEvaluationDelta[] {
    if (window !== undefined && window > 0) {
      return this.evaluationHistory.slice(-window);
    }
    return this.evaluationHistory;
  }
}

// ============================================
// Export singleton
// ============================================

export const qaEvolutionEngine = new QAEvolutionEngine();
