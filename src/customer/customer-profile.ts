import {
  CustomerProfile,
  Channel,
  ChurnRisk,
  SentimentTrajectory,
  SLATier,
  TriageResult,
  ChannelMessage,
} from '../types.js';

/**
 * Customer360Synthesizer
 *
 * Aggregates customer interaction history and triage results to produce
 * a comprehensive 360-degree customer profile.
 */
export class Customer360Synthesizer {
  /**
   * Synthesizes a full CustomerProfile for a given customer.
   *
   * @param customerId - Unique identifier for the customer
   * @param history - Array of channel messages representing interaction history
   * @param recentTriages - Array of recent triage results for the customer
   * @returns A fully populated CustomerProfile
   */
  synthesize(
    customerId: string,
    history: ChannelMessage[],
    recentTriages: TriageResult[]
  ): CustomerProfile {
    const channels = this.deriveChannels(history);
    const churnRisk = this.calculateChurnRisk(recentTriages, history);
    const sentimentTrajectory = this.deriveSentimentTrajectory(recentTriages);
    const lastContactAt = this.deriveLastContactAt(history);
    const totalTickets = recentTriages.length;
    const openTickets = this.deriveOpenTickets(recentTriages);
    const avgResolutionTime = this.deriveAvgResolutionTime(recentTriages);
    const keyPatterns = this.deriveKeyPatterns(recentTriages, history);
    const recentEscalations = this.countRecentEscalations(recentTriages);
    const preferredLanguage = this.derivePreferredLanguage(history);
    const slaTier = this.deriveSLATier(totalTickets, recentEscalations);
    const lifetimeValue = this.estimateLifetimeValue(history, recentTriages);
    const accountTenureDays = this.deriveAccountTenureDays(history);
    const planTier = this.derivePlanTier(slaTier, lifetimeValue);

    return {
      customerId,
      channels,
      lifetimeValue,
      churnRisk,
      sentimentTrajectory,
      lastContactAt,
      totalTickets,
      openTickets,
      avgResolutionTime,
      planTier,
      accountTenureDays,
      keyPatterns,
      recentEscalations,
      preferredLanguage,
      slaTier,
    };
  }

  private deriveChannels(history: ChannelMessage[]): Channel[] {
    const channelSet = new Set<Channel>();
    for (const msg of history) {
      channelSet.add(msg.channel);
    }
    return Array.from(channelSet);
  }

  private calculateChurnRisk(
    recentTriages: TriageResult[],
    history: ChannelMessage[]
  ): ChurnRisk {
    if (recentTriages.length === 0) return 'low';

    const negativeCount = recentTriages.filter(
      (t) => t.sentiment === 'negative'
    ).length;
    const highEscalationCount = recentTriages.filter(
      (t) => t.escalationLevel >= 2
    ).length;
    const criticalUrgencyCount = recentTriages.filter(
      (t) => t.urgencyLevel === 'critical'
    ).length;

    const negativeRatio = negativeCount / recentTriages.length;
    const recentActivity = history.filter((msg) => {
      const msgTime = new Date(msg.timestamp).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return msgTime >= thirtyDaysAgo;
    }).length;

    if (negativeRatio >= 0.6 || highEscalationCount >= 2 || criticalUrgencyCount >= 1) {
      return 'critical';
    }
    if (negativeRatio >= 0.4 || highEscalationCount >= 1 || recentActivity >= 20) {
      return 'high';
    }
    if (negativeRatio >= 0.2 || recentActivity >= 10) {
      return 'medium';
    }
    return 'low';
  }

