---
repo: "uos-department-customer-service"
display_name: "@uos/department-customer-service"
package_name: "@uos/department-customer-service"
lane: "department overlay"
artifact_class: "TypeScript package / business-domain overlay"
maturity: "domain overlay focused on support delivery and QA"
generated_on: "2026-04-03"
assumptions: "Grounded in the current split-repo contents, package metadata, README/PRD alignment pass, and the Paperclip plugin scaffold presence where applicable; deeper module-level inspection should refine implementation detail as the code evolves."
autonomy_mode: "maximum-capability autonomous work with deep research and explicit learning loops"
---

# PRD: @uos/department-customer-service

## 1. Product Intent

**Package / repo:** `@uos/department-customer-service`  
**Lane:** department overlay  
**Artifact class:** TypeScript package / business-domain overlay  
**Current maturity:** domain overlay focused on support delivery and QA  
**Source-of-truth assumption:** Department-specific customer service overlay.
**Runtime form:** Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

@uos/department-customer-service operationalizes support delivery, knowledge automation, QA, and escalation management. Its goal is to improve speed, accuracy, empathy, and learning across the full support loop.

## 2. Problem Statement

Support organizations accumulate fragmented macros, tribal knowledge, uneven QA, and escalation chaos. Without structured workflows and learning loops, teams solve the same issues repeatedly and miss product feedback hidden inside support demand.

## 3. Target Users and Jobs to Be Done

- Customer service agents and support leads.
- QA reviewers and escalation managers.
- Knowledge owners responsible for support documentation.
- Product and ops teams consuming support-derived insights.

## 4. Outcome Thesis

**North star:** Support becomes faster and more reliable without becoming robotic: agents have better guidance, QA is consistent, escalations are intentional, and recurring issues reliably feed platform and product improvements.

### 12-month KPI targets
- First-response suggestion acceptance reaches >= 70% on the maintained support benchmark set.
- QA pass rate stays >= 90% for reviewed responses and escalations.
- Escalation misrouting stays < 5% for benchmark issue classes.
- Recurring top-issue patterns produce an upstream fix, bug, or knowledge action within 2 business days.
- Policy or evidence citation is present in 100% of high-risk or billing-adjacent response drafts.

### Acceptance thresholds for the next implementation wave
- A stable issue taxonomy exists for triage, escalation, and reporting.
- Response drafts can pull evidence from policy, product, billing, and account context where relevant.
- Escalation rules are explicit for bugs, refunds, account risk, and sensitive cases.
- Support learning loops actually create knowledge updates or upstream product actions.

## 5. In Scope

- Ticket triage, routing, and issue classification support.
- Knowledge retrieval, gap detection, and content healing loops.
- QA review workflows and rubric-driven scoring.
- Escalation decision support and playbook management.
- Feedback extraction from support issues into improvement backlogs.

## 6. Explicit Non-Goals

- Replacing human judgment in high-stakes or emotionally complex cases.
- Masking product defects through support automation alone.
- Owning billing/legal/security policy beyond safe routing and escalation.

## 7. Maximum Tool and Connection Surface

- This repo should assume it may use any connection, API, browser flow, CLI, document surface, dataset, or storage system materially relevant to completing the job, as long as the access pattern is lawful, auditable, and proportionate to risk.
- Do not artificially limit execution to the tools already named in the repo if adjacent systems are clearly required to close the loop.
- Prefer first-party APIs and direct integrations when available, but use browser automation, provider CLIs, structured import/export, and human-review queues when they are the most reliable path to completion.
- Treat communication systems, docs, spreadsheets, issue trackers, code hosts, cloud consoles, dashboards, databases, and admin panels as valid operating surfaces whenever the repo's job depends on them.
- Escalate only when the action is irreversible, privacy-sensitive, financially material, or likely to create external side effects without adequate review.

### Priority surfaces for customer service work
- Zendesk, Intercom, Help Scout, Gmail/Google Workspace, Slack, Discord, CRM systems such as HubSpot or Salesforce, billing/order systems such as Stripe, and account-management surfaces required to fully resolve customer issues.
- Knowledge bases, docs, QA systems, conversation analytics, issue trackers such as GitHub, Linear, or Jira, and product feedback channels needed to improve resolution quality over time.
- Browser and admin-console flows for support, billing, and account tools when the relevant customer context is not fully exposed through API access.
- Any adjacent system needed to close the loop from incoming issue to resolution, escalation, refund, bug report, account update, or knowledge refresh.

### Selection rules
- Start by identifying the systems that would let the repo complete the real job end to end, not just produce an intermediate artifact.
- Use the narrowest safe action for high-risk domains, but not the narrowest tool surface by default.
- When one system lacks the evidence or authority needed to finish the task, step sideways into the adjacent system that does have it.
- Prefer a complete, reviewable workflow over a locally elegant but operationally incomplete one.

