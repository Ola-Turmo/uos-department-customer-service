# PRD: UOS Department Customer Service — Maximally Autonomous Edition

## 1. Concept & Vision

**What it does:** The Customer Service Department is the *frontline intelligence* of the company — receiving every incoming signal (complaint, bug report, billing question, refund request, how-to inquiry), triaging it with full AI context, and either closing it autonomously or routing it precisely to the right specialist with evidence-backed draft response already prepared.

**What it becomes:** A maximally autonomous customer service brain that doesn't just react — it predicts, prevents, heals itself, and continuously improves. It closes the loop from *incoming signal* to *resolved issue* to *upstream fix* to *knowledge update* without human intervention on routine matters. It treats every customer interaction as a data point that improves the entire system.

**North star metric:** **Autonomous Resolution Rate (ARR)** — percentage of incoming issues resolved end-to-end without human handoff. Target: 70%+ for appropriate categories within 6 months.

**Operational philosophy:** Humans are escalators, not routers. Specialists handle edge cases, novel situations, and high-stakes decisions. Everything else runs itself.

---

## 2. Competitive Benchmark

| System | ARR | Key Capabilities |
|--------|-----|-----------------|
| Intercom Fin AI | ~51% resolution | LLM-native, knowledge base synthesis, handoff to humans |
| Zendesk AI | ~60% resolution | Agent assist, automated workflows, predictive CSAT |
| Gorgias Freddy | ~40% resolution | Macros + AI suggestions, multi-brand |
| Freshdesk Freddy | ~35% resolution | Bot workflows, sentiment analysis |
| **This system (target)** | **70%+ resolution** | Full autonomous loop, upstream learning, predictive prevention |

**Differentiation:** All benchmark systems react. This system predicts, prevents, and closes the full loop from customer issue → upstream fix → knowledge update.

---

## 3. Current State Audit

### What Already Exists ✅

**`TriageService`** (`src/triage-service.ts`)
- Keyword-based issue classification (9 categories)
- Priority determination with sentiment boost
- Escalation level computation (0-3)
- Evidence collection (policy, product, KB, previous cases)
- Response draft generation (tone-aware, category-specific)
- AI-enhanced `triageIssueAI()` using intent classifier + sentiment analyzer
- Full state management with persistence

**`RecurringPatternService`** (`src/recurring-pattern-service.ts`)
- Issue pattern detection and indexing
- Upstream action creation (bug-fix, knowledge-update, process-improvement)
- Pattern → action lifecycle tracking
- Impact scoring (frequency × affected customers)

**`QAService`** (`src/qa-service.ts`)
- Rubric-based evaluation (empathy, accuracy, completeness, tone, policy compliance)
- Agent performance tracking
- LLM-evaluation with reasoning trace
- Learning loop (human confirmation → drift detection)

**`IntentClassifier`** (`src/triage/intent-classifier.ts`)
- 50+ intent categories with keyword + LLM classification
- Ambiguity detection, multi-intent support
- Routing hint generation

**`SentimentAnalyzer`** (`src/triage/sentiment-analyzer.ts`)
- Keyword-based sentiment polarity + intensity
- Escalation risk scoring
- Urgency level classification

**`ConnectorHealthService`** (`src/connector-health.ts`)
- Health monitoring for Zendesk, Intercom, Gmail, Shopify, Stripe, WhatsApp, GoogleDrive

### What Is Missing ❌

1. **Autonomous resolution** — no capability to actually *close* issues, only classify and draft
2. **Knowledge graph** — only basic evidence collection, no KB auto-update
3. **Proactive outreach** — no capability to reach *out* to customers
4. **Real multi-channel orchestration** — connectors defined but not actively used
5. **Customer 360 context** — no unified customer profile synthesis
6. **SLA management** — no automatic deadline tracking or breach alerts
7. **Predictive escalation** — no forward-looking escalation probability
8. **QA continuous learning** — drift detection exists but rubric auto-evolution missing
9. **Refund/billing autonomous actions** — no Stripe/billing system write-back
10. **Cross-channel session continuity** — email + chat + WhatsApp siloed
11. **Churn prediction** — no customer risk scoring
12. **Root cause analysis** — no causal链路 tracing for recurring issues
13. **Compensation engine** — no autonomous credit/refund issuance within policy
14. **Agent coaching loop** — no per-agent improvement recommendations
15. **Session memory** — no long-term conversation context across interactions

