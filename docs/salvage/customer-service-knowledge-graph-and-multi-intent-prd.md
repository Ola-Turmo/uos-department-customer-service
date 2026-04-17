# PRD: Customer Service Knowledge Graph And Multi-Intent Triage

## Summary

Extend `uos-department-customer-service` with a first-class issue knowledge
graph and multi-intent ticket decomposition layer.

This PRD salvages the most valuable net-new functionality observed in the
archived repo `uos-department-customer-service-ai-native-cust`, specifically:

- `src/knowledge/graph.ts`
- `src/knowledge/autolink.ts`
- `src/knowledge/similarity.ts`
- `src/knowledge/suggestions.ts`
- `src/triage/multi-intent-detector.ts`

The live repo already has RAG retrieval, similar-ticket retrieval, triage, and
response drafting. What it does not clearly own yet is graph-native knowledge
modeling and explicit decomposition of a single support message into multiple
separable intents.

## Problem

The live customer-service system can retrieve knowledge and similar tickets, but
it still appears to treat most tickets as single-issue requests flowing through
a mostly linear pipeline.

That creates three problems:

1. One message with two or three issues can be triaged incorrectly as a single
   intent.
2. The system can retrieve similar tickets, but it lacks a durable graph of
   relationships between issue type, policy, affected system, customer segment,
   and prior resolution patterns.
3. Knowledge healing remains retrieval-centric instead of structure-centric,
   making it harder to explain why a recommendation was made and what related
   concepts were considered.

## Users

- Support agents handling mixed-intent tickets
- QA reviewers auditing triage quality
- Knowledge owners maintaining support documentation
- Product and ops teams looking for structured recurring issue patterns

## Goals

- Detect when a single inbound message contains multiple support intents
- Split multi-intent tickets into structured sub-intent outputs
- Build a reusable support knowledge graph across issues, resolutions, policies,
  customers, systems, and documents
- Improve retrieval precision by combining graph relationships with existing RAG
- Surface graph-backed suggestions for agents and autonomous resolution

## Non-Goals

- Replacing the existing RAG stack
- Shipping a distributed graph database in v1
- Performing fully automated sub-ticket creation for all tenants without
  operator review controls

## Product Requirements

### 1. Multi-Intent Detection

The system must:

- detect likely multi-intent inbound messages
- return normalized sub-intent spans
- assign confidence per detected sub-intent
- allow routing policy to keep a ticket unified or split it into linked
  sub-cases

Minimum output:

- `isMultiIntent`
- `subIntents[]`
- `confidence`
- `recommendedHandlingMode`: `single_case | linked_subcases | human_review`

### 2. Knowledge Graph Core

The system must maintain a typed support knowledge graph with nodes such as:

- issue type
- product area
- policy
- connector / system
- customer segment
- ticket
- resolution playbook
- knowledge article

Supported graph operations:

- add node
- add edge
- remove node
- query related nodes
- keyword search
- retrieve graph statistics

### 3. Graph-Augmented Suggestion Layer

When triaging or drafting a response, the system should:

- pull related graph nodes for the current issue
- use prior linked resolutions as evidence
- suggest relevant policies and docs
- explain which graph relationships drove the recommendation

### 4. Knowledge Healing

The system should detect weakly connected or frequently referenced unresolved
areas in the graph and emit healing suggestions:

- missing article
- outdated policy reference
- recurring issue without canonical playbook
- disconnected cluster that should be linked

## UX / Operator Surface

The plugin UI should add:

- a multi-intent triage panel showing detected sub-intents
- a graph evidence panel showing related issues, docs, and policies
- a knowledge-healing queue ordered by support impact

## Success Metrics

- Multi-intent detection precision >= 0.90 on benchmark tickets
- Triage misrouting on mixed-intent tickets reduced by >= 40%
- Suggested evidence acceptance rate >= 60%
- Recurring issue to canonical playbook creation time reduced by >= 50%

## Delivery Phases

### Phase 1

- implement multi-intent detector
- add graph schema and in-memory graph service
- augment triage output with multi-intent fields

### Phase 2

- integrate graph-backed evidence into response drafting and QA
- add operator UI panels
- add graph healing suggestions

### Phase 3

- link graph updates to recurring-pattern and upstream feedback loops
- add tenant persistence and background maintenance jobs

## Why This Is Worth Salvaging

The archived repo contains small but focused functionality that is not just
another copy of the live customer-service overlay. It introduces a structural
improvement to how support demand is represented and reasoned about.

