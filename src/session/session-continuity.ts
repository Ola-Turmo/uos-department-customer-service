/**
 * Session Continuity Manager
 * VAL-DEPT-CS-SESSION: A customer starts on WhatsApp, continues via email, resolves on chat — without repeating themselves
 *
 * Manages unified session IDs across channels, carries context forward,
 * merges triage from multiple channels, and learns channel preferences.
 */

import type { TriageResult, SentimentResult } from "../types.js";

// ============================================
// Types
// ============================================

export type Channel = "email" | "chat" | "whatsapp" | "phone" | "twitter" | "app";

export interface ChannelPreference {
  preferredChannel: Channel;
  avgResponseTimeMinutes: number;
  avgCSAT: number;
  totalInteractions: number;
}

export interface ChannelInteraction {
  channel: Channel;
  channelInteractionId: string;
  timestamp: string;
  triageResult?: TriageResult;
  sentiment?: SentimentResult;
  agentResponse?: string;
  wasEscalated: boolean;
  wasResolved: boolean;
  channelMessageCount: number;
  lastMessageAt: string;
}

export interface UnifiedSession {
  sessionId: string;
  customerId: string;
  primaryChannel: Channel; // channel where session started
  currentChannel: Channel;   // channel where customer is currently active
  interactions: ChannelInteraction[];
  mergedTriageContext: TriageResult | null; // merged from all channels
  mergedSentiment: SentimentResult | null;
  sentimentTrajectory: "improving" | "stable" | "declining" | "unknown";
  status: "active" | "pending_human" | "resolved" | "closed";
  createdAt: string;
  lastActivityAt: string;
  resolvedAt?: string;
  preferredChannel: Channel;
  channelPreferenceLearned: boolean;
  // Summary across all interactions
  totalInteractions: number;
  channelsUsed: Channel[];
  unresolvedTopics: string[]; // topics mentioned but not yet resolved
  escalatedTopics: string[];   // topics that triggered escalation
}

export interface SessionMergeResult {
  sessionId: string;
  isNewSession: boolean;
  session: UnifiedSession;
  triageCarriedForward: boolean;
  channelsNowActive: Channel[];
  unresolvedTopics: string[];
}

// ============================================
// Session Continuity Manager
// ============================================

export class SessionContinuityManager {
  private sessions: Map<string, UnifiedSession> = new Map();
  private customerToSession: Map<string, string> = new Map(); // customerId → active sessionId
  private maxSessionsPerCustomer = 10;
  private unresolvedTopicKeywords = [
    "still", "not resolved", "didn't", "doesn't work", "still having",
    "still broken", "still wrong", "waiting", "following up", "nothing happened",
  ];

  // --- Public API ---

