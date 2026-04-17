# Archived Customer Service Porting Matrix

This matrix maps salvageable functionality from archived repos into the live
`uos-department-customer-service` implementation.

Priority scale:

- `P1` ship first because it changes core product capability
- `P2` important follow-on once core wiring exists
- `P3` useful but depends on earlier scaffolding or stronger evidence

| Feature cluster | Archived source file(s) | Live destination module(s) | Priority | Notes |
| --- | --- | --- | --- | --- |
| Multi-intent detection | `uos-department-customer-service-ai-native-cust/src/triage/multi-intent-detector.ts` | `src/triage/multi-intent-detector.ts`, `src/triage/intent-classifier.ts`, `src/triage-service.ts` | P1 | Direct gap in live repo. Integrate into top-level triage result, not as a side utility. |
| Support knowledge graph core | `uos-department-customer-service-ai-native-cust/src/knowledge/graph.ts` | `src/knowledge/graph.ts`, `src/rag/knowledge-retriever.ts`, `src/rag/similar-ticket-retriever.ts`, `src/recurring-pattern-service.ts` | P1 | Add a typed graph service under a new `src/knowledge/` namespace and keep current RAG paths as consumers. |
| Knowledge graph similarity | `uos-department-customer-service-ai-native-cust/src/knowledge/similarity.ts` | `src/knowledge/similarity.ts`, `src/rag/similar-ticket-retriever.ts` | P2 | Use for reranking and linked-case recommendations. |
| Knowledge autolink and suggestions | `uos-department-customer-service-ai-native-cust/src/knowledge/autolink.ts`, `uos-department-customer-service-ai-native-cust/src/knowledge/suggestions.ts` | `src/knowledge/autolink.ts`, `src/knowledge/suggestions.ts`, `src/autonomous-resolution/llm-response-draft.ts`, `src/qa-service.ts` | P2 | Feed drafting and QA with graph-backed citations and next-best evidence. |
| Omnichannel adapter layer | `uos-department-customer-service-maximally-autonomous/src/adapters/gmail.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/hubspot.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/intercom.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/shopify.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/stripe.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/whatsapp.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/zendesk.ts`, `uos-department-customer-service-maximally-autonomous/src/adapters/paperclip-adapter.ts` | `src/adapters/*.ts`, `src/orchestration/support-orchestrator.ts`, `src/data/connectors-config.ts`, `src/connector-health.ts` | P1 | Start with adapter contracts plus Zendesk / Intercom / Stripe because they align most directly with the live domain model. |
| Cross-department handoff and autonomy graduation | `uos-department-customer-service-maximally-autonomous/src/autonomous-resolution/cross-department.ts`, `uos-department-customer-service-maximally-autonomous/src/autonomous-resolution/graduation.ts`, `uos-department-customer-service-maximally-autonomous/src/autonomous-resolution/handoff-protocols.ts` | `src/autonomous-resolution/task-flows.ts`, `src/autonomous-resolution/action-executor.ts`, `src/session/handoff-protocol.ts`, `src/proactive/outreach-engine.ts` | P1 | Live repo already has action and handoff surfaces; wire the archived logic into those instead of duplicating workflow engines. |
| Autonomous resolution KPI tracking | `uos-department-customer-service-maximally-autonomous/src/metrics/arr-tracker.ts`, `uos-department-customer-service-maximally-autonomous/src/metrics/dashboard.ts` | `src/metrics/arr-tracker.ts`, `src/qa/resolution-tracker.ts`, `src/ui/widgets.tsx` | P1 | ARR is the missing autonomy KPI. Keep it separate from generic QA metrics. |
| Predictive CSAT and QA threshold tuning | `uos-department-customer-service-maximally-autonomous/src/qa/csat-predictor.ts`, `uos-department-customer-service-maximally-autonomous/src/qa/csat-correlation-analyzer.ts`, `uos-department-customer-service-maximally-autonomous/src/qa/threshold-auto-adjuster.ts`, `uos-department-customer-service-maximally-autonomous/src/qa/qa-service.ts` | `src/qa/csat-predictor.ts`, `src/qa/qa-evolution.ts`, `src/qa/agent-coaching.ts`, `src/qa-service.ts` | P2 | Bring the predictor and threshold tuner in after ARR is wired so the system has an autonomy baseline. |
| Knowledge healing | `uos-department-customer-service-maximally-autonomous/src/knowledge/knowledge-healer.ts` | `src/knowledge/knowledge-healer.ts`, `src/rag/knowledge-retriever.ts`, `src/recurring-pattern-service.ts` | P2 | Use graph gaps and repeated failure patterns to propose doc or playbook updates. |
| RLHF-style feedback loop | `uos-department-customer-service-maximally-autonomous/src/rlhf/feedback-loop.ts` | `src/feedback/rlhf-feedback-loop.ts`, `src/feedback/feedback-bus.ts`, `src/qa/qa-evolution.ts` | P2 | Keep this as structured feedback infrastructure, not model-training theater. |
| Conversation memory and ticket logging | `uos-department-customer-service-maximally-autonomous/src/services/conversation-memory.ts`, `uos-department-customer-service-maximally-autonomous/src/services/ticket-logger.ts`, `uos-department-customer-service-maximally-autonomous/src/workers/ticket-logger.ts` | `src/session/session-continuity.ts`, `src/logging/ticket-logger.ts`, `src/worker.ts` | P3 | Useful, but should follow the adapter layer so logs reflect a normalized channel model. |
| Heartbeat polling and upstream task fan-out | `uos-department-customer-service-maximally-autonomous/src/workers/heartbeat-worker.ts`, `uos-department-customer-service-maximally-autonomous/src/workers/upstream-task.ts`, `uos-department-customer-service-maximally-autonomous/src/services/upstream-task-sender.ts` | `src/worker.ts`, `src/orchestration/support-orchestrator.ts`, `src/feedback/feedback-bus.ts` | P3 | Only add after connector and handoff contracts are stable. |

## Explicit No-Port Decisions

- `uos-department-operations-autonomous-operation`
  No port PRD created because the clearly unique `freshness` slice is already
  present in the live operations repo via `src/freshness-service.ts`,
  `src/ml/freshness-scorer.ts`, and the documented product surface.

- `uos-finance-risk-complete-accounting-department`
  No port PRD created because the live finance repo already contains the broad
  accounting surface under `src/accounting/*`, including GL, AP, AR, FA, cash,
  payroll, tax, and reporting.
