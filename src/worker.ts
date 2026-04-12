import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { TriageService } from "./triage-service.js";
import { RecurringPatternService } from "./recurring-pattern-service.js";
import { QAService } from "./qa-service.js";
import {
  createInitialConnectorHealthState,
  updateConnectorHealthState,
  computeDepartmentHealthStatus,
  generateToolkitLimitations,
  formatAllLimitations,
  performRuntimeHealthCheck,
  type ConnectorHealthState,
} from "./connector-health.js";
import type {
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

// Initialize services
const triageService = new TriageService();
const recurringPatternService = new RecurringPatternService();
const qaService = new QAService();

// Connector health state (XAF-007)
let connectorHealthState: ConnectorHealthState[] = createInitialConnectorHealthState();

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
     * NOTE: Since we don't have real Paperclip host access, this uses a simulation
     * approach. When host access is available, replace the simulation in
     * connector-health.ts with actual connector API calls.
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

    // QA data
    ctx.data.register("qa.getSummary", async () => {
      return qaService.getSummary();
    });

    ctx.data.register("qa.getRecentEvaluations", async () => {
      const summary = qaService.getSummary();
      return { evaluations: [], totalEvaluated: summary.totalEvaluated };
    });
  },

  async onHealth() {
    return { status: "ok", message: "Plugin worker is running" };
  }
});

export default plugin;
// @ts-ignore - import.meta is only available in ES modules
runWorker(plugin, import.meta.url);
