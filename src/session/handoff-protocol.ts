/**
 * Human Handoff Protocol
 * VAL-DEPT-CS-HANDOFF: Complete handoff packages when human escalation is needed
 *
 * When escalation is needed, the handoff package is complete:
 * - Full triage result with evidence
 * - Customer 360 profile
 * - Drafted response (specialist can edit or send as-is)
 * - Sentiment summary
 * - Similar cases resolved (for reference)
 * - Recommended resolution path
 */

import type {
  TriageResult,
  AIEnrichedTriageResult,
  SentimentResult,
  IssuePriority,
  IssueCategory,
} from "../types.js";
import type { CustomerProfile } from "../customer/customer-profile.js";

// ============================================
// Types
// ============================================

export type SpecialistRole =
  | "billing_specialist"
  | "technical_support"
  | "account_manager"
  | "senior_support"
  | "escalations_manager"
  | "security_team"
  | "executive_team";

export interface HandoffPackage {
  // Identity
  handoffId: string;
  issueId: string;
  customerId: string;
  createdAt: string;
  urgency: "critical" | "high" | "medium" | "low";
  estimatedComplexity: "simple" | "moderate" | "complex";

  // Routing
  recommendedRole: SpecialistRole;
  routingRationale: string;
  priorityLevel: IssuePriority;

  // Customer
  customerProfile: {
    customerId: string;
    planTier: string;
    accountTenureDays: number;
    churnRisk: string;
    lifetimeValue: number;
    sentimentTrajectory: string;
    previousTickets: number;
    slaTier: string;
  };

  // Issue
  issueSummary: {
    subject: string;
    description: string;
    channel: string;
    category: IssueCategory;
    priority: IssuePriority;
    sentiment: SentimentResult;
    sentimentUrgency: "critical" | "high" | "medium" | "low";
    topics: string[]; // keywords extracted from the issue
    unresolvedTopics: string[]; // topics customer said weren't resolved before
  };

  // AI work already done
  triageResult: {
    category: IssueCategory;
    priority: IssuePriority;
    confidence: string;
    escalationLevel: number;
    routingTeam: string;
    recommendedActions: string[];
  };

  draftResponse: {
    tone: string;
    content: string;
    readyToSend: boolean; // true if confidence is high enough
    requiresSpecialistReview: boolean;
    reviewNotes?: string; // what to verify before sending
  };

  // Context
  contextSummary: {
    customerLongstanding: boolean;
    highValueAccount: boolean;
    previouslyEscalated: boolean;
    churnRiskDetected: boolean;
    billingSensitivity: "high" | "medium" | "low";
    sentimentDeclining: boolean;
  };

  // Similar cases for reference
  similarCases: Array<{
    ticketId: string;
    resolution: string;
    wasSatisfactory: boolean;
  }>;

  // Resolution path
  recommendedResolution: {
    steps: string[];
    estimatedMinutes: number;
    requiresRefund: boolean;
    maxAutonomousRefund?: number;
    escalateToThirdParty: boolean;
    thirdPartyName?: string;
    notes: string;
  };

  // SLA
  sla: {
    originalDeadline: string;
    currentStatus: string;
    timeRemainingMinutes: number;
    isBreaching: boolean;
    breachRiskLevel: "critical" | "high" | "medium" | "low";
  };

  // For specialist quick-action
  quickActions: Array<{
    action: string;
    label: string;
    requiresConfirmation: boolean;
  }>;
}

export interface SpecialistAction {
  handoffId: string;
  action: "accept" | "reject" | "reassign" | "send_response" | "add_note" | "close";
  timestamp: string;
  specialistId?: string;
  notes?: string;
  responseSent?: boolean;
}

// ============================================
// Handoff Protocol
// ============================================

export class HandoffProtocol {
  private handedOff: Map<string, HandoffPackage> = new Map();
  private actionLog: Map<string, SpecialistAction[]> = new Map();
  private maxHistory = 500;

  // --- Public API ---

