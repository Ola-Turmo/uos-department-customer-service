import {
  ChurnRiskResult,
  ChurnRiskScore,
  CustomerProfile,
} from '../types.js';

/**
 * ChurnRiskScorer
 *
 * Analyzes customer profiles to predict churn risk and generate
 * retention recommendations.
 */
export default class ChurnRiskScorer {
  /**
   * Scores a customer's churn risk based on their profile data.
   *
   * @param profile - The customer profile to score
   * @returns A ChurnRiskResult with score, factors, recommended actions, and playbook
   */
  score(profile: CustomerProfile): ChurnRiskResult {
    const factors: string[] = [];
    const recommendedActions: string[] = [];

    // Calculate risk score based on multiple factors
    let riskScore = this.calculateBaseScore(profile, factors, recommendedActions);

    // Adjust for sentiment trajectory
    riskScore = this.adjustForSentimentTrajectory(profile, riskScore, factors, recommendedActions);

    // Adjust for account tenure
    riskScore = this.adjustForAccountTenure(profile, riskScore, factors, recommendedActions);

    // Adjust for engagement patterns
    riskScore = this.adjustForEngagement(profile, riskScore, factors, recommendedActions);

    // Adjust for value and SLA tier
    riskScore = this.adjustForValueAndSLA(profile, riskScore, factors, recommendedActions);

    // Determine final churn risk score
    const score = this.determineChurnRiskScore(riskScore);

    // Generate retention playbook based on score and factors
    const retentionPlaybook = this.generateRetentionPlaybook(score, factors, profile);

    return {
      customerId: profile.customerId,
      score,
      factors,
      recommendedActions,
      retentionPlaybook,
    };
  }

  private calculateBaseScore(
    profile: CustomerProfile,
    factors: string[],
    recommendedActions: string[]
  ): number {
    let score = 50; // Neutral baseline

    // Factor: existing churn risk assessment
    switch (profile.churnRisk) {
      case 'critical':
        score += 40;
        factors.push('Existing churn risk is marked as critical');
        recommendedActions.push('Immediate executive outreach recommended');
        break;
      case 'high':
        score += 25;
        factors.push('Existing churn risk is marked as high');
        recommendedActions.push('Schedule proactive retention call');
        break;
      case 'medium':
        score += 10;
        factors.push('Existing churn risk is marked as medium');
        break;
      case 'low':
        score -= 10;
        factors.push('Existing churn risk is marked as low');
        break;
    }

    // Factor: open tickets ratio
    const openTicketRatio = profile.totalTickets > 0
      ? profile.openTickets / profile.totalTickets
      : 0;

    if (openTicketRatio > 0.5) {
      score += 20;
      factors.push(`High ratio of open tickets (${profile.openTickets}/${profile.totalTickets})`);
      recommendedActions.push('Prioritize resolution of open tickets');
    } else if (openTicketRatio > 0.3) {
      score += 10;
      factors.push(`Moderate open ticket ratio (${profile.openTickets}/${profile.totalTickets})`);
    }

    // Factor: recent escalations
    if (profile.recentEscalations >= 3) {
      score += 30;
      factors.push(`High number of recent escalations (${profile.recentEscalations})`);
      recommendedActions.push('Conduct root cause analysis on escalation pattern');
    } else if (profile.recentEscalations >= 1) {
      score += 15;
      factors.push(`Recent escalations detected (${profile.recentEscalations})`);
    }

    return score;
  }

  private adjustForSentimentTrajectory(
    profile: CustomerProfile,
    score: number,
    factors: string[],
    recommendedActions: string[]
  ): number {
    switch (profile.sentimentTrajectory) {
      case 'declining':
        score += 25;
        factors.push('Sentiment trajectory is declining');
        recommendedActions.push('Implement sentiment recovery campaign');
        break;
      case 'stable':
        score += 5;
        break;
      case 'improving':
        score -= 15;
        factors.push('Sentiment trajectory is improving');
        break;
    }
    return score;
  }

