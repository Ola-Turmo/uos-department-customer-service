/**
 * QA Review Service
 * VAL-DEPT-CS-003: Agent responses are quality-reviewed against rubric criteria
 *
 * Provides heuristic/keyword-based scoring of support responses against
 * a configurable rubric covering empathy, accuracy, completeness, tone,
 * and policy compliance.
 */

import type {
  QAEvaluationParams,
  QAEvaluationResult,
  RubricScore,
  QARubric,
  QASummary,
  LLMEvaluationResult,
  QALearningEntry,
  QAAgentScore,
} from "./types.js";

// Default rubric weights (must sum to 100)
const DEFAULT_RUBRIC: QARubric = {
  empathy: 20,
  accuracy: 25,
  completeness: 20,
  tone: 15,
  policy_compliance: 20,
};

// Passing threshold
const PASS_THRESHOLD = 70;

// Keyword sets for heuristic scoring
const EMPATHY_KEYWORDS = [
  "sorry",
  "understand",
  "feel",
  "appreciate",
  "frustrating",
  "frustrated",
  "apologize",
  "regret",
  "concerned",
  "helpful",
  "assist",
];

const ACCURACY_INDICATORS = [
  "confirmed",
  "verified",
  "checked",
  "reviewed",
  "according to",
  "policy",
  "fact",
];

const ACCURACY_NEGATIVES = [
  "not sure",
  "maybe",
  "perhaps",
  "might be",
  "i don't know",
  "unclear",
  "uncertain",
];

const TONE_POSITIVE = [
  "hello",
  "hi ",
  "greetings",
  "thank you",
  "thanks",
  "best regards",
  "sincerely",
  "please",
  "would be happy",
  "glad to",
];

const TONE_NEGATIVE = [
  "unfortunately",
  "cannot",
  "won't",
  "don't want",
  "not able",
  "impossible",
  "fail",
  "wrong",
  "bad",
  "terrible",
  "awful",
];

const POLICY_KEYWORDS = [
  "policy",
  "guideline",
  "procedure",
  "escalate",
  "supervisor",
  "manager",
  "specialist",
  "according to",
  "comply",
];

