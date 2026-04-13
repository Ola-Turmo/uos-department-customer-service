/**
 * Root Cause Analyzer
 * VAL-DEPT-CS-ROOT-CAUSE: Traces symptom → surface issue → intermediate cause → root cause
 *
 * When recurring patterns are detected, automatically trace the causal chain.
 * Uses the RecurringPatternService patterns as input.
 */

import type { IssueCategory } from "../types.js";

// ============================================
// Types
// ============================================

export type RootCauseType =
  | "code_defect"
  | "config_error"
  | "documentation_gap"
  | "process_breakdown"
  | "policy_gap"
  | "third_party"
  | "user_error"
  | "unknown";

export type FixType =
  | "code_fix"
  | "config_change"
  | "kb_article_create"
  | "kb_article_update"
  | "process_change"
  | "policy_update"
  | "third_party_escalation"
  | "user_education"
  | "none";

export interface CausalLink {
  nodeId: string;
  nodeType: "symptom" | "surface_issue" | "intermediate_cause" | "root_cause";
  description: string;
  confidence: number; // 0-1
  evidence: string[]; // supporting facts
  linkedFrom: string[]; // nodeIds that feed into this node
  linkedTo: string[]; // nodeIds this feeds into
}

export interface RootCauseReport {
  patternId: string;
  summary: string; // human-readable executive summary
  causalGraph: CausalLink[];
  rootCause: {
    type: RootCauseType;
    description: string;
    confidence: number;
    evidence: string[];
  };
  fixRecommendation: {
    type: FixType;
    description: string;
    estimatedEffort: "low" | "medium" | "high";
    priority: "critical" | "high" | "medium" | "low";
    owner?: string; // team or role responsible
  };
  similarCases: Array<{ ticketId: string; resolution: string }>; // from past tickets
  generatedAt: string;
}

export interface RootCauseAnalysisInput {
  patternId: string;
  surfaceIssueCategory: IssueCategory;
  surfaceSubjectPattern: string; // common subject keywords
  frequency: number; // count of tickets in pattern
  affectedCustomers: string[];
  ticketIds: string[];
  resolutionSummaries: string[]; // what resolved these tickets
  timeRange: { from: string; to: string };
  isReopened?: boolean; // were any of these tickets reopened after resolution
}

// ============================================
// Root Cause Analyzer
// ============================================

export class RootCauseAnalyzer {
  // Pattern-specific causal chains (learned over time)
  private causalChainCache: Map<string, RootCauseReport> = new Map();

  /**
   * Analyze a recurring pattern and produce a root cause report
   */
  public analyze(input: RootCauseAnalysisInput): RootCauseReport {
    const graph = this.buildCausalGraph(input);
    const rootCauseResult = this.identifyRootCauseType(input, graph);
    const fixRecommendation = this.recommendFix(
      rootCauseResult.type,
      input.surfaceIssueCategory,
      graph
    );
    const similarCases = this.findSimilarCases(input.patternId, input.ticketIds);
    const summary = this.generateSummary(input, {
      type: rootCauseResult.type,
      description: this.getRootCauseDescription(rootCauseResult.type),
      confidence: rootCauseResult.confidence,
      evidence: rootCauseResult.evidence,
    });

    const report: RootCauseReport = {
      patternId: input.patternId,
      summary,
      causalGraph: graph,
      rootCause: {
        type: rootCauseResult.type,
        description: this.getRootCauseDescription(rootCauseResult.type),
        confidence: rootCauseResult.confidence,
        evidence: rootCauseResult.evidence,
      },
      fixRecommendation,
      similarCases,
      generatedAt: new Date().toISOString(),
    };

    this.causalChainCache.set(input.patternId, report);
    return report;
  }

  /**
   * Get cached analysis for a pattern (if already analyzed)
   */
  public getCachedAnalysis(patternId: string): RootCauseReport | null {
    return this.causalChainCache.get(patternId) ?? null;
  }

  /**
   * Merge findings from a newly resolved ticket into existing pattern analysis
   */
  public incorporateNewResolution(
    patternId: string,
    ticketId: string,
    resolutionSummary: string
  ): void {
    const cached = this.causalChainCache.get(patternId);
    if (cached) {
      // Add to similar cases if not already present
      const existingIds = cached.similarCases.map((c) => c.ticketId);
      if (!existingIds.includes(ticketId)) {
        cached.similarCases.push({ ticketId, resolution: resolutionSummary });
      }
    }
  }