## 8. Autonomous Operating Model

This PRD assumes **maximum-capability autonomous work**. The repo should not merely accept tasks; it should research deeply, compare options, reduce uncertainty, ship safely, and learn from every outcome. Autonomy here means higher standards for evidence, reversibility, observability, and knowledge capture—not just faster execution.

### Required research before every material task
1. Read the repo README, this PRD, touched source modules, existing tests, and recent change history before proposing a solution.
1. Trace impact across adjacent UOS repos and shared contracts before changing interfaces, schemas, or runtime behavior.
1. Prefer evidence over assumption: inspect current code paths, add repro cases, and study real failure modes before implementing a fix.
1. Use external official documentation and standards for any upstream dependency, provider API, framework, CLI, or format touched by the task.
1. For non-trivial work, compare at least two approaches and explicitly choose based on reversibility, operational safety, and long-term maintainability.

### Repo-specific decision rules
- Accuracy and empathy beat raw speed in any high-stakes interaction.
- A helpful answer with citations or evidence beats a fluent but uncertain one.
- Escalation quality matters more than escalation suppression.
- Knowledge automation should reduce agent load and improve consistency, not freeze learning.

### Mandatory escalation triggers
- Security, billing, legal, abuse, or crisis-related cases.
- Situations where policy and empathy are in tension and require human review.
- Any automation that could mislead a customer about commitments or outcomes.

## 9. Continuous Learning Requirements

### Required learning loop after every task
- Every completed task must leave behind at least one durable improvement: a test, benchmark, runbook, migration note, ADR, or automation asset.
- Capture the problem, evidence, decision, outcome, and follow-up questions in repo-local learning memory so the next task starts smarter.
- Promote repeated fixes into reusable abstractions, templates, linters, validators, or code generation rather than solving the same class of issue twice.
- Track confidence and unknowns; unresolved ambiguity becomes a research backlog item, not a silent assumption.
- Prefer instrumented feedback loops: telemetry, evaluation harnesses, fixtures, or replayable traces should be added whenever feasible.

### Repo-specific research agenda
- Which issue clusters create the most avoidable support load?
- Where are the biggest knowledge gaps or stale articles?
- What QA rubric dimensions best predict customer outcomes?
- Which escalations are unnecessary and which are currently too late?
- How can support signals feed product and operations faster and with better structure?

### Repo-specific memory objects that must stay current
- Issue taxonomy and recurrence map.
- Knowledge gap backlog.
- QA rubric history and examples.
- Escalation playbook library.
- Support-to-product feedback ledger.

## 10. Core Workflows the Repo Must Master

1. Triaging and classifying incoming issues.
1. Suggesting accurate, policy-aligned responses with evidence.
1. Running QA reviews and coaching loops.
1. Escalating effectively based on issue type and risk.
1. Mining recurring issue patterns to inform upstream fixes.

## 11. Interfaces and Dependencies

- Paperclip plugin scaffold for worker, manifest, UI, and validation surfaces.

- `@uos/core` for workflow orchestration.
- Knowledge sources and content management surfaces.
- Product/ops overlays receiving issue-derived insights.
- Potential connector surfaces for ticketing or CRM systems.

## 12. Implementation Backlog

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

## 13. Risks and Mitigations

- Over-automation reducing empathy or nuance.
- Knowledge suggestions that appear confident while being stale or wrong.
- Escalation policies optimized for queue metrics rather than customer outcomes.
- Support insights staying trapped in the support team.

## 14. Definition of Done

A task in this repo is only complete when all of the following are true:

- The code, configuration, or skill behavior has been updated with clear intent.
- Tests, evals, replay cases, or validation artifacts were added or updated to protect the changed behavior.
- Documentation, runbooks, or decision records were updated when the behavior, contract, or operating model changed.
- The task produced a durable learning artifact rather than only a code diff.
- Cross-repo consequences were checked wherever this repo touches shared contracts, orchestration, or downstream users.

### Repo-specific completion requirements
- Any answer-supporting automation has evidence and confidence handling.
- QA and escalation consequences are reflected in playbooks or rubrics.
- Recurring issue learnings are routed to the right upstream owners.

## 15. Recommended Repo-Local Knowledge Layout

- `/docs/research/` for research briefs, benchmark notes, and upstream findings.
- `/docs/adrs/` for decision records and contract changes.
- `/docs/lessons/` for task-by-task learning artifacts and postmortems.
- `/evals/` for executable quality checks, golden cases, and regression suites.
- `/playbooks/` for operator runbooks, migration guides, and incident procedures.
