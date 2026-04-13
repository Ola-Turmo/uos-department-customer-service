import type { CrossChannelSession, ChannelMessage, UnifiedIssueContext } from '../types.js';

/**
 * SessionContinuity
 * Handles cross-channel session continuity by building sessions from messages
 * and merging contexts from multiple channels.
 */
export default class SessionContinuity {
  /**
   * Build a CrossChannelSession from a customerId and array of channel messages.
   */
  buildSession(customerId: string, messages: ChannelMessage[]): CrossChannelSession {
    // Extract unique channels from messages
    const channelArray = messages.map((m) => m.channel);
    const uniqueChannels = Array.from(new Set(channelArray));

    // Determine channel preference (most frequently used channel)
    const channelCounts = new Map<ChannelMessage['channel'], number>();
    for (const msg of messages) {
      channelCounts.set(msg.channel, (channelCounts.get(msg.channel) || 0) + 1);
    }
    let channelPreference: ChannelMessage['channel'] = 'email';
    let maxCount = 0;
    channelCounts.forEach((count, channel) => {
      if (count > maxCount) {
        maxCount = count;
        channelPreference = channel;
      }
    });

    // Sort messages by timestamp
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Build unified context from messages
    const unifiedContext = this.buildUnifiedContextFromMessages(sortedMessages);

    // Generate a session ID
    const sessionId = `session-${customerId}-${Date.now()}`;

    return {
      sessionId,
      customerId,
      channels: uniqueChannels,
      messages: sortedMessages,
      unifiedContext,
      channelPreference,
    };
  }

  /**
   * Merge multiple UnifiedIssueContext objects into a single context.
   */
  mergeContexts(contexts: UnifiedIssueContext[]): UnifiedIssueContext {
    if (contexts.length === 0) {
      throw new Error('At least one context is required for merging');
    }

    if (contexts.length === 1) {
      return contexts[0];
    }

    // Merge customer profiles (take the most recent one by lastContactAt)
    const sortedByContact = [...contexts].sort(
      (a, b) => new Date(b.customerProfile.lastContactAt).getTime() - new Date(a.customerProfile.lastContactAt).getTime()
    );
    const mergedCustomerProfile = sortedByContact[0].customerProfile;

    // Merge allChannelHistory and sort by timestamp
    const allMessages: ChannelMessage[] = [];
    for (const ctx of contexts) {
      allMessages.push(...ctx.allChannelHistory);
    }
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Merge triage results (take highest confidence or most recent)
    const sortedByConfidence = [...contexts].sort(
      (a, b) => b.triageResult.confidence - a.triageResult.confidence
    );
    const mergedTriageResult = sortedByConfidence[0].triageResult;

    return {
      triageResult: mergedTriageResult,
      customerProfile: mergedCustomerProfile,
      allChannelHistory: allMessages,
    };
  }

  /**
   * Helper to build a UnifiedIssueContext from an array of messages.
   */
  private buildUnifiedContextFromMessages(messages: ChannelMessage[]): UnifiedIssueContext {
    // Default empty triage result
    const defaultTriageResult = {
      category: 'unknown',
      confidence: 0,
      sentiment: 'neutral' as const,
      sentimentIntensity: 0,
      escalationLevel: 0 as const,
      urgencyLevel: 'medium' as const,
      routingHint: 'general',
      evidence: [],
      responseDraft: '',
      intent: 'unknown',
      ambiguityDetected: false,
    };

    // Default empty customer profile
    const defaultCustomerProfile = {
      customerId: '',
      channels: [] as ChannelMessage['channel'][],
      lifetimeValue: 0,
      churnRisk: 'low' as const,
      sentimentTrajectory: 'stable' as const,
      lastContactAt: new Date().toISOString(),
      totalTickets: 0,
      openTickets: 0,
      avgResolutionTime: '0h',
      planTier: 'standard',
      accountTenureDays: 0,
      keyPatterns: [],
      recentEscalations: 0,
      preferredLanguage: 'en',
      slaTier: 'standard' as const,
    };

    return {
      triageResult: defaultTriageResult,
      customerProfile: defaultCustomerProfile,
      allChannelHistory: messages,
    };
  }
}
