/**
 * Customer Profile Synthesizer
 * VAL-DEPT-CS-CUST360: Unified customer context from all available signals
 *
 * Merges data from all connectors (Zendesk, Intercom, Stripe, Shopify, CRM)
 * into a single unified Customer360 view updated on every interaction.
 */

import type { SentimentResult } from "../types.js";
import { AccountTier, ACCOUNT_TIER_CONFIGS } from "../policy/policy-engine.js";

// ============================================
// Customer Profile Types
// ============================================

export interface CustomerChannel {
  type: "email" | "chat" | "whatsapp" | "phone" | "twitter" | "app";
  handle: string;
  lastContactAt?: string;
  totalContacts: number;
  preferred: boolean;
}

export interface CustomerBilling {
  totalSpent: number;
  mrr: number;
  currency: string;
  planTier: string;
  accountAgeDays: number;
  billingIssues: number;
  refundRequests: number;
  lastInvoiceAt?: string;
  nextInvoiceAt?: string;
}

export interface CustomerHealth {
  churnRisk: "critical" | "high" | "medium" | "low";
  churnScore: number; // 0-100
  healthScore: number; // 0-100
  sentimentTrajectory: "improving" | "stable" | "declining";
  lastInteractionSentiment?: "positive" | "negative" | "neutral";
  escalationCount30d: number;
  ticketsClosedCount30d: number;
  reopenedTicketsCount30d: number;
  avgCsat?: number;
}

export interface CustomerUsage {
  lastLoginAt?: string;
  daysSinceLastActive: number;
  weeklyActiveHours?: number;
  featureAdoptionScore: number; // 0-100
  inactiveWarning: boolean;
  isPowerUser: boolean;
}

export interface CustomerProfile {
  customerId: string;
  displayName: string;
  email: string;
  companyName?: string;
  channels: CustomerChannel[];
  billing: CustomerBilling;
  health: CustomerHealth;
  usage: CustomerUsage;
  metadata: Record<string, unknown>;

  // Tags derived from behavior
  tags: string[];

  // Computed
  accountTier: AccountTier;
  isVip: boolean;
  isChurning: boolean;
  requiresProactiveOutreach: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastContactAt: string;
}

export interface CustomerProfileSynthesizerParams {
  customerId: string;
  // Connector data (populated by the caller with real API data)
  ticketHistory?: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    resolvedAt?: string;
    sentiment?: "positive" | "negative" | "neutral";
    category?: string;
    priority?: string;
    wasEscalated?: boolean;
    wasReopened?: boolean;
    csatScore?: number;
  }>;
  accountData?: {
    email: string;
    displayName?: string;
    companyName?: string;
    planTier: string;
    mrr: number;
    totalSpent: number;
    currency?: string;
    createdAt: string;
    tags?: string[];
  };
  billingData?: {
    mrr: number;
    totalSpent: number;
    currency?: string;
    planTier: string;
    accountAgeDays: number;
    billingIssues: number;
    refundRequests: number;
    lastInvoiceAt?: string;
    nextInvoiceAt?: string;
  };
  usageData?: {
    lastLoginAt?: string;
    weeklyActiveHours?: number;
    featureAdoptionScore?: number;
  };
  crmData?: {
    churnRisk?: "critical" | "high" | "medium" | "low";
    healthScore?: number;
    tags?: string[];
    ltv?: number;
  };
  currentTicket?: {
    channel: "email" | "chat" | "whatsapp" | "phone" | "twitter" | "app";
    subject: string;
    createdAt: string;
    sentiment?: SentimentResult;
  };
}

// ============================================
// Customer Profile Synthesizer
// ============================================