---

## 4. Feature Roadmap (Prioritized)

### Phase 1: Autonomous Resolution Core (ARR 0→40%)

#### Feature 1.1: Autonomous Action Executor
**What:** A deterministic action engine that executes predefined resolution playbooks for low-risk, high-confidence issues.

**Trigger conditions for autonomous close:**
- Category in `["how-to", "faq", "documentation", "guide", "tutorial"]` AND confidence ≥ 0.7
- Category = `"feature-request"` (auto-acknowledge, route to product)
- Category = `"billing"` AND amount < $50 AND confidence ≥ 0.8 (auto-explain)
- Sentiment = `"positive"` AND category = `"feedback"` (auto-thank)
- No escalation risk factors AND confidence ≥ 0.8 AND category = `"account"` (password reset flow)

**Resolution actions available:**
- `send_response_draft()` — deliver the AI drafted response
- `update_ticket_status()` — close or transition the ticket
- `add_internal_note()` — document resolution for QA
- `create_kb_article()` — promote high-value resolution to KB
- `route_to_team()` — escalate with full context
- `issue_credit()` — autonomous refund/credit within policy limits

**Implementation:** New `src/autonomous-resolution/action-executor.ts` with a rules engine + capability registry.

**Policy guardrails:** Every autonomous action checked against `src/policy/policy-engine.ts` — defines max autonomous refund ($200), max autonomous credit ($50), categories that always require human.

---

#### Feature 1.2: Customer 360 Profile Synthesizer
**What:** Unified customer context that aggregates all known signals across channels into a single view.

**Data sources synthesized:**
- Current ticket (subject, description, channel, metadata)
- Historical tickets (past issues, resolution patterns, satisfaction scores)
- Account data (plan tier, tenure, MRR, user count, health score)
- Product usage signals (if available via API)
- CRM data (company info, LTV, churn risk score)
- Previous CS contacts (sentiment trajectory)

**Implementation:** New `src/customer/customer-profile.ts` — `CustomerProfile` type, `CustomerContextSynthesizer` class that merges data from all available connectors into a unified profile on every triage call.

**Schema:**
```typescript
interface CustomerProfile {
  customerId: string;
  channels: Channel[];  // email, chat, whatsapp, phone
  lifetimeValue: number;
  churnRisk: "high" | "medium" | "low";
  sentimentTrajectory: "improving" | "stable" | "declining";
  lastContactAt: string;
  totalTickets: number;
  openTickets: number;
  avgResolutionTime: string;
  planTier: string;
  accountTenureDays: number;
  keyPatterns: string[]; // "billing-sensitive", "technical-power-user", etc.
  recentEscalations: number;
  preferredLanguage: string;
  slaTier: "standard" | "priority" | "enterprise";
}
```

---

#### Feature 1.3: Autonomous Knowledge Base Healing
**What:** After a ticket is resolved, automatically update the knowledge base if the resolution surfaced new information not in existing KB articles.

**Flow:**
1. Ticket resolved → extract resolution summary
2. Check against existing KB articles (semantic similarity)
3. If gap found → draft new KB article or update existing
4. Route draft to KB team (or auto-publish if confidence ≥ 0.95)

**Implementation:** New `src/knowledge/knowledge-healer.ts` — `KnowledgeGapDetector` class using embedding similarity, `KBArticleGenerator` class.

---

#### Feature 1.4: SLA Management Engine
**What:** Automatic SLA deadline tracking with intelligent breach prevention.

**Features:**
- Per-category, per-tier SLA definitions (config in `src/policy/sla-policy.ts`)
- Real-time countdown on every open ticket
- Pre-breach alerts (25%, 50%, 75% thresholds)
- Auto-escalation on breach risk
- SLA health dashboard reporting

**Implementation:** New `src/sla/sla-engine.ts` — `SLAClock`, `SLABreacherPreventer`, `SLADashboard` types.

---

### Phase 2: Predictive & Proactive Intelligence (ARR 40→60%)

