import { z } from 'zod';
export declare const SentimentSchema: z.ZodEnum<["positive", "negative", "neutral", "mixed"]>;
export type Sentiment = z.infer<typeof SentimentSchema>;
export declare const EscalationLevelSchema: z.ZodEnum<["none", "low", "medium", "high", "critical"]>;
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;
export declare const IntentCategorySchema: z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>;
export type IntentCategory = z.infer<typeof IntentCategorySchema>;
export declare const ConfidenceScoreSchema: z.ZodObject<{
    score: z.ZodNumber;
    isAmbiguous: z.ZodBoolean;
    alternatives: z.ZodOptional<z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        score: number;
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
    }, {
        score: number;
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    score: number;
    isAmbiguous: boolean;
    alternatives?: {
        score: number;
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
    }[] | undefined;
}, {
    score: number;
    isAmbiguous: boolean;
    alternatives?: {
        score: number;
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
    }[] | undefined;
}>;
export declare const IntentSchema: z.ZodObject<{
    id: z.ZodString;
    category: z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>;
    confidence: z.ZodObject<{
        score: z.ZodNumber;
        isAmbiguous: z.ZodBoolean;
        alternatives: z.ZodOptional<z.ZodArray<z.ZodObject<{
            category: z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>;
            score: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            score: number;
            category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        }, {
            score: number;
            category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        score: number;
        isAmbiguous: boolean;
        alternatives?: {
            score: number;
            category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        }[] | undefined;
    }, {
        score: number;
        isAmbiguous: boolean;
        alternatives?: {
            score: number;
            category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        }[] | undefined;
    }>;
    sentiment: z.ZodEnum<["positive", "negative", "neutral", "mixed"]>;
    multiIntent: z.ZodOptional<z.ZodBoolean>;
    subIntents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    extractedEntities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    rawText: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
    id: string;
    confidence: {
        score: number;
        isAmbiguous: boolean;
        alternatives?: {
            score: number;
            category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        }[] | undefined;
    };
    sentiment: "positive" | "negative" | "neutral" | "mixed";
    rawText: string;
    timestamp: string;
    multiIntent?: boolean | undefined;
    subIntents?: string[] | undefined;
    extractedEntities?: Record<string, unknown> | undefined;
}, {
    category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
    id: string;
    confidence: {
        score: number;
        isAmbiguous: boolean;
        alternatives?: {
            score: number;
            category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        }[] | undefined;
    };
    sentiment: "positive" | "negative" | "neutral" | "mixed";
    rawText: string;
    timestamp: string;
    multiIntent?: boolean | undefined;
    subIntents?: string[] | undefined;
    extractedEntities?: Record<string, unknown> | undefined;
}>;
export type Intent = z.infer<typeof IntentSchema>;
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;
export declare const TicketStatusSchema: z.ZodEnum<["open", "in_progress", "pending", "resolved", "closed", "escalated"]>;
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export declare const TicketPrioritySchema: z.ZodEnum<["low", "normal", "high", "urgent"]>;
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;
export declare const TicketChannelSchema: z.ZodEnum<["email", "chat", "phone", "social", "web", "mobile", "api"]>;
export type TicketChannel = z.infer<typeof TicketChannelSchema>;
export declare const TicketSchema: z.ZodObject<{
    id: z.ZodString;
    customerId: z.ZodString;
    subject: z.ZodString;
    description: z.ZodString;
    channel: z.ZodEnum<["email", "chat", "phone", "social", "web", "mobile", "api"]>;
    status: z.ZodEnum<["open", "in_progress", "pending", "resolved", "closed", "escalated"]>;
    priority: z.ZodEnum<["low", "normal", "high", "urgent"]>;
    intent: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        category: z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>;
        confidence: z.ZodObject<{
            score: z.ZodNumber;
            isAmbiguous: z.ZodBoolean;
            alternatives: z.ZodOptional<z.ZodArray<z.ZodObject<{
                category: z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>;
                score: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }, {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            isAmbiguous: boolean;
            alternatives?: {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }[] | undefined;
        }, {
            score: number;
            isAmbiguous: boolean;
            alternatives?: {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }[] | undefined;
        }>;
        sentiment: z.ZodEnum<["positive", "negative", "neutral", "mixed"]>;
        multiIntent: z.ZodOptional<z.ZodBoolean>;
        subIntents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        extractedEntities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        rawText: z.ZodString;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        id: string;
        confidence: {
            score: number;
            isAmbiguous: boolean;
            alternatives?: {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }[] | undefined;
        };
        sentiment: "positive" | "negative" | "neutral" | "mixed";
        rawText: string;
        timestamp: string;
        multiIntent?: boolean | undefined;
        subIntents?: string[] | undefined;
        extractedEntities?: Record<string, unknown> | undefined;
    }, {
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        id: string;
        confidence: {
            score: number;
            isAmbiguous: boolean;
            alternatives?: {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }[] | undefined;
        };
        sentiment: "positive" | "negative" | "neutral" | "mixed";
        rawText: string;
        timestamp: string;
        multiIntent?: boolean | undefined;
        subIntents?: string[] | undefined;
        extractedEntities?: Record<string, unknown> | undefined;
    }>>;
    sentiment: z.ZodOptional<z.ZodEnum<["positive", "negative", "neutral", "mixed"]>>;
    escalationLevel: z.ZodEnum<["none", "low", "medium", "high", "critical"]>;
    assignedAgentId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    resolvedAt: z.ZodOptional<z.ZodString>;
    slaDeadline: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "in_progress" | "pending" | "resolved" | "closed" | "escalated";
    id: string;
    customerId: string;
    subject: string;
    description: string;
    channel: "email" | "chat" | "phone" | "social" | "web" | "mobile" | "api";
    priority: "low" | "high" | "normal" | "urgent";
    escalationLevel: "none" | "low" | "medium" | "high" | "critical";
    createdAt: string;
    updatedAt: string;
    sentiment?: "positive" | "negative" | "neutral" | "mixed" | undefined;
    intent?: {
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        id: string;
        confidence: {
            score: number;
            isAmbiguous: boolean;
            alternatives?: {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }[] | undefined;
        };
        sentiment: "positive" | "negative" | "neutral" | "mixed";
        rawText: string;
        timestamp: string;
        multiIntent?: boolean | undefined;
        subIntents?: string[] | undefined;
        extractedEntities?: Record<string, unknown> | undefined;
    } | undefined;
    assignedAgentId?: string | undefined;
    tags?: string[] | undefined;
    resolvedAt?: string | undefined;
    slaDeadline?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status: "open" | "in_progress" | "pending" | "resolved" | "closed" | "escalated";
    id: string;
    customerId: string;
    subject: string;
    description: string;
    channel: "email" | "chat" | "phone" | "social" | "web" | "mobile" | "api";
    priority: "low" | "high" | "normal" | "urgent";
    escalationLevel: "none" | "low" | "medium" | "high" | "critical";
    createdAt: string;
    updatedAt: string;
    sentiment?: "positive" | "negative" | "neutral" | "mixed" | undefined;
    intent?: {
        category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
        id: string;
        confidence: {
            score: number;
            isAmbiguous: boolean;
            alternatives?: {
                score: number;
                category: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other";
            }[] | undefined;
        };
        sentiment: "positive" | "negative" | "neutral" | "mixed";
        rawText: string;
        timestamp: string;
        multiIntent?: boolean | undefined;
        subIntents?: string[] | undefined;
        extractedEntities?: Record<string, unknown> | undefined;
    } | undefined;
    assignedAgentId?: string | undefined;
    tags?: string[] | undefined;
    resolvedAt?: string | undefined;
    slaDeadline?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type Ticket = z.infer<typeof TicketSchema>;
export declare const CustomerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    tier: z.ZodEnum<["free", "basic", "premium", "enterprise"]>;
    totalTickets: z.ZodNumber;
    resolvedTickets: z.ZodNumber;
    openTickets: z.ZodNumber;
    satisfactionScore: z.ZodOptional<z.ZodNumber>;
    riskLevel: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    lastContactAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string;
    tier: "free" | "basic" | "premium" | "enterprise";
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    phone?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    satisfactionScore?: number | undefined;
    riskLevel?: "low" | "medium" | "high" | undefined;
    lastContactAt?: string | undefined;
}, {
    id: string;
    email: string;
    name: string;
    tier: "free" | "basic" | "premium" | "enterprise";
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    phone?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    satisfactionScore?: number | undefined;
    riskLevel?: "low" | "medium" | "high" | undefined;
    lastContactAt?: string | undefined;
}>;
export type Customer = z.infer<typeof CustomerSchema>;
export declare const AgentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    team: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["agent", "senior_agent", "team_lead", "manager"]>;
    status: z.ZodEnum<["available", "busy", "away", "offline"]>;
    currentTickets: z.ZodArray<z.ZodString, "many">;
    maxConcurrentTickets: z.ZodNumber;
    specialties: z.ZodOptional<z.ZodArray<z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>, "many">>;
    performanceScore: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "available" | "busy" | "away" | "offline";
    id: string;
    email: string;
    name: string;
    role: "agent" | "senior_agent" | "team_lead" | "manager";
    currentTickets: string[];
    maxConcurrentTickets: number;
    metadata?: Record<string, unknown> | undefined;
    team?: string | undefined;
    specialties?: ("billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other")[] | undefined;
    performanceScore?: number | undefined;
}, {
    status: "available" | "busy" | "away" | "offline";
    id: string;
    email: string;
    name: string;
    role: "agent" | "senior_agent" | "team_lead" | "manager";
    currentTickets: string[];
    maxConcurrentTickets: number;
    metadata?: Record<string, unknown> | undefined;
    team?: string | undefined;
    specialties?: ("billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other")[] | undefined;
    performanceScore?: number | undefined;
}>;
export type Agent = z.infer<typeof AgentSchema>;
export declare const WorkflowConditionSchema: z.ZodObject<{
    field: z.ZodString;
    operator: z.ZodEnum<["equals", "not_equals", "contains", "greater_than", "less_than", "in", "not_in"]>;
    value: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
    value?: unknown;
}, {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
    value?: unknown;
}>;
export declare const WorkflowActionSchema: z.ZodObject<{
    type: z.ZodEnum<["assign_agent", "notify", "escalate", "tag", "priority_change", "status_change", "sla_adjust", "webhook"]>;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
}, {
    params: Record<string, unknown>;
    type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
}>;
export declare const WorkflowNodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["trigger", "condition", "action", "router", "sla"]>;
    name: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        operator: z.ZodEnum<["equals", "not_equals", "contains", "greater_than", "less_than", "in", "not_in"]>;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
        value?: unknown;
    }, {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
        value?: unknown;
    }>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["assign_agent", "notify", "escalate", "tag", "priority_change", "status_change", "sla_adjust", "webhook"]>;
        params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        params: Record<string, unknown>;
        type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
    }, {
        params: Record<string, unknown>;
        type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
    }>, "many">>;
    nextNodeId: z.ZodOptional<z.ZodString>;
    branchNodeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "trigger" | "condition" | "action" | "router" | "sla";
    id: string;
    name: string;
    config: Record<string, unknown>;
    conditions?: {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
        value?: unknown;
    }[] | undefined;
    actions?: {
        params: Record<string, unknown>;
        type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
    }[] | undefined;
    nextNodeId?: string | undefined;
    branchNodeIds?: string[] | undefined;
}, {
    type: "trigger" | "condition" | "action" | "router" | "sla";
    id: string;
    name: string;
    config: Record<string, unknown>;
    conditions?: {
        field: string;
        operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
        value?: unknown;
    }[] | undefined;
    actions?: {
        params: Record<string, unknown>;
        type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
    }[] | undefined;
    nextNodeId?: string | undefined;
    branchNodeIds?: string[] | undefined;
}>;
export declare const WorkflowSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodString;
    isActive: z.ZodBoolean;
    triggerType: z.ZodEnum<["ticket_created", "ticket_updated", "sentiment_change", "sla_breach", "manual"]>;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["trigger", "condition", "action", "router", "sla"]>;
        name: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            operator: z.ZodEnum<["equals", "not_equals", "contains", "greater_than", "less_than", "in", "not_in"]>;
            value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
            value?: unknown;
        }, {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
            value?: unknown;
        }>, "many">>;
        actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["assign_agent", "notify", "escalate", "tag", "priority_change", "status_change", "sla_adjust", "webhook"]>;
            params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            params: Record<string, unknown>;
            type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
        }, {
            params: Record<string, unknown>;
            type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
        }>, "many">>;
        nextNodeId: z.ZodOptional<z.ZodString>;
        branchNodeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "trigger" | "condition" | "action" | "router" | "sla";
        id: string;
        name: string;
        config: Record<string, unknown>;
        conditions?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
            value?: unknown;
        }[] | undefined;
        actions?: {
            params: Record<string, unknown>;
            type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
        }[] | undefined;
        nextNodeId?: string | undefined;
        branchNodeIds?: string[] | undefined;
    }, {
        type: "trigger" | "condition" | "action" | "router" | "sla";
        id: string;
        name: string;
        config: Record<string, unknown>;
        conditions?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
            value?: unknown;
        }[] | undefined;
        actions?: {
            params: Record<string, unknown>;
            type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
        }[] | undefined;
        nextNodeId?: string | undefined;
        branchNodeIds?: string[] | undefined;
    }>, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    createdBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    version: string;
    isActive: boolean;
    triggerType: "ticket_created" | "ticket_updated" | "sentiment_change" | "sla_breach" | "manual";
    nodes: {
        type: "trigger" | "condition" | "action" | "router" | "sla";
        id: string;
        name: string;
        config: Record<string, unknown>;
        conditions?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
            value?: unknown;
        }[] | undefined;
        actions?: {
            params: Record<string, unknown>;
            type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
        }[] | undefined;
        nextNodeId?: string | undefined;
        branchNodeIds?: string[] | undefined;
    }[];
    createdBy: string;
    description?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    version: string;
    isActive: boolean;
    triggerType: "ticket_created" | "ticket_updated" | "sentiment_change" | "sla_breach" | "manual";
    nodes: {
        type: "trigger" | "condition" | "action" | "router" | "sla";
        id: string;
        name: string;
        config: Record<string, unknown>;
        conditions?: {
            field: string;
            operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
            value?: unknown;
        }[] | undefined;
        actions?: {
            params: Record<string, unknown>;
            type: "assign_agent" | "notify" | "escalate" | "tag" | "priority_change" | "status_change" | "sla_adjust" | "webhook";
        }[] | undefined;
        nextNodeId?: string | undefined;
        branchNodeIds?: string[] | undefined;
    }[];
    createdBy: string;
    description?: string | undefined;
}>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;
export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;
export declare const KnowledgeNodeTypeSchema: z.ZodEnum<["issue", "resolution", "customer", "product", "document", "faq"]>;
export type KnowledgeNodeType = z.infer<typeof KnowledgeNodeTypeSchema>;
export declare const KnowledgeEdgeSchema: z.ZodObject<{
    sourceId: z.ZodString;
    targetId: z.ZodString;
    relationship: z.ZodEnum<["related_to", "causes", "resolves", "part_of", "similar_to", "depends_on"]>;
    weight: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    sourceId: string;
    targetId: string;
    relationship: "related_to" | "causes" | "resolves" | "part_of" | "similar_to" | "depends_on";
    metadata?: Record<string, unknown> | undefined;
    weight?: number | undefined;
}, {
    sourceId: string;
    targetId: string;
    relationship: "related_to" | "causes" | "resolves" | "part_of" | "similar_to" | "depends_on";
    metadata?: Record<string, unknown> | undefined;
    weight?: number | undefined;
}>;
export declare const KnowledgeNodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["issue", "resolution", "customer", "product", "document", "faq"]>;
    title: z.ZodString;
    content: z.ZodString;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    issueCategory: z.ZodOptional<z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>>;
    resolutionCount: z.ZodOptional<z.ZodNumber>;
    successRate: z.ZodOptional<z.ZodNumber>;
    lastUpdated: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "issue" | "resolution" | "customer" | "product" | "document" | "faq";
    id: string;
    createdAt: string;
    title: string;
    content: string;
    lastUpdated: string;
    metadata?: Record<string, unknown> | undefined;
    embedding?: number[] | undefined;
    issueCategory?: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other" | undefined;
    resolutionCount?: number | undefined;
    successRate?: number | undefined;
}, {
    type: "issue" | "resolution" | "customer" | "product" | "document" | "faq";
    id: string;
    createdAt: string;
    title: string;
    content: string;
    lastUpdated: string;
    metadata?: Record<string, unknown> | undefined;
    embedding?: number[] | undefined;
    issueCategory?: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other" | undefined;
    resolutionCount?: number | undefined;
    successRate?: number | undefined;
}>;
export declare const KnowledgeGraphSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["issue", "resolution", "customer", "product", "document", "faq"]>;
        title: z.ZodString;
        content: z.ZodString;
        embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        issueCategory: z.ZodOptional<z.ZodEnum<["billing_inquiry", "payment_issue", "refund_request", "subscription_change", "invoice_request", "technical_issue", "account_access", "connectivity_problem", "feature_not_working", "data_export", "product_inquiry", "pricing_info", "comparison_request", "demo_request", "trial_extension", "account_creation", "account_deletion", "profile_update", "password_reset", "two_factor_auth", "shipping_inquiry", "delivery_delay", "lost_package", "address_change", "return_request", "complaint_general", "complaint_quality", "complaint_service", "complaint_shipping", "complaint_billing", "feedback_positive", "feedback_negative", "feature_request", "bug_report", "general_inquiry", "contact_request", "partnership_inquiry", "press_inquiry", "other"]>>;
        resolutionCount: z.ZodOptional<z.ZodNumber>;
        successRate: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "issue" | "resolution" | "customer" | "product" | "document" | "faq";
        id: string;
        createdAt: string;
        title: string;
        content: string;
        lastUpdated: string;
        metadata?: Record<string, unknown> | undefined;
        embedding?: number[] | undefined;
        issueCategory?: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other" | undefined;
        resolutionCount?: number | undefined;
        successRate?: number | undefined;
    }, {
        type: "issue" | "resolution" | "customer" | "product" | "document" | "faq";
        id: string;
        createdAt: string;
        title: string;
        content: string;
        lastUpdated: string;
        metadata?: Record<string, unknown> | undefined;
        embedding?: number[] | undefined;
        issueCategory?: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other" | undefined;
        resolutionCount?: number | undefined;
        successRate?: number | undefined;
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        sourceId: z.ZodString;
        targetId: z.ZodString;
        relationship: z.ZodEnum<["related_to", "causes", "resolves", "part_of", "similar_to", "depends_on"]>;
        weight: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        sourceId: string;
        targetId: string;
        relationship: "related_to" | "causes" | "resolves" | "part_of" | "similar_to" | "depends_on";
        metadata?: Record<string, unknown> | undefined;
        weight?: number | undefined;
    }, {
        sourceId: string;
        targetId: string;
        relationship: "related_to" | "causes" | "resolves" | "part_of" | "similar_to" | "depends_on";
        metadata?: Record<string, unknown> | undefined;
        weight?: number | undefined;
    }>, "many">;
    stats: z.ZodObject<{
        totalNodes: z.ZodNumber;
        totalEdges: z.ZodNumber;
        issueCount: z.ZodNumber;
        resolutionCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        resolutionCount: number;
        totalNodes: number;
        totalEdges: number;
        issueCount: number;
    }, {
        resolutionCount: number;
        totalNodes: number;
        totalEdges: number;
        issueCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    nodes: {
        type: "issue" | "resolution" | "customer" | "product" | "document" | "faq";
        id: string;
        createdAt: string;
        title: string;
        content: string;
        lastUpdated: string;
        metadata?: Record<string, unknown> | undefined;
        embedding?: number[] | undefined;
        issueCategory?: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other" | undefined;
        resolutionCount?: number | undefined;
        successRate?: number | undefined;
    }[];
    edges: {
        sourceId: string;
        targetId: string;
        relationship: "related_to" | "causes" | "resolves" | "part_of" | "similar_to" | "depends_on";
        metadata?: Record<string, unknown> | undefined;
        weight?: number | undefined;
    }[];
    stats: {
        resolutionCount: number;
        totalNodes: number;
        totalEdges: number;
        issueCount: number;
    };
}, {
    nodes: {
        type: "issue" | "resolution" | "customer" | "product" | "document" | "faq";
        id: string;
        createdAt: string;
        title: string;
        content: string;
        lastUpdated: string;
        metadata?: Record<string, unknown> | undefined;
        embedding?: number[] | undefined;
        issueCategory?: "billing_inquiry" | "payment_issue" | "refund_request" | "subscription_change" | "invoice_request" | "technical_issue" | "account_access" | "connectivity_problem" | "feature_not_working" | "data_export" | "product_inquiry" | "pricing_info" | "comparison_request" | "demo_request" | "trial_extension" | "account_creation" | "account_deletion" | "profile_update" | "password_reset" | "two_factor_auth" | "shipping_inquiry" | "delivery_delay" | "lost_package" | "address_change" | "return_request" | "complaint_general" | "complaint_quality" | "complaint_service" | "complaint_shipping" | "complaint_billing" | "feedback_positive" | "feedback_negative" | "feature_request" | "bug_report" | "general_inquiry" | "contact_request" | "partnership_inquiry" | "press_inquiry" | "other" | undefined;
        resolutionCount?: number | undefined;
        successRate?: number | undefined;
    }[];
    edges: {
        sourceId: string;
        targetId: string;
        relationship: "related_to" | "causes" | "resolves" | "part_of" | "similar_to" | "depends_on";
        metadata?: Record<string, unknown> | undefined;
        weight?: number | undefined;
    }[];
    stats: {
        resolutionCount: number;
        totalNodes: number;
        totalEdges: number;
        issueCount: number;
    };
}>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;
export type KnowledgeEdge = z.infer<typeof KnowledgeEdgeSchema>;
export declare const QACategorySchema: z.ZodEnum<["response_quality", "empathy", "accuracy", "completeness", "professionalism", "timeliness", "resolution_effectiveness", "customer_satisfaction"]>;
export type QACategory = z.infer<typeof QACategorySchema>;
export declare const QAEvaluationSchema: z.ZodObject<{
    id: z.ZodString;
    ticketId: z.ZodString;
    agentId: z.ZodString;
    evaluatorType: z.ZodEnum<["llm", "human", "hybrid"]>;
    scores: z.ZodRecord<z.ZodString, z.ZodNumber>;
    overallScore: z.ZodNumber;
    strengths: z.ZodArray<z.ZodString, "many">;
    weaknesses: z.ZodArray<z.ZodString, "many">;
    coachingSuggestions: z.ZodArray<z.ZodString, "many">;
    explanation: z.ZodString;
    timestamp: z.ZodString;
    confirmedByHuman: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: string;
    ticketId: string;
    agentId: string;
    evaluatorType: "llm" | "human" | "hybrid";
    scores: Record<string, number>;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    coachingSuggestions: string[];
    explanation: string;
    confirmedByHuman?: boolean | undefined;
}, {
    id: string;
    timestamp: string;
    ticketId: string;
    agentId: string;
    evaluatorType: "llm" | "human" | "hybrid";
    scores: Record<string, number>;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    coachingSuggestions: string[];
    explanation: string;
    confirmedByHuman?: boolean | undefined;
}>;
export type QAEvaluation = z.infer<typeof QAEvaluationSchema>;
export declare const AgentPerformanceSchema: z.ZodObject<{
    agentId: z.ZodString;
    period: z.ZodEnum<["daily", "weekly", "monthly"]>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    averageScore: z.ZodNumber;
    ticketCount: z.ZodNumber;
    resolvedCount: z.ZodNumber;
    escalatedCount: z.ZodNumber;
    customerSatisfactionAvg: z.ZodOptional<z.ZodNumber>;
    trend: z.ZodOptional<z.ZodEnum<["improving", "stable", "declining"]>>;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    period: "daily" | "weekly" | "monthly";
    startDate: string;
    endDate: string;
    averageScore: number;
    ticketCount: number;
    resolvedCount: number;
    escalatedCount: number;
    customerSatisfactionAvg?: number | undefined;
    trend?: "improving" | "stable" | "declining" | undefined;
}, {
    agentId: string;
    period: "daily" | "weekly" | "monthly";
    startDate: string;
    endDate: string;
    averageScore: number;
    ticketCount: number;
    resolvedCount: number;
    escalatedCount: number;
    customerSatisfactionAvg?: number | undefined;
    trend?: "improving" | "stable" | "declining" | undefined;
}>;
export type AgentPerformance = z.infer<typeof AgentPerformanceSchema>;
export declare const EscalationPredictionSchema: z.ZodObject<{
    ticketId: z.ZodString;
    predictedLevel: z.ZodEnum<["none", "low", "medium", "high", "critical"]>;
    confidence: z.ZodNumber;
    riskFactors: z.ZodArray<z.ZodObject<{
        factor: z.ZodString;
        weight: z.ZodNumber;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        weight: number;
        factor: string;
    }, {
        description: string;
        weight: number;
        factor: string;
    }>, "many">;
    recommendedActions: z.ZodArray<z.ZodString, "many">;
    shouldEscalate: z.ZodBoolean;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    timestamp: string;
    ticketId: string;
    predictedLevel: "none" | "low" | "medium" | "high" | "critical";
    riskFactors: {
        description: string;
        weight: number;
        factor: string;
    }[];
    recommendedActions: string[];
    shouldEscalate: boolean;
}, {
    confidence: number;
    timestamp: string;
    ticketId: string;
    predictedLevel: "none" | "low" | "medium" | "high" | "critical";
    riskFactors: {
        description: string;
        weight: number;
        factor: string;
    }[];
    recommendedActions: string[];
    shouldEscalate: boolean;
}>;
export type EscalationPrediction = z.infer<typeof EscalationPredictionSchema>;
export declare const DeEscalationActionSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["apologize", "compensate", "priority_boost", "agent_escalation", "satisfaction_guarantee"]>;
    message: z.ZodString;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    successProbability: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "apologize" | "compensate" | "priority_boost" | "agent_escalation" | "satisfaction_guarantee";
    id: string;
    successProbability: number;
    parameters?: Record<string, unknown> | undefined;
}, {
    message: string;
    type: "apologize" | "compensate" | "priority_boost" | "agent_escalation" | "satisfaction_guarantee";
    id: string;
    successProbability: number;
    parameters?: Record<string, unknown> | undefined;
}>;
export type DeEscalationAction = z.infer<typeof DeEscalationActionSchema>;
export declare const SLAPolicySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    priority: z.ZodEnum<["low", "normal", "high", "urgent"]>;
    responseTimeMinutes: z.ZodNumber;
    resolutionTimeMinutes: z.ZodNumber;
    businessHoursOnly: z.ZodBoolean;
    escalationThresholds: z.ZodArray<z.ZodObject<{
        percentage: z.ZodNumber;
        escalateTo: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        percentage: number;
        escalateTo: string;
    }, {
        percentage: number;
        escalateTo: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    priority: "low" | "high" | "normal" | "urgent";
    name: string;
    responseTimeMinutes: number;
    resolutionTimeMinutes: number;
    businessHoursOnly: boolean;
    escalationThresholds: {
        percentage: number;
        escalateTo: string;
    }[];
}, {
    id: string;
    priority: "low" | "high" | "normal" | "urgent";
    name: string;
    responseTimeMinutes: number;
    resolutionTimeMinutes: number;
    businessHoursOnly: boolean;
    escalationThresholds: {
        percentage: number;
        escalateTo: string;
    }[];
}>;
export type SLAPolicy = z.infer<typeof SLAPolicySchema>;
export declare const ChannelSwitchEventSchema: z.ZodObject<{
    customerId: z.ZodString;
    fromChannel: z.ZodEnum<["email", "chat", "phone", "social", "web", "mobile", "api"]>;
    toChannel: z.ZodEnum<["email", "chat", "phone", "social", "web", "mobile", "api"]>;
    ticketId: z.ZodString;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    customerId: string;
    ticketId: string;
    fromChannel: "email" | "chat" | "phone" | "social" | "web" | "mobile" | "api";
    toChannel: "email" | "chat" | "phone" | "social" | "web" | "mobile" | "api";
}, {
    timestamp: string;
    customerId: string;
    ticketId: string;
    fromChannel: "email" | "chat" | "phone" | "social" | "web" | "mobile" | "api";
    toChannel: "email" | "chat" | "phone" | "social" | "web" | "mobile" | "api";
}>;
export type ChannelSwitchEvent = z.infer<typeof ChannelSwitchEventSchema>;
export declare const JourneyEventSchema: z.ZodObject<{
    id: z.ZodString;
    customerId: z.ZodString;
    ticketId: z.ZodString;
    eventType: z.ZodEnum<["created", "assigned", "status_changed", "intent_detected", "escalated", "resolved", "channel_switch"]>;
    timestamp: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: string;
    customerId: string;
    ticketId: string;
    eventType: "resolved" | "escalated" | "created" | "assigned" | "status_changed" | "intent_detected" | "channel_switch";
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    customerId: string;
    ticketId: string;
    eventType: "resolved" | "escalated" | "created" | "assigned" | "status_changed" | "intent_detected" | "channel_switch";
    metadata?: Record<string, unknown> | undefined;
}>;
export type JourneyEvent = z.infer<typeof JourneyEventSchema>;
export declare const DashboardMetricsSchema: z.ZodObject<{
    totalTickets: z.ZodNumber;
    openTickets: z.ZodNumber;
    avgResponseTimeMinutes: z.ZodNumber;
    avgResolutionTimeMinutes: z.ZodNumber;
    slaComplianceRate: z.ZodNumber;
    customerSatisfactionAvg: z.ZodNumber;
    escalationRate: z.ZodNumber;
    firstContactResolutionRate: z.ZodNumber;
    channelDistribution: z.ZodRecord<z.ZodString, z.ZodNumber>;
    sentimentDistribution: z.ZodRecord<z.ZodString, z.ZodNumber>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    totalTickets: number;
    openTickets: number;
    customerSatisfactionAvg: number;
    avgResponseTimeMinutes: number;
    avgResolutionTimeMinutes: number;
    slaComplianceRate: number;
    escalationRate: number;
    firstContactResolutionRate: number;
    channelDistribution: Record<string, number>;
    sentimentDistribution: Record<string, number>;
}, {
    timestamp: string;
    totalTickets: number;
    openTickets: number;
    customerSatisfactionAvg: number;
    avgResponseTimeMinutes: number;
    avgResolutionTimeMinutes: number;
    slaComplianceRate: number;
    escalationRate: number;
    firstContactResolutionRate: number;
    channelDistribution: Record<string, number>;
    sentimentDistribution: Record<string, number>;
}>;
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export interface TriageResult {
    intent: Intent;
    routingRecommendation: {
        targetTeam: string;
        priority: TicketPriority;
        urgency: 'low' | 'normal' | 'high' | 'critical';
    };
}
export interface SimilarIssueResult {
    knowledgeNode: KnowledgeNode;
    similarityScore: number;
    matchedFields: string[];
}
export interface SuggestionResult {
    suggestion: string;
    confidence: number;
    sourceNodeId: string;
    reasoning: string;
}
//# sourceMappingURL=types.d.ts.map