export class CustomerProfileSynthesizer {
  /**
   * Synthesize a unified customer profile from all available data sources
   */
  synthesize(params: CustomerProfileSynthesizerParams): CustomerProfile {
    const {
      customerId,
      ticketHistory = [],
      accountData,
      billingData,
      usageData,
      crmData,
      currentTicket,
    } = params;

    const now = new Date().toISOString();
    const tags: string[] = [];

    // ============================================
    // Account Tier Detection
    // ============================================
    const mrr = billingData?.mrr ?? accountData?.mrr ?? 0;
    const accountTier = this.detectAccountTier(mrr, accountData?.planTier);
    const isVip = accountTier === "enterprise" || accountTier === "high";

    // ============================================
    // Channel Aggregation
    // ============================================
    const channels = this.aggregateChannels(ticketHistory, currentTicket?.channel);

    // ============================================
    // Billing Profile
    // ============================================
    const billing = this.buildBillingProfile(mrr, billingData, accountData);

    // ============================================
    // Health Scoring
    // ============================================
    const health = this.computeHealthScore({
      ticketHistory,
      crmData,
      currentTicket,
      billingData,
      accountTier,
    });

    // ============================================
    // Usage Profile
    // ============================================
    const usage = this.computeUsageProfile(accountTier, usageData);

    // ============================================
    // Behavioral Tags
    // ============================================
    this.deriveBehavioralTags(tags, {
      ticketHistory,
      health,
      billing,
      usage,
      accountTier,
      currentTicket,
    });

    // ============================================
    // Last Contact
    // ============================================
    const lastTicket = ticketHistory[0];
    const lastContactAt =
      currentTicket?.createdAt ??
      lastTicket?.createdAt ??
      accountData?.createdAt ??
      now;

    // ============================================
    // Compute Flags
    // ============================================
    const isChurning =
      health.churnRisk === "critical" ||
      health.churnRisk === "high" ||
      (health.escalationCount30d >= 3 && health.sentimentTrajectory === "declining");

    const requiresProactiveOutreach =
      (health.churnRisk === "critical" && !currentTicket) ||
      (usage.inactiveWarning && !currentTicket) ||
      (health.sentimentTrajectory === "declining" && health.escalationCount30d >= 2);

    return {
      customerId,
      displayName: accountData?.displayName ?? "Unknown",
      email: accountData?.email ?? "",
      companyName: accountData?.companyName,
      channels,
      billing,
      health,
      usage,
      metadata: {
        ltv: crmData?.ltv,
        sourceTags: accountData?.tags ?? [],
      },
      tags,
      accountTier,
      isVip,
      isChurning,
      requiresProactiveOutreach,
      createdAt: accountData?.createdAt ?? now,
      updatedAt: now,
      lastContactAt,
    };
  }

  private detectAccountTier(mrr: number, planTier?: string): AccountTier {
    if (planTier) {
      const tier = planTier.toLowerCase();
      if (tier.includes("enterprise")) return "enterprise";
      if (tier.includes("high") || tier.includes("pro") || tier.includes("business")) return "high";
      if (tier.includes("medium") || tier.includes("starter")) return "medium";
    }
    if (mrr >= 1000) return "enterprise";
    if (mrr >= 300) return "high";
    if (mrr >= 50) return "medium";
    return "standard";
  }

  private aggregateChannels(
    ticketHistory: CustomerProfileSynthesizerParams["ticketHistory"],
    currentChannel?: NonNullable<CustomerProfileSynthesizerParams["currentTicket"]>["channel"]
  ): CustomerChannel[] {
    const channelMap = new Map<string, CustomerChannel>();

    // Count from ticket history
    for (const ticket of ticketHistory ?? []) {
      const type = this.extractChannelType(ticket.id);
      if (!channelMap.has(type)) {
        channelMap.set(type, {
          type,
          handle: "unknown",
          totalContacts: 0,
          preferred: type === currentChannel,
        });
      }
      channelMap.get(type)!.totalContacts++;
    }

    if (currentChannel && !channelMap.has(currentChannel)) {
      channelMap.set(currentChannel, {
        type: currentChannel,
        handle: "unknown",
        totalContacts: 1,
        preferred: true,
      });
    }

    // Sort by total contacts descending
    return Array.from(channelMap.values()).sort(
      (a, b) => b.totalContacts - a.totalContacts
    );
  }