#### Feature 2.1: Predictive Escalation Engine
**What:** Before a customer escalates, predict it and take preventive action.

**Predictive signals:**
- Sentiment intensity trend across last 3 interactions
- Issue category (billing + negative sentiment = high risk)
- Time-of-day patterns (evening/weekend = higher escalation)
- Channel (phone > email > chat for escalation intent)
- Historical: customer has escalated before
- Ticket reopened after resolution
- Response time exceeds SLA by >50%

**Implementation:** New `src/predictive/escalation-predictor.ts` — `EscalationPredictor` class using a scoring model (weights tunable from historical data).

**Action on prediction ≥ 0.7:**
- Auto-upgrade priority
- Assign to senior specialist pre-emptively
- Draft proactive message to customer: "I noticed you may still have questions about..."
- Trigger de-escalation offer (compensation, apology, priority)

---

#### Feature 2.2: Churn Risk Scoring
**What:** Every customer interaction updates a live churn risk score.

**Risk factors:**
- Sentiment declining over last 5 interactions
- 3+ escalations in 30 days
- Ticket reopened (implies unresolved)
- Billing issue + high-value account
- Negative CSAT scores
- Product usage declining (if usage data available)

**Output:** `ChurnRiskScore` with factors + recommended retention actions:
- Low: standard handling
- Medium: send satisfaction check-in after resolution
- High: trigger customer success outreach + manager review
- Critical: immediate retention play (credit, call, executive handoff)

**Implementation:** New `src/predictive/churn-risk-scorer.ts` — `ChurnRiskScorer` class, `RetentionPlaybook` registry.

---

#### Feature 2.3: Proactive Outreach Engine
**What:** Reach out to customers before they contact support.

**Trigger scenarios:**
- Product update deployed that affects their workflow
- Planned maintenance window affecting their account
- Invoice about to be charged for first time (reduce billing shock)
- Long-time no-login account (re-engagement)
- Usage drop detected (early warning of dissatisfaction)
- New KB article relevant to their past issues

**Channels:** Email (primary), WhatsApp (if opted in), in-app message (if applicable).

**Implementation:** New `src/proactive/outreach-engine.ts` — `ProactiveOutreachTrigger`, `OutreachTemplateLibrary`, `ChannelRouter`.

---

#### Feature 2.4: Autonomous Refund/Credit Issuance
**What:** Issue refunds and credits automatically within policy guardrails, without human approval.

**Policy rules:**
- Refund ≤ $50: fully autonomous (if category=billing/refund AND confidence≥0.8 AND no prior large refunds)
- Refund $51-$200: autonomous + internal notification (human can veto within 24h)
- Refund >$200: requires human approval
- Credit (non-refund): ≤$25 fully autonomous
- Customer in VIP tier: 2× thresholds

**Stripe integration:** Use Stripe API to issue refunds directly. Log every action in `RefundLedger` for audit trail.

**Implementation:** New `src/billing/refund-engine.ts` — `RefundPolicyEvaluator`, `StripeRefundExecutor`, `RefundLedger`.

---

### Phase 3: Learning Loop & Self-Improvement (ARR 60→70%)

#### Feature 3.1: QA Rubric Auto-Evolution
**What:** The QA rubric doesn't stay static — it evolves based on what customers actually care about.

**Mechanism:**
- After human QA review, capture the delta between AI evaluation and human score
- If systematic drift detected in a criterion (e.g., "empathy" consistently under-scored vs human), auto-adjust keyword weights
- Track which criteria most strongly predict CSAT → weight those higher
- Monthly rubric review report: "Empathy scores are trending down vs human review. Consider adding [new empathy keywords]"

**Implementation:** `src/qa/qa-evolution.ts` — `RubricDriftDetector`, `AutoRubricAdjuster`, `CSATCorrelationAnalyzer`.

---

#### Feature 3.2: Root Cause Analysis Engine
**What:** When recurring patterns are detected, automatically trace the root cause chain.

**Causal链路 model:**
```
Customer symptom → surface issue → intermediate cause → root cause
     ↑                  ↑                   ↑               ↑
  (ticket)         (pattern)          (investigation)   (product/billing config)
```

