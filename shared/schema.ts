import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const severityLevelEnum = pgEnum("severity_level", ["info", "warning", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "acknowledged", "resolved"]);
export const remediationStatusEnum = pgEnum("remediation_status", ["pending", "approved", "executing", "completed", "failed", "rejected"]);
export const agentStatusEnum = pgEnum("agent_status", ["active", "inactive", "error"]);
export const agentTypeEnum = pgEnum("agent_type", ["collector", "detector", "predictor", "recommender", "approval", "executor", "audit"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("operator"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Servers table
export const servers = pgTable("servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostname: text("hostname").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  environment: text("environment").notNull(), // prod, staging, dev
  location: text("location").notNull(),
  status: text("status").notNull().default("healthy"), // healthy, warning, critical, offline
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Server metrics/telemetry
export const serverMetrics = pgTable("server_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id),
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }).notNull(),
  memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }).notNull(),
  memoryTotal: integer("memory_total").notNull(), // in MB
  diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }).notNull(),
  diskTotal: integer("disk_total").notNull(), // in GB
  networkLatency: decimal("network_latency", { precision: 8, scale: 3 }), // in ms
  networkThroughput: decimal("network_throughput", { precision: 10, scale: 2 }), // in MB/s
  processCount: integer("process_count").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Agents table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: agentTypeEnum("type").notNull(),
  status: agentStatusEnum("status").notNull().default("active"),
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }).default("0"),
  memoryUsage: decimal("memory_usage", { precision: 7, scale: 1 }).default("0"), // in MB
  processedCount: integer("processed_count").default(0),
  errorCount: integer("error_count").default(0),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow(),
  startedAt: timestamp("started_at").defaultNow(),
  config: jsonb("config").$type<Record<string, any>>().default({}),
});

// Alerts table - Updated to match template structure
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostname: text("hostname").notNull(), // Direct hostname field from template
  title: text("title"), // Title field from template  
  description: text("description"), // Description field from template
  severity: text("severity").notNull(), // Severity (MEDIUM, HIGH, LOW from template)
  metricType: text("metric_type"), // metricType from template
  metricValue: decimal("metric_value", { precision: 10, scale: 3 }), // metricValue from template
  threshold: decimal("threshold", { precision: 10, scale: 3 }), // threshold from template
  
  // Internal fields for system functionality
  serverId: varchar("server_id").references(() => servers.id), // Derived from hostname lookup
  agentId: varchar("agent_id").references(() => agents.id),
  status: alertStatusEnum("status").notNull().default("active"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
});

// Remediation actions - Updated to match template structure
export const remediationActions = pgTable("remediation_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostname: text("hostname"), // hostname field from template
  title: text("title"), // title field from template
  description: text("description"), // description field from template  
  actionType: text("action_type"), // actionType field from template
  confidence: text("confidence"), // confidence field from template (used as remediation ID like REM-00001)
  estimatedDowntime: text("estimated_downtime"), // estimatedDowntime field from template
  status: text("status").notNull().default("pending"), // status field from template (Failed, Completed, etc.)
  
  // Internal fields for system functionality
  alertId: varchar("alert_id").references(() => alerts.id),
  serverId: varchar("server_id").references(() => servers.id), // Derived from hostname lookup
  agentId: varchar("agent_id").references(() => agents.id),
  command: text("command"),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  approvedBy: varchar("approved_by").references(() => users.id),
  parameters: jsonb("parameters").$type<Record<string, any>>().default({}),
  result: jsonb("result").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
});

// Audit logs - Updated to match template structure
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostname: text("hostname"), // hostname field from template
  agentName: text("agent_name"), // agentName field from template
  action: text("action").notNull(), // action field from template (AlertAcknowledged, ApprovalGranted, etc.)
  details: text("details").notNull(), // details field from template
  status: text("status").notNull(), // status field from template (Success, Failed, etc.)
  impact: text("impact"), // impact field from template
  timestamp: timestamp("timestamp").defaultNow(), // timestamp field from template
  
  // Internal fields for system functionality
  agentId: varchar("agent_id").references(() => agents.id),
  serverId: varchar("server_id").references(() => servers.id), // Derived from hostname lookup
  userId: varchar("user_id").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

