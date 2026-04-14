# PRD: uos-department-customer-service — AI-Native Customer Experience Engine

## Context
Customer service department with keyword-based triage (VAL-DEPT-CS-001), pattern detection (VAL-DEPT-CS-002), QA evaluation (VAL-DEPT-CS-003), and connector health (XAF-007). 8 connectors, 5 UI widgets. The weakest part is keyword-based triage — easily confused and misses nuance.

## Vision (April 2026 — World-Class)
The customer service department should be an **AI-native customer experience engine** — understanding intent with nuance, predicting escalations before they happen, learning from every interaction, and treating each customer as a valued individual rather than a ticket number.

## What's Missing / Innovation Opportunities

### 1. LLM-Powered Intent Classification
Currently: Keyword matching for triage.
**Add**: Fine-tuned intent classifier with 50+ categories, confidence scoring, ambiguity detection. Multi-intent detection (customer has multiple issues). Sentiment-aware routing.

### 2. Visual Escalation Workflow Builder
Currently: Sequential escalation levels.
**Add**: Visual workflow designer for escalation paths. Conditional branching, parallel notifications, SLA-based routing. One-click workflow testing.

### 3. Real-Time QA with Learning Loop
Currently: Heuristic keyword scoring, 70% threshold.
**Add**: LLM-based QA evaluation with explainability. Continuous learning from confirmed QA results. Comparative agent scoring. Coaching suggestions.

### 4. Predictive Escalation Engine
Currently: Reactive escalation after triage.
**Add**: Predict which issues will escalate based on customer history, issue type, sentiment signals, time-of-day patterns. Proactive de-escalation offers.

### 5. Knowledge Graph for Issue Resolution
Currently: Pattern linking to upstream actions.
**Add**: Customer issue knowledge graph. Similar issue resolution lookup. Answer suggestion from resolved history. Auto-link to relevant docs.

### 6. Multi-Channel Dashboard (UI)
Currently: 5 widgets but disconnected.
**Add**: Unified customer experience dashboard. Channel切换 (channel switching) detection. Customer journey timeline. SLA countdown timers.

## Implementation Phases

### Phase 1: AI Triage
- Intent classifier service (`src/triage/intent-classifier.ts`)
- Sentiment analyzer
- Multi-intent detector

### Phase 2: Predictive Escalation
- Escalation predictor (`src/escalation/predictor.ts`)
- Proactive de-escalation actions
- SLA optimizer

### Phase 3: Knowledge Graph + Dashboard
- Issue knowledge graph (`src/knowledge/graph.ts`)
- Unified dashboard redesign

## Technical Approach
- TypeScript + Zod
- `@paperclipai/plugin-sdk`
- LLM-based classification (via connector to GPT-4o/claude)
- In-memory knowledge graph

## Success Metrics
- Triage accuracy: > 92% (vs current keyword-based ~70%)
- Escalation prediction precision: > 80%
- First-contact resolution improvement: > 30%
- QA evaluation consistency: > 90% agreement with human review
