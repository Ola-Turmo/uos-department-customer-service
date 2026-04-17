# PRD: Customer Service Omnichannel Autonomy, Learning, And KPI Control

## Summary

Extend `uos-department-customer-service` with an omnichannel autonomous
operations layer, explicit learning loops, and customer-service-specific
autonomy KPIs.

This PRD salvages the highest-value capabilities from the archived repo
`uos-department-customer-service-maximally-autonomous`, especially:

- channel adapters under `src/adapters/*`
- autonomous handoff and graduation logic
- ARR tracking
- CSAT prediction and correlation analysis
- RLHF-style feedback collection
- conversation memory and ticket logging services
- heartbeat workers and upstream task emission

The live repo already supports triage, churn scoring, predictive escalation,
proactive outreach, SLA logic, QA, and response drafting. The archived repo adds
the execution and learning scaffolding needed to operate that system as a more
complete autonomous service department.

## Problem

The live repo is strong on decision support and domain logic, but weaker on
three dimensions that matter for real autonomous operation:

1. Omnichannel execution
   The live surface does not clearly expose a unified adapter layer for Zendesk,
   Intercom, Gmail, WhatsApp, HubSpot, Shopify, and Stripe.

2. Closed-loop learning
   The live repo has feedback and QA components, but not a clearly defined
   RLHF-style loop that converts human corrections and outcomes into updated
   preference weights and autonomous behavior tuning.

3. Autonomy-specific measurement
   Standard support metrics exist conceptually, but the archived repo adds an
   explicit `ARR` model, predicted CSAT, threshold auto-adjustment, and
   ticket-level memory needed to manage autonomy quality over time.

## Users

- Support operations leads running multi-channel support
- Founders or operators trying to increase autonomous resolution safely
- QA reviewers and policy owners tuning guardrails
- Product and finance stakeholders consuming upstream issue flow

## Goals

- unify inbound and outbound support execution across core channels
- add safe autonomous progression and human-review graduation gates
- capture human feedback and outcome signals as learning inputs
- monitor autonomy quality with dedicated KPIs, not just generic support KPIs
- route upstream product, billing, or ops follow-up tasks automatically

## Non-Goals

- Becoming a full CRM
- Replacing external source systems of record
- Deploying unrestricted autonomy without policy and confidence gates

## Product Requirements

### 1. Omnichannel Adapter Layer

The system must provide a normalized adapter surface for at least:

- Zendesk
- Intercom
- Gmail
- WhatsApp
- HubSpot
- Shopify
- Stripe

Adapter responsibilities:

- fetch inbound work
- normalize message / ticket / customer structures
- execute allowed outbound actions
- emit audit-ready action records

### 2. Autonomy Graduation And Handoff

The system must support:

- confidence-based autonomous execution
- automatic graduation from draft-only to action-taking per workflow
- cross-department handoff protocols for finance, product, and ops
- explicit escalation reasons and evidence bundles

### 3. Customer Service Autonomy Metrics

The system must add:

- `ARR` = Autonomous Resolution Rate
- predicted CSAT before resolution
- realized CSAT after feedback
- false escalation rate
- policy violation rate
- autonomous save / refund / outreach outcome metrics

### 4. RLHF-Style Feedback Loop

The system must collect:

- thumbs up / thumbs down
- ratings
- free-text corrections
- operator overrides

The system must translate those into:

- reward signals
- policy-weight updates
- workflow-level improvement suggestions

### 5. Conversation Memory And Logging

The system must maintain lightweight conversation memory and ticket-level audit
logs so autonomous behavior is explainable across sessions and channels.

### 6. Heartbeat And Upstream Tasks

The system should support scheduled heartbeat workers that:

- poll configured channels
- enqueue unresolved work
- emit upstream tasks to product, billing, or operations when a support issue
  exposes a broader root cause

## UX / Operator Surface

The plugin UI should add:

- channel health and queue visibility
- ARR and predicted CSAT dashboards
- autonomy-threshold tuning controls
- review queues for corrections and training candidates
- upstream issue emission history

## Success Metrics

- ARR improves without degrading CSAT
- false escalation rate decreases over time
- operator correction frequency declines on repeated issue classes
- upstream issues generated from support produce measurable product or policy
  fixes
- channel coverage reaches the configured connector set with stable polling and
  audit trails

## Delivery Phases

### Phase 1

- add adapter contracts and first-party connectors
- implement ARR tracker and predicted CSAT service
- add autonomy review dashboard

### Phase 2

- implement RLHF-style feedback collection and reward signal generation
- add cross-department handoff flows
- add conversation memory and ticket logging

### Phase 3

- introduce threshold auto-adjustment with guardrails
- add heartbeat workers and upstream task fan-out
- tune operator controls and reporting

## Why This Is Worth Salvaging

This archived repo is not merely a rename of the live one. It contains the
missing operational shell that turns a smart support overlay into a measurable,
multi-channel autonomous department.