  /**
   * Get all current root cause reports
   */
  public getAllReports(): RootCauseReport[] {
    return Array.from(this.causalChainCache.values());
  }

  // --- Internal causal chain building ---

  private buildCausalGraph(input: RootCauseAnalysisInput): CausalLink[] {
    const graph: CausalLink[] = [];

    // Node 1: SYMPTOM (what customer reports experiencing)
    const symptomNodeId = `${input.patternId}-symptom`;
    const symptomDescription = `Customer unable to ${this.extractActionPhrase(input.surfaceSubjectPattern)}`;

    graph.push({
      nodeId: symptomNodeId,
      nodeType: "symptom",
      description: symptomDescription,
      confidence: 0.95,
      evidence: [
        `Pattern detected from ${input.frequency} tickets`,
        `Time range: ${input.timeRange.from} to ${input.timeRange.to}`,
      ],
      linkedFrom: [],
      linkedTo: [`${input.patternId}-surface-issue`],
    });

    // Node 2: SURFACE ISSUE (what customers describe)
    const surfaceNodeId = `${input.patternId}-surface-issue`;
    const surfaceDescription = `${input.surfaceIssueCategory}: ${input.surfaceSubjectPattern}`;

    graph.push({
      nodeId: surfaceNodeId,
      nodeType: "surface_issue",
      description: surfaceDescription,
      confidence: 0.9,
      evidence: [
        `Category: ${input.surfaceIssueCategory}`,
        `Keywords: ${input.surfaceSubjectPattern}`,
        `Affected customers: ${input.affectedCustomers.length}`,
      ],
      linkedFrom: [symptomNodeId],
      linkedTo: [`${input.patternId}-intermediate-cause`],
    });

    // Node 3: INTERMEDIATE CAUSE (investigation shows)
    const intermediateNodeId = `${input.patternId}-intermediate-cause`;
    const intermediateResult = this.determineIntermediateCause(input.resolutionSummaries);

    graph.push({
      nodeId: intermediateNodeId,
      nodeType: "intermediate_cause",
      description: intermediateResult.description,
      confidence: intermediateResult.confidence,
      evidence: intermediateResult.evidence,
      linkedFrom: [surfaceNodeId],
      linkedTo: [`${input.patternId}-root-cause`],
    });

    // Node 4: ROOT CAUSE (ultimate source)
    const rootCauseNodeId = `${input.patternId}-root-cause`;
    const rootCauseResult = this.identifyRootCauseType(input, graph);

    graph.push({
      nodeId: rootCauseNodeId,
      nodeType: "root_cause",
      description: this.getRootCauseDescription(rootCauseResult.type),
      confidence: rootCauseResult.confidence,
      evidence: rootCauseResult.evidence,
      linkedFrom: [intermediateNodeId],
      linkedTo: [],
    });

    return graph;
  }

  private determineIntermediateCause(
    resolutions: string[]
  ): { description: string; confidence: number; evidence: string[] } {
    const combinedText = resolutions.join(" ").toLowerCase();

    if (combinedText.includes("reset") || combinedText.includes("restart") || combinedText.includes("refresh")) {
      return {
        description: "Temporary workaround applied, root cause unknown",
        confidence: 0.6,
        evidence: resolutions.filter((r) =>
          /reset|restart|refresh/i.test(r)
        ),
      };
    }

    if (combinedText.includes("updated documentation") || combinedText.includes("documentation")) {
      return {
        description: "User education gap identified",
        confidence: 0.75,
        evidence: resolutions.filter((r) =>
          /documentation|docs|guide|explain/i.test(r)
        ),
      };
    }

    if (combinedText.includes("fixed in code") || combinedText.includes("patched") || combinedText.includes("deployed fix")) {
      return {
        description: "Code-level fix was applied",
        confidence: 0.85,
        evidence: resolutions.filter((r) =>
          /code|patch|fix|deploy|bug/i.test(r)
        ),
      };
    }

    if (combinedText.includes("changed setting") || combinedText.includes("updated config")) {
      return {
        description: "Configuration error was corrected",
        confidence: 0.8,
        evidence: resolutions.filter((r) =>
          /config|setting|change|adjust/i.test(r)
        ),
      };
    }

    if (combinedText.includes("escalated to") || combinedText.includes("third party") || combinedText.includes("vendor")) {
      return {
        description: "Third party dependency issue",
        confidence: 0.7,
        evidence: resolutions.filter((r) =>
          /escalat|vendor|third.?party|external|upstream/i.test(r)
        ),
      };
    }

    return {
      description: "Root cause under investigation",
      confidence: 0.4,
      evidence: resolutions,
    };
  }

