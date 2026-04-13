/**
 * Recurring Pattern Service
 * VAL-DEPT-CS-002: Recurring support patterns create upstream product or knowledge actions
 * 
 * Detects recurring support issue patterns and creates traceable upstream
 * follow-up artifacts that remain beyond the original ticket flow.
 */

import type {
  IssuePattern,
  UpstreamAction,
  RecurringPatternState,
  DetectPatternsParams,
  CreateUpstreamActionParams,
  LinkPatternToIssueParams,
  UpdatePatternStatusParams,
  UpdateUpstreamActionStatusParams,
  GetRecurringIssuesReportParams,
  PatternDetectionResult,
  IssueCategory,
  TriageResult,
} from "./types.js";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Normalize issue text for pattern matching
 */
function normalizeForPattern(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract key phrases from text for pattern matching
 */
function extractKeyPhrases(text: string): string[] {
  const normalized = normalizeForPattern(text);
  const words = normalized.split(" ");

  // Remove common stop words
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "or", "and", "but",
    "if", "then", "so", "not", "no", "it", "this", "that", "i", "you", "we",
    "they", "he", "she", "my", "your", "our", "their", "its", "get", "got",
    "have", "having", "im", "i'm", "you're", "youre", "don't", "dont",
  ]);

  // Extract 2-3 word phrases
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }
    if (i < words.length - 2 && !stopWords.has(words[i]) && !stopWords.has(words[i + 2])) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return phrases;
}

/**
 * Generate a pattern key from issue content
 */
function generatePatternKey(category: IssueCategory, subject: string, description: string): string {
  const phrases = extractKeyPhrases(`${subject} ${description}`);
  const topPhrases = phrases.slice(0, 3).join("-").replace(/\s+/g, "-");
  return `${category}-${topPhrases}`.substring(0, 80);
}

/**
 * Calculate impact score based on frequency and affected customers
 */
function calculateImpactScore(frequency: number, affectedCustomers: number): number {
  // Weighted combination: frequency (40%) + affected customers (60%)
  const frequencyScore = Math.min(frequency / 10, 1) * 40;
  const customerScore = Math.min(affectedCustomers / 50, 1) * 60;
  return Math.round(frequencyScore + customerScore);
}

export class RecurringPatternService {
  private state: RecurringPatternState;

