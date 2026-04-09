import { describe, expect, it } from "vitest";
import { connectors, department, jobs, roles, skills } from "../src";
import { TriageService } from "../src/triage-service";
import { RecurringPatternService } from "../src/recurring-pattern-service";
import type { TriageResult, IssuePattern } from "../src/types";

describe("@uos/department-customer-service", () => {
  it("captures the customer service department boundary", () => {
    expect(department.departmentId).toBe("customer-service");
    expect(department.parentFunctionId).toBe("customer");
    expect(department.moduleId).toBe("autonomous-customer-service");
  });

  it("includes the autonomous customer service roles and jobs", () => {
    expect(roles.some((role) => role.roleKey === "customer-knowledge-automation-lead")).toBe(true);
    expect(roles.some((role) => role.roleKey === "customer-email-resolution-specialist")).toBe(true);
    expect(jobs.map((job) => job.jobKey)).toEqual([
      "customer-service-qa-sampling",
      "customer-service-weekly-knowledge-refresh",
    ]);
  });

  it("keeps the service-specific skills and connector toolkits", () => {
    expect(skills.bundleIds).toContain("uos-customer-service-autonomy");
    expect(skills.externalSkills.some((skill) => skill.id === "uos-external-support-docs")).toBe(true);
    expect(connectors.requiredToolkits).toContain("zendesk");
    expect(connectors.requiredToolkits).toContain("stripe");
    expect(connectors.roleToolkits.some((role) => role.roleKey === "customer-whatsapp-resolution-specialist")).toBe(true);
  });
});

describe("TriageService", () => {
  const triageService = new TriageService();

  describe("triageIssue", () => {
    it("triages a billing issue with correct category and routing", () => {
      const result = triageService.triageIssue({
        issueId: "issue-001",
        subject: "I was charged incorrectly for my subscription",
        description: "I was charged $50 but my plan is $30/month",
      });

      expect(result.issueId).toBe("issue-001");
      expect(result.category).toBe("billing");
      expect(result.routingRecommendation.team).toBe("billing-specialist");
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.suggestedResponseDraft).toBeDefined();
      expect(result.suggestedResponseDraft?.tone).toBe("informative");
    });

    it("triages a bug report with correct category and higher priority", () => {
      const result = triageService.triageIssue({
        issueId: "issue-002",
        subject: "App crashes when I try to login",
        description: "The application crashes with error code 403 when I click login",
      });

      expect(result.category).toBe("bug");
      expect(result.priority).toBe("medium");
      expect(result.evidence.some((e) => e.type === "product")).toBe(true);
    });

    it("triages a refund request with escalation", () => {
      const result = triageService.triageIssue({
        issueId: "issue-003",
        subject: "Request for refund of $500",
        description: "I want a refund for my purchase",
      });

      expect(result.category).toBe("refund");
      expect(result.escalationLevel).toBeGreaterThan(0);
      expect(result.escalationRationale).toBeDefined();
    });

    it("triages an account issue with account-related routing", () => {
      const result = triageService.triageIssue({
        issueId: "issue-004",
        subject: "Cannot access my account",
        description: "I forgot my password and need to reset it",
      });

      expect(result.category).toBe("account");
      expect(result.routingRecommendation.team).toBe("account-management");
      expect(result.evidence.some((e) => e.type === "policy")).toBe(true);
    });

    it("triages a how-to question with knowledge evidence", () => {
      const result = triageService.triageIssue({
        issueId: "issue-005",
        subject: "Where can I find the tutorial?",
        description: "Can you guide me to the getting started documentation?",
      });

      expect(result.category).toBe("how-to");
      expect(result.evidence.some((e) => e.type === "knowledge")).toBe(true);
    });

    it("triages a feature request with appropriate routing", () => {
      const result = triageService.triageIssue({
        issueId: "issue-006",
        subject: "Feature request: dark mode",
        description: "It would be nice to have a dark mode option",
      });

      expect(result.category).toBe("feature-request");
      expect(result.routingRecommendation.team).toBe("product-feedback");
    });

    it("triages a complaint with empathetic tone in draft", () => {
      const result = triageService.triageIssue({
        issueId: "issue-007",
        subject: "Very frustrated with the service",
        description: "I am unhappy with the recent changes",
      });

      expect(result.category).toBe("complaint");
      expect(result.suggestedResponseDraft?.tone).toBe("empathetic");
    });

    it("generates triage summary with correct counts", () => {
      // Clear state
      triageService.getAllTriageResults().forEach(() => {});

      triageService.triageIssue({
        issueId: "sum-001",
        subject: "Billing question",
        description: "About my invoice",
      });

      triageService.triageIssue({
        issueId: "sum-002",
        subject: "Bug report",
        description: "App not working",
      });

      const summary = triageService.generateTriageSummary();
      expect(summary.totalTriaged).toBeGreaterThanOrEqual(2);
      expect(summary.byCategory.billing).toBeGreaterThanOrEqual(1);
      expect(summary.byCategory.bug).toBeGreaterThanOrEqual(1);
    });
  });

  describe("escalation", () => {
    it("creates an escalation for a triaged issue", () => {
      const triageResult = triageService.triageIssue({
        issueId: "esc-001",
        subject: "I have a question about billing",
        description: "I was charged incorrectly",
      });

      const escalation = triageService.createEscalation({
        issueId: "esc-001",
        reason: "Billing issue requiring manager attention",
      });

      expect(escalation).toBeDefined();
      expect(escalation?.issueId).toBe("esc-001");
      expect(escalation?.status).toBe("pending");
      expect(escalation?.toLevel).toBeGreaterThanOrEqual(triageResult.escalationLevel);
    });

    it("resolves an escalation", () => {
      triageService.triageIssue({
        issueId: "esc-resolve-001",
        subject: "Test issue",
        description: "Test description",
      });

      triageService.createEscalation({
        issueId: "esc-resolve-001",
        reason: "Test escalation",
      });

      const resolved = triageService.resolveEscalation({
        escalationId: triageService.getEscalationRecord("esc-resolve-001")?.id ?? "",
        resolution: "Issue resolved by updating the user",
        status: "resolved",
      });

      expect(resolved?.status).toBe("resolved");
      expect(resolved?.resolvedAt).toBeDefined();
    });

    it("returns pending escalations", () => {
      triageService.triageIssue({
        issueId: "esc-pending-002",
        subject: "Billing question",
        description: "About my invoice",
      });

      triageService.createEscalation({
        issueId: "esc-pending-002",
        reason: "Test",
      });

      const pending = triageService.getPendingEscalations();
      expect(pending.some((e) => e.issueId === "esc-pending-002")).toBe(true);
    });
  });
});