  private extractChannelType(ticketId: string): CustomerChannel["type"] {
    const id = ticketId.toLowerCase();
    if (id.includes("zendesk") || id.includes("ticket")) return "email";
    if (id.includes("intercom") || id.includes("chat")) return "chat";
    if (id.includes("whatsapp")) return "whatsapp";
    if (id.includes("phone") || id.includes("call")) return "phone";
    if (id.includes("twitter") || id.includes("social")) return "twitter";
    return "email";
  }

  private buildBillingProfile(
    mrr: number,
    billingData?: CustomerProfileSynthesizerParams["billingData"],
    accountData?: CustomerProfileSynthesizerParams["accountData"]
  ): CustomerBilling {
    return {
      totalSpent: billingData?.totalSpent ?? accountData?.totalSpent ?? 0,
      mrr,
      currency: billingData?.currency ?? accountData?.currency ?? "USD",
      planTier: billingData?.planTier ?? accountData?.planTier ?? "standard",
      accountAgeDays: billingData?.accountAgeDays ?? 0,
      billingIssues: billingData?.billingIssues ?? 0,
      refundRequests: billingData?.refundRequests ?? 0,
      lastInvoiceAt: billingData?.lastInvoiceAt,
      nextInvoiceAt: billingData?.nextInvoiceAt,
    };
  }

  private computeHealthScore(params: {
    ticketHistory: CustomerProfileSynthesizerParams["ticketHistory"];
    crmData?: CustomerProfileSynthesizerParams["crmData"];
    currentTicket?: CustomerProfileSynthesizerParams["currentTicket"];
    billingData?: CustomerProfileSynthesizerParams["billingData"];
    accountTier: AccountTier;
  }): CustomerHealth {
    const { ticketHistory, crmData, currentTicket, accountTier } = params;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentTickets = (ticketHistory ?? []).filter(
      (t) => new Date(t.createdAt) >= thirtyDaysAgo
    );

    const escalationCount30d = recentTickets.filter((t) => t.wasEscalated).length;
    const reopenedCount = recentTickets.filter((t) => t.wasReopened).length;
    const closedCount = recentTickets.filter((t) => t.status === "resolved").length;

    // Sentiment trajectory
    const sentimentHistory = recentTickets
      .filter((t): t is typeof t & { sentiment: NonNullable<typeof t.sentiment> } => t.sentiment !== undefined)
      .map((t) => t.sentiment);
    const sentimentTrajectory = this.computeSentimentTrajectory(sentimentHistory);

    // Last interaction sentiment
    const lastInteractionSentiment = recentTickets[0]?.sentiment;

    // CSAT average
    const csatScores = recentTickets
      .filter((t) => t.csatScore !== undefined)
      .map((t) => t.csatScore!);
    const avgCsat =
      csatScores.length > 0
        ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
        : undefined;

    // Churn score
    const churnScore = this.computeChurnScore({
      escalationCount30d,
      reopenedCount,
      sentimentTrajectory,
      avgCsat,
      accountTier,
      churnRisk: crmData?.churnRisk,
    });

    const churnRisk = this.scoreToRiskLevel(churnScore);

    // Health score (inverse of churn score, scaled)
    const healthScore = Math.max(0, 100 - churnScore);

    return {
      churnRisk,
      churnScore,
      healthScore,
      sentimentTrajectory,
      lastInteractionSentiment,
      escalationCount30d,
      ticketsClosedCount30d: closedCount,
      reopenedTicketsCount30d: reopenedCount,
      avgCsat,
    };
  }

  private computeSentimentTrajectory(
    history: ("positive" | "negative" | "neutral")[]
  ): "improving" | "stable" | "declining" {
    if (history.length < 3) return "stable";

    // Compare recent (first 2) to older (last 2)
    const recent = history.slice(0, 2);
    const older = history.slice(-2);

    const score = (s: "positive" | "negative" | "neutral") =>
      s === "positive" ? 1 : s === "negative" ? -1 : 0;

    const recentAvg = recent.reduce((a, b) => a + score(b), 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + score(b), 0) / older.length;

    if (recentAvg > olderAvg + 0.3) return "improving";
    if (recentAvg < olderAvg - 0.3) return "declining";
    return "stable";
  }

