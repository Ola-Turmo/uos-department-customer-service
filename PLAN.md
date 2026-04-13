# Plan: UOS Department Customer Service — Maximally Autonomous

## Context
- **Repo:** new (`@uos/department-customer-service`)
- **Stack:** TypeScript, Node.js, vitest
- **Existing built:** `src/policy/policy-engine.ts`, `src/types.ts` (full type system)
- **Worktree:** `/root/.hermes/paperclip-worktrees/instances/ec634a80`

## What Needs to Be Built

### Phase 1: Autonomous Resolution Core (ARR 0→40%)

| Task | File | Description |
|------|------|-------------|
| T1 | `src/customer/customer-profile.ts` | Customer 360 Profile Synthesizer |
| T2 | `src/feedback/feedback-bus.ts` | Event-driven feedback fan-out bus |
| T3 | `src/sla/sla-engine.ts` | SLA clock, breach prevention, dashboard |
| T4 | `src/autonomous-resolution/action-executor.ts` | Rules engine + capability registry |
| T5 | `src/knowledge/knowledge-healer.ts` | KB gap detection + article generation |

### Phase 2: Predictive & Proactive Intelligence (ARR 40→60%)

| Task | File | Description |
|------|------|-------------|
| T6 | `src/predictive/escalation-predictor.ts` | Escalation probability scoring |
| T7 | `src/predictive/churn-risk-scorer.ts` | Customer churn risk scoring |
| T8 | `src/proactive/outreach-engine.ts` | Proactive outreach trigger + templates |
| T9 | `src/billing/refund-engine.ts` | Autonomous refund/credit issuance |

### Phase 3: Learning Loop & Self-Improvement (ARR 60→70%)

| Task | File | Description |
|------|------|-------------|
| T10 | `src/qa/qa-evolution.ts` | Rubric drift detection + auto-adjustment |
| T11 | `src/qa/agent-coaching.ts` | Per-agent coaching recommendations |
| T12 | `src/analysis/root-cause-analyzer.ts` | Causal chain tracing for patterns |

### Phase 4: Full Autonomous Closure (ARR 70%+)

| Task | File | Description |
|------|------|-------------|
| T13 | `src/session/session-continuity.ts` | Cross-channel session continuity |
| T14 | `src/autonomous-resolution/task-flows.ts` | Multi-step task flow state machine |

## Execution Order

**BATCH 1 (parallel, 5 tasks):** T1, T2, T3, T4, T5
**BATCH 2 (parallel, 4 tasks):** T6, T7, T8, T9
**BATCH 3 (parallel, 3 tasks):** T10, T11, T12
**BATCH 4 (parallel, 2 tasks):** T13, T14
**FINAL:** Build verification + git commit

## Verification
- `npm run check` (tsc --noEmit) must pass for all files
- Each file is self-contained with proper types imported from `../types.js`
- All exports match the type signatures defined in `src/types.ts`
- Lore Commit Protocol for all commits: `feat(scope): short description`