  constructor(initialState?: RecurringPatternState) {
    this.state = initialState ?? {
      patterns: {},
      upstreamActions: {},
      issueIndex: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Index a triage result for pattern detection
   * VAL-DEPT-CS-002
   */
  indexTriageResult(result: TriageResult): void {
    const patternKey = generatePatternKey(result.category, result.issueId, result.issueId);

    // Find existing pattern by key
    const existingPattern = Object.values(this.state.patterns).find(
      (p) => p.patternKey === patternKey && p.status !== "resolved"
    );

    if (existingPattern) {
      // Update existing pattern
      if (!existingPattern.linkedIssueIds.includes(result.issueId)) {
        existingPattern.linkedIssueIds.push(result.issueId);
        existingPattern.frequency = existingPattern.linkedIssueIds.length;
        existingPattern.lastSeenAt = new Date().toISOString();
        existingPattern.affectedCustomers = Math.min(
          existingPattern.affectedCustomers + 1,
          existingPattern.linkedIssueIds.length
        );
        existingPattern.impactScore = calculateImpactScore(
          existingPattern.frequency,
          existingPattern.affectedCustomers
        );
      }

      // Update index
      if (!this.state.issueIndex[result.issueId]) {
        this.state.issueIndex[result.issueId] = [];
      }
      if (!this.state.issueIndex[result.issueId].includes(existingPattern.id)) {
        this.state.issueIndex[result.issueId].push(existingPattern.id);
      }
    }

    this.state.lastUpdated = new Date().toISOString();
  }

  /**
   * Detect recurring patterns in triage results
   * VAL-DEPT-CS-002
   */
  detectPatterns(params: DetectPatternsParams): PatternDetectionResult[] {
    const minFrequency = params.minFrequency ?? 2;
    const lookbackDays = params.lookbackDays ?? 30;
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    const results: PatternDetectionResult[] = [];

    // Group issues by pattern key
    const patternGroups = new Map<string, {
      category: IssueCategory;
      firstSubject: string;
      issues: { id: string; at: string }[];
    }>();

    for (const [issueId, patternIds] of Object.entries(this.state.issueIndex)) {
      for (const patternId of patternIds) {
        const pattern = this.state.patterns[patternId];
        if (!pattern) continue;

        // Filter by category if specified
        if (params.category && pattern.category !== params.category) continue;

        // Filter by date
        const issueDate = new Date(pattern.lastSeenAt);
        if (issueDate < lookbackDate) continue;

        if (!patternGroups.has(pattern.patternKey)) {
          patternGroups.set(pattern.patternKey, {
            category: pattern.category,
            firstSubject: pattern.title,
            issues: [],
          });
        }
        patternGroups.get(pattern.patternKey)!.issues.push({
          id: issueId,
          at: pattern.lastSeenAt,
        });
      }
    }

    // Create patterns for groups exceeding minimum frequency
    for (const [patternKey, group] of Array.from(patternGroups.entries())) {
      if (group.issues.length < minFrequency) continue;

      const now = new Date().toISOString();
      const pattern: IssuePattern = {
        id: generateId(),
        patternKey,
        title: group.firstSubject,
        description: `Recurring ${group.category} issue detected in ${group.issues.length} recent cases`,
        category: group.category,
        frequency: group.issues.length,
        affectedCustomers: group.issues.length,
        impactScore: calculateImpactScore(group.issues.length, group.issues.length),
        firstSeenAt: group.issues[group.issues.length - 1]?.at ?? now,
        lastSeenAt: group.issues[0]?.at ?? now,
        linkedIssueIds: group.issues.map((i) => i.id),
        tags: [group.category, "recurring"],
        status: "detected",
      };

      pattern.impactScore = calculateImpactScore(pattern.frequency, pattern.affectedCustomers);
      this.state.patterns[pattern.id] = pattern;

      // Determine suggested action kind
      let suggestedActionKind: UpstreamAction["kind"] = "process-improvement";
      if (pattern.category === "bug") {
        suggestedActionKind = "bug-fix";
      } else if (pattern.category === "how-to") {
        suggestedActionKind = "knowledge-update";
      } else if (pattern.category === "feature-request") {
        suggestedActionKind = "feature-request";
      } else if (pattern.category === "billing" || pattern.category === "refund") {
        suggestedActionKind = "process-improvement";
      }

      results.push({
        pattern,
        detectedAt: now,
        confidence: pattern.frequency >= 5 ? "high" : pattern.frequency >= 3 ? "medium" : "low",
        similarIssuesFound: pattern.frequency,
        suggestedActionKind,
      });
    }

    this.state.lastUpdated = new Date().toISOString();
    return results;
  }

  /**
   * Get a pattern by ID
   */
  getPattern(patternId: string): IssuePattern | undefined {
    return this.state.patterns[patternId];
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): IssuePattern[] {
    return Object.values(this.state.patterns);
  }

  /**
   * Get patterns by status
   */
  getPatternsByStatus(status: IssuePattern["status"]): IssuePattern[] {
    return Object.values(this.state.patterns).filter((p) => p.status === status);
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: IssueCategory): IssuePattern[] {
    return Object.values(this.state.patterns).filter((p) => p.category === category);
  }

  /**
   * Get patterns for a specific issue
   */
  getPatternsForIssue(issueId: string): IssuePattern[] {
    const patternIds = this.state.issueIndex[issueId] ?? [];
    return patternIds.map((id) => this.state.patterns[id]).filter(Boolean);
  }

  /**
   * Link an existing pattern to an issue
   * VAL-DEPT-CS-002
   */
  linkPatternToIssue(params: LinkPatternToIssueParams): IssuePattern | undefined {
    const pattern = this.state.patterns[params.patternId];
    if (!pattern) return undefined;

    if (!pattern.linkedIssueIds.includes(params.issueId)) {
      pattern.linkedIssueIds.push(params.issueId);
      pattern.frequency = pattern.linkedIssueIds.length;
      pattern.lastSeenAt = new Date().toISOString();
      pattern.impactScore = calculateImpactScore(
        pattern.frequency,
        pattern.affectedCustomers
      );
    }

    if (!this.state.issueIndex[params.issueId]) {
      this.state.issueIndex[params.issueId] = [];
    }
    if (!this.state.issueIndex[params.issueId].includes(params.patternId)) {
      this.state.issueIndex[params.issueId].push(params.patternId);
    }

    this.state.lastUpdated = new Date().toISOString();
    return pattern;
  }

  /**
   * Update pattern status
   * VAL-DEPT-CS-002
   */
  updatePatternStatus(params: UpdatePatternStatusParams): IssuePattern | undefined {
    const pattern = this.state.patterns[params.patternId];
    if (!pattern) return undefined;

    pattern.status = params.status;
    if (params.notes) {
      pattern.tags.push(...params.notes);
    }

    this.state.lastUpdated = new Date().toISOString();
    return pattern;
  }

  /**
   * Create an upstream action from a pattern
   * VAL-DEPT-CS-002
   */
  createUpstreamAction(params: CreateUpstreamActionParams): UpstreamAction | undefined {
    const pattern = this.state.patterns[params.patternId];
    if (!pattern) return undefined;

    const now = new Date().toISOString();

    const action: UpstreamAction = {
      id: generateId(),
      title: params.title,
      description: params.description,
      kind: params.kind,
      sourcePatternId: params.patternId,
      sourceIssueIds: [...pattern.linkedIssueIds],
      status: "proposed",
      ownerRoleKey: params.ownerRoleKey,
      ownerTeam: params.ownerTeam,
      priority: params.priority ?? (pattern.impactScore >= 70 ? "high" : pattern.impactScore >= 40 ? "medium" : "low"),
      impactScore: pattern.impactScore,
      createdAt: now,
      updatedAt: now,
      dueDate: params.dueDate,
      evidenceIds: [],
      externalRef: params.externalRef,
      externalUrl: params.externalUrl,
      notes: [],
    };

    this.state.upstreamActions[action.id] = action;

    // Update pattern status to indicate action was created
    pattern.status = "action-created";
    pattern.tags.push(`action:${action.id}`);

    this.state.lastUpdated = now;
    return action;
  }

  /**
   * Get an upstream action by ID
   */
  getUpstreamAction(actionId: string): UpstreamAction | undefined {
    return this.state.upstreamActions[actionId];
  }

  /**
   * Get all upstream actions
   */
  getAllUpstreamActions(): UpstreamAction[] {
    return Object.values(this.state.upstreamActions);
  }

  /**
   * Get actions by pattern
   */
  getActionsByPattern(patternId: string): UpstreamAction[] {
    return Object.values(this.state.upstreamActions).filter(
      (a) => a.sourcePatternId === patternId
    );
  }

  /**
   * Get actions by status
   */
  getActionsByStatus(status: UpstreamAction["status"]): UpstreamAction[] {
    return Object.values(this.state.upstreamActions).filter((a) => a.status === status);
  }

  /**
   * Get actions by kind
   */
  getActionsByKind(kind: UpstreamAction["kind"]): UpstreamAction[] {
    return Object.values(this.state.upstreamActions).filter((a) => a.kind === kind);
  }

  /**
   * Get open (non-completed, non-rejected) actions
   */
  getOpenActions(): UpstreamAction[] {
    return Object.values(this.state.upstreamActions).filter(
      (a) => !["completed", "rejected"].includes(a.status)
    );
  }

  /**
   * Update upstream action status
   * VAL-DEPT-CS-002
   */
  updateUpstreamActionStatus(
    params: UpdateUpstreamActionStatusParams
  ): UpstreamAction | undefined {
    const action = this.state.upstreamActions[params.actionId];
    if (!action) return undefined;

    action.status = params.status;
    action.updatedAt = new Date().toISOString();

    if (params.notes && params.notes.length > 0) {
      action.notes.push(...params.notes);
    }

    if (params.externalRef) {
      action.externalRef = params.externalRef;
    }

    if (params.externalUrl) {
      action.externalUrl = params.externalUrl;
    }

    if (params.status === "completed") {
      action.completedAt = new Date().toISOString();
    }

    this.state.lastUpdated = action.updatedAt;
    return action;
  }

  /**
   * Add a note to an action
   */
  addActionNote(actionId: string, note: string): UpstreamAction | undefined {
    const action = this.state.upstreamActions[actionId];
    if (!action) return undefined;

    action.notes.push(note);
    action.updatedAt = new Date().toISOString();
    this.state.lastUpdated = action.updatedAt;
    return action;
  }

  /**
   * Link an external reference to an action
   */
  linkExternalRef(
    actionId: string,
    externalRef: string,
    externalUrl?: string
  ): UpstreamAction | undefined {
    const action = this.state.upstreamActions[actionId];
    if (!action) return undefined;

    action.externalRef = externalRef;
    if (externalUrl) {
      action.externalUrl = externalUrl;
    }
    action.updatedAt = new Date().toISOString();
    this.state.lastUpdated = action.updatedAt;
    return action;
  }

  /**
   * Generate a recurring issues report
   * VAL-DEPT-CS-002
   */
  generateRecurringIssuesReport(
    params?: GetRecurringIssuesReportParams
  ): {
    patterns: IssuePattern[];
    actions: UpstreamAction[];
    summary: {
      totalPatterns: number;
      byCategory: Record<IssueCategory, number>;
      byStatus: Record<IssuePattern["status"], number>;
      totalActionsCreated: number;
      openActions: number;
      completedActions: number;
      averageImpactScore: number;
    };
  } {
    let patterns = Object.values(this.state.patterns);

    // Apply filters
    if (params?.lookbackDays) {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - params.lookbackDays);
      patterns = patterns.filter((p) => new Date(p.lastSeenAt) >= lookbackDate);
    }

    if (params?.category) {
      patterns = patterns.filter((p) => p.category === params.category);
    }

    if (params?.status) {
      patterns = patterns.filter((p) => p.status === params.status);
    }

    // Get associated actions
    const patternIds = new Set(patterns.map((p) => p.id));
    const actions = Object.values(this.state.upstreamActions).filter((a) =>
      patternIds.has(a.sourcePatternId)
    );

    // Build summary
    const byCategory: Record<IssueCategory, number> = {
      bug: 0,
      billing: 0,
      account: 0,
      "feature-request": 0,
      "how-to": 0,
      complaint: 0,
      refund: 0,
      technical: 0,
      other: 0,
    };

    const byStatus: Record<IssuePattern["status"], number> = {
      detected: 0,
      investigating: 0,
      "action-created": 0,
      resolved: 0,
      ignored: 0,
    };

    let impactSum = 0;
    for (const pattern of patterns) {
      byCategory[pattern.category]++;
      byStatus[pattern.status]++;
      impactSum += pattern.impactScore;
    }

    return {
      patterns,
      actions,
      summary: {
        totalPatterns: patterns.length,
        byCategory,
        byStatus,
        totalActionsCreated: actions.length,
        openActions: actions.filter((a) => !["completed", "rejected"].includes(a.status)).length,
        completedActions: actions.filter((a) => a.status === "completed").length,
        averageImpactScore: patterns.length > 0 ? Math.round(impactSum / patterns.length) : 0,
      },
    };
  }

  /**
   * Get current state for persistence
   */
  getState(): RecurringPatternState {
    return this.state;
  }

  /**
   * Load state from persistence
   */
  loadState(state: RecurringPatternState): void {
    this.state = state;
  }
}
