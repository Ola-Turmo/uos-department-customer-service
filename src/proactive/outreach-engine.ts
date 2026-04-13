/**
 * Proactive Outreach Engine
 * VAL-DEPT-CS-PROACTIVE: Reach out to customers before they contact support
 */

import type { CustomerProfile } from "../customer/customer-profile.js";
import type { SentimentResult } from "../types.js";

// ============================================
// Types
// ============================================

export type OutreachTrigger =
  | "product_update_impacting_account"
  | "planned_maintenance_window"
  | "first_invoice_pending"
  | "long_time_no_login"
  | "usage_drop_detected"
  | "new_kb_article_relevant"
  | "billing_change_imminent"
  | "churn_risk_detected"
  | "sla_breach_prevent";

export type OutreachChannel = "email" | "whatsapp" | "sms" | "in_app";

export interface OutreachTemplate {
  trigger: OutreachTrigger;
  channel: OutreachChannel;
  subject: string; // for email
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface OutreachMessage {
  id: string;
  customerId: string;
  trigger: OutreachTrigger;
  channel: OutreachChannel;
  subject?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  scheduledFor?: string;
  sentAt?: string;
  status: "draft" | "scheduled" | "sent" | "failed" | "suppressed";
  suppressReason?: string;
}

export interface OutreachTriggerEvent {
  trigger: OutreachTrigger;
  customerId: string;
  context: Record<string, unknown>; // trigger-specific data
  priority: "critical" | "high" | "medium" | "low";
  createdAt: string;
}

export interface OutreachScheduleParams {
  customerId: string;
  trigger: OutreachTrigger;
  channel: OutreachChannel;
  context: Record<string, unknown>;
  scheduledFor?: string; // ISO datetime, defaults to "now"
}

// ============================================
// Template Library
// ============================================

const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    trigger: "product_update_impacting_account",
    channel: "email",
    subject: "Quick heads-up about a recent change to {{feature}}",
    headline: "We updated {{feature}} — here's what changed",
    body: "Hi {{customerName}}, we recently made a change to {{feature}} that may affect how you use it. Our records show you're an active user, so we wanted to give you a heads-up. {{changeSummary}} If you run into any issues or have questions, our support team is here to help.",
    ctaLabel: "Talk to support",
  },
  {
    trigger: "planned_maintenance_window",
    channel: "email",
    subject: "Scheduled maintenance on {{date}}",
    headline: "Quick heads-up about scheduled maintenance",
    body: "Hi {{customerName}}, we'll be performing scheduled maintenance on {{date}} from {{startTime}} to {{endTime}} ({{timezone}}). During this time, some features may be temporarily unavailable. We apologize for any inconvenience and will have everything back up and running as quickly as possible.",
    ctaLabel: "Learn more",
  },
  {
    trigger: "first_invoice_pending",
    channel: "email",
    subject: "Your first invoice is about to be generated",
    headline: "Your first invoice is coming up",
    body: "Hi {{customerName}}, great to have you on board! Your first invoice for {{amount}} will be generated on {{date}}. This covers your {{planName}} subscription for {{billingPeriod}}. You can update your billing information at any time in your account settings.",
    ctaLabel: "Update billing info",
  },
  {
    trigger: "long_time_no_login",
    channel: "email",
    subject: "We miss you, {{customerName}}!",
    headline: "It's been a while — here's what's new",
    body: "Hi {{customerName}}, it's been {{daysSinceLogin}} days since you last logged in. We wanted to check in and let you know about some great new features we've added since your last visit: {{newFeatures}}. Jump back in and see what's new, or if there's anything we can help with, just reply to this email.",
    ctaLabel: "Log in now",
  },
  {
    trigger: "usage_drop_detected",
    channel: "email",
    subject: "We noticed a change in your usage",
    headline: "Everything okay, {{customerName}}?",
    body: "Hi {{customerName}}, we noticed your usage has dropped {{dropPercent}}% over the last 30 days compared to your usual activity. This sometimes happens when something isn't working as expected, or priorities shift. We want to make sure you're getting the most out of {{productName}}. Is there anything we can help with?",
    ctaLabel: "Get help",
  },
  {
    trigger: "new_kb_article_relevant",
    channel: "email",
    subject: "New help article: {{articleTitle}}",
    headline: "New: {{articleTitle}}",
    body: "Hi {{customerName}}, we just published a new help article that we think you'll find useful based on your recent activity: '{{articleTitle}}'. It covers {{articleSummary}}. You can read it at any time — we hope it helps!",
    ctaLabel: "Read the article",
  },
  {
    trigger: "billing_change_imminent",
    channel: "email",
    subject: "Your billing is changing on {{date}}",
    headline: "Upcoming change to your invoice",
    body: "Hi {{customerName}}, this is a notice that your subscription will be changing on {{date}}. The new amount will be {{newAmount}} (previously {{oldAmount}}). This is due to {{reason}}. If you have questions or want to adjust your plan, we're happy to help.",
    ctaLabel: "Review options",
  },
  {
    trigger: "churn_risk_detected",
    channel: "email",
    subject: "We value you, {{customerName}}",
    headline: "Let's make things right",
    body: "Hi {{customerName}}, we know things haven't been perfect lately, and we want to do better. We've flagged your account for a personal follow-up from our customer success team. Someone will be in touch within the next 24 hours. In the meantime, if there's anything urgent, please don't hesitate to reach out directly.",
    ctaLabel: "Talk to us now",
  },
  {
    trigger: "sla_breach_prevent",
    channel: "whatsapp",
    subject: "", // not used for WhatsApp
    headline: "Quick update on your support ticket",
    body: "Hi {{customerName}}, we noticed your support ticket has been open for a while and we didn't want you to feel forgotten. Our team is actively working on it and you should hear back within the next {{expectedResponseTime}}. Thanks for your patience!",
    ctaLabel: "Reply here",
  },
];

