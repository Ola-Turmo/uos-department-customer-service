/**
 * Customer Service Department UI Widgets
 * VAL-DEPT-CS-001: Issue triage dashboard
 * VAL-DEPT-CS-002: Recurring patterns dashboard
 * XAF-007: Connector degradation and limitation messaging
 */

import * as React from "react";
import { usePluginAction, usePluginData, type PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";
import { useState } from "react";

type ToolkitLimitation = {
  toolkitId: string;
  displayName: string;
  limitationMessage: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedWorkflows: string[];
  suggestedAction: string;
};

type HealthData = {
  status: "ok" | "degraded" | "error";
  checkedAt: string;
  hasLimitations?: boolean;
  limitations?: ToolkitLimitation[];
};

type ConnectorHealthSummary = {
  overallStatus: "ok" | "degraded" | "error" | "unknown";
  checkedAt: string;
  connectors: Array<{
    toolkitId: string;
    status: "ok" | "degraded" | "error" | "unknown";
    lastChecked: string;
    error?: string;
  }>;
  limitations: ToolkitLimitation[];
  hasLimitations: boolean;
};

type TriageSummary = {
  totalTriaged: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  pendingEscalations: number;
  averageConfidence: number;
};

type PatternSummary = {
  totalPatterns: number;
  openActions: number;
  completedActions: number;
  averageImpactScore: number;
};

type EscalationRecord = {
  id: string;
  issueId: string;
  fromLevel: number;
  toLevel: number;
  reason: string;
  routedToRoleKey?: string;
  routedToTeam?: string;
  status: "pending" | "accepted" | "resolved" | "rejected";
  createdAt: string;
};

type Pattern = {
  id: string;
  patternKey: string;
  title: string;
  description: string;
  category: string;
  frequency: number;
  affectedCustomers: number;
  status: "detected" | "investigating" | "action-created" | "resolved" | "ignored";
  impactScore: number;
  lastSeenAt: string;
};

type UpstreamAction = {
  id: string;
  title: string;
  description: string;
  kind: string;
  status: "proposed" | "approved" | "in-progress" | "completed" | "rejected";
  priority: string;
  impactScore: number;
  sourcePatternId: string;
  createdAt: string;
};

export function DashboardWidget(_props: PluginWidgetProps) {
  const { data, loading, error } = usePluginData<HealthData>("health");
  const ping = usePluginAction("ping");

  if (loading) return <div>Loading plugin health...</div>;
  if (error) return <div>Plugin error: {error.message}</div>;

  const statusColor = data?.status === "ok" ? "#4caf50" : data?.status === "degraded" ? "#ff9800" : "#f44336";
  const limitations = data?.limitations ?? [];

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <strong>Department Customer Service</strong>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span>Health:</span>
        <span style={{ 
          padding: "0.25rem 0.5rem", 
          borderRadius: "4px", 
          background: statusColor, 
          color: "white",
          fontWeight: "bold"
        }}>
          {data?.status?.toUpperCase() ?? "UNKNOWN"}
        </span>
      </div>
      <div>Checked: {data?.checkedAt ?? "never"}</div>
      
      {/* XAF-007: Explicit limitation messaging when connectors are impaired */}
      {limitations.length > 0 && (
        <div style={{ 
          border: "2px solid #f44336", 
          borderRadius: "4px", 
          padding: "0.75rem",
          background: "#ffebee"
        }}>
          <div style={{ fontWeight: "bold", color: "#f44336", marginBottom: "0.5rem" }}>
            ⚠️ CONNECTOR LIMITATIONS DETECTED
          </div>
          {limitations.map((lim, i) => (
            <div key={i} style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              <span style={{ 
                padding: "0.125rem 0.25rem", 
                borderRadius: "2px",
                background: lim.severity === "critical" ? "#f44336" : lim.severity === "high" ? "#ff5722" : "#ff9800",
                color: "white",
                fontSize: "0.75rem"
              }}>
                {lim.severity.toUpperCase()}
              </span>
              <strong> {lim.displayName}:</strong> {lim.limitationMessage}
              <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                Affected: {lim.affectedWorkflows.slice(0, 2).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button onClick={() => void ping()}>Ping Worker</button>
    </div>
  );
}

export function TriageWidget(_props: PluginWidgetProps) {
  const { data: summaryData, loading: summaryLoading } = usePluginData<TriageSummary>("triage.getSummary");
  const triageIssue = usePluginAction("triage.triageIssue");
  const getAllResults = usePluginAction("triage.getAllResults");

  const [issueId, setIssueId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [triageResult, setTriageResult] = useState<unknown>(null);

  const handleTriage = async () => {
    if (!issueId || !subject) return;
    const result = await triageIssue({ issueId, subject, description });
    setTriageResult(result);
  };

  if (summaryLoading) return <div>Loading triage summary...</div>;

  return (
    <div style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <strong>Issue Triage Dashboard</strong>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {summaryData?.totalTriaged ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Total Triaged</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {summaryData?.pendingEscalations ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Pending Escalations</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {typeof summaryData?.averageConfidence === "number" ? Math.round(summaryData.averageConfidence * 100) : 0}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Avg Confidence</div>
        </div>
      </div>

      {/* Triage Form */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <h4>New Issue Triage</h4>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <input
            placeholder="Issue ID"
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            style={{ width: "100%", padding: "0.25rem" }}
          />
          <input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ width: "100%", padding: "0.25rem" }}
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.25rem" }}
          />
          <button onClick={handleTriage} style={{ padding: "0.5rem" }}>
            Triage Issue
          </button>
        </div>
      </div>

      {/* Triage Result */}
      {triageResult !== null && triageResult !== undefined ? (
        <div style={{ border: "1px solid #4caf50", padding: "1rem", borderRadius: "4px", background: "#f5f5f5" }}>
          <h4>Triage Result</h4>
          <pre style={{ fontSize: "0.75rem", overflow: "auto" }}>
            {JSON.stringify(triageResult, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function EscalationWidget(_props: PluginWidgetProps) {
  const { data: pendingData, loading: pendingLoading } = usePluginData<{ records: EscalationRecord[] }>("escalation.getPending");
  const resolveEscalation = usePluginAction("escalation.resolve");

  const [selectedRecord, setSelectedRecord] = useState<EscalationRecord | null>(null);
  const [resolution, setResolution] = useState("");

  const handleResolve = async (status: "resolved" | "rejected") => {
    if (!selectedRecord) return;
    await resolveEscalation({
      escalationId: selectedRecord.id,
      resolution,
      status,
    });
    setSelectedRecord(null);
    setResolution("");
  };

  if (pendingLoading) return <div>Loading escalations...</div>;

  const records = pendingData?.records ?? [];

  return (
    <div style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <strong>Escalations Dashboard</strong>

      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <h4>Pending Escalations ({records.length})</h4>
        {records.length === 0 ? (
          <div style={{ color: "#666", fontStyle: "italic" }}>No pending escalations</div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "300px", overflow: "auto" }}>
            {records.map((record) => (
              <div
                key={record.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: selectedRecord?.id === record.id ? "#e3f2fd" : "white",
                }}
                onClick={() => setSelectedRecord(record)}
              >
                <div style={{ fontWeight: "bold" }}>Issue: {record.issueId}</div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  Level {record.fromLevel} → {record.toLevel} | {record.routedToTeam}
                </div>
                <div style={{ fontSize: "0.75rem" }}>{record.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Panel */}
      {selectedRecord && (
        <div style={{ border: "1px solid #ff9800", padding: "1rem", borderRadius: "4px" }}>
          <h4>Resolve Escalation</h4>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Issue:</strong> {selectedRecord.issueId}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Reason:</strong> {selectedRecord.reason}
          </div>
          <textarea
            placeholder="Resolution notes..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.25rem", marginBottom: "0.5rem" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <button
              onClick={() => handleResolve("resolved")}
              style={{ padding: "0.5rem", background: "#4caf50", color: "white", border: "none", borderRadius: "4px" }}
            >
              Mark Resolved
            </button>
            <button
              onClick={() => handleResolve("rejected")}
              style={{ padding: "0.5rem", background: "#f44336", color: "white", border: "none", borderRadius: "4px" }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatternsWidget(_props: PluginWidgetProps) {
  const { data: patternsData, loading: patternsLoading } = usePluginData<{ patterns: Pattern[] }>("patterns.getAllPatterns");
  const { data: actionsData } = usePluginData<{ actions: UpstreamAction[] }>("patterns.getOpenActions");
  const detectPatterns = usePluginAction("patterns.detect");
  const generateReport = usePluginAction("patterns.generateReport");
  const createUpstreamAction = usePluginAction("patterns.createUpstreamAction");

  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionKind, setActionKind] = useState<"product-fix" | "bug-fix" | "knowledge-update" | "process-improvement" | "feature-request">("process-improvement");

  const patterns = patternsData?.patterns ?? [];
  const openActions = actionsData?.actions ?? [];

  const handleDetectPatterns = async () => {
    await detectPatterns({ lookbackDays: 30, minFrequency: 2 });
  };

  const handleGenerateReport = async () => {
    await generateReport({ lookbackDays: 30 });
  };

  const handleCreateAction = async () => {
    if (!selectedPattern || !actionTitle) return;
    await createUpstreamAction({
      patternId: selectedPattern.id,
      title: actionTitle,
      description: actionDescription,
      kind: actionKind,
    });
    setSelectedPattern(null);
    setActionTitle("");
    setActionDescription("");
  };

  if (patternsLoading) return <div>Loading patterns...</div>;

  return (
    <div style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <strong>Recurring Patterns Dashboard</strong>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{patterns.length}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Patterns Detected</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{openActions.length}</div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Open Actions</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "0.5rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {patterns.length > 0 ? Math.round(patterns.reduce((sum, p) => sum + p.impactScore, 0) / patterns.length) : 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>Avg Impact Score</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <button onClick={handleDetectPatterns} style={{ padding: "0.5rem" }}>
          Detect Patterns
        </button>
        <button onClick={handleGenerateReport} style={{ padding: "0.5rem" }}>
          Generate Report
        </button>
      </div>

      {/* Patterns List */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <h4>Detected Patterns ({patterns.length})</h4>
        {patterns.length === 0 ? (
          <div style={{ color: "#666", fontStyle: "italic" }}>No patterns detected yet</div>
        ) : (
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "200px", overflow: "auto" }}>
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: selectedPattern?.id === pattern.id ? "#e3f2fd" : "white",
                }}
                onClick={() => setSelectedPattern(pattern)}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "bold" }}>{pattern.category}</span>
                  <span style={{ fontSize: "0.75rem", color: "#666" }}>Impact: {pattern.impactScore}</span>
                </div>
                <div style={{ fontSize: "0.75rem" }}>Frequency: {pattern.frequency} | Status: {pattern.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Action Panel */}
      {selectedPattern && (
        <div style={{ border: "1px solid #2196f3", padding: "1rem", borderRadius: "4px" }}>
          <h4>Create Upstream Action</h4>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Pattern:</strong> {selectedPattern.patternKey}
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <input
              placeholder="Action title"
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              style={{ width: "100%", padding: "0.25rem" }}
            />
            <textarea
              placeholder="Action description"
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: "0.25rem" }}
            />
            <select
              value={actionKind}
              onChange={(e) => setActionKind(e.target.value as typeof actionKind)}
              style={{ width: "100%", padding: "0.25rem" }}
            >
              <option value="bug-fix">Bug Fix</option>
              <option value="product-fix">Product Fix</option>
              <option value="knowledge-update">Knowledge Update</option>
              <option value="process-improvement">Process Improvement</option>
              <option value="feature-request">Feature Request</option>
            </select>
            <button onClick={handleCreateAction} style={{ padding: "0.5rem", background: "#2196f3", color: "white", border: "none", borderRadius: "4px" }}>
              Create Action
            </button>
          </div>
        </div>
      )}

      {/* Open Actions */}
      {openActions.length > 0 && (
        <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
          <h4>Open Upstream Actions ({openActions.length})</h4>
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "150px", overflow: "auto" }}>
            {openActions.map((action) => (
              <div key={action.id} style={{ border: "1px solid #ddd", padding: "0.5rem", borderRadius: "4px" }}>
                <div style={{ fontWeight: "bold" }}>{action.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  Kind: {action.kind} | Status: {action.status} | Priority: {action.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Connector Health Widget
 * XAF-007: View and simulate connector degradation to verify limitation messaging
 */
export function ConnectorHealthWidget(_props: PluginWidgetProps) {
  const { data, loading } = usePluginData<ConnectorHealthSummary>("connector.getHealth");
  const setHealth = usePluginAction("connector.setHealth");
  const simulateDegradation = usePluginAction("connector.simulateDegradation");
  const restoreConnector = usePluginAction("connector.restore");

  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  const handleSimulate = async (severity: "degraded" | "error") => {
    if (!selectedConnector) return;
    await simulateDegradation({ toolkitId: selectedConnector, severity });
  };

  const handleRestore = async () => {
    if (!selectedConnector) return;
    await restoreConnector({ toolkitId: selectedConnector });
  };

  if (loading) return <div>Loading connector health...</div>;

  const connectors = data?.connectors ?? [];
  const limitations = data?.limitations ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok": return "#4caf50";
      case "degraded": return "#ff9800";
      case "error": return "#f44336";
      default: return "#9e9e9e";
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem", padding: "1rem" }}>
      <strong>Connector Health Dashboard</strong>
      <div style={{ fontSize: "0.875rem", color: "#666" }}>
        XAF-007: View connector status and simulate degradation
      </div>

      {/* Overall Status */}
      <div style={{ 
        border: "2px solid #2196f3", 
        borderRadius: "4px", 
        padding: "0.75rem",
        background: "#e3f2fd"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold" }}>Overall Status:</span>
          <span style={{ 
            padding: "0.25rem 0.75rem", 
            borderRadius: "4px", 
            background: getStatusColor(data?.overallStatus ?? "unknown"),
            color: "white",
            fontWeight: "bold"
          }}>
            {(data?.overallStatus ?? "unknown").toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Last checked: {data?.checkedAt ?? "never"}
        </div>
      </div>

      {/* Active Limitations */}
      {limitations.length > 0 && (
        <div style={{ 
          border: "2px solid #f44336", 
          borderRadius: "4px", 
          padding: "0.75rem",
          background: "#ffebee"
        }}>
          <div style={{ fontWeight: "bold", color: "#f44336", marginBottom: "0.5rem" }}>
            ⚠️ {limitations.length} CONNECTOR LIMITATION{limitations.length > 1 ? "S" : ""} ACTIVE
          </div>
          {limitations.map((lim, i) => (
            <div key={i} style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              <span style={{ 
                padding: "0.125rem 0.25rem", 
                borderRadius: "2px",
                background: lim.severity === "critical" ? "#f44336" : "#ff9800",
                color: "white",
                fontSize: "0.75rem"
              }}>
                {lim.severity.toUpperCase()}
              </span>
              <strong> {lim.displayName}:</strong> {lim.limitationMessage}
            </div>
          ))}
        </div>
      )}

      {/* Connector List */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
        <h4>Connector Status ({connectors.length})</h4>
        <div style={{ display: "grid", gap: "0.5rem", maxHeight: "300px", overflow: "auto" }}>
          {connectors.map((connector) => (
            <div
              key={connector.toolkitId}
              style={{
                border: `2px solid ${selectedConnector === connector.toolkitId ? "#2196f3" : "#ddd"}`,
                padding: "0.5rem",
                borderRadius: "4px",
                cursor: "pointer",
                background: selectedConnector === connector.toolkitId ? "#e3f2fd" : "white",
              }}
              onClick={() => setSelectedConnector(connector.toolkitId)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold" }}>{connector.toolkitId}</span>
                <span style={{ 
                  padding: "0.125rem 0.5rem", 
                  borderRadius: "4px", 
                  background: getStatusColor(connector.status),
                  color: "white",
                  fontSize: "0.75rem"
                }}>
                  {connector.status.toUpperCase()}
                </span>
              </div>
              {connector.error && (
                <div style={{ fontSize: "0.75rem", color: "#f44336", marginTop: "0.25rem" }}>
                  {connector.error}
                </div>
              )}
              <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                Last checked: {connector.lastChecked}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Controls */}
      {selectedConnector && (
        <div style={{ border: "1px solid #ff9800", padding: "1rem", borderRadius: "4px" }}>
          <h4>Simulation Controls</h4>
          <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            Selected: <strong>{selectedConnector}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <button 
              onClick={() => void handleSimulate("degraded")}
              style={{ padding: "0.5rem", background: "#ff9800", color: "white", border: "none", borderRadius: "4px" }}
            >
              Simulate Degraded
            </button>
            <button 
              onClick={() => void handleSimulate("error")}
              style={{ padding: "0.5rem", background: "#f44336", color: "white", border: "none", borderRadius: "4px" }}
            >
              Simulate Error
            </button>
            <button 
              onClick={() => void handleRestore()}
              style={{ padding: "0.5rem", background: "#4caf50", color: "white", border: "none", borderRadius: "4px" }}
            >
              Restore
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