  private adjustForAccountTenure(
    profile: CustomerProfile,
    score: number,
    factors: string[],
    recommendedActions: string[]
  ): number {
    // New accounts are more at risk
    if (profile.accountTenureDays < 30) {
      score += 20;
      factors.push('New account (< 30 days tenure)');
      recommendedActions.push('Onboarding check-in recommended');
    } else if (profile.accountTenureDays < 90) {
      score += 10;
      factors.push('Relatively new account (< 90 days tenure)');
    } else if (profile.accountTenureDays > 365 * 3) {
      score -= 10;
      factors.push('Long-tenured account (> 3 years)');
    }

    return score;
  }

  private adjustForEngagement(
    profile: CustomerProfile,
    score: number,
    factors: string[],
    recommendedActions: string[]
  ): number {
    // Check for concerning patterns
    const concerningPatterns = ['sentiment-challenged', 'high-urgency-prone', 'billing-sensitive'];
    const matchedPatterns = profile.keyPatterns.filter(p => concerningPatterns.includes(p));

    for (const pattern of matchedPatterns) {
      switch (pattern) {
        case 'sentiment-challenged':
          score += 15;
          factors.push('Customer has sentiment-challenged pattern');
          recommendedActions.push('Empathy-focused engagement recommended');
          break;
        case 'high-urgency-prone':
          score += 15;
          factors.push('Customer has high-urgency-prone pattern');
          break;
        case 'billing-sensitive':
          score += 10;
          factors.push('Customer is billing-sensitive');
          recommendedActions.push('Offer billing optimization review');
          break;
      }
    }

    // Low engagement (few channels)
    if (profile.channels.length === 1) {
      score += 5;
      factors.push('Single-channel engagement');
    }

    return score;
  }

  private adjustForValueAndSLA(
    profile: CustomerProfile,
    score: number,
    factors: string[],
    recommendedActions: string[]
  ): number {
    // High value customers get some protection
    if (profile.lifetimeValue > 5000) {
      score -= 15;
      factors.push('High lifetime value customer');
      recommendedActions.push('Consider exclusive retention offer');
    } else if (profile.lifetimeValue > 1000) {
      score -= 5;
      factors.push('Medium lifetime value customer');
    }

    // SLA tier consideration
    if (profile.slaTier === 'enterprise') {
      score -= 10;
      factors.push('Enterprise SLA tier customer');
    } else if (profile.slaTier === 'priority') {
      score -= 5;
      factors.push('Priority SLA tier customer');
    }

    return score;
  }

  private determineChurnRiskScore(riskScore: number): ChurnRiskScore {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private generateRetentionPlaybook(
    score: ChurnRiskScore,
    factors: string[],
    profile: CustomerProfile
  ): string {
    switch (score) {
      case 'critical':
        return `CRITICAL RISK PLAYBOOK: Immediate action required for customer ${profile.customerId}. ` +
          `Key risk factors: ${factors.join('; ')}. ` +
          `Recommended: Executive-to-executive outreach, comprehensive account review, ` +
          `and personalized retention offer within 24 hours.`;
      case 'high':
        return `HIGH RISK PLAYBOOK: Proactive retention needed for customer ${profile.customerId}. ` +
          `Risk indicators: ${factors.join('; ')}. ` +
          `Recommended: Senior support rep assignment, proactive check-in call, ` +
          `and satisfaction survey within 7 days.`;
      case 'medium':
        return `MEDIUM RISK PLAYBOOK: Monitor and engage customer ${profile.customerId}. ` +
          `Factors to watch: ${factors.join('; ')}. ` +
          `Recommended: Regular touchpoints, share relevant success stories, ` +
          `and ensure excellent resolution on all open tickets.`;
      case 'low':
        return `LOW RISK PLAYBOOK: Maintain relationship with customer ${profile.customerId}. ` +
          `Positive factors: ${factors.join('; ')}. ` +
          `Recommended: Continue standard engagement, identify expansion opportunities, ` +
          `and gather testimonials if satisfied.`;
    }
  }
}