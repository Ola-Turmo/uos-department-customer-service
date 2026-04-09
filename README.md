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
