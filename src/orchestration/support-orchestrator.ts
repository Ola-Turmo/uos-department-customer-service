// src/orchestration/support-orchestrator.ts
// A LangGraph-style support orchestration graph.
// Agents: triage → [churn] → [respond/escalate] with memory.

import type { SemanticTriageResult } from "../analysis/semantic-triage.js";
import type { DraftResult } from "../autonomous-resolution/llm-response-draft.js";
import type { MLChurnPrediction } from "../predictive/ml-churn-scorer.js";

// ── State ────────────────────────────────────────────────────────────────────

export interface TicketState {
  ticketId: string;
  subject: string;
  body?: string;
  channel?: string;
  customerId?: string;
  // Agent outputs
  triage?: SemanticTriageResult;
  churn?: MLChurnPrediction;
  response?: DraftResult;
  escalated?: boolean;
  resolved?: boolean;
  // Memory
  conversationHistory: Array<{ role: string; content: string }>;
  agentTrace: AgentTraceEntry[];
  errors: string[];
}

export interface AgentTraceEntry {
  agent: string;
  startTime: string;
  endTime?: string;
  output?: string;
  error?: string;
}

// ── Node Functions ────────────────────────────────────────────────────────────

type NodeFn = (state: TicketState) => Promise<Partial<TicketState>>;

async function triageNode(state: TicketState): Promise<Partial<TicketState>> {
  const start = new Date().toISOString();
  try {
    const { SemanticTriageEngine } = await import("../analysis/semantic-triage.js");
    const engine = new SemanticTriageEngine();
    const triage = await engine.classify({ subject: state.ticketId, body: state.body, channel: state.channel });
    return {
      triage,
      agentTrace: [...state.agentTrace, { agent: "triage", startTime: start, endTime: new Date().toISOString(), output: triage.category + "/" + triage.priority }],
    };
  } catch (e) {
    return { errors: [...state.errors, `triage error: ${e}`] };
  }
}

async function churnNode(state: TicketState): Promise<Partial<TicketState>> {
  const start = new Date().toISOString();
  try {
    const { MLChurnScorer } = await import("../predictive/ml-churn-scorer.js");
    const scorer = new MLChurnScorer();
    const churn = await scorer.score({
      customerId: state.customerId ?? state.ticketId,
      accountAge: 12, monthlySpend: 99, ticketCount: 1, lastTicketDaysAgo: 30,
      npsScore: 7, productUsageFrequency: 0.7, supportEscalationCount: 0, paymentDelays: 0,
    });
    return {
      churn,
      agentTrace: [...state.agentTrace, { agent: "churn", startTime: start, endTime: new Date().toISOString(), output: `risk=${churn.riskLevel}` }],
    };
  } catch (e) {
    return { errors: [...state.errors, `churn error: ${e}`] };
  }
}

async function respondNode(state: TicketState): Promise<Partial<TicketState>> {
  const start = new Date().toISOString();
  try {
    const { LLMResponseDrafter } = await import("../autonomous-resolution/llm-response-draft.js");
    const drafter = new LLMResponseDrafter();
    const tone = state.churn?.riskLevel === "critical" || state.churn?.riskLevel === "high" ? "empathetic" : "professional";
    const response = await drafter.draft({ ticket: { subject: state.subject, body: state.body }, triage: state.triage!, tone });
    return {
      response,
      resolved: true,
      agentTrace: [...state.agentTrace, { agent: "respond", startTime: start, endTime: new Date().toISOString(), output: `drafted ${response.body.length} chars` }],
    };
  } catch (e) {
    return { errors: [...state.errors, `respond error: ${e}`] };
  }
}

async function escalateNode(state: TicketState): Promise<Partial<TicketState>> {
  const start = new Date().toISOString();
  return {
    escalated: true,
    agentTrace: [...state.agentTrace, { agent: "escalate", startTime: start, endTime: new Date().toISOString(), output: "human escalation triggered" }],
  };
}

// ── Conditional Edges ─────────────────────────────────────────────────────────

type ConditionalFn = (state: TicketState) => string;

function routeAfterTriage(state: TicketState): string {
  if (!state.triage) return "escalate";
  if (state.triage.priority === "p0") return "churn";  // High priority → check churn
  return state.triage.urgency === "immediate" ? "churn" : "respond";
}

function routeAfterChurn(state: TicketState): string {
  if (!state.churn) return "respond";
  if (state.churn.riskLevel === "critical") return "escalate";
  return "respond";
}

// ── Support Orchestrator (LangGraph-style) ───────────────────────────────────

export class SupportOrchestrator {
  private nodes: Record<string, NodeFn>;
  private conditionals: Record<string, ConditionalFn>;

  constructor() {
    this.nodes = { triage: triageNode, churn: churnNode, respond: respondNode, escalate: escalateNode };
    this.conditionals = { triage: routeAfterTriage, churn: routeAfterChurn };
  }

  /**
   * Run the orchestration graph from start to end.
   * Models LangGraph's compile().stream() pattern.
   */
  async run(initialState: Partial<TicketState>): Promise<TicketState> {
    const state: TicketState = {
      ticketId: initialState.ticketId ?? `ticket-${Date.now()}`,
      subject: initialState.subject ?? "",
      body: initialState.body,
      channel: initialState.channel,
      customerId: initialState.customerId,
      conversationHistory: initialState.conversationHistory ?? [],
      agentTrace: [],
      errors: [],
    };

    // LangGraph-style topological execution
    let currentNode: string | undefined = "triage";
    const visited = new Set<string>();
    
    while (currentNode && !visited.has(currentNode)) {
      visited.add(currentNode);
      const nodeFn = this.nodes[currentNode];
      if (!nodeFn) break;
      
      const partial = await nodeFn(state);
      Object.assign(state, partial);
      
      // Determine next node
      const cond: ConditionalFn | undefined = this.conditionals[currentNode];
      currentNode = cond ? cond(state) : undefined;
    }

    return state;
  }

  /**
   * Stream agent trace as they execute (like LangGraph streaming).
   */
  async *stream(initialState: Partial<TicketState>): AsyncGenerator<AgentTraceEntry> {
    const state: TicketState = {
      ticketId: initialState.ticketId ?? `ticket-${Date.now()}`,
      subject: initialState.subject ?? "",
      body: initialState.body,
      channel: initialState.channel,
      customerId: initialState.customerId,
      conversationHistory: [],
      agentTrace: [],
      errors: [],
    };

    let currentNode: string | undefined = "triage";
    const visited = new Set<string>();

    while (currentNode && !visited.has(currentNode)) {
      visited.add(currentNode);
      const nodeFn = this.nodes[currentNode];
      if (!nodeFn) break;

      const partial = await nodeFn(state);
      Object.assign(state, partial);

      for (const entry of state.agentTrace.slice(-1)) {
        yield entry;
      }

      const cond: ConditionalFn | undefined = this.conditionals[currentNode];
      currentNode = cond ? cond(state) : undefined;
    }
  }
}