**Implementation:** New `src/analysis/root-cause-analyzer.ts` — `CausalGraph`, `RootCauseTracer`. Integrates with existing `RecurringPatternService`.

**Output:** For each pattern, a structured `RootCauseReport`:
- Surface issue (what customers report)
- Suspected root cause with confidence
- Recommended investigation steps
- Expected fix type (code, config, policy, KB)

---

#### Feature 3.3: Per-Agent Coaching Engine
**What:** Instead of aggregate QA, generate per-agent coaching recommendations.

**Data per agent:**
- Average QA scores by criterion over time
- Strongest and weakest criteria
- Most common failure modes
- Sentiment trajectory of their assigned customers
- Escalation rate vs team average

**Output:** Monthly `AgentCoachingReport` with:
- Personalized tip: "Your accuracy scores are 15 points below team average — try adding more verification language ('I confirmed...', 'I verified...')"
- Training resource recommendations
- Peer comparison (opt-in)

**Implementation:** `src/qa/agent-coaching.ts` — `AgentPerformanceTracker`, `CoachingReportGenerator`.

---

#### Feature 3.4: Ticket Auto-Classification Learning
**What:** The intent classifier learns from misclassifications.

**Mechanism:**
- When a ticket is escalated or re-routed, record the human correction
- Retrain/reweight keyword associations weekly
- Flag novel intent categories that emerge (e.g., new product feature generates new issue type)

**Output:** Weekly `ClassificationHealthReport`:
- Categories with highest mis-route rate
- New intent signals detected
- Suggested new categories to add

---

### Phase 4: Full Autonomous Closure (ARR 70%+)

#### Feature 4.1: Multi-Step Autonomous Task Completion
**What:** Handle complex multi-step tasks that require actions across multiple systems.

**Example flows:**
1. **"Cancel my subscription and refund the last charge"**
   → Authenticate account → Verify no conflicting pending orders → Cancel subscription in Stripe → Issue refund → Send confirmation email → Create KB update if this is a new cancellation pattern

2. **"I can't access my account"**
   → Check account status → If locked, initiate unlock flow → Send password reset email → If MFA issue, reset MFA → Send resolution confirmation → Log for security audit

3. **"I was charged twice"**
   → Pull Stripe payment history → Verify duplicate charge → If confirmed, issue partial refund for duplicate → Send explanation + apology → Create billing adjustment record

**Implementation:** New `src/autonomous-resolution/task-flows.ts` — `TaskFlowEngine` with step definitions, error handling, rollback capability. Each flow is a state machine.

---

#### Feature 4.2: Cross-Channel Session Continuity
**What:** A customer starts a conversation on WhatsApp, continues via email, resolves on chat — without repeating themselves.

**Mechanism:**
- Unified session ID across channels per customer
- Context carries forward: triage done on WhatsApp doesn't need to be redone on email
- Response drafts merge context from all channels
- Channel preference learned per customer

**Implementation:** `src/session/session-continuity.ts` — `CrossChannelSession`, `ContextMerger`, `ChannelPreferenceLearner`.

---

#### Feature 4.3: Autonomous Handoff Protocol
**What:** When human escalation is needed, the handoff is complete — no back-and-forth.

**Handoff package includes:**
- Full triage result with evidence
- Customer 360 profile
- Suggested specialist role + reason
- Drafted response (specialist can edit or send as-is)
- Sentiment summary
- Similar cases resolved (for reference)
- Recommended resolution path

**Specialist experience:** Opens ticket → sees full context → can respond with one click or refine → done.

---

#### Feature 4.4: 360° Feedback Loop
**What:** Every resolved ticket feeds back into the system through all loops simultaneously.

**Feedback architecture:**
```
Ticket Resolved
    ├──→ QA Evaluation ──→ Rubric Evolution ──→ Agent Coaching
    ├──→ Pattern Detection ──→ Root Cause ──→ Upstream Action
    ├──→ Knowledge Healer ──→ KB Article (new/updated)
    ├──→ Customer Profile Update ──→ Churn Risk Recalc
    ├──→ CSAT Prediction ──→ SLA Health Update
    └──→ Classification Learning ──→ Intent Weights Update
```