// ============================================
// Helper
// ============================================

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// ============================================
// Engine
// ============================================

export class ProactiveOutreachEngine {
  private scheduledMessages: Map<string, OutreachMessage> = new Map();
  private suppressionLog: Map<string, string> = new Map(); // customerId → reason
  private recentContacts: Map<string, string> = new Map(); // customerId → ISO datetime of last contact

  /**
   * Schedule a proactive outreach message
   */
  schedule(params: OutreachScheduleParams): OutreachMessage {
    const { customerId, trigger, channel, context, scheduledFor } = params;

    // Check suppression
    const suppression = this.shouldSuppress(customerId, trigger);
    if (suppression.suppressed) {
      const message: OutreachMessage = {
        id: generateId("outreach"),
        customerId,
        trigger,
        channel,
        subject: "",
        headline: "",
        body: "",
        status: "suppressed",
        suppressReason: suppression.reason,
      };
      return message;
    }

    // Find matching template
    const template = OUTREACH_TEMPLATES.find(
      (t) => t.trigger === trigger && t.channel === channel
    );

    if (!template) {
      const message: OutreachMessage = {
        id: generateId("outreach"),
        customerId,
        trigger,
        channel,
        subject: "",
        headline: "",
        body: "",
        status: "failed",
      };
      return message;
    }

    // Get customer for rendering (we need customerId to look up)
    // For now, render with placeholders - caller should pass customer profile
    const customer: CustomerProfile = context.customer as CustomerProfile;
    const rendered = this.renderTemplate(template, customer, context);

    const now = new Date().toISOString();
    const message: OutreachMessage = {
      id: generateId("outreach"),
      customerId,
      trigger,
      channel,
      subject: rendered.subject,
      headline: rendered.headline,
      body: rendered.body,
      ctaLabel: rendered.ctaLabel,
      ctaUrl: template.ctaUrl,
      scheduledFor: scheduledFor ?? now,
      status: scheduledFor && new Date(scheduledFor) > new Date() ? "scheduled" : "draft",
    };

    this.scheduledMessages.set(message.id, message);
    return message;
  }

