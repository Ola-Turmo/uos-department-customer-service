/**
 * Connectors Configuration
 * 
 * This module exports the connectors configuration as a TypeScript object
 * to avoid JSON import issues across different module resolution modes.
 */

export const connectorsConfig = {
  requiredToolkits: [
    "zendesk",
    "intercom",
    "gmail",
    "shopify",
    "stripe",
    "whatsapp",
    "googledrive",
    "googledocs"
  ],
  roleToolkits: [
    {
      roleKey: "customer-support-lead",
      toolkits: [
        "gmail",
        "stripe",
        "zendesk",
        "intercom"
      ]
    },
    {
      roleKey: "customer-knowledge-automation-lead",
      toolkits: [
        "googledrive",
        "googledocs",
        "gmail",
        "zendesk",
        "shopify",
        "stripe"
      ]
    },
    {
      roleKey: "customer-chat-resolution-specialist",
      toolkits: [
        "intercom",
        "zendesk"
      ]
    },
    {
      roleKey: "customer-email-resolution-specialist",
      toolkits: [
        "gmail",
        "zendesk"
      ]
    },
    {
      roleKey: "customer-whatsapp-resolution-specialist",
      toolkits: [
        "whatsapp",
        "zendesk"
      ]
    },
    {
      roleKey: "customer-escalation-recovery-specialist",
      toolkits: [
        "zendesk",
        "shopify",
        "stripe"
      ]
    }
  ]
} as const;

export type ConnectorsConfig = typeof connectorsConfig;