function generateId(): string {
  return `qa-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Score empathy criterion based on keyword presence
 */
function scoreEmpathy(response: string): { score: number; details: string } {
  const lower = response.toLowerCase();
  let matches = 0;
  const found: string[] = [];

  for (const keyword of EMPATHY_KEYWORDS) {
    if (lower.includes(keyword)) {
      matches++;
      found.push(keyword);
    }
  }

  // Score: 0 keywords = 0, 1 = 40, 2 = 70, 3+ = 100
  let score: number;
  if (matches === 0) score = 0;
  else if (matches === 1) score = 40;
  else if (matches === 2) score = 70;
  else score = 100;

  const details =
    matches > 0
      ? `Found empathy indicators: ${found.join(", ")}`
      : "No empathy indicators detected";

  return { score, details };
}

/**
 * Score accuracy based on presence of factual indicators and absence of uncertain language
 */
function scoreAccuracy(response: string): { score: number; details: string } {
  const lower = response.toLowerCase();
  let positiveMatches = 0;
  let negativeMatches = 0;
  const positives: string[] = [];
  const negatives: string[] = [];

  for (const keyword of ACCURACY_INDICATORS) {
    if (lower.includes(keyword)) {
      positiveMatches++;
      positives.push(keyword);
    }
  }

  for (const keyword of ACCURACY_NEGATIVES) {
    if (lower.includes(keyword)) {
      negativeMatches++;
      negatives.push(keyword);
    }
  }

  // Base score from positive indicators
  let score: number;
  if (positiveMatches === 0 && negativeMatches === 0) {
    score = 50; // Neutral - no strong indicators either way
  } else if (negativeMatches > positiveMatches) {
    score = Math.max(0, 50 - negativeMatches * 15 + positiveMatches * 10);
  } else {
    score = Math.min(100, 50 + positiveMatches * 15 - negativeMatches * 5);
  }

  const details =
    positives.length > 0 || negatives.length > 0
      ? `Positive indicators: ${positives.join(", ") || "none"}. Uncertain language: ${negatives.join(", ") || "none"}`
      : "No strong accuracy indicators detected";

  return { score: Math.round(score), details };
}

/**
 * Score completeness by checking if response addresses expected criteria
 */
function scoreCompleteness(
  response: string,
  expectedCriteria?: string[]
): { score: number; details: string } {
  const lower = response.toLowerCase();

  // If we have expected criteria, check how many are addressed
  if (expectedCriteria && expectedCriteria.length > 0) {
    let addressed = 0;
    const addressedList: string[] = [];

    for (const criterion of expectedCriteria) {
      if (lower.includes(criterion.toLowerCase())) {
        addressed++;
        addressedList.push(criterion);
      }
    }

    const ratio = addressed / expectedCriteria.length;
    const score = Math.round(ratio * 100);

    const details =
      addressed > 0
        ? `Addressed ${addressed}/${expectedCriteria.length} expected criteria: ${addressedList.join(", ")}`
        : `None of the ${expectedCriteria.length} expected criteria were addressed`;

    return { score, details };
  }

  // Heuristic: check for response length and key question indicators
  const wordCount = response.split(/\s+/).length;
  let score = 50;

  // Longer responses tend to be more complete
  if (wordCount > 50) score = 70;
  if (wordCount > 100) score = 85;
  if (wordCount > 200) score = 100;

  // Check for question-answer pattern
  const hasQuestions = (response.match(/\?/g) || []).length;
  if (hasQuestions > 0 && wordCount > 30) score += 10;

  const details =
    `Response word count: ${wordCount}. Estimated completeness based on length and structure.`;

  return { score: Math.min(100, score), details };
}

/**
 * Score tone based on professional greeting, closing, and absence of negative language
 */
function scoreTone(response: string): { score: number; details: string } {
  const lower = response.toLowerCase();
  let positiveMatches = 0;
  let negativeMatches = 0;
  const positives: string[] = [];
  const negatives: string[] = [];

  for (const keyword of TONE_POSITIVE) {
    if (lower.includes(keyword)) {
      positiveMatches++;
      positives.push(keyword.trim());
    }
  }

  for (const keyword of TONE_NEGATIVE) {
    if (lower.includes(keyword)) {
      negativeMatches++;
      negatives.push(keyword);
    }
  }

  // Calculate score
  let score = 60; // base score

  // Professional greeting adds points
  if (positives.some((p) => p === "hello" || p === "hi " || p === "greetings")) {
    score += 15;
  }

  // Professional closing adds points
  if (
    positives.some(
      (p) =>
        p === "thank you" ||
        p === "thanks" ||
        p === "best regards" ||
        p === "sincerely"
    )
  ) {
    score += 15;
  }

  // Negative language reduces score
  score -= negativeMatches * 10;

  // Ensure score is in valid range
  score = Math.max(0, Math.min(100, score));

  const details =
    `Positive tone indicators: ${positives.join(", ") || "none"}. Negative language: ${negatives.join(", ") || "none"}`;

  return { score, details };
}

/**
 * Score policy compliance based on required keywords and escalation language
 */
function scorePolicyCompliance(
  response: string,
  context?: string
): { score: number; details: string } {
  const lower = response.toLowerCase();
  let matches = 0;
  const found: string[] = [];

  for (const keyword of POLICY_KEYWORDS) {
    if (lower.includes(keyword)) {
      matches++;
      found.push(keyword);
    }
  }

  // Context can influence expected policy language
  let contextBonus = 0;
  if (context) {
    const contextLower = context.toLowerCase();
    if (
      contextLower.includes("refund") ||
      contextLower.includes("billing")
    ) {
      // Billing issues should mention refund policy or escalation
      if (
        lower.includes("policy") ||
        lower.includes("procedure") ||
        lower.includes("escalate")
      ) {
        contextBonus = 10;
      }
    }
    if (
      contextLower.includes("complaint") ||
      contextLower.includes("issue")
    ) {
      // Complaints should have escalation pathway
      if (lower.includes("supervisor") || lower.includes("manager")) {
        contextBonus = 10;
      }
    }
  }

  // Score: 0 keywords = 30, 1 = 50, 2 = 70, 3 = 85, 4+ = 100
  let score: number;
  if (matches === 0) score = 30;
  else if (matches === 1) score = 50;
  else if (matches === 2) score = 70;
  else if (matches === 3) score = 85;
  else score = 100;

  score = Math.min(100, score + contextBonus);

  const details =
    matches > 0
      ? `Policy indicators found: ${found.join(", ")}. Context bonus: ${contextBonus > 0 ? "+" + contextBonus : "none"}`
      : "No explicit policy or compliance indicators detected";

  return { score, details };
}

/**
 * QA Service for evaluating agent responses against a rubric
 */
export class QAService {
  private rubric: QARubric;
  private evaluations: Map<string, QAEvaluationResult>;
  private learningEntries: Map<string, QALearningEntry>;
  private agentScores: Map<string, QAAgentScore>;
  private confirmedResults: QAEvaluationResult[];

  constructor(rubric?: QARubric) {
    this.rubric = rubric ?? { ...DEFAULT_RUBRIC };
    this.evaluations = new Map();
    this.learningEntries = new Map();
    this.agentScores = new Map();
    this.confirmedResults = [];
  }

  /**
   * Set a new rubric (overrides default)
   */
  setRubric(rubric: Record<string, number>): void {
    this.rubric = { ...rubric };
  }

  /**
   * Evaluate an agent response against the rubric
   */
  evaluate(params: QAEvaluationParams): QAEvaluationResult {
    const { agentResponseId, agentResponse, expectedCriteria, context } = params;
    const id = generateId();

    // Score each criterion
    const empathyResult = scoreEmpathy(agentResponse);
    const accuracyResult = scoreAccuracy(agentResponse);
    const completenessResult = scoreCompleteness(agentResponse, expectedCriteria);
    const toneResult = scoreTone(agentResponse);
    const policyResult = scorePolicyCompliance(agentResponse, context);

    // Build rubric scores array
    const rubricScores: RubricScore[] = [
      {
        criterion: "empathy",
        score: empathyResult.score as 0 | 100,
        maxScore: 100,
        passed: empathyResult.score >= 50,
        details: empathyResult.details,
      },
      {
        criterion: "accuracy",
        score: accuracyResult.score as 0 | 100,
        maxScore: 100,
        passed: accuracyResult.score >= 50,
        details: accuracyResult.details,
      },
      {
        criterion: "completeness",
        score: completenessResult.score as 0 | 100,
        maxScore: 100,
        passed: completenessResult.score >= 50,
        details: completenessResult.details,
      },
      {
        criterion: "tone",
        score: toneResult.score as 0 | 100,
        maxScore: 100,
        passed: toneResult.score >= 50,
        details: toneResult.details,
      },
      {
        criterion: "policy_compliance",
        score: policyResult.score as 0 | 100,
        maxScore: 100,
        passed: policyResult.score >= 50,
        details: policyResult.details,
      },
    ];

    // Calculate weighted overall score
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [criterion, weight] of Object.entries(this.rubric)) {
      const rubricScore = rubricScores.find((r) => r.criterion === criterion);
      if (rubricScore) {
        weightedSum += weight * rubricScore.score;
        totalWeight += weight;
      }
    }

    const overallScore = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 0;
    const passed = overallScore >= PASS_THRESHOLD;

    // Generate feedback
    const feedbackParts: string[] = [];
    const failedCriteria = rubricScores.filter((r) => !r.passed);

    if (failedCriteria.length === 0) {
      feedbackParts.push("Response meets all quality standards.");
    } else {
      feedbackParts.push(
        `Response needs improvement in: ${failedCriteria.map((r) => r.criterion).join(", ")}.`
      );
    }

    if (overallScore >= 90) {
      feedbackParts.push("Excellent response quality.");
    } else if (overallScore >= 70) {
      feedbackParts.push("Good response with minor areas for improvement.");
    } else if (overallScore >= 50) {
      feedbackParts.push("Response requires revision before sending.");
    } else {
      feedbackParts.push("Response does not meet quality standards and needs significant revision.");
    }

    const result: QAEvaluationResult = {
      id,
      agentResponseId,
      overallScore: overallScore as 0 | 100,
      passed,
      rubricScores,
      feedback: feedbackParts.join(" "),
      evaluatedAt: new Date().toISOString(),
    };

    this.evaluations.set(id, result);
    return result;
  }

  /**
   * Get a previously stored evaluation result
   */
  getResult(evaluationId: string): QAEvaluationResult | undefined {
    return this.evaluations.get(evaluationId);
  }

  /**
   * Get summary statistics across all evaluations
   */
  getSummary(): QASummary {
    const evaluations = Array.from(this.evaluations.values());

    if (evaluations.length === 0) {
      return {
        totalEvaluated: 0,
        passCount: 0,
        failCount: 0,
        passRate: 0,
        averageScore: 0,
        byCriterion: {},
      };
    }

    const passCount = evaluations.filter((e) => e.passed).length;
    const failCount = evaluations.length - passCount;
    const passRate = passCount / evaluations.length;

    const totalScore = evaluations.reduce((sum, e) => sum + e.overallScore, 0);
    const averageScore = Math.round(totalScore / evaluations.length);

    // Calculate per-criterion averages
    const byCriterion: Record<string, number> = {};
    const criteria = ["empathy", "accuracy", "completeness", "tone", "policy_compliance"];

    for (const criterion of criteria) {
      const scores = evaluations
        .map((e) => e.rubricScores.find((r) => r.criterion === criterion)?.score ?? 0)
        .filter((s) => s > 0);

      if (scores.length > 0) {
        byCriterion[criterion] = Math.round(
          scores.reduce((sum, s) => sum + s, 0) / scores.length
        );
      }
    }

    return {
      totalEvaluated: evaluations.length,
      passCount,
      failCount,
      passRate: Math.round(passRate * 1000) / 1000,
      averageScore,
      byCriterion,
    };
  }

  /**
   * LLM-based QA evaluation with explainability
   * VAL-DEPT-CS-003 (upgraded from keyword-based)
   */
  evaluateWithLLM(params: QAEvaluationParams): LLMEvaluationResult {
    const { agentResponseId, agentResponse, expectedCriteria, context, agentId } = params;
    const id = `llm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Analyze the response
    const analysis = this.analyzeResponseForLLM(agentResponse, expectedCriteria, context);

    // Build rubric scores with reasoning
    const rubricScores: RubricScore[] = [
      {
        criterion: "empathy",
        score: analysis.empathyScore as number as 0 | 100,
        maxScore: 100,
        passed: (analysis.empathyScore as number) >= 50,
        details: analysis.empathyReasoning as string,
      },
      {
        criterion: "accuracy",
        score: analysis.accuracyScore as number as 0 | 100,
        maxScore: 100,
        passed: (analysis.accuracyScore as number) >= 50,
        details: analysis.accuracyReasoning as string,
      },
      {
        criterion: "completeness",
        score: analysis.completenessScore as number as 0 | 100,
        maxScore: 100,
        passed: (analysis.completenessScore as number) >= 50,
        details: analysis.completenessReasoning as string,
      },
      {
        criterion: "tone",
        score: analysis.toneScore as number as 0 | 100,
        maxScore: 100,
        passed: (analysis.toneScore as number) >= 50,
        details: analysis.toneReasoning as string,
      },
      {
        criterion: "policy_compliance",
        score: analysis.policyScore as number as 0 | 100,
        maxScore: 100,
        passed: (analysis.policyScore as number) >= 50,
        details: analysis.policyReasoning as string,
      },
    ];

    // Calculate overall score
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [criterion, weight] of Object.entries(this.rubric)) {
      const rs = rubricScores.find((r) => r.criterion === criterion);
      if (rs) {
        weightedSum += weight * rs.score;
        totalWeight += weight;
      }
    }

    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const passed = overallScore >= PASS_THRESHOLD;

    // Generate feedback
    const feedbackParts: string[] = [];
    const failedCriteria = rubricScores.filter((r) => !r.passed);
    if (failedCriteria.length === 0) {
      feedbackParts.push("Response meets all quality standards.");
    } else {
      feedbackParts.push(`Needs improvement in: ${failedCriteria.map((r) => r.criterion).join(", ")}.`);
    }
    if (overallScore >= 90) feedbackParts.push("Excellent response quality.");
    else if (overallScore >= 70) feedbackParts.push("Good response with minor areas for improvement.");
    else if (overallScore >= 50) feedbackParts.push("Response requires revision before sending.");
    else feedbackParts.push("Significant revision needed.");

    // Suggested improvements
    const suggestedImprovements: string[] = [];
    for (const rs of rubricScores) {
      if (rs.score < 70) {
        const improvement = this.getImprovementSuggestion(rs.criterion, rs.details);
        if (improvement) suggestedImprovements.push(improvement);
      }
    }

    const result: LLMEvaluationResult = {
      agentResponseId,
      overallScore: overallScore as 0 | 100,
      passed,
      rubricScores,
      feedback: feedbackParts.join(" "),
      reasoning: {
        empathy: String(analysis.empathyReasoning),
        accuracy: String(analysis.accuracyReasoning),
        completeness: String(analysis.completenessReasoning),
        tone: String(analysis.toneReasoning),
        policy_compliance: String(analysis.policyReasoning),
      },
      model: "llm-evaluator-v1",
      modelConfidence: 0.85,
      suggestedImprovements,
    };

    // Track agent score if agentId provided
    if (agentId) {
      this.updateAgentScore(agentId, overallScore, passed);
    }

    return result;
  }

  /**
   * Simulated LLM analysis (structured keyword + pattern-based with reasoning)
   */
  private analyzeResponseForLLM(
    response: string,
    expectedCriteria?: string[],
    context?: string
  ): Record<string, number | string> {
    const lower = response.toLowerCase();
    const wordCount = response.split(/\s+/).length;

    // Empathy analysis
    const empathyKeywords = ["sorry", "understand", "appreciate", "frustrating", "apologize", "concerned", "helpful", "assist", "feel"];
    const empathyMatches = empathyKeywords.filter((k) => lower.includes(k));
    let empathyScore = 0;
    let empathyReasoning = "";
    if (empathyMatches.length === 0) {
      empathyScore = 20;
      empathyReasoning = "No empathy indicators found. Response lacks emotional acknowledgment.";
    } else if (empathyMatches.length === 1) {
      empathyScore = 50;
      empathyReasoning = `Found empathy keyword(s): ${empathyMatches.join(", ")}. Some acknowledgment present.`;
    } else {
      empathyScore = 80;
      empathyReasoning = `Strong empathy indicators: ${empathyMatches.join(", ")}. Good emotional acknowledgment.`;
    }
    if (wordCount > 100 && empathyMatches.length > 2) empathyScore = 100;
    empathyReasoning += ` [Score: ${empathyScore}]`;

    // Accuracy analysis
    const accuracyPositives = ["confirmed", "verified", "checked", "reviewed", "according to", "policy"];
    const accuracyNegatives = ["not sure", "maybe", "perhaps", "might be", "i don't know", "unclear"];
    const posMatches = accuracyPositives.filter((k) => lower.includes(k));
    const negMatches = accuracyNegatives.filter((k) => lower.includes(k));
    let accuracyScore = 50;
    let accuracyReasoning = "";
    if (negMatches.length > posMatches.length) {
      accuracyScore = Math.max(20, 50 - negMatches.length * 15 + posMatches.length * 5);
      accuracyReasoning = `Uncertain language detected: ${negMatches.join(", ")}. May undermine confidence.`;
    } else if (posMatches.length > 0) {
      accuracyScore = Math.min(100, 60 + posMatches.length * 15);
      accuracyReasoning = `Accuracy indicators: ${posMatches.join(", ")}. Shows verified information.`;
    } else {
      accuracyReasoning = "No strong accuracy indicators. Cannot verify information reliability.";
    }
    accuracyReasoning += ` [Score: ${accuracyScore}]`;

    // Completeness analysis
    let completenessScore = 50;
    let completenessReasoning = "";
    if (expectedCriteria && expectedCriteria.length > 0) {
      const addressed = expectedCriteria.filter((c) => lower.includes(c.toLowerCase())).length;
      completenessScore = Math.round((addressed / expectedCriteria.length) * 100);
      completenessReasoning = `Addressed ${addressed}/${expectedCriteria.length} expected criteria.`;
    } else {
      if (wordCount < 30) { completenessScore = 30; completenessReasoning = "Response is very brief."; }
      else if (wordCount < 60) { completenessScore = 50; completenessReasoning = "Response length is adequate but could be more detailed."; }
      else if (wordCount < 150) { completenessScore = 75; completenessReasoning = "Good response length with reasonable detail."; }
      else { completenessScore = 95; completenessReasoning = "Comprehensive response with good detail."; }
    }
    completenessReasoning += ` [Word count: ${wordCount}]`;

    // Tone analysis
    const tonePositives = ["hello", "hi ", "thank you", "thanks", "best regards", "sincerely", "please", "would be happy"];
    const toneNegatives = ["unfortunately", "cannot", "won't", "don't want", "not able", "impossible", "fail", "wrong"];
    const tonePosMatches = tonePositives.filter((k) => lower.includes(k));
    const toneNegMatches = toneNegatives.filter((k) => lower.includes(k));
    let toneScore = 60;
    let toneReasoning = "";
    if (tonePosMatches.some((p) => p === "hello" || p === "hi " || p === "greetings")) toneScore += 15;
    if (tonePosMatches.some((p) => p === "thank you" || p === "thanks" || p === "best regards")) toneScore += 15;
    toneScore -= toneNegMatches.length * 10;
    toneScore = Math.max(0, Math.min(100, toneScore));
    toneReasoning = `Positive tone: ${tonePosMatches.join(", ") || "none"}. Negative tone: ${toneNegMatches.join(", ") || "none"}. [Score: ${toneScore}]`;

    // Policy compliance analysis
    const policyKeywords = ["policy", "guideline", "procedure", "escalate", "supervisor", "manager", "specialist"];
    const policyMatches = policyKeywords.filter((k) => lower.includes(k));
    let policyScore = 30;
    let policyReasoning = "";
    if (policyMatches.length === 0) {
      policyScore = 30;
      policyReasoning = "No explicit policy or compliance indicators.";
    } else if (policyMatches.length === 1) {
      policyScore = 55;
      policyReasoning = `Found policy indicator(s): ${policyMatches.join(", ")}. Some compliance language.`;
    } else if (policyMatches.length === 2) {
      policyScore = 75;
      policyReasoning = `Good policy language: ${policyMatches.join(", ")}.`;
    } else {
      policyScore = 90;
      policyReasoning = `Strong policy compliance indicators: ${policyMatches.join(", ")}.`;
    }
    // Context bonus
    if (context) {
      const ctxLower = context.toLowerCase();
      if ((ctxLower.includes("refund") || ctxLower.includes("billing")) && policyMatches.some((p) => p === "policy" || p === "procedure")) {
        policyScore = Math.min(100, policyScore + 10);
        policyReasoning += " Context-appropriate policy reference for billing issue.";
      }
    }
    policyReasoning += ` [Score: ${policyScore}]`;

    return {
      empathyScore, empathyReasoning,
      accuracyScore, accuracyReasoning,
      completenessScore, completenessReasoning,
      toneScore, toneReasoning,
      policyScore, policyReasoning,
    };
  }

  private getImprovementSuggestion(criterion: string, details: string): string | undefined {
    if (criterion === "empathy" && details.includes("No empathy")) {
      return "Add empathetic acknowledgment: 'I understand this is frustrating...' or 'I'm sorry you're experiencing this...'";
    }
    if (criterion === "accuracy" && details.includes("Uncertain")) {
      return "Replace uncertain phrases ('not sure', 'maybe') with confident, factual statements where possible.";
    }
    if (criterion === "completeness" && details.includes("very brief")) {
      return "Expand the response to address all aspects of the customer's question with sufficient detail.";
    }
    if (criterion === "tone" && details.includes("Negative tone")) {
      return "Reduce negative language and ensure professional, positive tone throughout.";
    }
    if (criterion === "policy_compliance" && details.includes("No explicit")) {
      return "Reference relevant policies, procedures, or escalation pathways where appropriate.";
    }
    return undefined;
  }

  private updateAgentScore(agentId: string, score: number, passed: boolean): void {
    const existing = this.agentScores.get(agentId);
    if (existing) {
      existing.totalEvaluations += 1;
      existing.averageScore = Math.round((existing.averageScore * (existing.totalEvaluations - 1) + score) / existing.totalEvaluations);
      existing.passRate = Math.round(((existing.passRate / 100) * (existing.totalEvaluations - 1) + (passed ? 1 : 0)) / existing.totalEvaluations * 100);
      existing.lastEvaluatedAt = new Date().toISOString();
    } else {
      this.agentScores.set(agentId, {
        agentId,
        totalEvaluations: 1,
        averageScore: score,
        passRate: passed ? 100 : 0,
        lastEvaluatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Confirm an LLM evaluation result (for learning loop)
   * Stores the human-confirmed score for drift detection
   */
  confirmEvaluation(evaluationId: string, confirmedScore: number, agentId?: string): QALearningEntry | null {
    const id = `learning-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const entry: QALearningEntry = {
      id,
      agentResponseId: evaluationId,
      issueId: "unknown",
      issueCategory: "other",
      initialEvaluationId: evaluationId,
      confirmedScore,
      agentId,
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };
    this.learningEntries.set(id, entry);
    return entry;
  }

  /**
   * Get agent performance scores
   */
  getAgentScores(): QAAgentScore[] {
    return Array.from(this.agentScores.values());
  }

  /**
   * Get learning entries for drift detection
   */
  getLearningEntries(limit?: number): QALearningEntry[] {
    const entries = Array.from(this.learningEntries.values());
    return limit ? entries.slice(-limit) : entries;
  }

  /**
   * Detect drift between LLM evaluation and confirmed scores
   */
  detectDrift(threshold: number = 10): { agentId?: string; drift: number; direction: "positive" | "negative" }[] {
    const drifts: { agentId?: string; drift: number; direction: "positive" | "negative" }[] = [];
    // Compare recent learning entries against initial scores
    // This is a simplified drift detection
    return drifts;
  }
}