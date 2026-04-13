/**
 * Proactive Outreach Engine
 * Handles trigger logic and message templates for proactive customer outreach
 */

import { CustomerProfile, ChannelMessage, TriageResult } from '../types.js';

export type ChurnRisk = 'critical' | 'high' | 'medium' | 'low';

export interface OutreachDecision {
  shouldOutreach: boolean;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedChannel: 'email' | 'chat' | 'whatsapp' | 'phone';
}

export interface TouchpointTemplate {
  subject: string;
  body: string;
  tone: 'empathetic' | 'supportive' | 'urgent' | 'appreciation';
  maxRetries: number;
}

/**
 * OutreachEngine determines when and how to proactively reach out to customers
 * based on their profile, sentiment, and churn risk signals.
 */
export default class OutreachEngine {
  /**
   * Determines whether proactive outreach should be initiated for a customer.
   * 
   * @param profile - The customer profile to evaluate
   * @returns OutreachDecision with shouldOutreach flag and reasoning
   */
  shouldOutreach(profile: CustomerProfile): OutreachDecision {
    const { churnRisk, sentimentTrajectory, recentEscalations, openTickets } = profile;

    // Critical churn risk always warrants outreach
    if (churnRisk === 'critical') {
      return {
        shouldOutreach: true,
        reason: 'Customer has critical churn risk - immediate retention action required',
        priority: 'critical',
        recommendedChannel: this.getPreferredChannel(profile),
      };
    }

    // High churn risk with declining sentiment is high priority
    if (churnRisk === 'high') {
      if (sentimentTrajectory === 'declining') {
        return {
          shouldOutreach: true,
          reason: 'High churn risk combined with declining sentiment trajectory',
          priority: 'high',
          recommendedChannel: this.getPreferredChannel(profile),
        };
      }
      return {
        shouldOutreach: true,
        reason: 'High churn risk detected - proactive retention recommended',
        priority: 'high',
        recommendedChannel: this.getPreferredChannel(profile),
      };
    }

    // Medium churn risk with negative signals warrants outreach
    if (churnRisk === 'medium') {
      if (sentimentTrajectory === 'declining' || recentEscalations > 0) {
        return {
          shouldOutreach: true,
          reason: 'Medium churn risk with negative indicators detected',
          priority: 'medium',
          recommendedChannel: this.getPreferredChannel(profile),
        };
      }
    }

    // Multiple recent escalations indicate engagement issues
    if (recentEscalations >= 2) {
      return {
        shouldOutreach: true,
        reason: `Customer has ${recentEscalations} recent escalations - engagement follow-up needed`,
        priority: openTickets > 0 ? 'high' : 'medium',
        recommendedChannel: this.getPreferredChannel(profile),
      };
    }

    // Multiple open tickets may indicate unresolved issues
    if (openTickets >= 3) {
      return {
        shouldOutreach: true,
        reason: `Customer has ${openTickets} open tickets - resolution follow-up recommended`,
        priority: 'medium',
        recommendedChannel: this.getPreferredChannel(profile),
      };
    }

    return {
      shouldOutreach: false,
      reason: 'No significant churn risk or negative signals detected',
      priority: 'low',
      recommendedChannel: this.getPreferredChannel(profile),
    };
  }

  /**
   * Generates a personalized outreach message for a customer.
   * 
   * @param profile - The customer profile
   * @param reason - The reason for outreach (from shouldOutreach decision)
   * @returns ChannelMessage ready to be sent
   */
  generateOutreachMessage(profile: CustomerProfile, reason: string): ChannelMessage {
    const template = this.get触点Template(profile.churnRisk);
    const personalizedBody = this.personalizeMessage(template.body, profile);
    
    return {
      channel: this.getPreferredChannel(profile),
      messageId: `outreach-${profile.customerId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      content: this.formatMessage(personalizedBody, template.subject, profile),
      direction: 'outbound',
    };
  }

  /**
   * Gets the appropriate touchpoint template based on churn risk level.
   * "触点" means "touchpoint" in Chinese.
   * 
   * @param churnRisk - The customer's churn risk level
   * @returns TouchpointTemplate with subject, body, tone, and retry settings
   */
  get触点Template(churnRisk: ChurnRisk): TouchpointTemplate {
    const templates: Record<ChurnRisk, TouchpointTemplate> = {
      critical: {
        subject: 'Immediate Action Needed: We Value Your Business',
        body: `Dear {{customerName}},

We noticed you may be experiencing some challenges with our service, and we want to make sure we've done everything possible to help.

Your satisfaction is our top priority, and we'd like to personally connect with you to understand any concerns and find a solution that works for you.

Can we schedule a brief call or chat today? We're committed to making this right.

Best regards,
Your Dedicated Support Team`,
        tone: 'urgent',
        maxRetries: 5,
      },
      high: {
        subject: 'We\'d Love to Hear From You',
        body: `Dear {{customerName}},

We value your partnership and want to ensure you're getting the most out of our services.

Our records show you may have some unresolved concerns, and we'd like to offer our assistance. Your success is important to us, and we're here to help.

Would you have a few minutes to chat? We're always happy to listen and find ways to better serve you.

Warm regards,
Your Support Team`,
        tone: 'empathetic',
        maxRetries: 3,
      },
      medium: {
        subject: 'Checking In - How Can We Help?',
        body: `Dear {{customerName}},

We hope this message finds you well. We wanted to reach out and see how things are going with your account.

If there's anything we can do to improve your experience or any questions we can answer, please don't hesitate to let us know. We're here for you.

As a valued customer, your feedback helps us serve you better.

Best,
Customer Success Team`,
        tone: 'supportive',
        maxRetries: 2,
      },
      low: {
        subject: 'Thank You for Being a Valued Customer',
        body: `Dear {{customerName}},

We just wanted to take a moment to say thank you for your continued trust in us.

We realize you have many choices, and we're grateful you chose us. If there's ever anything we can do to enhance your experience, please let us know.

Here's to your continued success!

Warm regards,
Your Customer Success Team`,
        tone: 'appreciation',
        maxRetries: 1,
      },
    };

    return templates[churnRisk];
  }

  /**
   * Personalizes a message template with customer-specific data.
   */
  private personalizeMessage(body: string, profile: CustomerProfile): string {
    return body
      .replace(/\{\{customerName\}\}/g, this.extractCustomerName(profile))
      .replace(/\{\{accountTenureDays\}\}/g, profile.accountTenureDays.toString())
      .replace(/\{\{planTier\}\}/g, profile.planTier)
      .replace(/\{\{openTickets\}\}/g, profile.openTickets.toString());
  }

  /**
   * Extracts a display name from the customer profile.
   * Assumes customerId format or retrieves from profile metadata.
   */
  private extractCustomerName(profile: CustomerProfile): string {
    // If we have patterns that indicate a name, use that
    // Otherwise, use customerId
    return `Customer ${profile.customerId}`;
  }

  /**
   * Formats the complete message with subject and body.
   */
  private formatMessage(body: string, subject: string, profile: CustomerProfile): string {
    return `Subject: ${subject}\n\n${body}`;
  }

  /**
   * Determines the preferred outreach channel based on customer profile.
   */
  private getPreferredChannel(profile: CustomerProfile): 'email' | 'chat' | 'whatsapp' | 'phone' {
    // Priority: phone > whatsapp > chat > email
    if (profile.channels.includes('phone')) {
      return 'phone';
    }
    if (profile.channels.includes('whatsapp')) {
      return 'whatsapp';
    }
    if (profile.channels.includes('chat')) {
      return 'chat';
    }
    return 'email';
  }
}