  /**
   * Check if a customer should be suppressed from outreach
   * (e.g., recently contacted, opted out, in blackout period)
   */
  shouldSuppress(customerId: string, trigger: OutreachTrigger): { suppressed: boolean; reason?: string } {
    // Check suppression log
    const suppressReason = this.suppressionLog.get(customerId);
    if (suppressReason) {
      return { suppressed: true, reason: suppressReason };
    }

    // Check if customer messaged in last 24h
    const lastContact = this.recentContacts.get(customerId);
    if (lastContact) {
      const lastContactDate = new Date(lastContact);
      const now = new Date();
      const hoursSinceContact = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceContact < 24) {
        return { suppressed: true, reason: "Customer contacted support within last 24 hours" };
      }
    }

    // Check if there's already pending outreach for this trigger
    for (const msg of this.scheduledMessages.values()) {
      if (msg.customerId === customerId && msg.trigger === trigger && msg.status === "scheduled") {
        return { suppressed: true, reason: `Pending outreach for trigger '${trigger}' already exists` };
      }
    }

    return { suppressed: false };
  }

  /**
   * Render a template with customer context
   */
  private renderTemplate(
    template: OutreachTemplate,
    customer: CustomerProfile,
    context: Record<string, unknown>
  ): { subject: string; headline: string; body: string; ctaLabel?: string } {
    const now = new Date();

    // Build placeholder values from customer profile
    const placeholders: Record<string, string> = {
      customerName: customer.displayName,
      email: customer.email,
      planTier: customer.accountTier,
      accountTenureDays: String(
        Math.floor((now.getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      ),
      companyName: customer.companyName ?? "",
      // Include context overrides
      ...Object.fromEntries(
        Object.entries(context).map(([k, v]) => [k, String(v)])
      ),
    };

    // Interpolate {{placeholders}} in text
    const interpolate = (text: string): string =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => placeholders[key] ?? `{{${key}}}`);

    return {
      subject: interpolate(template.subject),
      headline: interpolate(template.headline),
      body: interpolate(template.body),
      ctaLabel: template.ctaLabel,
    };
  }

  /**
   * Get all scheduled messages for a customer
   */
  getScheduledMessages(customerId: string): OutreachMessage[] {
    return Array.from(this.scheduledMessages.values()).filter(
      (msg) => msg.customerId === customerId && msg.status === "scheduled"
    );
  }

  /**
   * Cancel a scheduled message
   */
  cancelScheduled(messageId: string): boolean {
    const message = this.scheduledMessages.get(messageId);
    if (!message || message.status !== "scheduled") {
      return false;
    }
    message.status = "failed";
    this.scheduledMessages.set(messageId, message);
    return true;
  }

  /**
   * Get suppression log
   */
  getSuppressionLog(customerId: string): string | undefined {
    return this.suppressionLog.get(customerId);
  }

  /**
   * Get all active triggers that should be checked for a customer
   */
  getActiveTriggersForCustomer(
    customer: CustomerProfile
  ): Array<{ trigger: OutreachTrigger; reason: string }> {
    const triggers: Array<{ trigger: OutreachTrigger; reason: string }> = [];

    // Churn risk detected
    if (customer.health.churnRisk === "critical" || customer.health.churnRisk === "high") {
      triggers.push({
        trigger: "churn_risk_detected",
        reason: `Customer has ${customer.health.churnRisk} churn risk`,
      });
    }

    // Long time no login
    if (customer.usage.daysSinceLastActive > 14) {
      triggers.push({
        trigger: "long_time_no_login",
        reason: `No login for ${customer.usage.daysSinceLastActive} days`,
      });
    }

    // Usage drop detected
    if (customer.usage.inactiveWarning) {
      triggers.push({
        trigger: "usage_drop_detected",
        reason: "Usage inactive warning triggered",
      });
    }

    // First invoice pending (new accounts)
    if (customer.billing.accountAgeDays <= 30 && !customer.billing.lastInvoiceAt) {
      triggers.push({
        trigger: "first_invoice_pending",
        reason: "New account approaching first invoice",
      });
    }

    // Billing change imminent (if nextInvoiceAt is within 7 days)
    if (customer.billing.nextInvoiceAt) {
      const nextInvoice = new Date(customer.billing.nextInvoiceAt);
      const daysToInvoice = Math.floor(
        (nextInvoice.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysToInvoice > 0 && daysToInvoice <= 7) {
        triggers.push({
          trigger: "billing_change_imminent",
          reason: `Next invoice in ${daysToInvoice} days`,
        });
      }
    }

    // Proactive outreach recommended from customer profile synthesis
    if (customer.requiresProactiveOutreach) {
      triggers.push({
        trigger: "churn_risk_detected",
        reason: "Customer flagged for proactive outreach",
      });
    }

    return triggers;
  }

  /**
   * Auto-detect triggers from customer profile changes
   */
  detectTriggers(
    customer: CustomerProfile,
    previousCustomer?: CustomerProfile
  ): OutreachTriggerEvent[] {
    const events: OutreachTriggerEvent[] = [];
    const now = new Date().toISOString();

    if (!previousCustomer) {
      // New customer - check for initial triggers
      const triggers = this.getActiveTriggersForCustomer(customer);
      for (const t of triggers) {
        events.push({
          trigger: t.trigger,
          customerId: customer.customerId,
          context: { reason: t.reason },
          priority: this.getTriggerPriority(t.trigger),
          createdAt: now,
        });
      }
      return events;
    }

    // Compare previous and current customer states
    // Usage drop detection
    if (
      customer.usage.daysSinceLastActive > 14 &&
      previousCustomer.usage.daysSinceLastActive <= 14
    ) {
      events.push({
        trigger: "long_time_no_login",
        customerId: customer.customerId,
        context: { daysSinceLogin: customer.usage.daysSinceLastActive },
        priority: "medium",
        createdAt: now,
      });
    }

    // Churn risk change
    const churnRiskLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    if (
      churnRiskLevels[customer.health.churnRisk] > churnRiskLevels[previousCustomer.health.churnRisk]
    ) {
      events.push({
        trigger: "churn_risk_detected",
        customerId: customer.customerId,
        context: {
          previousRisk: previousCustomer.health.churnRisk,
          currentRisk: customer.health.churnRisk,
          churnScore: customer.health.churnScore,
        },
        priority: customer.health.churnRisk === "critical" ? "critical" : "high",
        createdAt: now,
      });
    }

    // Usage drop (if we have previous weeklyActiveHours data)
    const prevWeeklyHours = previousCustomer.usage.weeklyActiveHours;
    const currWeeklyHours = customer.usage.weeklyActiveHours;
    if (
      prevWeeklyHours !== undefined &&
      currWeeklyHours !== undefined &&
      prevWeeklyHours > 0 &&
      currWeeklyHours < prevWeeklyHours * 0.7
    ) {
      const dropPercent = Math.round((1 - currWeeklyHours / prevWeeklyHours) * 100);
      events.push({
        trigger: "usage_drop_detected",
        customerId: customer.customerId,
        context: {
          dropPercent,
          previousHours: prevWeeklyHours,
          currentHours: currWeeklyHours,
        },
        priority: dropPercent > 50 ? "high" : "medium",
        createdAt: now,
      });
    }

    // Health score significant drop
    if (customer.health.healthScore < previousCustomer.health.healthScore - 20) {
      events.push({
        trigger: "churn_risk_detected",
        customerId: customer.customerId,
        context: {
          previousHealthScore: previousCustomer.health.healthScore,
          currentHealthScore: customer.health.healthScore,
        },
        priority: customer.health.healthScore < 30 ? "critical" : "high",
        createdAt: now,
      });
    }

    return events;
  }

  /**
   * Get priority for a trigger type
   */
  private getTriggerPriority(trigger: OutreachTrigger): "critical" | "high" | "medium" | "low" {
    switch (trigger) {
      case "churn_risk_detected":
      case "sla_breach_prevent":
        return "critical";
      case "billing_change_imminent":
      case "usage_drop_detected":
        return "high";
      case "product_update_impacting_account":
      case "planned_maintenance_window":
        return "medium";
      default:
        return "low";
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const proactiveOutreachEngine = new ProactiveOutreachEngine();
