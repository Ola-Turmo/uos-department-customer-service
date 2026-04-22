import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { TriageService } from "./triage-service.js";
import { RecurringPatternService } from "./recurring-pattern-service.js";
import { QAService } from "./qa-service.js";
import { intentClassifier } from "./triage/intent-classifier.js";
import { sentimentAnalyzer } from "./triage/sentiment-analyzer.js";
import {
  createInitialConnectorHealthState,
  updateConnectorHealthState,
  computeDepartmentHealthStatus,
  generateToolkitLimitations,
  formatAllLimitations,
  performRuntimeHealthCheck,
  type ConnectorHealthState,
} from "./connector-health.js";
import { policyEngine } from "./policy/policy-engine.js";
import { customerProfileSynthesizer, CustomerProfileSynthesizerParams } from "./customer/customer-profile.js";
import { feedbackBus } from "./feedback/feedback-bus.js";
import { slaEngine } from "./sla/sla-engine.js";
import { autonomousActionExecutor } from "./autonomous-resolution/action-executor.js";
import type {
  IssuePriority,
  TriageIssueParams,
  CreateEscalationParams,
  ResolveEscalationParams,
  DetectPatternsParams,
  CreateUpstreamActionParams,
  LinkPatternToIssueParams,
  UpdatePatternStatusParams,
  UpdateUpstreamActionStatusParams,
  GetPatternsByIssueParams,
  GetActionsByPatternParams,
  GetRecurringIssuesReportParams,
  SetConnectorHealthParams,
  GetConnectorHealthParams,
  ConnectorHealthSummary,
  IssueCategory,
} from "./types.js";
import type { SLAHealthReport } from "./sla/sla-engine.js";

// Initialize services
const triageService = new TriageService();
const recurringPatternService = new RecurringPatternService();
const qaService = new QAService();

// Connector health state (XAF-007)
let connectorHealthState: ConnectorHealthState[] = createInitialConnectorHealthState();

// Register internal feedback bus subscribers at startup
feedbackBus.registerInternalSubscribers({
  qaService,
  recurringPatternService,
  customerProfileSynthesizer,
});

const plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("issue.created", async (event) => {
      const issueId = event.entityId ?? "unknown";
      await ctx.state.set({ scopeKind: "issue", scopeId: issueId, stateKey: "seen" }, true);
      ctx.logger.info("Observed issue.created", { issueId });
    });

    // Health check (now includes connector health status - XAF-007)
    ctx.data.register("health", async () => {
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        status: overallStatus,
        checkedAt: new Date().toISOString(),
        hasLimitations: limitations.length > 0,
        limitations: limitations,
      };
    });

    // Connector health data (XAF-007)
    ctx.data.register("connectorHealth", async (params) => {
      const p = params as unknown as GetConnectorHealthParams;
      if (p?.toolkitId) {
        const state = connectorHealthState.find((s) => s.toolkitId === p.toolkitId);
        if (!state) {
          return { error: `Connector '${p.toolkitId}' not found` };
        }
        const limitations = state.status !== "ok"
          ? generateToolkitLimitations([state])
          : [];
        return { connector: state, limitations };
      }
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      const summary: ConnectorHealthSummary = {
        overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        limitations,
        hasLimitations: limitations.length > 0,
      };
      return summary;
    });

    // Dashboard widgets consume connector status through this key.
    ctx.data.register("connector.getHealth", async () => {
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        limitations,
        hasLimitations: limitations.length > 0,
      };
    });

    // Ping action for testing
    ctx.actions.register("ping", async () => {
      ctx.logger.info("Ping action invoked");
      return { pong: true, at: new Date().toISOString() };
    });

    // ============================================
    // Connector Health Actions (XAF-007)
    // ============================================

    /**
     * Set connector health status (for simulation/testing)
     * XAF-007: Simulate connector degradation to verify limitation messaging
     */
    ctx.actions.register("connector.setHealth", async (params) => {
      const p = params as unknown as SetConnectorHealthParams;
      ctx.logger.info("Setting connector health", { toolkitId: p.toolkitId, status: p.status });
      connectorHealthState = updateConnectorHealthState(
        connectorHealthState,
        p.toolkitId,
        p.status,
        p.error
      );
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        success: true,
        toolkitId: p.toolkitId,
        status: p.status,
        overallStatus,
        limitations,
        formattedLimitations: limitations.length > 0 ? formatAllLimitations(limitations) : undefined,
      };
    });

    /**
     * Get connector health summary
     * XAF-007
     */
    ctx.actions.register("connector.getHealth", async () => {
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        limitations,
        hasLimitations: limitations.length > 0,
      };
    });

    /**
     * Simulate connector degradation for testing
     * XAF-007
     */
    ctx.actions.register("connector.simulateDegradation", async (params) => {
      const p = params as unknown as { toolkitId: string; severity?: "degraded" | "error" };
      const status = p.severity ?? "degraded";
      ctx.logger.info("Simulating connector degradation", { toolkitId: p.toolkitId, status });
      connectorHealthState = updateConnectorHealthState(
        connectorHealthState,
        p.toolkitId,
        status,
        status === "error"
          ? "Simulated: Connector authentication failed"
          : "Simulated: Connector responding slowly"
      );
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        success: true,
        toolkitId: p.toolkitId,
        status,
        overallStatus,
        limitations,
        formattedLimitations: limitations.length > 0 ? formatAllLimitations(limitations) : undefined,
      };
    });

    /**
     * Restore connector to healthy state
     * XAF-007
     */
    ctx.actions.register("connector.restore", async (params) => {
      const p = params as unknown as { toolkitId: string };
      ctx.logger.info("Restoring connector health", { toolkitId: p.toolkitId });
      connectorHealthState = updateConnectorHealthState(
        connectorHealthState,
        p.toolkitId,
        "ok"
      );
      const limitations = generateToolkitLimitations(connectorHealthState);
      const overallStatus = computeDepartmentHealthStatus(connectorHealthState);
      return {
        success: true,
        toolkitId: p.toolkitId,
        status: "ok",
        overallStatus,
        limitations,
        hasLimitations: limitations.length > 0,
      };
    });

    /**
     * Perform actual runtime health check for all connectors.
     * 
     * This implements XAF-007: Department workflows degrade explicitly when
     * dependent connectors or tools are impaired, rather than blindly reporting ok.
     * 
     * This action performs actual verification of connector health status rather
     * than relying on static health registration. The check will:
     * - Verify each connector's availability
     * - Update health state based on actual results
     * - Return detailed limitation information if any connectors are impaired
     * 
     * NOTE: Uses real Zapier API health checks via connector-health.ts
     */
    ctx.actions.register("connector.checkHealth", async () => {
      ctx.logger.info("Performing runtime connector health check", { 
        connectorCount: connectorHealthState.length 
      });
      
      const checkResult = await performRuntimeHealthCheck(connectorHealthState);
      
      // Update the module-level state with check results
      connectorHealthState = checkResult.updatedStates;
      
      ctx.logger.info("Connector health check completed", {
        overallStatus: checkResult.overallStatus,
        checkedConnectors: checkResult.checkResults.filter(r => r.wasChecked).length,
        hasImpaired: checkResult.checkResults.some(r => r.status !== "ok"),
      });
      
      const limitations = generateToolkitLimitations(connectorHealthState);
      
      return {
        success: true,
        overallStatus: checkResult.overallStatus,
        checkedAt: new Date().toISOString(),
        connectors: connectorHealthState,
        checkResults: checkResult.checkResults,
        limitations,
        hasLimitations: limitations.length > 0,
        formattedLimitations: limitations.length > 0 ? formatAllLimitations(limitations) : undefined,
      };
    });

    // ============================================
    // Triage Actions (VAL-DEPT-CS-001)
    // ============================================

    /**
     * Triage an incoming issue with classification, evidence, and routing
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("triage.triageIssue", async (params) => {
      const p = params as unknown as TriageIssueParams;
      ctx.logger.info("Triage request received", { issueId: p.issueId });
      const result = triageService.triageIssue(p);
      return { result };
    });

    /**
     * Get a triage result by issue ID
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("triage.getResult", async (params) => {
      const p = params as unknown as { issueId: string };
      const result = triageService.getTriageResult(p.issueId);
      return { result: result ?? null };
    });

    /**
     * Get all triage results
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("triage.getAllResults", async () => {
      const results = triageService.getAllTriageResults();
      return { results };
    });

    /**
     * Get triage results by category
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("triage.getByCategory", async (params) => {
      const p = params as unknown as { category: IssueCategory };
      const results = triageService.getTriageResultsByCategory(p.category);
      return { results };
    });

    /**
     * Get issues requiring escalation
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("triage.getIssuesForEscalation", async (params) => {
      const p = params as unknown as { minLevel: 0 | 1 | 2 | 3 };
      const results = triageService.getIssuesForEscalation(p.minLevel);
      return { results };
    });

    /**
     * Get triage summary statistics
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("triage.getSummary", async () => {
      const summary = triageService.generateTriageSummary();
      return { summary };
    });

    ctx.data.register("triage.getSummary", async () => {
      return triageService.generateTriageSummary();
    });

    // ============================================
    // AI Triage Actions (VAL-DEPT-CS-001 - Phase 1)
    // ============================================

    /**
     * AI-powered triage using intent classification and sentiment analysis
     * VAL-DEPT-CS-001 (upgraded from keyword-based)
     */
    ctx.actions.register("triage.triageIssueAI", async (params) => {
      const p = params as unknown as TriageIssueParams;
      ctx.logger.info("AI triage request received", { issueId: p.issueId });
      const result = triageService.triageIssueAI(p);
      return { result };
    });

    /**
     * Standalone intent classification using AI
     */
    ctx.actions.register("triage.classifyIntent", async (params) => {
      const p = params as unknown as { subject: string; description: string };
      ctx.logger.info("Intent classification request received");
      const classification = intentClassifier.classify(p.subject, p.description);
      const routingHint = intentClassifier.getRoutingHint(classification.primaryIntent.intent);
      return { classification, routingHint };
    });

    /**
     * Standalone sentiment analysis using AI
     */
    ctx.actions.register("triage.analyzeSentiment", async (params) => {
      const p = params as unknown as { text: string };
      ctx.logger.info("Sentiment analysis request received");
      const sentiment = sentimentAnalyzer.analyze(p.text);
      return { sentiment };
    });

    // ============================================
    // Escalation Actions (VAL-DEPT-CS-001)
    // ============================================

    /**
     * Create an escalation for an issue
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("escalation.create", async (params) => {
      const p = params as unknown as CreateEscalationParams;
      ctx.logger.info("Escalation requested", { issueId: p.issueId });
      const record = triageService.createEscalation(p);
      return { record: record ?? null };
    });

    /**
     * Get an escalation record by issue ID
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("escalation.getRecord", async (params) => {
      const p = params as unknown as { issueId: string };
      const record = triageService.getEscalationRecord(p.issueId);
      return { record: record ?? null };
    });

    /**
     * Get all escalation records
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("escalation.getAllRecords", async () => {
      const records = triageService.getAllEscalationRecords();
      return { records };
    });

    /**
     * Get pending escalations
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("escalation.getPending", async () => {
      const records = triageService.getPendingEscalations();
      return { records };
    });

    ctx.data.register("escalation.getPending", async () => {
      return { records: triageService.getPendingEscalations() };
    });

    /**
     * Resolve an escalation
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("escalation.resolve", async (params) => {
      const p = params as unknown as ResolveEscalationParams;
      ctx.logger.info("Escalation resolved", { escalationId: p.escalationId });
      const record = triageService.resolveEscalation(p);
      return { record: record ?? null };
    });

    /**
     * Add a note to an escalation
     * VAL-DEPT-CS-001
     */
    ctx.actions.register("escalation.addNote", async (params) => {
      const p = params as unknown as { escalationId: string; note: string };
      const record = triageService.addEscalationNote(p.escalationId, p.note);
      return { record: record ?? null };
    });

    // ============================================
    // Recurring Pattern Actions (VAL-DEPT-CS-002)
    // ============================================

    /**
     * Detect recurring patterns from triage results
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.detect", async (params) => {
      const p = params as unknown as DetectPatternsParams;
      ctx.logger.info("Pattern detection requested", { params: p });
      const results = recurringPatternService.detectPatterns(p);
      return { detectedPatterns: results };
    });

    /**
     * Get a pattern by ID
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getPattern", async (params) => {
      const p = params as unknown as { patternId: string };
      const pattern = recurringPatternService.getPattern(p.patternId);
      return { pattern: pattern ?? null };
    });

    /**
     * Get all patterns
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getAllPatterns", async () => {
      const patterns = recurringPatternService.getAllPatterns();
      return { patterns };
    });

    ctx.data.register("patterns.getAllPatterns", async () => {
      return { patterns: recurringPatternService.getAllPatterns() };
    });

    /**
     * Get patterns by status
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getByStatus", async (params) => {
      const p = params as unknown as { status: "detected" | "investigating" | "action-created" | "resolved" | "ignored" };
      const patterns = recurringPatternService.getPatternsByStatus(p.status);
      return { patterns };
    });

    /**
     * Get patterns for a specific issue
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getForIssue", async (params) => {
      const p = params as unknown as GetPatternsByIssueParams;
      const patterns = recurringPatternService.getPatternsForIssue(p.issueId);
      return { patterns };
    });

    /**
     * Link an existing pattern to an issue
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.linkToIssue", async (params) => {
      const p = params as unknown as LinkPatternToIssueParams;
      const pattern = recurringPatternService.linkPatternToIssue(p);
      return { pattern: pattern ?? null };
    });

    /**
     * Update pattern status
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.updateStatus", async (params) => {
      const p = params as unknown as UpdatePatternStatusParams;
      const pattern = recurringPatternService.updatePatternStatus(p);
      return { pattern: pattern ?? null };
    });

    /**
     * Create an upstream action from a pattern
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.createUpstreamAction", async (params) => {
      const p = params as unknown as CreateUpstreamActionParams;
      ctx.logger.info("Creating upstream action from pattern", { patternId: p.patternId });
      const action = recurringPatternService.createUpstreamAction(p);
      return { action: action ?? null };
    });

    /**
     * Get an upstream action by ID
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getUpstreamAction", async (params) => {
      const p = params as unknown as { actionId: string };
      const action = recurringPatternService.getUpstreamAction(p.actionId);
      return { action: action ?? null };
    });

    /**
     * Get all upstream actions
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getAllUpstreamActions", async () => {
      const actions = recurringPatternService.getAllUpstreamActions();
      return { actions };
    });

    /**
     * Get actions by pattern
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getActionsByPattern", async (params) => {
      const p = params as unknown as GetActionsByPatternParams;
      const actions = recurringPatternService.getActionsByPattern(p.patternId);
      return { actions };
    });

    /**
     * Get open (non-completed) actions
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.getOpenActions", async () => {
      const actions = recurringPatternService.getOpenActions();
      return { actions };
    });

    ctx.data.register("patterns.getOpenActions", async () => {
      return { actions: recurringPatternService.getOpenActions() };
    });

    /**
     * Update upstream action status
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.updateActionStatus", async (params) => {
      const p = params as unknown as UpdateUpstreamActionStatusParams;
      ctx.logger.info("Updating upstream action status", { actionId: p.actionId, status: p.status });
      const action = recurringPatternService.updateUpstreamActionStatus(p);
      return { action: action ?? null };
    });

    /**
     * Link external reference to an action
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.linkExternalRef", async (params) => {
      const p = params as unknown as { actionId: string; externalRef: string; externalUrl?: string };
      const action = recurringPatternService.linkExternalRef(p.actionId, p.externalRef, p.externalUrl);
      return { action: action ?? null };
    });

    /**
     * Add a note to an action
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.addActionNote", async (params) => {
      const p = params as unknown as { actionId: string; note: string };
      const action = recurringPatternService.addActionNote(p.actionId, p.note);
      return { action: action ?? null };
    });

    /**
     * Generate recurring issues report
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.generateReport", async (params) => {
      const p = params as unknown as GetRecurringIssuesReportParams;
      const report = recurringPatternService.generateRecurringIssuesReport(p);
      return { report };
    });

    // ============================================
    // Index triage result for pattern detection
    // ============================================

    /**
     * Index a triage result for recurring pattern detection
     * VAL-DEPT-CS-002
     */
    ctx.actions.register("patterns.indexTriageResult", async (params) => {
      const p = params as unknown as { triageResultJson: string };
      try {
        const triageResult = JSON.parse(p.triageResultJson);
        recurringPatternService.indexTriageResult(triageResult);
        return { success: true };
      } catch (error) {
        ctx.logger.error("Failed to index triage result", { error });
        return { success: false, error: String(error) };
      }
    });

    // ============================================
    // QA Review Actions (VAL-DEPT-CS-001)
    // ============================================

    ctx.actions.register("qa.evaluate", async (params) => {
      const p = params as unknown as { agentResponseId: string; agentResponse: string; expectedCriteria?: string[]; context?: string };
      ctx.logger.info("QA evaluation requested", { agentResponseId: p.agentResponseId });
      const result = qaService.evaluate({
        agentResponseId: p.agentResponseId,
        agentResponse: p.agentResponse,
        expectedCriteria: p.expectedCriteria,
        context: p.context,
      });
      return { evaluation: result };
    });

    ctx.actions.register("qa.getResult", async (params) => {
      const p = params as unknown as { evaluationId: string };
      const result = qaService.getResult(p.evaluationId);
      return { evaluation: result ?? null };
    });

    ctx.actions.register("qa.getSummary", async () => {
      const summary = qaService.getSummary();
      return { summary };
    });

    ctx.actions.register("qa.setRubric", async (params) => {
      const p = params as unknown as { weights: Record<string, number> };
      qaService.setRubric(p.weights);
      return { success: true };
    });

    /**
     * LLM-based QA evaluation with explainability
     * VAL-DEPT-CS-003 (upgraded from keyword-based)
     */
    ctx.actions.register("qa.evaluateWithLLM", async (params) => {
      const p = params as unknown as { agentResponseId: string; agentResponse: string; expectedCriteria?: string[]; context?: string; agentId?: string };
      ctx.logger.info("LLM QA evaluation requested", { agentResponseId: p.agentResponseId });
      const result = qaService.evaluateWithLLM({
        agentResponseId: p.agentResponseId,
        agentResponse: p.agentResponse,
        expectedCriteria: p.expectedCriteria,
        context: p.context,
        agentId: p.agentId,
      });
      return { evaluation: result };
    });

    // QA data
    ctx.data.register("qa.getSummary", async () => {
      return qaService.getSummary();
    });

    ctx.data.register("qa.getRecentEvaluations", async () => {
      const summary = qaService.getSummary();
      return { evaluations: [], totalEvaluated: summary.totalEvaluated };
    });

    // ============================================
    // Policy Engine Actions (VAL-DEPT-CS-POLICY)
    // ============================================

    /**
     * Evaluate whether an issue can be handled autonomously
     * VAL-DEPT-CS-POLICY
     */
    ctx.actions.register("policy.evaluate", async (params) => {
      const p = params as unknown as {
        category: IssueCategory;
        priority: IssuePriority;
        confidence: number;
        estimatedRefundAmount?: number;
        accountTier?: "standard" | "medium" | "high" | "enterprise";
        escalationRisk?: number;
        sentimentPolarity?: "positive" | "negative" | "neutral";
        sentimentIntensity?: number;
        slaBreachMinutes?: number;
        isReopened?: boolean;
        previousHumanEscalations?: number;
      };
      const evaluation = policyEngine.evaluate({
        category: p.category,
        priority: p.priority,
        confidence: p.confidence,
        estimatedRefundAmount: p.estimatedRefundAmount,
        accountTier: p.accountTier,
        escalationRisk: p.escalationRisk,
        sentimentPolarity: p.sentimentPolarity,
        sentimentIntensity: p.sentimentIntensity,
        slaBreachMinutes: p.slaBreachMinutes,
        isReopened: p.isReopened,
        previousHumanEscalations: p.previousHumanEscalations,
      });
      return { evaluation };
    });

    /**
     * Evaluate refund eligibility under policy
     * VAL-DEPT-CS-POLICY
     */
    ctx.actions.register("policy.evaluateRefund", async (params) => {
      const p = params as unknown as {
        amount: number;
        accountTier?: "standard" | "medium" | "high" | "enterprise";
        reason: string;
        previousRefundsCount?: number;
        previousRefundsTotal?: number;
      };
      const result = policyEngine.evaluateRefund({
        amount: p.amount,
        accountTier: p.accountTier,
        reason: p.reason,
        previousRefundsCount: p.previousRefundsCount,
        previousRefundsTotal: p.previousRefundsTotal,
      });
      return result;
    });

    /**
     * Get SLA deadline for an issue
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.getDeadline", async (params) => {
      const p = params as unknown as {
        issueId: string;
        priority: IssuePriority;
        category: IssueCategory;
        accountTier?: "standard" | "medium" | "high" | "enterprise";
        createdAt?: string;
      };
      const deadline = policyEngine.getSLADeadline({
        priority: p.priority,
        category: p.category,
        accountTier: p.accountTier,
        createdAt: p.createdAt,
      });
      return { deadline };
    });

    /**
     * Register a ticket for SLA tracking
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.register", async (params) => {
      const p = params as unknown as {
        issueId: string;
        priority: IssuePriority;
        category: IssueCategory;
        accountTier?: "standard" | "medium" | "high" | "enterprise";
        createdAt?: string;
      };
      const sla = slaEngine.registerTicket({
        issueId: p.issueId,
        priority: p.priority,
        category: p.category,
        accountTier: p.accountTier ?? "standard",
        createdAt: p.createdAt,
      });
      return { sla };
    });

    /**
     * Get SLA status for a ticket
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.getStatus", async (params) => {
      const p = params as unknown as { issueId: string };
      const info = slaEngine.getDeadlineInfo(p.issueId);
      return info;
    });

    /**
     * Record response for a ticket SLA
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.recordResponse", async (params) => {
      const p = params as unknown as { issueId: string; respondedAt?: string };
      const sla = slaEngine.recordResponse(p.issueId, p.respondedAt);
      return { sla };
    });

    /**
     * Record resolution for a ticket SLA
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.recordResolution", async (params) => {
      const p = params as unknown as { issueId: string; resolvedAt?: string };
      const sla = slaEngine.recordResolution(p.issueId, p.resolvedAt);
      return { sla };
    });

    /**
     * Get SLA tickets needing attention (at risk or warning)
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.getTicketsNeedingAttention", async () => {
      const tickets = slaEngine.getTicketsNeedingAttention();
      return { tickets };
    });

    /**
     * Generate SLA health report
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.generateReport", async (params) => {
      const p = params as unknown as { periodStart: string; periodEnd: string };
      const report = slaEngine.generateReport(p.periodStart, p.periodEnd);
      return { report };
    });

    /**
     * Check all active SLAs for breach risk
     * VAL-DEPT-CS-SLA
     */
    ctx.actions.register("sla.checkAll", async () => {
      const atRisk = slaEngine.checkAll();
      return { atRisk, count: atRisk.length };
    });

    // ============================================
    // Customer Profile Actions (VAL-DEPT-CS-CUST360)
    // ============================================

    /**
     * Synthesize a unified customer profile
     * VAL-DEPT-CS-CUST360
     */
    ctx.actions.register("customer.synthesizeProfile", async (params) => {
      const p = params as unknown as {
        customerId: string;
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
          sentiment?: { polarity: "positive" | "negative" | "neutral"; intensity: number };
        };
      };
      const profile = customerProfileSynthesizer.synthesize({
        customerId: p.customerId,
        ticketHistory: p.ticketHistory,
        accountData: p.accountData,
        billingData: p.billingData,
        usageData: p.usageData,
        crmData: p.crmData,
        currentTicket: p.currentTicket as CustomerProfileSynthesizerParams["currentTicket"],
      });
      return { profile };
    });

    // ============================================
    // Autonomous Action Executor (VAL-DEPT-CS-AUTO)
    // ============================================

    /**
     * Execute autonomous action for an issue
     * VAL-DEPT-CS-AUTO
     */
    ctx.actions.register("autonomous.execute", async (params) => {
      const p = params as unknown as {
        issueId: string;
        customerId: string;
        channel: "email" | "chat" | "whatsapp" | "phone" | "twitter" | "app";
        triageResult: TriageIssueParams;
        responseDraft?: {
          id: string;
          tone: string;
          content: string;
          citations?: Array<{ evidenceId: string; quote: string }>;
          confidence: string;
          policyCompliant: boolean;
          createdAt: string;
        };
        customerProfile?: ReturnType<typeof customerProfileSynthesizer.synthesize>;
        estimatedRefundAmount?: number;
        resolvedBy?: "autonomous" | "human";
      };
      const result = await autonomousActionExecutor.execute({
        issueId: p.issueId,
        customerId: p.customerId,
        channel: p.channel,
        triageResult: p.triageResult as any,
        responseDraft: p.responseDraft as any,
        customerProfile: p.customerProfile,
        estimatedRefundAmount: p.estimatedRefundAmount,
        resolvedBy: p.resolvedBy,
      });
      return { result };
    });

    // ============================================
    // Feedback Bus Actions (VAL-DEPT-CS-FEEDBACK)
    // ============================================

    /**
     * Emit a ticket resolved event
     * VAL-DEPT-CS-FEEDBACK
     */
    ctx.actions.register("feedback.emitResolved", async (params) => {
      const p = params as unknown as {
        issueId: string;
        customerId: string;
        category: string;
        priority: string;
        channel: string;
        resolutionTimeMinutes?: number;
        triageResultJson: string;
        qaResultJson?: string;
        responseDraft: string;
        resolvedBy: "autonomous" | "human";
        estimatedRefundAmount?: number;
      };
      const triageResult = JSON.parse(p.triageResultJson);
      const qaResult = p.qaResultJson ? JSON.parse(p.qaResultJson) : undefined;

      await feedbackBus.emitTicketResolved({
        issueId: p.issueId,
        customerId: p.customerId,
        category: p.category,
        priority: p.priority,
        channel: p.channel,
        resolutionTimeMinutes: p.resolutionTimeMinutes,
        triageResult,
        qaResult,
        responseDraft: p.responseDraft,
        resolvedBy: p.resolvedBy,
        estimatedRefundAmount: p.estimatedRefundAmount,
      });

      return { success: true };
    });

    /**
     * Emit a ticket reopened event
     * VAL-DEPT-CS-FEEDBACK
     */
    ctx.actions.register("feedback.emitReopened", async (params) => {
      const p = params as unknown as {
        issueId: string;
        customerId: string;
        originalResolutionTimeMinutes?: number;
        timeUntilReopenMinutes?: number;
        reason?: string;
      };
      await feedbackBus.emitTicketReopened({
        issueId: p.issueId,
        customerId: p.customerId,
        originalResolutionTimeMinutes: p.originalResolutionTimeMinutes,
        timeUntilReopenMinutes: p.timeUntilReopenMinutes,
        reason: p.reason,
      });
      return { success: true };
    });

    /**
     * Get recent feedback events
     * VAL-DEPT-CS-FEEDBACK
     */
    ctx.actions.register("feedback.getRecent", async (params) => {
      const p = params as unknown as { types?: string[]; limit?: number };
      const events = feedbackBus.getRecentEvents(p.types, p.limit);
      const counts = feedbackBus.getEventCounts();
      return { events, counts };
    });

    /**
     * Get feedback event counts
     * VAL-DEPT-CS-FEEDBACK
     */
    ctx.actions.register("feedback.getCounts", async () => {
      const counts = feedbackBus.getEventCounts();
      return { counts };
    });

    // ============================================
    // Full Autonomous Pipeline (VAL-DEPT-CS-PIPELINE)
    // Combines triage + customer profile + SLA + policy + action
    // ============================================

    /**
     * Run the full autonomous customer service pipeline on an issue.
     * Returns triage, customer profile, SLA info, policy decision, and action result.
     * VAL-DEPT-CS-PIPELINE
     */
    ctx.actions.register("pipeline.run", async (params) => {
      const p = params as unknown as {
        issueId: string;
        customerId: string;
        channel: "email" | "chat" | "whatsapp" | "phone" | "twitter" | "app";
        subject: string;
        description: string;
        metadata?: Record<string, unknown>;
        customerTicketHistory?: Array<{
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
        customerAccountData?: {
          email: string;
          displayName?: string;
          companyName?: string;
          planTier: string;
          mrr: number;
          totalSpent: number;
          createdAt: string;
          tags?: string[];
        };
        customerBillingData?: {
          mrr: number;
          totalSpent: number;
          planTier: string;
          accountAgeDays: number;
          billingIssues: number;
          refundRequests: number;
          lastInvoiceAt?: string;
          nextInvoiceAt?: string;
        };
        estimatedRefundAmount?: number;
      };

      ctx.logger.info("Running full autonomous pipeline", { issueId: p.issueId, customerId: p.customerId });

      // Step 1: Triage (AI-enriched for full sentiment + intent data)
      const triageResult = triageService.triageIssueAI({
        issueId: p.issueId,
        subject: p.subject,
        description: p.description,
        channel: p.channel,
        customerId: p.customerId,
        metadata: p.metadata,
      } as TriageIssueParams);

      // Step 2: Customer profile
      const customerProfile = customerProfileSynthesizer.synthesize({
        customerId: p.customerId,
        ticketHistory: p.customerTicketHistory ?? [],
        accountData: p.customerAccountData,
        billingData: p.customerBillingData,
        currentTicket: {
          channel: p.channel,
          subject: p.subject,
          createdAt: new Date().toISOString(),
          sentiment: triageResult.sentiment,
        },
      });

      // Step 3: SLA registration
      const slaInfo = slaEngine.getDeadlineInfo(p.issueId);
      if (!slaInfo.deadline) {
        slaEngine.registerTicket({
          issueId: p.issueId,
          priority: triageResult.priority,
          category: triageResult.category,
          accountTier: customerProfile.accountTier,
        });
      }

      // Step 4: Generate response draft (from triage)
      const responseDraft = triageResult.suggestedResponseDraft
        ? {
            id: `draft-${p.issueId}`,
            tone: triageResult.suggestedResponseDraft.tone,
            content: triageResult.suggestedResponseDraft.content,
            citations: triageResult.suggestedResponseDraft.citations ?? [],
            confidence: triageResult.suggestedResponseDraft.confidence,
            policyCompliant: triageResult.suggestedResponseDraft.policyCompliant,
            createdAt: new Date().toISOString(),
          }
        : undefined;

      // Step 5: Execute autonomous action
      const actionResult = await autonomousActionExecutor.execute({
        issueId: p.issueId,
        customerId: p.customerId,
        channel: p.channel,
        triageResult,
        responseDraft,
        customerProfile,
        estimatedRefundAmount: p.estimatedRefundAmount,
      });

      // Step 6: If autonomously closed, emit feedback event
      if (actionResult.outcome === "autonomous_close") {
        await feedbackBus.emitTicketResolved({
          issueId: p.issueId,
          customerId: p.customerId,
          category: triageResult.category,
          priority: triageResult.priority,
          channel: p.channel,
          triageResult,
          responseDraft: responseDraft?.content ?? "",
          resolvedBy: "autonomous",
          sentiment: triageResult.sentiment as any,
        });
      }

      return {
        triageResult,
        customerProfile: {
          customerId: customerProfile.customerId,
          displayName: customerProfile.displayName,
          accountTier: customerProfile.accountTier,
          isVip: customerProfile.isVip,
          isChurning: customerProfile.isChurning,
          churnRisk: customerProfile.health.churnRisk,
          sentimentTrajectory: customerProfile.health.sentimentTrajectory,
          tags: customerProfile.tags,
        },
        slaInfo: slaEngine.getDeadlineInfo(p.issueId),
        actionResult,
      };
    });
  },

  async onHealth() {
    return { status: "ok", message: "Plugin worker is running" };
  }
});

export default plugin;
// @ts-ignore - import.meta is only available in ES modules
runWorker(plugin, import.meta.url);