  private identifyRootCauseType(
    input: RootCauseAnalysisInput,
    _graph: CausalLink[]
  ): { type: RootCauseType; confidence: number; evidence: string[] } {
    const combinedText = input.resolutionSummaries.join(" ").toLowerCase();
    const category = input.surfaceIssueCategory;

    // code_defect: category="bug" AND resolutions mention "bug", "fix", "patch", "hotfix"
    if (category === "bug" && /bug|fix|patch|hotfix|code.?defect/i.test(combinedText)) {
      return {
        type: "code_defect",
        confidence: 0.9,
        evidence: [`Category is "${category}"`, ...input.resolutionSummaries.filter((r) => /bug|fix|patch|hotfix/i.test(r))],
      };
    }

    // config_error: category="technical" OR resolutions mention "config", "setting", "wrong value"
    if (category === "technical" || /config|setting|wrong.?value|parameter/i.test(combinedText)) {
      return {
        type: "config_error",
        confidence: 0.85,
        evidence: [`Category is "${category}"`, ...input.resolutionSummaries.filter((r) => /config|setting|wrong/i.test(r))],
      };
    }

    // documentation_gap: resolutions mention "docs", "documentation", "unclear", "explained"
    if (/docs|documentation|unclear|explained|guide|how.?to/i.test(combinedText)) {
      return {
        type: "documentation_gap",
        confidence: 0.8,
        evidence: input.resolutionSummaries.filter((r) => /docs|documentation|unclear|explained|guide/i.test(r)),
      };
    }

    // process_breakdown: isReopened=true OR resolutions mention "process", "workflow", "approval"
    if (input.isReopened || /process|workflow|approval|procedure/i.test(combinedText)) {
      return {
        type: "process_breakdown",
        confidence: input.isReopened ? 0.95 : 0.75,
        evidence: input.isReopened
          ? ["Ticket was reopened after resolution", ...input.resolutionSummaries.filter((r) => /process|workflow|approval/i.test(r))]
          : input.resolutionSummaries.filter((r) => /process|workflow|approval/i.test(r)),
      };
    }

    // policy_gap: category="billing" OR resolutions mention "policy", "terms", "allowed"
    if (category === "billing" || /policy|terms|allowed|not.?allowed/i.test(combinedText)) {
      return {
        type: "policy_gap",
        confidence: 0.85,
        evidence: [`Category is "${category}"`, ...input.resolutionSummaries.filter((r) => /policy|terms|allowed/i.test(r))],
      };
    }

    // third_party: resolutions mention "vendor", "third party", "external", "upstream"
    if (/vendor|third.?party|external|upstream|third.?party/i.test(combinedText)) {
      return {
        type: "third_party",
        confidence: 0.8,
        evidence: input.resolutionSummaries.filter((r) => /vendor|third.?party|external|upstream/i.test(r)),
      };
    }

    // user_error: resolutions mention "user mistake", "incorrect", "wrong email"
    if (/user.?mistake|incorrect|wrong.?email|user.?error|wrong.?account/i.test(combinedText)) {
      return {
        type: "user_error",
        confidence: 0.75,
        evidence: input.resolutionSummaries.filter((r) => /user.?mistake|incorrect|wrong/i.test(r)),
      };
    }

    // unknown: insufficient evidence
    return {
      type: "unknown",
      confidence: 0.3,
      evidence: ["Insufficient evidence to determine root cause type"],
    };
  }

