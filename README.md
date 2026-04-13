# @uos/department-customer-service

@uos/department-customer-service operationalizes support delivery, knowledge automation, QA, and escalation management. Its goal is to improve speed, accuracy, empathy, and learning across the full support loop.

Built as part of the UOS split workspace on top of [Paperclip](https://github.com/paperclipai/paperclip), which remains the upstream control-plane substrate.

## What This Repo Owns

- Ticket triage, routing, and issue classification support.
- Knowledge retrieval, gap detection, and content healing loops.
- QA review workflows and rubric-driven scoring.
- Escalation decision support and playbook management.
- Feedback extraction from support issues into improvement backlogs.

## Runtime Form

- Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

## Highest-Value Workflows

- Triaging and classifying incoming issues.
- Suggesting accurate, policy-aligned responses with evidence.
- Running QA reviews and coaching loops.
- Escalating effectively based on issue type and risk.
- Mining recurring issue patterns to inform upstream fixes.

## Key Connections and Operating Surfaces

- Zendesk, Intercom, Help Scout, Gmail/Google Workspace, Slack, Discord, CRM systems such as HubSpot or Salesforce, billing/order systems such as Stripe, and account-management surfaces required to fully resolve customer issues.
- Knowledge bases, docs, QA systems, conversation analytics, issue trackers such as GitHub, Linear, or Jira, and product feedback channels needed to improve resolution quality over time.
- Browser and admin-console flows for support, billing, and account tools when the relevant customer context is not fully exposed through API access.
- Any adjacent system needed to close the loop from incoming issue to resolution, escalation, refund, bug report, account update, or knowledge refresh.

## KPI Targets

- First-response suggestion acceptance reaches >= 70% on the maintained support benchmark set.
- QA pass rate stays >= 90% for reviewed responses and escalations.
- Escalation misrouting stays < 5% for benchmark issue classes.
- Recurring top-issue patterns produce an upstream fix, bug, or knowledge action within 2 business days.

## Phase 1+2 Feature Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Support Ticket Incoming                       │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Multi-Agent Orchestrator (LangGraph-style)          │
│  ┌──────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐  │
│  │  Triage  │──▶│   Churn   │──▶│  Respond  │   │ Escalate  │  │
│  │   Node   │   │   Node    │   │   Node    │──▶│   Node    │  │
│  └──────────┘   └───────────┘   └───────────┘   └───────────┘  │
│        │             │                                         │
│        ▼             ▼                                         │
│  SemanticTriage   MLChurnScorer                                │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RAG Knowledge Base                          │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  BM25 + Cosine       │  │  Similar Ticket Retriever        │ │
│  │  Hybrid Ranking      │  │  (resolved_ticket source)       │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Autonomous Resolution (LLM Response Draft)         │
│  Tone: empathetic / professional / friendly                     │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Resolution Quality Tracker                    │
│  Quality scoring, category insights, agent leaderboard           │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Agent Orchestrator (LangGraph-style)

`src/orchestration/support-orchestrator.ts`

A LangGraph-style orchestration graph that coordinates the support pipeline:

- **Triage Node** — Classifies ticket category, priority, sentiment, and urgency using semantic analysis
- **Churn Node** — Scores customer churn risk based on behavioral signals (account age, NPS, usage frequency, escalation count, payment delays)
- **Respond Node** — Drafts LLM-powered responses with tone adapted to churn risk
- **Escalate Node** — Triggers human escalation for critical cases

**Conditional Routing:**
- `routeAfterTriage`: P0 → churn check; immediate urgency → churn check; otherwise → respond
- `routeAfterChurn`: Critical risk → escalate; otherwise → respond

**API:**
```typescript
const orch = new SupportOrchestrator();
const state = await orch.run({ ticketId: "t1", subject: "Help", body: "..." });
for await (const entry of orch.stream({ ticketId: "t1", subject: "Help", body: "..." })) {
  console.log(entry.agent, entry.output);
}
```

### RAG Knowledge Base (BM25+cosine hybrid)

`src/rag/knowledge-retriever.ts`

In-memory RAG retriever using hybrid BM25 + cosine similarity ranking:

- **BM25** — Traditional keyword-based relevance scoring (40% weight)
- **Cosine similarity** — Embedding-based semantic similarity (60% weight)
- **Pseudo-embeddings** — Hash-based 384-dim vectors (replace with OpenAI/Cohere in production)
- **Highlight extraction** — Sentences containing query terms are extracted as evidence snippets

**API:**
```typescript
const retriever = new KnowledgeRetriever();
retriever.addDocuments([{ id: "d1", content: "How to reset password", source: "kb_article", metadata: {} }]);
await retriever.embedAll();
const results = await retriever.retrieve("password reset", 5);
```

### Similar Ticket Retrieval

`src/rag/similar-ticket-retriever.ts`

Finds previously resolved tickets that inform new ticket resolution:

- Indexes resolved tickets with subject, body, and resolution text
- Uses KnowledgeRetriever's hybrid search to find similar tickets
- Marks tickets with similarity > 0.6 as `resolutionApplicable: true`

**API:**
```typescript
const retriever = new SimilarTicketRetriever();
retriever.indexTickets([{ id: "t1", subject: "...", body: "...", resolution: "...", category: "billing", resolvedAt: "..." }]);
const similar = await retriever.findSimilar({ subject: "New issue", body: "..." }, 5);
```

### Resolution Quality Tracker

`src/qa/resolution-tracker.ts`

Tracks resolution outcomes and provides performance insights:

- **Quality scoring** — 0-1 score based on response length, CSAT, NPS, churn risk penalty
- **Category insights** — Aggregated quality metrics per triage category
- **Agent leaderboard** — Ranked by avg quality score and resolution rate
- **Feedback loop** — Outcomes feed back into coaching and process improvement

**API:**
```typescript
const tracker = new ResolutionTracker();
tracker.record({ ticketId: "t1", agentId: "agent-1", responseDrafted: "...", triageCategory: "billing", timestamp: "..." });
const insights = tracker.getInsights();
const leaderboard = tracker.getAgentLeaderboard();
```

### LLM Semantic Triage

`src/analysis/semantic-triage.ts`

Classifies tickets using MiniMax LLM with keyword-based fallback:

- **Categories**: billing, technical, account, feature_request, complaint, general
- **Priority**: p0, p1, p2, p3
- **Sentiment**: angry, frustrated, neutral, satisfied, happy
- **Urgency**: immediate, same_day, 3_days, 1_week
- **Confidence** — LLM-assigned confidence score (0-1)
- **Source tracking** — `"llm"` or `"keyword_fallback"` for observability

**API:**
```typescript
const engine = new SemanticTriageEngine();
const result = await engine.classify({ subject: "Help", body: "...", channel: "email" });
```

### LLM Response Drafting

`src/autonomous-resolution/llm-response-draft.ts`

Drafts support responses using MiniMax LLM:

- Tone adapts to churn risk: empathetic (critical/high churn), professional (default), friendly
- Falls back to template response when LLM is unavailable
- Includes customer name personalization when provided

**API:**
```typescript
const drafter = new LLMResponseDrafter();
const result = await drafter.draft({
  ticket: { subject: "...", body: "...", customerName: "Alice" },
  triage: { category: "billing", priority: "p1", sentiment: "neutral", intent: "refund", recommendedAction: "refund", urgency: "same_day", confidence: 0.8, source: "llm" },
  tone: "professional",
});
```

### ML Churn Scoring

`src/predictive/ml-churn-scorer.ts`

Scores customer churn risk using LLM behavioral analysis:

- **Risk levels**: critical, high, medium, low
- **Signals analyzed**: account age, monthly spend, ticket frequency, NPS, product usage, escalation count, payment delays, feature adoption
- **Rule-based fallback** — When LLM is unavailable, uses weighted rule scoring
- **Top risk factors** and **recommended actions** returned for each prediction

**API:**
```typescript
const scorer = new MLChurnScorer();
const result = await scorer.score({
  customerId: "cust-1",
  accountAge: 12, monthlySpend: 99, ticketCount: 1, lastTicketDaysAgo: 30,
  npsScore: 7, productUsageFrequency: 0.7, supportEscalationCount: 0, paymentDelays: 0,
});
```

## New Exports (Phase 1+2)

```typescript
// Orchestration
export { SupportOrchestrator } from "./orchestration/support-orchestrator.js";
export type { TicketState, AgentTraceEntry } from "./orchestration/support-orchestrator.js";

// RAG
export { KnowledgeRetriever } from "./rag/knowledge-retriever.js";
export type { KnowledgeDocument, RetrievalResult } from "./rag/knowledge-retriever.js";
export { SimilarTicketRetriever } from "./rag/similar-ticket-retriever.js";
export type { ResolvedTicket, SimilarTicketResult } from "./rag/similar-ticket-retriever.js";

// QA
export { ResolutionTracker } from "./qa/resolution-tracker.js";
export type { ResolutionOutcome, QualityInsight } from "./qa/resolution-tracker.js";

// Analysis
export { SemanticTriageEngine } from "./analysis/semantic-triage.js";
export type { SemanticTriageResult } from "./analysis/semantic-triage.js";

// Autonomous Resolution
export { LLMResponseDrafter } from "./autonomous-resolution/llm-response-draft.js";
export type { DraftResult } from "./autonomous-resolution/llm-response-draft.js";

// Predictive
export { MLChurnScorer } from "./predictive/ml-churn-scorer.js";
export type { MLChurnPrediction } from "./predictive/ml-churn-scorer.js";
```

## Implementation Backlog

### Now
- Define the canonical support issue taxonomy, QA rubric, and escalation matrix.
- Wire evidence-backed response drafting to the highest-value customer, billing, and product contexts.
- Capture recurring support patterns and route them into product and knowledge follow-up loops.

### Next
- Improve routing and prioritization for mixed product, billing, and account-health issues.
- Reduce reviewer load by making QA and risk signals more explicit in the working surface.
- Measure whether knowledge updates actually lower repeat contact volume.

### Later
- Add more autonomous resolution flows for low-risk issues with strong evidence coverage.
- Build department-grade service reporting tied to product and retention outcomes.

## Local Plugin Use

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"<absolute-path-to-this-repo>","isLocalPath":true}'
```

## Validation

```bash
npm install
npm run check
npm run plugin:typecheck
npm run plugin:test
```