**Implementation:** `src/feedback/feedback-bus.ts` — event-driven feedback architecture. Each resolution triggers a `TicketResolved` event that fan-outs to all learning subsystems in parallel.

---

## 5. Architecture

### New Directory Structure
```
src/
├── triage/              # existing ✅
│   ├── intent-classifier.ts
│   └── sentiment-analyzer.ts
├── triage-service.ts     # existing ✅
├── qa-service.ts        # existing ✅
├── recurring-pattern-service.ts  # existing ✅
├── connector-health.ts   # existing ✅
├── autonomous-resolution/   # NEW
│   ├── action-executor.ts
│   ├── task-flows.ts
│   └── policy-engine.ts
├── customer/              # NEW
│   └── customer-profile.ts
├── knowledge/             # NEW
│   └── knowledge-healer.ts
├── sla/                   # NEW
│   └── sla-engine.ts
├── predictive/            # NEW
│   ├── escalation-predictor.ts
│   └── churn-risk-scorer.ts
├── proactive/             # NEW
│   └── outreach-engine.ts
├── billing/               # NEW
│   └── refund-engine.ts
├── qa/                    # NEW
│   ├── qa-evolution.ts
│   └── agent-coaching.ts
├── analysis/              # NEW
│   └── root-cause-analyzer.ts
├── session/              # NEW
│   └── session-continuity.ts
├── feedback/             # NEW
│   └── feedback-bus.ts
└── worker.ts             # existing ✅ (updated to wire all new services)
```

### Data Flow
```
Incoming Issue (any channel)
    │
    ▼
TriageService.triageIssueAI()
    ├── IntentClassifier → category + routing
    ├── SentimentAnalyzer → urgency + risk
    │
    ▼
CustomerProfileSynthesizer.getProfile(customerId)
    │
    ▼
Customer360 + TriageResult → UnifiedIssueContext
    │
    ├────────────────────────────────────────┐
    ▼                                      ▼
SLAEngine.check()              ChurnRiskScorer.score()
    │                                      │
    ▼                                      ▼
EscalationPredictor.predict()   IF risk ≥ HIGH:
    │                              ProactiveOutreach.trigger()
    ▼
IF confidence ≥ threshold AND category in autonomous-allowed:
    │
    ▼
ActionExecutor.runAutonomousFlow()
    ├── PolicyEngine.check(action)   ← guardrails
    ├── TaskFlow.execute()           ← multi-step if needed
    └── FeedbackBus.emit(resolved)   ← close all loops
    │
    └───→ All learning subsystems notified in parallel

IF confidence < threshold OR category not autonomous:
    │
    ▼
Route to human specialist with full handoff package
    │
    ▼
Human resolves → TicketResolved event
    │
    ▼
FeedbackBus.emit() → all learning loops
```

---

## 6. Integration Surface

### Platform Connectors (read/write)
| Platform | Read Operations | Write Operations |
|----------|----------------|-----------------|
| **Zendesk** | tickets, users, satisfaction | update ticket, add comment, close |
| **Intercom** | conversations, users | reply, close, tag |
| **Gmail** | threads | send reply, add label |
| **Shopify** | orders, customers | refund, update customer |
| **Stripe** | charges, customers, subscriptions | refund, credit, cancel subscription |
| **WhatsApp** | messages | send template message |
| **Google Drive/Docs** | KB articles | create/update KB doc |
| **Slack** | — | send alert to #support-escalations |
| **CRM (HubSpot/Salesforce)** | contact record, LTV | update contact score, log activity |
| **Paperclip** | plugin events, entity data | register handlers, update state |

### Event Subscriptions
- `issue.created` — already wired ✅
- `issue.resolved` — NEW
- `issue.escalated` — NEW
- `ticket.reopened` — NEW
- `customer.sentiment_declined` — NEW
- `sla.breach_risk` — NEW
- `pattern.detected` — already wired ✅
- `kb.gap_found` — NEW

---

## 7. KPI Targets & Success Metrics