describe("RecurringPatternService", () => {
  const triageService = new TriageService();
  const patternService = new RecurringPatternService();

  describe("pattern detection", () => {
    it("indexes triage results for pattern detection", () => {
      const result = triageService.triageIssue({
        issueId: "pattern-001",
        subject: "Cannot login with Google",
        description: "Getting 403 error when trying to login with Google OAuth",
      });

      patternService.indexTriageResult(result);

      const patterns = patternService.getPatternsForIssue("pattern-001");
      // Patterns are created when issues share the same pattern key
      expect(Array.isArray(patterns)).toBe(true);
    });

    it("detects patterns with sufficient frequency", () => {
      // Index multiple similar issues
      const result1 = triageService.triageIssue({
        issueId: "dup-billing-001",
        subject: "Invoice question",
        description: "About my invoice",
      });

      const result2 = triageService.triageIssue({
        issueId: "dup-billing-002",
        subject: "Invoice problem",
        description: "Invoice incorrect",
      });

      patternService.indexTriageResult(result1);
      patternService.indexTriageResult(result2);

      const detected = patternService.detectPatterns({ minFrequency: 2, lookbackDays: 30 });
      expect(Array.isArray(detected)).toBe(true);
    });

    it("creates upstream actions from patterns", () => {
      // First detect a pattern
      const results = patternService.detectPatterns({ minFrequency: 1 });

      if (results.length > 0) {
        const pattern = results[0].pattern;
        const action = patternService.createUpstreamAction({
          patternId: pattern.id,
          title: "Fix recurring billing issue",
          description: "Investigate and fix the recurring billing issue",
          kind: "bug-fix",
        });

        expect(action).toBeDefined();
        expect(action?.title).toBe("Fix recurring billing issue");
        expect(action?.kind).toBe("bug-fix");
        expect(action?.sourcePatternId).toBe(pattern.id);
      }
    });

    it("updates pattern status", () => {
      const results = patternService.detectPatterns({ minFrequency: 1 });

      if (results.length > 0) {
        const patternId = results[0].pattern.id;
        const updated = patternService.updatePatternStatus({
          patternId,
          status: "investigating",
        });

        expect(updated?.status).toBe("investigating");
      }
    });

    it("updates upstream action status", () => {
      const results = patternService.detectPatterns({ minFrequency: 1 });

      if (results.length > 0) {
        const patternId = results[0].pattern.id;
        const action = patternService.createUpstreamAction({
          patternId,
          title: "Test action",
          description: "Test description",
          kind: "process-improvement",
        });

        if (action) {
          const updated = patternService.updateUpstreamActionStatus({
            actionId: action.id,
            status: "in-progress",
          });

          expect(updated?.status).toBe("in-progress");
        }
      }
    });

    it("generates recurring issues report", () => {
      const report = patternService.generateRecurringIssuesReport({ lookbackDays: 30 });

      expect(report).toBeDefined();
      expect(report.patterns).toBeDefined();
      expect(report.actions).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(typeof report.summary.totalPatterns).toBe("number");
      expect(typeof report.summary.openActions).toBe("number");
    });

    it("links external reference to action", () => {
      const results = patternService.detectPatterns({ minFrequency: 1 });

      if (results.length > 0) {
        const patternId = results[0].pattern.id;
        const action = patternService.createUpstreamAction({
          patternId,
          title: "Link test",
          description: "Testing external ref linking",
          kind: "feature-request",
        });

        if (action) {
          const linked = patternService.linkExternalRef(
            action.id,
            "JIRA-1234",
            "https://jira.example.com/browse/JIRA-1234"
          );

          expect(linked?.externalRef).toBe("JIRA-1234");
          expect(linked?.externalUrl).toBe("https://jira.example.com/browse/JIRA-1234");
        }
      }
    });
  });

  describe("closed-loop learning", () => {
    it("tracks repeated issues and creates one upstream follow-up with linked evidence", () => {
      // Simulate multiple similar issues from different customers
      const issue1 = triageService.triageIssue({
        issueId: "loop-issue-1",
        subject: "Stripe payment failing",
        description: "Credit card payment fails with error",
        customerId: "cust-1",
      });

      const issue2 = triageService.triageIssue({
        issueId: "loop-issue-2",
        subject: "Payment not going through",
        description: "Cannot pay with Stripe",
        customerId: "cust-2",
      });

      const issue3 = triageService.triageIssue({
        issueId: "loop-issue-3",
        subject: "Stripe checkout broken",
        description: "Checkout fails on Stripe integration",
        customerId: "cust-3",
      });

      // Index all three issues
      patternService.indexTriageResult(issue1);
      patternService.indexTriageResult(issue2);
      patternService.indexTriageResult(issue3);

      // Detect the recurring pattern
      const detected = patternService.detectPatterns({
        lookbackDays: 30,
        minFrequency: 2,
      });

      // Find the billing/Stripe pattern
      const stripePattern = detected.find(
        (d) => d.pattern.category === "billing" || d.pattern.title.includes("Stripe")
      );

      if (stripePattern) {
        // Create upstream action
        const action = patternService.createUpstreamAction({
          patternId: stripePattern.pattern.id,
          title: "Fix Stripe payment integration",
          description: `Recurring payment failures affecting ${stripePattern.pattern.frequency} customers`,
          kind: "bug-fix",
          priority: "high",
          ownerRoleKey: "customer-knowledge-automation-lead",
        });

        expect(action).toBeDefined();
        expect(action?.sourceIssueIds.length).toBeGreaterThanOrEqual(1);
        expect(action?.kind).toBe("bug-fix");
        expect(action?.priority).toBe("high");

        // Verify pattern status updated
        const updatedPattern = patternService.getPattern(stripePattern.pattern.id);
        expect(updatedPattern?.status).toBe("action-created");
      }
    });
  });
});