  /**
   * Start or continue a session for a customer on a specific channel
   */
  getOrCreateSession(params: {
    customerId: string;
    channel: Channel;
    channelInteractionId?: string;
    triageResult?: TriageResult;
    sentiment?: SentimentResult;
    messageText?: string;
  }): SessionMergeResult {
    const { customerId, channel, channelInteractionId, triageResult, sentiment, messageText } = params;
    const now = new Date().toISOString();
    const existingSessionId = this.customerToSession.get(customerId);

    // Check if customer has an active session that was active within 24h
    if (existingSessionId) {
      const existingSession = this.sessions.get(existingSessionId);
      if (existingSession && existingSession.status !== "closed") {
        const lastActivity = new Date(existingSession.lastActivityAt);
        const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);

        // Session is still active (within 24h)
        if (hoursSinceActivity < 24) {
          return this.continueExistingSession(existingSession, channel, channelInteractionId, triageResult, sentiment, messageText, now);
        }

        // Session is >7 days old - create new session
        const createdAt = new Date(existingSession.createdAt);
        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > 7) {
          return this.createNewSession(customerId, channel, channelInteractionId, triageResult, sentiment, messageText, now);
        }
      }
    }

    // No active session or session is stale - check if we have any session at all
    if (existingSessionId) {
      const existingSession = this.sessions.get(existingSessionId);
      if (existingSession) {
        // Session exists but is stale - archive and create new
        return this.createNewSession(customerId, channel, channelInteractionId, triageResult, sentiment, messageText, now);
      }
    }

    // No session exists - create new
    return this.createNewSession(customerId, channel, channelInteractionId, triageResult, sentiment, messageText, now);
  }

  /**
   * Record an agent response in the current channel interaction
   */
  recordAgentResponse(sessionId: string, agentResponse: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Find the most recent interaction for this session
    const lastInteraction = session.interactions[session.interactions.length - 1];
    if (lastInteraction) {
      lastInteraction.agentResponse = agentResponse;
    }

    // Check if this is a resolution message - if so, check for resolved topics
    const lowerResponse = agentResponse.toLowerCase();
    const resolutionKeywords = ["resolved", "fixed", "solved", "taken care of", "done", "completed"];
    const isResolutionMessage = resolutionKeywords.some(keyword => lowerResponse.includes(keyword));

    if (isResolutionMessage) {
      // Mark the last interaction as resolved
      if (lastInteraction) {
        lastInteraction.wasResolved = true;
      }

      // Remove resolved topics from unresolvedTopics
      const resolutionIndicators = ["issue", "problem", "matter", "question", "concern", "request"];
      for (const topic of [...session.unresolvedTopics]) {
        if (resolutionIndicators.some(indicator => lowerResponse.includes(indicator))) {
          session.unresolvedTopics = session.unresolvedTopics.filter(t => t !== topic);
        }
      }

      // If all topics are resolved, close the session
      if (session.unresolvedTopics.length === 0 && session.status === "resolved") {
        session.status = "closed";
        session.resolvedAt = new Date().toISOString();
      }
    }

    session.lastActivityAt = new Date().toISOString();
  }

  /**
   * Record that this session was escalated
   */
  recordEscalation(sessionId: string, topic: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Find the most recent interaction
    const lastInteraction = session.interactions[session.interactions.length - 1];
    if (lastInteraction) {
      lastInteraction.wasEscalated = true;
    }

    // Add topic to escalatedTopics if not already there
    if (!session.escalatedTopics.includes(topic)) {
      session.escalatedTopics.push(topic);
    }

    // Update status if not already pending_human
    if (session.status === "active") {
      session.status = "pending_human";
    }

    session.lastActivityAt = new Date().toISOString();
  }

  /**
   * Record that an issue was resolved
   */
  recordResolution(sessionId: string, resolvedTopics?: string[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Mark the most recent interaction as resolved
    const lastInteraction = session.interactions[session.interactions.length - 1];
    if (lastInteraction) {
      lastInteraction.wasResolved = true;
    }

    // Remove resolved topics from unresolvedTopics
    if (resolvedTopics && resolvedTopics.length > 0) {
      session.unresolvedTopics = session.unresolvedTopics.filter(
        topic => !resolvedTopics.includes(topic)
      );
    }

    // Set status to resolved
    session.status = "resolved";
    session.resolvedAt = new Date().toISOString();

    // If all topics are resolved, also close the session
    if (session.unresolvedTopics.length === 0) {
      session.status = "closed";
    }

    session.lastActivityAt = new Date().toISOString();
  }

  /**
   * Merge new triage context from a new channel into existing session
   */
  mergeTriageContext(sessionId: string, triageResult: TriageResult, sentiment: SentimentResult): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = new Date().toISOString();

    // If session has no merged triage context yet, set it
    if (!session.mergedTriageContext) {
      session.mergedTriageContext = { ...triageResult };
      session.mergedSentiment = { ...sentiment };
    } else {
      // Merge with existing triage - use the WORSE of the two
      const existing = session.mergedTriageContext;
      const incoming = triageResult;

      // Escalation level: use the higher (worse) level
      const existingEscalation = existing.escalationLevel;
      const incomingEscalation = incoming.escalationLevel;
      const maxEscalation = Math.max(existingEscalation, incomingEscalation) as 0 | 1 | 2 | 3;
      existing.escalationLevel = maxEscalation;

      // If either recommends escalation, keep escalation
      if (incoming.routingRecommendation.specialistRoleKey || incoming.routingRecommendation.channel) {
        if (!existing.routingRecommendation.specialistRoleKey && !existing.routingRecommendation.channel) {
          existing.routingRecommendation = { ...incoming.routingRecommendation };
        }
      }

      // Categories: if new category has higher priority, upgrade
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[incoming.priority] < priorityOrder[existing.priority]) {
        existing.priority = incoming.priority;
        existing.category = incoming.category;
      }

      // Confidence: use the LOWER (more conservative) confidence
      const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if (confidenceOrder[incoming.confidence] > confidenceOrder[existing.confidence]) {
        existing.confidence = incoming.confidence;
      }

      // Merge evidence from both triage results
      const existingEvidenceIds = new Set(existing.evidence.map(e => e.id));
      for (const evidence of incoming.evidence) {
        if (!existingEvidenceIds.has(evidence.id)) {
          existing.evidence.push({ ...evidence });
        }
      }

      // Merge tags
      for (const tag of incoming.tags) {
        if (!existing.tags.includes(tag)) {
          existing.tags.push(tag);
        }
      }

      // Merge sentiment
      session.mergedSentiment = this.mergeSentiment([session.mergedSentiment!, sentiment]);
    }

    // Recompute sentiment trajectory after merge
    session.sentimentTrajectory = this.computeSentimentTrajectory(session.interactions);

    // Update channel preference
    this.updateChannelPreference(session);

    session.lastActivityAt = now;
  }

  /**
   * Get current session for a customer
   */
  getActiveSession(customerId: string): UnifiedSession | null {
    const sessionId = this.customerToSession.get(customerId);
    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session || session.status === "closed") return null;

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): UnifiedSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get channel preference for a customer
   */
  getChannelPreference(customerId: string): ChannelPreference | null {
    // Collect all sessions for this customer
    const customerSessions: UnifiedSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.customerId === customerId) {
        customerSessions.push(session);
      }
    }

    if (customerSessions.length === 0) return null;

    // Aggregate channel statistics
    const channelStats: Record<Channel, { totalCSAT: number; count: number; totalResponseTime: number }> = {
      email: { totalCSAT: 0, count: 0, totalResponseTime: 0 },
      chat: { totalCSAT: 0, count: 0, totalResponseTime: 0 },
      whatsapp: { totalCSAT: 0, count: 0, totalResponseTime: 0 },
      phone: { totalCSAT: 0, count: 0, totalResponseTime: 0 },
      twitter: { totalCSAT: 0, count: 0, totalResponseTime: 0 },
      app: { totalCSAT: 0, count: 0, totalResponseTime: 0 },
    };

    let totalInteractions = 0;

    for (const session of customerSessions) {
      // Use the preferred channel learned from this session
      if (session.channelPreferenceLearned) {
        const channel = session.preferredChannel;
        channelStats[channel].count++;

        // Count interactions that had sentiment (proxy for CSAT)
        const interactionsWithSentiment = session.interactions.filter(i => i.sentiment);
        if (interactionsWithSentiment.length > 0) {
          // Use sentiment intensity as a proxy for CSAT (0.5 + 0.5 * intensity for positive, etc.)
          for (const interaction of interactionsWithSentiment) {
            if (interaction.sentiment) {
              const polarity = interaction.sentiment.polarity;
              let csatScore: number;
              if (polarity === "positive") {
                csatScore = 0.5 + 0.5 * interaction.sentiment.intensity;
              } else if (polarity === "negative") {
                csatScore = 0.5 - 0.5 * interaction.sentiment.intensity;
              } else {
                csatScore = 0.5;
              }
              channelStats[channel].totalCSAT += csatScore;
            }
          }
        }

        totalInteractions++;
      }
    }

    // Find channel with highest avgCSAT and lowest avgResponseTimeMinutes
    let bestChannel: Channel = "chat";
    let bestScore = -Infinity;

    for (const channel of Object.keys(channelStats) as Channel[]) {
      const stats = channelStats[channel];
      if (stats.count > 0) {
        const avgCSAT = stats.totalCSAT / stats.count;
        // Score: higher CSAT is better, lower response time is better
        // We use a simple combination: CSAT - (responseTimeFactor * 0.01)
        const score = avgCSAT;
        if (score > bestScore) {
          bestScore = score;
          bestChannel = channel;
        }
      }
    }

    return {
      preferredChannel: bestChannel,
      avgResponseTimeMinutes: 30, // Placeholder - would need actual timing data
      avgCSAT: bestScore === -Infinity ? 0.5 : bestScore,
      totalInteractions,
    };
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = "closed";
    session.lastActivityAt = new Date().toISOString();

    // Archive old sessions if needed
    this.archiveOldSessions(session.customerId);
  }

  // --- Internal methods ---

  private continueExistingSession(
    session: UnifiedSession,
    channel: Channel,
    channelInteractionId: string | undefined,
    triageResult: TriageResult | undefined,
    sentiment: SentimentResult | undefined,
    messageText: string | undefined,
    now: string
  ): SessionMergeResult {
    // Check if this channel already has an interaction
    const existingInteraction = channelInteractionId
      ? session.interactions.find(i => i.channelInteractionId === channelInteractionId)
      : undefined;

    let triageCarriedForward = false;

    // Add new interaction for this channel if channelInteractionId is new or not provided
    if (!existingInteraction) {
      const newInteraction: ChannelInteraction = {
        channel,
        channelInteractionId: channelInteractionId || `auto-${Date.now()}`,
        timestamp: now,
        triageResult,
        sentiment,
        wasEscalated: false,
        wasResolved: false,
        channelMessageCount: 1,
        lastMessageAt: now,
      };
      session.interactions.push(newInteraction);

      // Update current channel
      session.currentChannel = channel;

      // Add channel to channelsUsed if not already there
      if (!session.channelsUsed.includes(channel)) {
        session.channelsUsed.push(channel);
      }

      // Increment total interactions
      session.totalInteractions++;

      // Merge triage context if provided
      if (triageResult && sentiment) {
        this.mergeTriageContext(session.sessionId, triageResult, sentiment);
        triageCarriedForward = session.mergedTriageContext !== null;
      }
    } else {
      // Update existing interaction
      if (triageResult) {
        existingInteraction.triageResult = triageResult;
      }
      if (sentiment) {
        existingInteraction.sentiment = sentiment;
      }
      existingInteraction.channelMessageCount++;
      existingInteraction.lastMessageAt = now;
    }

    // Update sentiment trajectory
    session.sentimentTrajectory = this.computeSentimentTrajectory(session.interactions);

    // Detect unresolved topics
    if (messageText) {
      session.unresolvedTopics = this.detectUnresolvedTopics(messageText, session.unresolvedTopics);
    }

    // Update lastActivityAt
    session.lastActivityAt = now;

    // Update channel preference
    this.updateChannelPreference(session);

    return {
      sessionId: session.sessionId,
      isNewSession: false,
      session: { ...session },
      triageCarriedForward,
      channelsNowActive: session.channelsUsed,
      unresolvedTopics: [...session.unresolvedTopics],
    };
  }

  private createNewSession(
    customerId: string,
    channel: Channel,
    channelInteractionId: string | undefined,
    triageResult: TriageResult | undefined,
    sentiment: SentimentResult | undefined,
    messageText: string | undefined,
    now: string
  ): SessionMergeResult {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const interaction: ChannelInteraction = {
      channel,
      channelInteractionId: channelInteractionId || `init-${Date.now()}`,
      timestamp: now,
      triageResult,
      sentiment,
      wasEscalated: false,
      wasResolved: false,
      channelMessageCount: 1,
      lastMessageAt: now,
    };

    // Detect unresolved topics
    let unresolvedTopics: string[] = [];
    if (messageText) {
      unresolvedTopics = this.detectUnresolvedTopics(messageText, []);
    }

    const newSession: UnifiedSession = {
      sessionId,
      customerId,
      primaryChannel: channel,
      currentChannel: channel,
      interactions: [interaction],
      mergedTriageContext: triageResult ? { ...triageResult } : null,
      mergedSentiment: sentiment ? { ...sentiment } : null,
      sentimentTrajectory: sentiment ? this.computeSentimentTrajectory([interaction]) : "unknown",
      status: "active",
      createdAt: now,
      lastActivityAt: now,
      preferredChannel: channel,
      channelPreferenceLearned: false,
      totalInteractions: 1,
      channelsUsed: [channel],
      unresolvedTopics,
      escalatedTopics: [],
    };

    // Store session
    this.sessions.set(sessionId, newSession);
    this.customerToSession.set(customerId, sessionId);

    // Archive old sessions if needed
    this.archiveOldSessions(customerId);

    return {
      sessionId,
      isNewSession: true,
      session: { ...newSession },
      triageCarriedForward: false,
      channelsNowActive: [channel],
      unresolvedTopics: [...unresolvedTopics],
    };
  }

  private mergeSentiment(sentiments: SentimentResult[]): SentimentResult {
    if (sentiments.length === 0) {
      return {
        polarity: "neutral",
        intensity: 0,
        signals: [],
        escalationRisk: 0,
        urgencyLevel: "low",
        summary: "",
        analyzedAt: new Date().toISOString(),
      };
    }

    if (sentiments.length === 1) {
      return { ...sentiments[0] };
    }

    // Count polarities
    const polarityCounts: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
    let totalIntensity = 0;
    let maxEscalationRisk = 0;
    let maxUrgency: string = "low";
    const urgencyOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    const allSignals: SentimentResult["signals"] = [];

    for (const sentiment of sentiments) {
      polarityCounts[sentiment.polarity]++;
      totalIntensity += sentiment.intensity;
      maxEscalationRisk = Math.max(maxEscalationRisk, sentiment.escalationRisk);
      if (urgencyOrder[sentiment.urgencyLevel] > urgencyOrder[maxUrgency]) {
        maxUrgency = sentiment.urgencyLevel;
      }
      for (const signal of sentiment.signals) {
        if (!allSignals.find(s => s.keyword === signal.keyword)) {
          allSignals.push({ ...signal });
        }
      }
    }

    // Majority polarity wins
    let dominantPolarity: "positive" | "negative" | "neutral" = "neutral";
    let maxCount = 0;
    for (const [polarity, count] of Object.entries(polarityCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantPolarity = polarity as "positive" | "negative" | "neutral";
      }
    }

    return {
      polarity: dominantPolarity,
      intensity: totalIntensity / sentiments.length,
      signals: allSignals.slice(0, 10), // Limit signals
      escalationRisk: maxEscalationRisk,
      urgencyLevel: maxUrgency as SentimentResult["urgencyLevel"],
      summary: `Merged sentiment from ${sentiments.length} sources`,
      analyzedAt: new Date().toISOString(),
    };
  }

  private detectUnresolvedTopics(messageText: string, previousTopics: string[]): string[] {
    const lowerText = messageText.toLowerCase();
    const detected: string[] = [...previousTopics];

    // Check for unresolved topic keywords
    for (const keyword of this.unresolvedTopicKeywords) {
      if (lowerText.includes(keyword)) {
        // Try to extract a topic around this keyword
        const index = lowerText.indexOf(keyword);
        const start = Math.max(0, index - 20);
        const end = Math.min(messageText.length, index + keyword.length + 20);
        let topic = messageText.slice(start, end).trim();

        // Clean up the topic
        topic = topic.replace(/[^\w\s-]/g, "").trim();
        if (topic.length > 5 && topic.length < 100) {
          if (!detected.includes(topic)) {
            detected.push(topic);
          }
        }
      }
    }

    // Also look for patterns like "still having X" or "X is still broken"
    const unresolvedPatterns = [
      /(\w+(?:\s+\w+){0,3})\s+(?:is\s+)?(?:still|still\s+(?:having|broken|wrong|not\s+working))/gi,
      /(?:still|still\s+having)\s+(\w+(?:\s+\w+){0,3})/gi,
    ];

    for (const pattern of unresolvedPatterns) {
      let match;
      while ((match = pattern.exec(messageText)) !== null) {
        const topic = match[1].trim();
        if (topic.length > 3 && !detected.includes(topic)) {
          detected.push(topic);
        }
      }
    }

    return detected;
  }

  private computeSentimentTrajectory(interactions: ChannelInteraction[]): "improving" | "stable" | "declining" | "unknown" {
    // Look at last N interactions (where N = min(5, interactions.length))
    const recentInteractions = interactions.slice(-Math.min(5, interactions.length));

    // Filter interactions that have sentiment data
    const withSentiment = recentInteractions.filter(i => i.sentiment);

    if (withSentiment.length < 2) {
      return "unknown";
    }

    // Compare earliest sentiment to latest
    const earliest = withSentiment[0].sentiment!;
    const latest = withSentiment[withSentiment.length - 1].sentiment!;

    // Convert polarity to numeric value
    const polarityValue = (polarity: string): number => {
      switch (polarity) {
        case "positive": return 1;
        case "negative": return -1;
        default: return 0;
      }
    };

    const earliestValue = polarityValue(earliest.polarity) * earliest.intensity;
    const latestValue = polarityValue(latest.polarity) * latest.intensity;

    const threshold = 0.1; // Minimum change to be considered significant

    if (latestValue > earliestValue + threshold) {
      return "improving";
    } else if (latestValue < earliestValue - threshold) {
      return "declining";
    } else {
      return "stable";
    }
  }

  private updateChannelPreference(session: UnifiedSession): void {
    // After each session, update preference based on that channel's outcomes
    // Uses exponential moving average for CSAT and response time

    const currentChannel = session.currentChannel;
    const interactions = session.interactions.filter(i => i.channel === currentChannel);

    if (interactions.length === 0) return;

    // Calculate average sentiment for this channel in this session
    const sentiments = interactions.filter(i => i.sentiment).map(i => i.sentiment!);
    if (sentiments.length === 0) return;

    let sessionAvgCSAT = 0;
    for (const s of sentiments) {
      if (s.polarity === "positive") {
        sessionAvgCSAT += 0.5 + 0.5 * s.intensity;
      } else if (s.polarity === "negative") {
        sessionAvgCSAT += 0.5 - 0.5 * s.intensity;
      } else {
        sessionAvgCSAT += 0.5;
      }
    }
    sessionAvgCSAT /= sentiments.length;

    // If we already have a preference, use exponential moving average
    if (session.channelPreferenceLearned) {
      const alpha = 0.3; // Smoothing factor
      // Simplified: just mark as learned for the current channel
      // In a full implementation, we'd track historical CSAT per channel
    }

    session.preferredChannel = currentChannel;
    session.channelPreferenceLearned = true;
  }

  private archiveOldSessions(customerId: string): void {
    // Collect all sessions for this customer
    const customerSessions: UnifiedSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.customerId === customerId) {
        customerSessions.push(session);
      }
    }

    // If we exceed maxSessionsPerCustomer, archive oldest resolved/closed sessions
    if (customerSessions.length > this.maxSessionsPerCustomer) {
      // Sort by creation date, oldest first
      customerSessions.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Remove oldest closed/resolved sessions until we're under the limit
      let toRemove = customerSessions.length - this.maxSessionsPerCustomer;
      for (const session of customerSessions) {
        if (toRemove <= 0) break;
        if (session.status === "closed" || session.status === "resolved") {
          this.sessions.delete(session.sessionId);
          toRemove--;
        }
      }

      // If we still need to remove more (no closed sessions), remove oldest active
      if (toRemove > 0) {
        for (const session of customerSessions) {
          if (toRemove <= 0) break;
          if (session.status === "active" || session.status === "pending_human") {
            // Don't remove the most recent active session
            if (session.sessionId !== this.customerToSession.get(customerId)) {
              this.sessions.delete(session.sessionId);
              toRemove--;
            }
          }
        }
      }
    }
  }
}
