import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "uos.department-customer-service",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Department Customer Service",
  description: "Department overlay for customer service workflows: issue triage, evidence-backed response drafting, escalation routing, and recurring-issue conversion into upstream product or knowledge actions.",
  author: "turmo.dev",
  categories: ["automation", "ui"],
  capabilities: [
    "events.subscribe",
    "plugin.state.read",
    "plugin.state.write",
    "ui.dashboardWidget.register"
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui"
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "health-widget",
        displayName: "Department Customer Service Health",
        exportName: "DashboardWidget"
      },
      {
        type: "dashboardWidget",
        id: "triage-widget",
        displayName: "Issue Triage",
        exportName: "TriageWidget"
      },
      {
        type: "dashboardWidget",
        id: "escalation-widget",
        displayName: "Escalations",
        exportName: "EscalationWidget"
      },
      {
        type: "dashboardWidget",
        id: "patterns-widget",
        displayName: "Recurring Patterns",
        exportName: "PatternsWidget"
      },
      {
        type: "dashboardWidget",
        id: "connector-health-widget",
        displayName: "Connector Health (XAF-007)",
        exportName: "ConnectorHealthWidget"
      }
    ]
  }
};

export default manifest;
