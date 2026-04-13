/**
 * UOS Customer Service — Agent Coaching
 * Provides per-agent coaching recommendations based on QA evaluation data.
 */

import type { AgentPerformance, QAEvaluation } from '../types.js';

/**
 * AgentCoaching generates actionable coaching tips and identifies
 * performance strengths and weaknesses for customer service agents.
 */
export default class AgentCoaching {
  /**
   * Generate personalized coaching tips based on agent performance data.
   * Tips focus on areas needing improvement while reinforcing strengths.
   */
  generateTips(performance: AgentPerformance): string[] {
    const tips: string[] = [];

    // Recommend focusing on weakest criteria
    if (performance.weakestCriteria.length > 0) {
      const weakest = performance.weakestCriteria[0];
      tips.push(
        `Focus on improving your ${weakest} skills — consider reviewing the ${weakest} rubric and past successful cases.`
      );
    }

    // Recommend leveraging strongest areas
    if (performance.strongestCriteria.length > 0) {
      const strongest = performance.strongestCriteria[0];
      tips.push(
        `Your ${strongest} performance is exemplary — look for opportunities to mentor colleagues in this area.`
      );
    }

    // Address escalation rate if high
    if (performance.escalationRate > 0.15) {
      tips.push(
        `Your escalation rate is ${(performance.escalationRate * 100).toFixed(0)}%. Consider reviewing when to autonomously resolve vs. escalate.`
      );
    } else if (performance.escalationRate < 0.05 && performance.avgQAScore < 80) {
      tips.push(
        `Low escalation rate but moderate QA scores — ensure you're not under-escalating complex issues.`
      );
    }

    // Address resolution time
    const resolutionMinutes = this.parseResolutionTime(performance.avgResolutionTime);
    if (resolutionMinutes > 45) {
      tips.push(
        `Your average resolution time is ${performance.avgResolutionTime}. Look for opportunities to streamline your workflow.`
      );
    }

    // General QA score feedback
    if (performance.avgQAScore >= 90) {
      tips.push(`Outstanding performance with a ${performance.avgQAScore.toFixed(1)}% average QA score — maintain this standard.`);
    } else if (performance.avgQAScore >= 75) {
      tips.push(`Your ${performance.avgQAScore.toFixed(1)}% average QA score is solid — aim for 90%+ to reach excellence.`);
    } else {
      tips.push(
        `Your ${performance.avgQAScore.toFixed(1)}% average QA score indicates significant room for improvement. Prioritize the coaching plan.`
      );
    }

    // Supplement with any pre-existing coaching tips
    if (performance.coachingTips.length > 0) {
      tips.push(...performance.coachingTips.slice(0, 2));
    }

    return [...new Set(tips)]; // Deduplicate
  }

  /**
   * Identify the agent's strongest performance areas.
   */
  getStrongestAreas(performance: AgentPerformance): string[] {
    // Return pre-identified strongest criteria if available
    if (performance.strongestCriteria.length > 0) {
      return performance.strongestCriteria;
    }

    // Fallback: derive from criteria scores (top 3)
    return this.getTopCriteria(performance.criteriaScores, 3);
  }

  /**
   * Identify the agent's weakest performance areas.
   */
  getWeakestAreas(performance: AgentPerformance): string[] {
    // Return pre-identified weakest criteria if available
    if (performance.weakestCriteria.length > 0) {
      return performance.weakestCriteria;
    }

    // Fallback: derive from criteria scores (bottom 3)
    return this.getBottomCriteria(performance.criteriaScores, 3);
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Parse resolution time string (e.g., "1h 23m") to total minutes.
   */
  private parseResolutionTime(resolutionTime: string): number {
    const hourMatch = resolutionTime.match(/(\d+)h/);
    const minMatch = resolutionTime.match(/(\d+)m/);

    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;

    return hours * 60 + minutes;
  }

  /**
   * Get top N criteria by score.
   */
  private getTopCriteria(
    criteriaScores: Record<string, number>,
    count: number
  ): string[] {
    return Object.entries(criteriaScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([name]) => name);
  }

  /**
   * Get bottom N criteria by score.
   */
  private getBottomCriteria(
    criteriaScores: Record<string, number>,
    count: number
  ): string[] {
    return Object.entries(criteriaScores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, count)
      .map(([name]) => name);
  }
}