  private computeChurnScore(params: {
    escalationCount30d: number;
    reopenedCount: number;
    sentimentTrajectory: "improving" | "stable" | "declining";
    avgCsat?: number;
    accountTier: AccountTier;
    churnRisk?: "critical" | "high" | "medium" | "low";
  }): number {
    let score = 30; // base

    // Escalation weight (tier-sensitive)
    const escalationWeight = params.accountTier === "high" || params.accountTier === "enterprise" ? 15 : 10;
    score += params.escalationCount30d * escalationWeight;

    // Reopened tickets
    score += params.reopenedCount * 12;

    // Sentiment trajectory
    if (params.sentimentTrajectory === "declining") score += 20;
    if (params.sentimentTrajectory === "improving") score -= 10;

    // CSAT
    if (params.avgCsat !== undefined) {
      if (params.avgCsat < 3) score += 25;
      else if (params.avgCsat < 4) score += 10;
      else score -= 5;
    }

    // CRM churn risk (if available, trust it)
    if (params.churnRisk === "critical") score += 40;
    else if (params.churnRisk === "high") score += 20;
    else if (params.churnRisk === "medium") score += 5;

    return Math.min(100, Math.max(0, score));
  }

  private scoreToRiskLevel(score: number): "critical" | "high" | "medium" | "low" {
    if (score >= 75) return "critical";
    if (score >= 55) return "high";
    if (score >= 35) return "medium";
    return "low";
  }

  private computeUsageProfile(
    accountTier: AccountTier,
    usageData?: CustomerProfileSynthesizerParams["usageData"]
  ): CustomerUsage {
    const now = new Date();
    const lastLogin = usageData?.lastLoginAt ? new Date(usageData.lastLoginAt) : null;
    const daysSinceLastActive = lastLogin
      ? Math.floor((now.getTime() - lastLogin.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    const inactiveWarning =
      daysSinceLastActive > 14 ||
      (accountTier === "enterprise" && daysSinceLastActive > 7);

    const isPowerUser =
      (usageData?.weeklyActiveHours ?? 0) > 20 ||
      (usageData?.featureAdoptionScore ?? 0) > 70;

    return {
      lastLoginAt: usageData?.lastLoginAt,
      daysSinceLastActive,
      weeklyActiveHours: usageData?.weeklyActiveHours,
      featureAdoptionScore: usageData?.featureAdoptionScore ?? 50,
      inactiveWarning,
      isPowerUser,
    };
  }

  private deriveBehavioralTags(
    tags: string[],
    params: {
      ticketHistory: CustomerProfileSynthesizerParams["ticketHistory"];
      health: CustomerHealth;
      billing: CustomerBilling;
      usage: CustomerUsage;
      accountTier: AccountTier;
      currentTicket?: CustomerProfileSynthesizerParams["currentTicket"];
    }
  ): void {
    if (params.accountTier === "enterprise" || params.accountTier === "high") {
      tags.push("vip");
    }
    if (params.billing.refundRequests > 2) {
      tags.push("refund-sensitive");
    }
    if (params.billing.billingIssues > 3) {
      tags.push("billing-complex");
    }
    if (params.usage.isPowerUser) {
      tags.push("power-user");
    }
    if (params.usage.daysSinceLastActive > 30) {
      tags.push("at-risk-inactive");
    }
    if (params.health.escalationCount30d >= 3) {
      tags.push("frequent-escalator");
    }
    if (params.health.sentimentTrajectory === "declining") {
      tags.push("declining-sentiment");
    }
    if (params.health.reopenedTicketsCount30d >= 2) {
      tags.push("repeat-visitor");
    }
    // Channel preference
    if (params.ticketHistory && params.ticketHistory.length > 0) {
      const topChannel = this.extractChannelType(params.ticketHistory[0].id);
      tags.push(`pref:${topChannel}`);
    }
    // Sentiment from current ticket
    const currentSentiment = params.currentTicket?.sentiment?.polarity;
    if (currentSentiment === "negative") {
      tags.push("angry-current");
    }
  }
}

// Singleton
export const customerProfileSynthesizer = new CustomerProfileSynthesizer();