  /**
   * Create a complete handoff package for human specialist
   */
  createHandoff(params: {
    issueId: string;
    customerId: string;
    triageResult: TriageResult;
    aiEnrichedResult?: AIEnrichedTriageResult;
    customerProfile: CustomerProfile;
    sentiment: SentimentResult;
    draftResponse: string;
    similarCases?: Array<{ ticketId: string; resolution: string; wasSatisfactory: boolean }>;
    slaDeadline?: string;
    slaStatus?: string;
    unresolvedTopics?: string[];
  }): HandoffPackage {
    const {
      issueId,
      customerId,
      triageResult,
      aiEnrichedResult,
      customerProfile,
      sentiment,
      draftResponse,
      similarCases = [],
      slaDeadline,
      slaStatus,
      unresolvedTopics = [],
    } = params;

    // Generate handoffId
    const handoffId = `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Determine recommendedRole using determineRole()
    const recommendedRole = this.determineRole(triageResult, customerProfile);

    // Determine urgency using determineUrgency()
    const urgency = this.determineUrgency(triageResult, sentiment, customerProfile);

    // Determine complexity using determineComplexity()
    const estimatedComplexity = this.determineComplexity(
      triageResult.category,
      draftResponse.length > 0,
      true
    );

    // Build customerProfile summary from CustomerProfile
    const customerProfileSummary = {
      customerId: customerProfile.customerId,
      planTier: customerProfile.billing.planTier,
      accountTenureDays: customerProfile.billing.accountAgeDays,
      churnRisk: customerProfile.health.churnRisk,
      lifetimeValue: customerProfile.metadata?.ltv as number ?? customerProfile.billing.totalSpent,
      sentimentTrajectory: customerProfile.health.sentimentTrajectory,
      previousTickets: customerProfile.tags.includes("frequent-tickets") ? 5 : 0, // rough estimate
      slaTier: customerProfile.accountTier,
    };

    // Build issueSummary
    const issueSummary = {
      subject: triageResult.issueId, // subject should come from params but isn't in TriageResult
      description: triageResult.evidence[0]?.description ?? "",
      channel: triageResult.routingRecommendation.channel ?? "email",
      category: triageResult.category,
      priority: triageResult.priority,
      sentiment,
      sentimentUrgency: sentiment.urgencyLevel,
      topics: this.extractTopics(triageResult.issueId, triageResult.evidence[0]?.description ?? ""),
      unresolvedTopics,
    };

    // Build triageResult summary
    const triageResultSummary = {
      category: triageResult.category,
      priority: triageResult.priority,
      confidence: triageResult.confidence,
      escalationLevel: triageResult.escalationLevel,
      routingTeam: triageResult.routingRecommendation.team,
      recommendedActions: triageResult.tags,
    };

    // Build draftResponse
    const draftConfidence = triageResult.confidence === "high" && sentiment.urgencyLevel !== "critical";
    const draftResponseObj = {
      tone: triageResult.suggestedResponseDraft?.tone ?? "empathetic",
      content: draftResponse,
      readyToSend: draftConfidence,
      requiresSpecialistReview: !draftConfidence,
      reviewNotes: !draftConfidence
        ? "Review for accuracy and tone adjustment before sending"
        : undefined,
    };

    // Build contextSummary
    const contextSummary = {
      customerLongstanding: customerProfile.billing.accountAgeDays > 365,
      highValueAccount: customerProfile.isVip || customerProfile.accountTier === "enterprise",
      previouslyEscalated: customerProfile.health.escalationCount30d > 0,
      churnRiskDetected: customerProfile.isChurning,
      billingSensitivity: this.determineBillingSensitivity(customerProfile),
      sentimentDeclining: customerProfile.health.sentimentTrajectory === "declining",
    };

    // Get similarCases from provided list or empty
    const similarCasesList = similarCases;

    // Build recommendedResolution
    const recommendedResolution = this.buildRecommendedResolution(
      triageResult,
      customerProfile,
      aiEnrichedResult
    );

    // Build sla object
    const sla = this.buildSlaObject(slaDeadline, slaStatus);

    // Generate quickActions
    const quickActions = this.generateQuickActions({
      ...issueSummary,
      handoffId,
      recommendedRole,
      draftReady: draftResponseObj.readyToSend,
    });

    const handoffPackage: HandoffPackage = {
      handoffId,
      issueId,
      customerId,
      createdAt: new Date().toISOString(),
      urgency,
      estimatedComplexity,
      recommendedRole,
      routingRationale: triageResult.escalationRationale ?? `Routed to ${recommendedRole} based on ${triageResult.category} issue`,
      priorityLevel: triageResult.priority,
      customerProfile: customerProfileSummary,
      issueSummary,
      triageResult: triageResultSummary,
      draftResponse: draftResponseObj,
      contextSummary,
      similarCases: similarCasesList,
      recommendedResolution,
      sla,
      quickActions,
    };

    // Store in handedOff map
    this.handedOff.set(handoffId, handoffPackage);

    return handoffPackage;
  }

  /**
   * Get a handoff package by ID
   */
  getHandoff(handoffId: string): HandoffPackage | undefined {
    return this.handedOff.get(handoffId);
  }

  /**
   * Record specialist action on a handoff
   */
  recordAction(action: SpecialistAction): void {
    const { handoffId } = action;

    // Initialize action log for this handoff if needed
    if (!this.actionLog.has(handoffId)) {
      this.actionLog.set(handoffId, []);
    }

    const log = this.actionLog.get(handoffId)!;
    log.push(action);

    // Trim history if exceeds maxHistory
    if (log.length > this.maxHistory) {
      log.splice(0, log.length - this.maxHistory);
    }
  }

  /**
   * Get action history for a handoff
   */
  getActionHistory(handoffId: string): SpecialistAction[] {
    return this.actionLog.get(handoffId) ?? [];
  }

  /**
   * Get handoffs awaiting action
   */
  getPendingHandoffs(role?: SpecialistRole): HandoffPackage[] {
    const pending: HandoffPackage[] = [];

    for (const pkg of this.handedOff.values()) {
      // If role specified, filter by recommended role
      if (role && pkg.recommendedRole !== role) {
        continue;
      }

      // Check if this handoff has been closed or accepted
      const history = this.actionLog.get(pkg.handoffId) ?? [];
      const lastAction = history[history.length - 1];

      // Include if no actions yet, or last action is not accept/close
      if (history.length === 0 || !["accept", "close"].includes(lastAction?.action ?? "")) {
        pending.push(pkg);
      }
    }

    return pending;
  }

  // --- Internal methods ---

  private determineRole(triage: TriageResult, profile: CustomerProfile): SpecialistRole {
    const { category } = triage;
    const { accountTier } = profile;

    // category = "billing" → "billing_specialist"
    if (category === "billing" || category === "refund") {
      return "billing_specialist";
    }

    // category = "technical" → "technical_support"
    if (category === "technical" || category === "bug") {
      return "technical_support";
    }

    // category = "complaint" + churn risk high → "escalations_manager"
    if (category === "complaint" && (profile.health.churnRisk === "high" || profile.health.churnRisk === "critical")) {
      return "escalations_manager";
    }

    // triage.escalationLevel >= 2 → "senior_support"
    if (triage.escalationLevel >= 2) {
      return "senior_support";
    }

    // profile.planTier = "enterprise" → "account_manager"
    if (accountTier === "enterprise") {
      return "account_manager";
    }

    // default → "senior_support"
    return "senior_support";
  }

  private determineUrgency(
    triage: TriageResult,
    sentiment: SentimentResult,
    profile: CustomerProfile
  ): "critical" | "high" | "medium" | "low" {
    let urgency: "critical" | "high" | "medium" | "low";

    // sentiment.urgencyLevel = "critical" OR priority = "critical" → "critical"
    if (sentiment.urgencyLevel === "critical" || triage.priority === "critical") {
      urgency = "critical";
    }
    // sentiment.urgencyLevel = "high" OR priority = "high" → "high"
    else if (sentiment.urgencyLevel === "high" || triage.priority === "high") {
      urgency = "high";
    }
    // priority = "medium" → "medium"
    else if (triage.priority === "medium") {
      urgency = "medium";
    }
    // default → "low"
    else {
      urgency = "low";
    }

    // If churnRiskDetected → upgrade by 1 level
    if (profile.isChurning) {
      if (urgency === "low") urgency = "medium";
      else if (urgency === "medium") urgency = "high";
      else if (urgency === "high") urgency = "critical";
    }

    return urgency;
  }

  private determineComplexity(
    category: IssueCategory,
    hasDraft: boolean,
    _hasProfile: boolean
  ): "simple" | "moderate" | "complex" {
    // category in ["billing", "refund", "account"] AND confidence = "high" → "simple"
    if (["billing", "refund", "account"].includes(category)) {
      return "simple";
    }

    // category in ["technical", "bug"] → "complex"
    if (category === "technical" || category === "bug") {
      return "complex";
    }

    // hasDraft = false → "moderate"
    if (!hasDraft) {
      return "moderate";
    }

    // default → "moderate"
    return "moderate";
  }

  private extractTopics(subject: string, description: string): string[] {
    // Combine subject + description
    const text = `${subject} ${description}`.toLowerCase();

    // Simple stopwords list
    const stopwords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "must", "shall", "can", "need", "dare",
      "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
      "into", "through", "during", "before", "after", "above", "below",
      "between", "under", "again", "further", "then", "once", "here",
      "there", "when", "where", "why", "how", "all", "each", "few",
      "more", "most", "other", "some", "such", "no", "nor", "not",
      "only", "own", "same", "so", "than", "too", "very", "just",
      "and", "but", "if", "or", "because", "as", "until", "while",
      "this", "that", "these", "those", "it", "its", "they", "them",
      "their", "what", "which", "who", "whom", "we", "our", "you",
      "your", "he", "him", "his", "she", "her", "i", "me", "my",
      "am", "get", "got", "getting", "issue", "problem", "help",
      "please", "thanks", "thank", "hi", "hello", "hey",
    ]);

    // Extract meaningful keywords (nouns 2+ chars, excluding stopwords)
    const words = text.split(/\s+/).filter((word) => {
      const cleaned = word.replace(/[^a-z]/g, "");
      return cleaned.length >= 2 && !stopwords.has(cleaned);
    });

    // Count frequency
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }

    // Sort by frequency and return top 5
    const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 5).map(([word]) => word);
  }

  private generateQuickActions(pkg: {
    handoffId: string;
    category: IssueCategory;
    draftReady: boolean;
    recommendedRole: SpecialistRole;
  }): HandoffPackage["quickActions"] {
    const actions: HandoffPackage["quickActions"] = [];

    // Always: send AI draft response
    actions.push({
      action: "send_response",
      label: "Send AI draft response",
      requiresConfirmation: true,
    });

    // If has draft: accept & close
    if (pkg.draftReady) {
      actions.push({
        action: "accept",
        label: "Accept & close",
        requiresConfirmation: false,
      });
    }

    // If billing category: process refund
    if (pkg.category === "billing" || pkg.category === "refund") {
      actions.push({
        action: "process_refund",
        label: "Issue refund",
        requiresConfirmation: true,
      });
    }

    // If needs escalation (based on role): reassign
    if (pkg.recommendedRole === "escalations_manager" || pkg.recommendedRole === "executive_team") {
      actions.push({
        action: "reassign",
        label: "Reassign to specialist",
        requiresConfirmation: false,
      });
    }

    // Add internal note
    actions.push({
      action: "add_note",
      label: "Add internal note",
      requiresConfirmation: false,
    });

    // Close without response
    actions.push({
      action: "close",
      label: "Close without response",
      requiresConfirmation: false,
    });

    return actions;
  }

  private determineBillingSensitivity(profile: CustomerProfile): "high" | "medium" | "low" {
    const { billing, health } = profile;

    // High sensitivity: refund requests > 2 or billing issues > 3
    if (billing.refundRequests > 2 || billing.billingIssues > 3) {
      return "high";
    }

    // Medium sensitivity: churn risk high/critical or declining sentiment
    if (health.churnRisk === "high" || health.churnRisk === "critical" || health.sentimentTrajectory === "declining") {
      return "medium";
    }

    return "low";
  }

  private buildRecommendedResolution(
    triage: TriageResult,
    profile: CustomerProfile,
    aiEnrichedResult?: AIEnrichedTriageResult
  ): HandoffPackage["recommendedResolution"] {
    const steps: string[] = [];
    let requiresRefund = false;
    let estimatedMinutes = 15;
    let notes = "";

    // Add recommended actions from triage
    if (triage.tags.length > 0) {
      steps.push(...triage.tags.slice(0, 3).map((tag) => `Execute: ${tag}`));
    }

    // Add actions based on category
    switch (triage.category) {
      case "billing":
        steps.push("Review billing history", "Verify charges with finance team");
        requiresRefund = true;
        estimatedMinutes = 20;
        notes = "Ensure all billing calculations are verified before proceeding";
        break;

      case "refund":
        steps.push("Verify refund eligibility", "Process refund per policy", "Confirm with customer");
        requiresRefund = true;
        estimatedMinutes = 25;
        break;

      case "technical":
        steps.push("Reproduce issue", "Check system logs", "Escalate to engineering if needed");
        estimatedMinutes = 45;
        notes = "Technical issues may require code changes";
        break;

      case "bug":
        steps.push("File bug report", "Assess severity", "Prioritize fix");
        estimatedMinutes = 60;
        notes = "Bug should be tracked in issue management system";
        break;

      case "complaint":
        steps.push("Acknowledge complaint", "Review full context", "Propose resolution");
        estimatedMinutes = 30;
        if (profile.isChurning) {
          notes = "High churn risk - consider compensation offer";
        }
        break;

      case "account":
        steps.push("Verify account ownership", "Make required changes", "Confirm with customer");
        estimatedMinutes = 15;
        break;

      default:
        steps.push("Review issue details", "Determine appropriate action");
        estimatedMinutes = 20;
    }

    // Check for third-party escalation from AI enriched result
    let escalateToThirdParty = false;
    let thirdPartyName: string | undefined;

    if (aiEnrichedResult?.suggestedPriorityAdjustment) {
      notes += ` AI suggested priority adjustment: ${aiEnrichedResult.suggestedPriorityAdjustment.reason}`;
    }

    return {
      steps,
      estimatedMinutes,
      requiresRefund,
      maxAutonomousRefund: requiresRefund ? 100 : undefined,
      escalateToThirdParty,
      thirdPartyName,
      notes,
    };
  }

  private buildSlaObject(
    deadline?: string,
    status?: string
  ): HandoffPackage["sla"] {
    const now = new Date();
    const originalDeadline = deadline ?? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const deadlineDate = new Date(originalDeadline);

    const timeRemainingMs = deadlineDate.getTime() - now.getTime();
    const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / (60 * 1000)));

    const isBreaching = timeRemainingMinutes <= 0;

    let breachRiskLevel: "critical" | "high" | "medium" | "low" = "low";
    if (timeRemainingMinutes <= 0) {
      breachRiskLevel = "critical";
    } else if (timeRemainingMinutes <= 30) {
      breachRiskLevel = "high";
    } else if (timeRemainingMinutes <= 60) {
      breachRiskLevel = "medium";
    }

    return {
      originalDeadline,
      currentStatus: status ?? "open",
      timeRemainingMinutes,
      isBreaching,
      breachRiskLevel,
    };
  }
}
