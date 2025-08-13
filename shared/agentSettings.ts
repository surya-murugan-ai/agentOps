import { pgTable, text, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agentSettings = pgTable("agent_settings", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  aiModel: text("ai_model").notNull().default("openai"),
  modelName: text("model_name").notNull().default("gpt-4o"),
  temperature: real("temperature").notNull().default(0.1),
  systemPrompt: text("system_prompt").notNull(),
  maxTokens: real("max_tokens").notNull().default(1000),
  frequencyPenalty: real("frequency_penalty").notNull().default(0),
  presencePenalty: real("presence_penalty").notNull().default(0),
  fineTuningRules: jsonb("fine_tuning_rules").$type<{
    customInstructions: string[];
    restrictedActions: string[];
    priorityKeywords: string[];
    responseFormat: string;
  }>(),
  isActive: text("is_active").notNull().default("true"),
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