// Anomaly detections
export const anomalies = pgTable("anomalies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id),
  agentId: varchar("agent_id").references(() => agents.id),
  metricType: text("metric_type").notNull(),
  actualValue: decimal("actual_value", { precision: 10, scale: 3 }).notNull(),
  expectedValue: decimal("expected_value", { precision: 10, scale: 3 }),
  deviationScore: decimal("deviation_score", { precision: 5, scale: 2 }).notNull(),
  severity: severityLevelEnum("severity").notNull(),
  detectionMethod: text("detection_method").notNull(), // statistical, ml, threshold
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Predictions
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: varchar("server_id").notNull().references(() => servers.id),
  agentId: varchar("agent_id").references(() => agents.id),
  metricType: text("metric_type").notNull(),
  currentValue: decimal("current_value", { precision: 10, scale: 3 }).notNull(),
  predictedValue: decimal("predicted_value", { precision: 10, scale: 3 }).notNull(),
  predictionTime: timestamp("prediction_time").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const serversRelations = relations(servers, ({ many }) => ({
  metrics: many(serverMetrics),
  alerts: many(alerts),
  remediationActions: many(remediationActions),
  auditLogs: many(auditLogs),
  anomalies: many(anomalies),
  predictions: many(predictions),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  alerts: many(alerts),
  remediationActions: many(remediationActions),
  auditLogs: many(auditLogs),
  anomalies: many(anomalies),
  predictions: many(predictions),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  server: one(servers, { fields: [alerts.serverId], references: [servers.id] }),
  agent: one(agents, { fields: [alerts.agentId], references: [agents.id] }),
  acknowledgedByUser: one(users, { fields: [alerts.acknowledgedBy], references: [users.id] }),
  remediationActions: many(remediationActions),
}));

export const remediationActionsRelations = relations(remediationActions, ({ one }) => ({
  alert: one(alerts, { fields: [remediationActions.alertId], references: [alerts.id] }),
  server: one(servers, { fields: [remediationActions.serverId], references: [servers.id] }),
  agent: one(agents, { fields: [remediationActions.agentId], references: [agents.id] }),
  approvedByUser: one(users, { fields: [remediationActions.approvedBy], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertServerSchema = createInsertSchema(servers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServerMetricsSchema = createInsertSchema(serverMetrics).omit({ id: true, timestamp: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, lastHeartbeat: true, startedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, timestamp: true, createdAt: true, acknowledgedAt: true, resolvedAt: true });
export const insertRemediationActionSchema = createInsertSchema(remediationActions).omit({ 
  id: true, 
  createdAt: true, 
  approvedAt: true, 
  executedAt: true, 
  completedAt: true 
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertAnomalySchema = createInsertSchema(anomalies).omit({ id: true, createdAt: true, resolvedAt: true });
export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type ServerMetrics = typeof serverMetrics.$inferSelect;
export type InsertServerMetrics = z.infer<typeof insertServerMetricsSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type RemediationAction = typeof remediationActions.$inferSelect;
export type InsertRemediationAction = z.infer<typeof insertRemediationActionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;

// Agent Settings table for configuring AI models and prompts
export const agentSettings = pgTable("agent_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: text("agent_id").notNull().unique(),
  aiModel: text("ai_model").notNull().default("openai"),
  modelName: text("model_name").notNull().default("gpt-4o"),
  temperature: real("temperature").notNull().default(0.1),
  systemPrompt: text("system_prompt").notNull(),
  maxTokens: integer("max_tokens").notNull().default(1000),
  frequencyPenalty: real("frequency_penalty").notNull().default(0),
  presencePenalty: real("presence_penalty").notNull().default(0),
  fineTuningRules: jsonb("fine_tuning_rules").$type<{
    customInstructions: string[];
    restrictedActions: string[];
    priorityKeywords: string[];
    responseFormat: string;
  }>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAgentSettingsSchema = createInsertSchema(agentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AgentSettings = typeof agentSettings.$inferSelect;
export type InsertAgentSettings = z.infer<typeof insertAgentSettingsSchema>;

// System settings and API keys table
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // 'api_keys', 'integrations', 'system'
  key: text("key").notNull(), // 'openai_api_key', 'anthropic_api_key', etc.
  value: text("value"), // encrypted value
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isSecure: boolean("is_secure").notNull().default(false), // indicates if value should be masked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Integration configurations table
export const integrations = pgTable("integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'OpenAI', 'Anthropic', 'Slack', 'PagerDuty'
  type: text("type").notNull(), // 'ai_provider', 'notification', 'monitoring'
  isEnabled: boolean("is_enabled").notNull().default(false),
  config: jsonb("config").$type<Record<string, any>>().default({}),
  lastTestAt: timestamp("last_test_at"),
  lastTestStatus: text("last_test_status"), // 'success', 'failed', 'pending'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationsSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTestAt: true,
});

// Types for new tables
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationsSchema>;