  private deriveSentimentTrajectory(recentTriages: TriageResult[]): SentimentTrajectory {
    if (recentTriages.length < 2) return 'stable';

    const sortedTriages = [...recentTriages].sort(
      (a, b) => new Date(a.evidence[0]?.content ?? 0).getTime() - new Date(b.evidence[0]?.content ?? 0).getTime()
    );

    const sentimentScores = sortedTriages.map((t) => {
      if (t.sentiment === 'positive') return 1;
      if (t.sentiment === 'negative') return -1;
      return 0;
    });

    const recent = sentimentScores.slice(-Math.ceil(sentimentScores.length / 2));
    const older = sentimentScores.slice(0, Math.floor(sentimentScores.length / 2));

    const recentAvg = recent.reduce<number>((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce<number>((a, b) => a + b, 0) / older.length : recentAvg;

    const delta = recentAvg - olderAvg;
    if (delta > 0.2) return 'improving';
    if (delta < -0.2) return 'declining';
    return 'stable';
  }

  private deriveLastContactAt(history: ChannelMessage[]): string {
    if (history.length === 0) return new Date().toISOString();

    const sorted = [...history].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0].timestamp;
  }

  private deriveOpenTickets(recentTriages: TriageResult[]): number {
    // In a real system, this would check ticket status
    // For now, we estimate based on unresolved categories
    return Math.min(recentTriages.length, Math.floor(recentTriages.length * 0.3));
  }

  private deriveAvgResolutionTime(recentTriages: TriageResult[]): string {
    if (recentTriages.length === 0) return '0h';

    // Estimate based on triage complexity
    const totalWeight = recentTriages.reduce((sum, t) => {
      return sum + t.escalationLevel + (t.urgencyLevel === 'critical' ? 2 : 0);
    }, 0);

    const avgHours = Math.round(totalWeight / recentTriages.length) + 1;
    return `${avgHours}h`;
  }

  private deriveKeyPatterns(
    recentTriages: TriageResult[],
    history: ChannelMessage[]
  ): string[] {
    const patterns: string[] = [];

    const categoryCount: Record<string, number> = {};
    for (const triage of recentTriages) {
      categoryCount[triage.category] = (categoryCount[triage.category] || 0) + 1;
    }

    const dominantCategory = Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (dominantCategory) {
      const [category, count] = dominantCategory;
      if (count >= recentTriages.length * 0.5) {
        patterns.push(`${category.toLowerCase()}-focused`);
      }
    }

    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const triage of recentTriages) {
      sentimentCounts[triage.sentiment]++;
    }

    if (sentimentCounts.negative > sentimentCounts.positive) {
      patterns.push('sentiment-challenged');
    }

    const channels = this.deriveChannels(history);
    if (channels.length >= 3) {
      patterns.push('multi-channel-user');
    }

    const inboundCount = history.filter((m) => m.direction === 'inbound').length;
    if (inboundCount > history.length * 0.8) {
      patterns.push('passive-reporter');
    }

    const criticalCount = recentTriages.filter(
      (t) => t.urgencyLevel === 'critical'
    ).length;
    if (criticalCount >= 2) {
      patterns.push('high-urgency-prone');
    }

    return Array.from(new Set(patterns));
  }

  private countRecentEscalations(recentTriages: TriageResult[]): number {
    return recentTriages.filter((t) => t.escalationLevel >= 2).length;
  }

  private derivePreferredLanguage(history: ChannelMessage[]): string {
    if (history.length === 0) return 'en';

    // In a real implementation, this would use NLP to detect language
    // For now, return a default
    return 'en';
  }

  private deriveSLATier(totalTickets: number, recentEscalations: number): SLATier {
    if (recentEscalations >= 3 || totalTickets >= 50) return 'enterprise';
    if (recentEscalations >= 1 || totalTickets >= 20) return 'priority';
    return 'standard';
  }

  private estimateLifetimeValue(
    history: ChannelMessage[],
    recentTriages: TriageResult[]
  ): number {
    // Simple estimation based on interaction volume
    const messageCount = history.length;
    const ticketCount = recentTriages.length;

    // Base value + per-interaction value
    const baseValue = 500;
    const messageValue = messageCount * 10;
    const ticketValue = ticketCount * 50;

    return baseValue + messageValue + ticketValue;
  }

  private deriveAccountTenureDays(history: ChannelMessage[]): number {
    if (history.length === 0) return 0;

    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const oldest = new Date(sorted[0].timestamp).getTime();
    const now = Date.now();

    return Math.floor((now - oldest) / (24 * 60 * 60 * 1000));
  }

  private derivePlanTier(slaTier: SLATier, lifetimeValue: number): string {
    if (slaTier === 'enterprise' || lifetimeValue > 5000) return 'enterprise';
    if (slaTier === 'priority' || lifetimeValue > 1000) return 'professional';
    return 'starter';
  }
}
