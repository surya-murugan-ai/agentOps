import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const severityLevelEnum = pgEnum("severity_level", ["info", "warning", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "acknowledged", "resolved"]);
export const remediationStatusEnum = pgEnum("remediation_status", ["pending", "approved", "executing", "completed", "failed", "rejected"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "escalated"]);
export const approverRoleEnum = pgEnum("approver_role", ["operator", "supervisor", "manager", "director", "compliance_officer"]);
export const workflowStepTypeEnum = pgEnum("workflow_step_type", ["basic_approval", "compliance_check", "impact_assessment", "security_review", "change_board"]);
export const agentStatusEnum = pgEnum("agent_status", ["active", "inactive", "error"]);
export const agentTypeEnum = pgEnum("agent_type", ["collector", "detector", "predictor", "recommender", "approval", "executor", "audit", "cloud_collector"]);

// Cloud provider enums
export const cloudProviderEnum = pgEnum("cloud_provider", ["aws", "azure", "gcp"]);
export const cloudResourceTypeEnum = pgEnum("cloud_resource_type", ["ec2", "rds", "s3", "elb", "lambda", "vm", "sql_database", "storage_account", "app_service", "function_app"]);
export const llmProviderEnum = pgEnum("llm_provider", ["openai", "anthropic"]);
export const llmModelEnum = pgEnum("llm_model", ["gpt-4o", "gpt-4", "gpt-3.5-turbo", "claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: approverRoleEnum("role").notNull().default("operator"),
  email: text("email").unique(),
  isActive: boolean("is_active").default(true),
  approvalLimits: jsonb("approval_limits").$type<{
    maxRiskScore: number;
    maxServerCount: number;
    environments: string[];
  }>().default({ maxRiskScore: 30, maxServerCount: 5, environments: ["development"] }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Servers table (for on-premises and traditional infrastructure)
export const servers = pgTable("servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostname: text("hostname").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  environment: text("environment").notNull(), // prod, staging, dev
  location: text("location").notNull(),
  status: text("status").notNull().default("healthy"), // healthy, warning, critical, offline
  tags: jsonb("tags").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cloud resources table (for AWS, Azure, GCP resources)
export const cloudResources = pgTable("cloud_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: text("resource_id").notNull(), // AWS instance-id, Azure VM name, etc.
  resourceName: text("resource_name").notNull(),
  resourceType: cloudResourceTypeEnum("resource_type").notNull(),
  provider: cloudProviderEnum("provider").notNull(),
  region: text("region").notNull(),
  environment: text("environment").notNull(), // prod, staging, dev
  status: text("status").notNull().default("running"), // running, stopped, terminated, healthy, unhealthy
  configuration: jsonb("configuration").$type<Record<string, any>>().default({}),
  tags: jsonb("tags").$type<Record<string, any>>().default({}),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0"), // Monthly cost estimate
  lastSync: timestamp("last_sync").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cloud metrics table (for cloud resource telemetry)
export const cloudMetrics = pgTable("cloud_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: varchar("resource_id").notNull().references(() => cloudResources.id),
  metricName: text("metric_name").notNull(), // CPUUtilization, NetworkIn, etc.
  metricValue: decimal("metric_value", { precision: 15, scale: 5 }).notNull(),
  unit: text("unit").notNull(), // Percent, Bytes, Count, etc.
  dimensions: jsonb("dimensions").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cloud credentials/connections table
export const cloudConnections = pgTable("cloud_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  provider: cloudProviderEnum("provider").notNull(),
  region: text("region").notNull(),
  accountId: text("account_id"), // AWS Account ID, Azure Subscription ID, etc.
  isActive: boolean("is_active").default(true),
  encryptedCredentials: text("encrypted_credentials").notNull(), // Encrypted JSON with credentials
  lastTestResult: jsonb("last_test_result").$type<{
    status: "success" | "error";
    message: string;
    timestamp: Date;
  }>(),
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

// Agent Control Settings
export const agentControlSettings = pgTable("agent_control_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  realtimeMonitoringEnabled: boolean("realtime_monitoring_enabled").notNull().default(true),
  monitoringFrequencySeconds: integer("monitoring_frequency_seconds").notNull().default(60),
  autoRestartEnabled: boolean("auto_restart_enabled").notNull().default(true),
  maxRetries: integer("max_retries").notNull().default(3),
  alertThresholds: jsonb("alert_thresholds").$type<{
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  }>().default({
    cpuUsage: 80,
    memoryUsage: 1000,
    errorRate: 5,
    responseTime: 5000
  }),
  operatingSchedule: jsonb("operating_schedule").$type<{
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: string; // monday, tuesday, etc.
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      enabled: boolean;
    }>;
  }>().default({
    enabled: false,
    timezone: "UTC",
    schedule: []
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(), // Add missing createdAt field
  
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

// Approval Workflows table
export const approvalWorkflows = pgTable("approval_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  remediationActionId: varchar("remediation_action_id").notNull().references(() => remediationActions.id),
  workflowName: text("workflow_name").notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100 risk assessment
  requiredApprovals: integer("required_approvals").notNull().default(1),
  currentStep: integer("current_step").notNull().default(1),
  totalSteps: integer("total_steps").notNull().default(1),
  status: approvalStatusEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata").$type<{
    serverCriticality: "low" | "medium" | "high" | "critical";
    environment: string;
    impactAssessment: string;
    businessJustification: string;
    escalationReason?: string;
  }>().default({
    serverCriticality: "medium",
    environment: "production", 
    impactAssessment: "",
    businessJustification: ""
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workflow Steps table
export const workflowSteps = pgTable("workflow_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull().references(() => approvalWorkflows.id),
  stepNumber: integer("step_number").notNull(),
  stepType: workflowStepTypeEnum("step_type").notNull(),
  requiredRole: approverRoleEnum("required_role").notNull(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  comments: text("comments"),
  metadata: jsonb("metadata").$type<{
    timeoutHours: number;
    autoEscalate: boolean;
    parallelApproval: boolean;
    conditions: Record<string, any>;
  }>().default({
    timeoutHours: 24,
    autoEscalate: false,
    parallelApproval: false,
    conditions: {}
  }),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Approval History table
export const approvalHistory = pgTable("approval_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull().references(() => approvalWorkflows.id),
  stepId: varchar("step_id").references(() => workflowSteps.id),
  action: text("action").notNull(), // approved, rejected, escalated, delegated
  approverUserId: varchar("approver_user_id").notNull().references(() => users.id),
  comments: text("comments"),
  metadata: jsonb("metadata").$type<{
    ipAddress: string;
    userAgent: string;
    delegatedTo?: string;
    escalationReason?: string;
  }>().default({
    ipAddress: "",
    userAgent: ""
  }),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Upload History table for tracking file uploads and preventing duplicates
export const uploadHistory = pgTable("upload_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileHash: varchar("file_hash", { length: 64 }).notNull().unique(),
  filename: varchar("filename", { length: 255 }).notNull(),
  uploadCount: integer("upload_count").notNull(),
  uploadType: varchar("upload_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// LLM Usage Tracking table
export const llmUsage = pgTable("llm_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  provider: llmProviderEnum("provider").notNull(),
  model: llmModelEnum("model").notNull(),
  operation: text("operation").notNull(), // 'anomaly_detection', 'prediction', 'recommendation', etc.
  requestId: text("request_id"), // for tracking specific requests
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  requestDuration: integer("request_duration_ms"), // duration in milliseconds
  cost: decimal("cost", { precision: 10, scale: 6 }), // cost in USD
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    temperature?: number;
    maxTokens?: number;
    confidence?: number;
    serverId?: string;
    alertId?: string;
  }>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// LLM Usage Aggregates table for efficient reporting
export const llmUsageAggregates = pgTable("llm_usage_aggregates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  provider: llmProviderEnum("provider").notNull(),
  model: llmModelEnum("model").notNull(),
  operation: text("operation").notNull(),
  aggregateDate: timestamp("aggregate_date").notNull(), // daily aggregates
  totalRequests: integer("total_requests").notNull().default(0),
  successfulRequests: integer("successful_requests").notNull().default(0),
  failedRequests: integer("failed_requests").notNull().default(0),
  totalPromptTokens: integer("total_prompt_tokens").notNull().default(0),
  totalCompletionTokens: integer("total_completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  totalCost: decimal("total_cost", { precision: 12, scale: 6 }).notNull().default("0"),
  avgRequestDuration: integer("avg_request_duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const agentsRelations = relations(agents, ({ one, many }) => ({
  alerts: many(alerts),
  remediationActions: many(remediationActions),
  auditLogs: many(auditLogs),
  anomalies: many(anomalies),
  predictions: many(predictions),
  llmUsage: many(llmUsage),
  llmUsageAggregates: many(llmUsageAggregates),
  controlSettings: one(agentControlSettings),
}));

export const agentControlSettingsRelations = relations(agentControlSettings, ({ one }) => ({
  agent: one(agents, { fields: [agentControlSettings.agentId], references: [agents.id] }),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  server: one(servers, { fields: [alerts.serverId], references: [servers.id] }),
  agent: one(agents, { fields: [alerts.agentId], references: [agents.id] }),
  acknowledgedByUser: one(users, { fields: [alerts.acknowledgedBy], references: [users.id] }),
  remediationActions: many(remediationActions),
}));

export const remediationActionsRelations = relations(remediationActions, ({ one, many }) => ({
  alert: one(alerts, { fields: [remediationActions.alertId], references: [alerts.id] }),
  server: one(servers, { fields: [remediationActions.serverId], references: [servers.id] }),
  agent: one(agents, { fields: [remediationActions.agentId], references: [agents.id] }),
  approvedByUser: one(users, { fields: [remediationActions.approvedBy], references: [users.id] }),
  workflows: many(approvalWorkflows),
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one, many }) => ({
  remediationAction: one(remediationActions, { fields: [approvalWorkflows.remediationActionId], references: [remediationActions.id] }),
  steps: many(workflowSteps),
  history: many(approvalHistory),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one, many }) => ({
  workflow: one(approvalWorkflows, { fields: [workflowSteps.workflowId], references: [approvalWorkflows.id] }),
  assignedToUser: one(users, { fields: [workflowSteps.assignedTo], references: [users.id] }),
  approvedByUser: one(users, { fields: [workflowSteps.approvedBy], references: [users.id] }),
  history: many(approvalHistory),
}));

export const approvalHistoryRelations = relations(approvalHistory, ({ one }) => ({
  workflow: one(approvalWorkflows, { fields: [approvalHistory.workflowId], references: [approvalWorkflows.id] }),
  step: one(workflowSteps, { fields: [approvalHistory.stepId], references: [workflowSteps.id] }),
  approver: one(users, { fields: [approvalHistory.approverUserId], references: [users.id] }),
}));

export const llmUsageRelations = relations(llmUsage, ({ one }) => ({
  agent: one(agents, { fields: [llmUsage.agentId], references: [agents.id] }),
}));

export const llmUsageAggregatesRelations = relations(llmUsageAggregates, ({ one }) => ({
  agent: one(agents, { fields: [llmUsageAggregates.agentId], references: [agents.id] }),
}));

// Cloud resource relations
export const cloudResourcesRelations = relations(cloudResources, ({ many, one }) => ({
  metrics: many(cloudMetrics),
  connection: one(cloudConnections, { fields: [cloudResources.provider], references: [cloudConnections.provider] }),
}));

export const cloudMetricsRelations = relations(cloudMetrics, ({ one }) => ({
  resource: one(cloudResources, { fields: [cloudMetrics.resourceId], references: [cloudResources.id] }),
}));

export const cloudConnectionsRelations = relations(cloudConnections, ({ many }) => ({
  resources: many(cloudResources),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertServerSchema = createInsertSchema(servers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServerMetricsSchema = createInsertSchema(serverMetrics).omit({ id: true, timestamp: true });
export const insertCloudResourceSchema = createInsertSchema(cloudResources).omit({ id: true, createdAt: true, updatedAt: true, lastSync: true });
export const insertCloudMetricSchema = createInsertSchema(cloudMetrics).omit({ id: true, createdAt: true });
export const insertCloudConnectionSchema = createInsertSchema(cloudConnections).omit({ id: true, createdAt: true, updatedAt: true });
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
export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({ id: true, createdAt: true, completedAt: true });
export const insertApprovalHistorySchema = createInsertSchema(approvalHistory).omit({ id: true, timestamp: true });
export const insertLlmUsageSchema = createInsertSchema(llmUsage).omit({ id: true, timestamp: true });
export const insertLlmUsageAggregatesSchema = createInsertSchema(llmUsageAggregates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgentControlSettingsSchema = createInsertSchema(agentControlSettings).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type ServerMetrics = typeof serverMetrics.$inferSelect;
export type InsertServerMetrics = z.infer<typeof insertServerMetricsSchema>;
export type CloudResource = typeof cloudResources.$inferSelect;
export type InsertCloudResource = z.infer<typeof insertCloudResourceSchema>;
export type CloudMetric = typeof cloudMetrics.$inferSelect;
export type InsertCloudMetric = z.infer<typeof insertCloudMetricSchema>;
export type CloudConnection = typeof cloudConnections.$inferSelect;
export type InsertCloudConnection = z.infer<typeof insertCloudConnectionSchema>;
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
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;
export type LlmUsage = typeof llmUsage.$inferSelect;
export type InsertLlmUsage = z.infer<typeof insertLlmUsageSchema>;
export type LlmUsageAggregates = typeof llmUsageAggregates.$inferSelect;
export type InsertLlmUsageAggregates = z.infer<typeof insertLlmUsageAggregatesSchema>;
export type AgentControlSettings = typeof agentControlSettings.$inferSelect;
export type InsertAgentControlSettings = z.infer<typeof insertAgentControlSettingsSchema>;

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



// Types for configuration tables
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationsSchema>;