  private recommendFix(
    rootCauseType: RootCauseType,
    surfaceIssue: IssueCategory,
    _graph: CausalLink[]
  ): RootCauseReport["fixRecommendation"] {
    const priority = this.determinePriorityFromFrequency(0); // Will be overridden by frequency in actual use
    const basePriority = this.calculatePriorityFromGraph(_graph);

    switch (rootCauseType) {
      case "code_defect":
        return {
          type: "code_fix",
          description: "Engineering team should investigate and deploy a code fix",
          estimatedEffort: this.calculateEffort(surfaceIssue),
          priority: basePriority,
        };
      case "config_error":
        return {
          type: "config_change",
          description: "Update configuration settings to correct the issue",
          estimatedEffort: "low",
          priority: "high",
        };
      case "documentation_gap":
        return {
          type: "kb_article_update",
          description: "Create or update knowledge base article to guide users",
          estimatedEffort: "low",
          priority: "medium",
        };
      case "process_breakdown":
        return {
          type: "process_change",
          description: "Review and update internal processes to prevent recurrence",
          estimatedEffort: "medium",
          priority: "high",
        };
      case "policy_gap":
        return {
          type: "policy_update",
          description: "Review and update company policy to address the gap",
          estimatedEffort: "medium",
          priority: "medium",
        };
      case "third_party":
        return {
          type: "third_party_escalation",
          description: "Escalate to third-party vendor for resolution",
          estimatedEffort: "medium",
          priority: "high",
          owner: "integration team",
        };
      case "user_error":
        return {
          type: "user_education",
          description: "Provide clearer guidance and documentation to prevent user mistakes",
          estimatedEffort: "low",
          priority: "low",
        };
      case "unknown":
      default:
        return {
          type: "none",
          description: "Further investigation needed to determine appropriate fix",
          estimatedEffort: "high",
          priority: "low",
        };
    }
  }

  private calculatePriorityFromGraph(graph: CausalLink[]): "critical" | "high" | "medium" | "low" {
    const rootCauseNode = graph.find((n) => n.nodeType === "root_cause");
    if (!rootCauseNode) return "medium";

    // Priority based on root cause confidence and frequency
    if (rootCauseNode.confidence > 0.8) return "high";
    if (rootCauseNode.confidence > 0.6) return "medium";
    return "low";
  }

  private calculateEffort(surfaceIssue: IssueCategory): "low" | "medium" | "high" {
    // More complex categories typically require more effort
    if (["bug", "technical"].includes(surfaceIssue)) return "high";
    if (["billing", "account"].includes(surfaceIssue)) return "medium";
    return "low";
  }

  private determinePriorityFromFrequency(_frequency: number): "critical" | "high" | "medium" | "low" {
    // This is overridden by actual frequency in real usage
    return "medium";
  }

  private findSimilarCases(
    _patternId: string,
    ticketIds: string[]
  ): Array<{ ticketId: string; resolution: string }> {
    // In a real implementation, this would look up historical tickets
    // For now, return the current tickets as similar cases
    return ticketIds.map((id) => ({
      ticketId: id,
      resolution: "Previously resolved via standard process",
    }));
  }

  private generateSummary(
    input: RootCauseAnalysisInput,
    rootCause: RootCauseReport["rootCause"]
  ): string {
    const rcDescription = this.getRootCauseDescription(rootCause.type);
    return (
      `Root cause analysis for pattern "${input.patternId}" ` +
      `reveals that ${input.frequency} tickets sharing "${input.surfaceSubjectPattern}" ` +
      `were caused by ${rcDescription.toLowerCase()} ` +
      `(confidence: ${Math.round(rootCause.confidence * 100)}%). ` +
      `This pattern affected ${input.affectedCustomers.length} customers ` +
      `between ${input.timeRange.from} and ${input.timeRange.to}.`
    );
  }

  private extractActionPhrase(subjectPattern: string): string {
    // Extract a meaningful action phrase from the subject pattern
    const cleaned = subjectPattern
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
    return cleaned || "perform action";
  }

  private getRootCauseDescription(type: RootCauseType): string {
    const descriptions: Record<RootCauseType, string> = {
      code_defect: "Code Defect - Software bug in the application code",
      config_error: "Configuration Error - Incorrect system settings",
      documentation_gap: "Documentation Gap - Missing or unclear user documentation",
      process_breakdown: "Process Breakdown - Internal workflow or procedure failure",
      policy_gap: "Policy Gap - Missing or inadequate company policy",
      third_party: "Third Party Dependency - External vendor or service issue",
      user_error: "User Error - Customer mistake or misunderstanding",
      unknown: "Unknown - Insufficient evidence to determine root cause",
    };
    return descriptions[type] ?? descriptions.unknown;
  }
}