| Metric | Current | 90-day Target | 180-day Target |
|--------|---------|--------------|---------------|
| Autonomous Resolution Rate | ~0% | 40% | 70% |
| First-response suggestion acceptance | ≥70% (manual target) | 75% | 80% |
| QA pass rate | ≥90% | 92% | 95% |
| Escalation misrouting | <5% | <3% | <2% |
| Pattern → upstream fix SLA | 2 business days | 24h | 12h |
| Avg ticket resolution time | unknown | -30% | -50% |
| Churn detection precision | N/A | 60% | 80% |
| KB article auto-generation | N/A | 5/week | 20/week |
| Customer effort score (CES) | unknown | +0.5 | +1.0 |

---

## 8. Policy Guardrails

### Autonomous Action Policy (`src/policy/policy-engine.ts`)

```typescript
const AUTONOMOUS_POLICY = {
  maxAutonomousRefund: 50,        // $50 — above requires approval
  maxAutonomousCredit: 25,         // $25 — above requires approval
  highValueAccountMultiplier: 2,     // VIP tier = 2× thresholds
  alwaysRequireHuman: [
    "legal", "regulatory", "executive", "media", "security-breach"
  ],
  autonomousCategories: [
    "how-to", "faq", "documentation", "guide", "tutorial",
    "feature-request", "feedback", "praise", "account-recovery"
  ],
  maxAutonomousCloseConfidence: 0.8, // below this, always human
  autoEscalateOnChurnRisk: "critical", // critical churn risk → always human
};
```

### Override Mechanism
Any autonomous action can be overridden by:
1. Human specialist intervention
2. Customer "not resolved" feedback
3. SLA breach detection
4. Policy engine rule change (audited)

---

## 9. Validation

```bash
npm install
npm run check                    # lint + typecheck
npm run plugin:typecheck         # Paperclip plugin types
npm run plugin:test              # Paperclip plugin tests

# New test suites
npm run test:autonomous          # Action executor + task flows
npm run test:customer-profile     # Customer 360 synthesis
npm run test:qa-evolution         # Rubric drift + auto-evolution
npm run test:predictive           # Escalation predictor + churn scorer
npm run test:sla                  # SLA engine
npm run test:knowledge            # KB healer
npm run test:refund               # Refund engine + Stripe mock
npm run test:feedback-bus         # Feedback fan-out loop
```

---

## 10. Rollout Plan

### Week 1-2: Core Infrastructure
- `policy-engine.ts`, `customer-profile.ts`, `feedback-bus.ts`
- Wire into existing worker.ts

### Week 3-4: Phase 1 (Autonomous Resolution)
- `action-executor.ts`, `task-flows.ts` (how-to + feature-request flows first)
- `sla-engine.ts`
- `knowledge-healer.ts` (KB gap detection)

### Week 5-6: Phase 2 (Predictive)
- `escalation-predictor.ts`
- `churn-risk-scorer.ts`
- `proactive-outreach-engine.ts`
- `refund-engine.ts`

### Week 7-8: Phase 3 (Learning Loops)
- `qa-evolution.ts`
- `agent-coaching.ts`
- `root-cause-analyzer.ts`

### Week 9-10: Phase 4 (Full Closure)
- Cross-channel session continuity
- Enhanced multi-step task flows
- Full handoff protocol refinement

### Ongoing: Monitoring & Optimization
- Weekly KPI review (ARR, QA pass rate, SLA compliance)
- Monthly rubric evolution
- Quarterly capability expansion

---

## 11. Open Questions / Technical Decisions

1. **LLM provider**: Which model powers the autonomous response generation and QA evaluation? (Anthropic claude-opus for quality vs haiku for cost)
2. **Embedding model**: For KB gap detection — self-hosted embeddings or OpenAI/Cohere?
3. **Feedback storage**: PostgreSQL vs SQLite for the feedback bus event log?
4. **Stripe test mode**: Use Stripe test API keys for all refund engine validation
5. **Paperclip event schema**: Confirm event shape for `issue.resolved`, `ticket.reopened`
6. **WhatsApp template approval**: Proactive outreach on WhatsApp requires Meta-approved templates — account for approval timeline
7. **Gorgias/Intercom conflict**: If customer contacts via multiple platforms simultaneously, who owns the session?
8. **Human override rate**: Track how often humans override autonomous decisions — high rate = tighten policy thresholds
