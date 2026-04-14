# PLAN: uos-department-customer-service — AI-Native Customer Experience Engine

## Context
- **PRD**: AI-Native Customer Experience Engine for UOS Customer Service Department
- **Type**: NEW project
- **Stack**: TypeScript + Zod, @paperclipai/plugin-sdk, LLM-based classification
- **Repo**: prd-uos-department-customer-service-ai-native-cust.git (worktree at c89d9a8d)

## Requirements Summary
1. LLM-Powered Intent Classification (50+ categories, confidence scoring, multi-intent, sentiment routing)
2. Visual Escalation Workflow Builder (conditional branching, SLA routing, workflow testing)
3. Real-Time QA with Learning Loop (LLM-based QA, continuous learning, agent scoring)
4. Predictive Escalation Engine (predict escalations, proactive de-escalation)
5. Knowledge Graph for Issue Resolution (customer issue KG, similar issues, answer suggestions)
6. Multi-Channel Dashboard UI (unified dashboard, journey timeline, SLA countdown)

## Success Metrics
- Triage accuracy: > 92%
- Escalation prediction precision: > 80%
- First-contact resolution improvement: > 30%
- QA evaluation consistency: > 90%

---

## TASK 1: Setup — Initialize TypeScript Project
**Files to create:**
- `package.json` — name: `uos-department-customer-service`, deps: zod, @paperclipai/plugin-sdk, typescript
- `tsconfig.json` — strict mode, ES2022 target
- `src/types.ts` — all shared Zod schemas: Intent, Sentiment, Ticket, EscalationLevel, Workflow, KnowledgeNode, etc.
- `src/index.ts` — main exports

**Commit:** `feat: initialize TypeScript project with Zod schemas`

---

## TASK 2: Triage Service — Intent Classifier + Sentiment Analyzer
**Files to create:**
- `src/triage/intent-classifier.ts` — LLM-powered intent classifier with 50+ categories, confidence scoring, ambiguity detection
- `src/triage/sentiment-analyzer.ts` — sentiment detection (positive/negative/neutral/mixed)
- `src/triage/multi-intent-detector.ts` — detect multiple intents per ticket
- `src/triage/router.ts` — sentiment-aware routing based on intent + sentiment
- `src/triage/index.ts` — exports

**Commit:** `feat(triage): add LLM intent classifier, sentiment analyzer, multi-intent detector, router`

---

## TASK 3: Escalation Engine — Predictor + De-escalation + SLA
**Files to create:**
- `src/escalation/predictor.ts` — escalation predictor using customer history + issue type + sentiment + time patterns
- `src/escalation/deescalator.ts` — proactive de-escalation action engine
- `src/escalation/sla-optimizer.ts` — SLA deadline calculator and optimizer
- `src/escalation/workflow-builder.ts` — visual workflow builder: conditional branching, parallel notifications, SLA-based routing
- `src/escalation/workflow-tester.ts` — one-click workflow testing
- `src/escalation/index.ts` — exports

**Commit:** `feat(escalation): add escalation predictor, de-escalation engine, SLA optimizer, workflow builder`

---

## TASK 4: Knowledge Graph — Issue Resolution KG
**Files to create:**
- `src/knowledge/graph.ts` — in-memory knowledge graph with nodes (issues, customers, resolutions) and edges
- `src/knowledge/similarity.ts` — similar issue resolution lookup using embedding-style scoring
- `src/knowledge/suggestions.ts` — answer suggestion from resolved history
- `src/knowledge/autolink.ts` — auto-link issues to relevant docs
- `src/knowledge/index.ts` — exports

**Commit:** `feat(knowledge): add customer issue knowledge graph with similarity lookup and suggestions`

---

## TASK 5: QA Engine — Real-Time QA with Learning Loop
**Files to create:**
- `src/qa/evaluator.ts` — LLM-based QA evaluation with explainability scores
- `src/qa/learning-loop.ts` — continuous learning from confirmed QA results
- `src/qa/scoring.ts` — comparative agent scoring
- `src/qa/coaching.ts` — coaching suggestions from QA data
- `src/qa/index.ts` — exports

**Commit:** `feat(qa): add LLM-based QA evaluation with continuous learning loop`

---

## TASK 6: Dashboard — Multi-Channel Unified UI
**Files to create:**
- `src/dashboard/unified-dashboard.ts` — unified customer experience dashboard
- `src/dashboard/channel-detector.ts` — channel switching detection
- `src/dashboard/journey-timeline.ts` — customer journey timeline builder
- `src/dashboard/sla-timer.ts` — SLA countdown timer component
- `src/dashboard/index.ts` — exports

**Commit:** `feat(dashboard): add multi-channel unified dashboard with journey timeline and SLA timers`

---

## TASK 7: Integration — Wire Everything Together + Build
**Actions:**
- Update `src/index.ts` to export all services
- Run `npm install` and `npm run build`
- Verify TypeScript compilation passes with exit 0
- Commit: `feat: wire all components together in main export`
