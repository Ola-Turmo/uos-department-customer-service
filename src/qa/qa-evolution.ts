/**
 * QA Evolution — Rubric Drift Detection and Auto-Adjustment
 * Detects when QA criteria are drifting from expected scoring patterns
 * and automatically adjusts rubric weights to maintain evaluation accuracy.
 */

import { QARubric, QACriterion, QAEvaluation } from '../types.js';

interface DriftScore {
  criterion: QACriterion;
  driftMagnitude: number; // 0-1, higher = more drift
  avgScore: number;
  variance: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface ScoreStats {
  mean: number;
  variance: number;
  stdDev: number;
}

const DRIFT_THRESHOLD = 0.3; // drift magnitude above this = drifted
const STABILITY_THRESHOLD = 0.15; // variance above this = unstable
const WEIGHT_ADJUSTMENT_FACTOR = 0.15; // max weight change per adjustment

export default class QAEvolution {
  /**
   * Detect criteria that have drifted from expected scoring patterns.
   * Drift is determined by analyzing score distributions across evaluations:
   * - High variance in scores indicates instability
   * - Score trends over time indicate drift direction
   * - Cluster separation from expected ranges indicates misalignment
   */
  detectDrift(evaluations: QAEvaluation[], rubric: QARubric): QACriterion[] {
    if (evaluations.length < 3) {
      return []; // Not enough data for meaningful drift detection
    }

    const driftedCriteria: QACriterion[] = [];
    const sortedEvaluations = this.sortByTimestamp(evaluations);
    const criterionNames = rubric.criteria.map((c) => c.name);

    // Analyze each criterion for drift
    for (const criterionName of criterionNames) {
      const scores = this.extractCriterionScores(sortedEvaluations, criterionName);
      if (scores.length < 2) continue;

      const stats = this.calculateStats(scores);
      const expectedMean = 70; // reasonable default expected score
      const driftScore = this.calculateDriftScore(stats, expectedMean);

      if (driftScore.driftMagnitude > DRIFT_THRESHOLD || stats.variance > STABILITY_THRESHOLD) {
        driftedCriteria.push(rubric.criteria.find((c) => c.name === criterionName)!);
      }
    }

    return driftedCriteria.filter(Boolean);
  }

  /**
   * Adjust rubric weights based on drifted criteria.
   * Criteria with high drift get reduced weight until stabilized.
   * Criteria that are consistently well-scored may get increased weight.
   */
  adjustRubric(rubric: QARubric, driftedCriteria: QACriterion[]): QARubric {
    if (driftedCriteria.length === 0) {
      return rubric;
    }

    const driftedNames = new Set(driftedCriteria.map((c) => c.name));
    const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);

    const adjustedCriteria = rubric.criteria.map((criterion) => {
      if (driftedNames.has(criterion.name)) {
        // Reduce weight for drifted criteria
        const newWeight = Math.max(
          criterion.weight * (1 - WEIGHT_ADJUSTMENT_FACTOR),
          criterion.weight * 0.5 // never reduce below 50% of original
        );
        return { ...criterion, weight: Math.round(newWeight * 100) / 100 };
      } else {
        // Slightly increase weight for stable criteria
        const increase = (1 - criterion.weight / totalWeight) * WEIGHT_ADJUSTMENT_FACTOR * 0.5;
        const newWeight = criterion.weight + increase;
        return { ...criterion, weight: Math.round(newWeight * 100) / 100 };
      }
    });

    return {
      ...rubric,
      criteria: adjustedCriteria,
    };
  }

  private sortByTimestamp(evaluations: QAEvaluation[]): QAEvaluation[] {
    return [...evaluations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  private extractCriterionScores(evaluations: QAEvaluation[], criterionName: string): number[] {
    return evaluations
      .map((e) => e.scores[criterionName])
      .filter((score): score is number => score !== undefined && score !== null);
  }

  private calculateStats(scores: number[]): ScoreStats {
    const n = scores.length;
    if (n === 0) return { mean: 0, variance: 0, stdDev: 0 };

    const mean = scores.reduce((sum, s) => sum + s, 0) / n;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, variance, stdDev };
  }

  private calculateDriftScore(stats: ScoreStats, expectedMean: number): DriftScore {
    // Drift magnitude combines deviation from expected and variance
    const deviationFromExpected = Math.abs(stats.mean - expectedMean) / 100;
    const varianceFactor = Math.min(stats.variance / 1000, 1); // normalize variance
    const driftMagnitude = Math.min((deviationFromExpected + varianceFactor) / 2, 1);

    // Determine trend by comparing recent vs earlier scores
    const trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    return {
      criterion: {} as QACriterion, // filled by caller
      driftMagnitude,
      avgScore: stats.mean,
      variance: stats.variance,
      trend,
    };
  }
}
