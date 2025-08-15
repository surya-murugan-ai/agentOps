import { storage } from '../storage';
import { nanoid } from 'nanoid';
import type { InsertLlmUsage, InsertLlmUsageAggregates } from '@shared/schema';

export interface LlmUsageMetrics {
  agentId: string;
  provider: 'openai' | 'anthropic';
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestDuration?: number;
  cost?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: {
    temperature?: number;
    maxTokens?: number;
    confidence?: number;
    serverId?: string;
    alertId?: string;
  };
}

export interface LlmCostCalculation {
  provider: 'openai' | 'anthropic';
  model: string;
  promptTokens: number;
  completionTokens: number;
}

// Cost per 1K tokens for different models (as of 2025)
const MODEL_COSTS = {
  openai: {
    'gpt-4o': { prompt: 0.005, completion: 0.015 }, // $5/$15 per 1M tokens
    'gpt-4': { prompt: 0.03, completion: 0.06 },    // $30/$60 per 1M tokens
    'gpt-3.5-turbo': { prompt: 0.001, completion: 0.002 } // $1/$2 per 1M tokens
  },
  anthropic: {
    'claude-sonnet-4-20250514': { prompt: 0.015, completion: 0.075 }, // $15/$75 per 1M tokens
    'claude-3-7-sonnet-20250219': { prompt: 0.015, completion: 0.075 },
    'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 } // $3/$15 per 1M tokens
  }
};

export class LlmUsageService {
  
  /**
   * Calculate cost for LLM API usage
   */
  calculateCost({ provider, model, promptTokens, completionTokens }: LlmCostCalculation): number {
    const costs = MODEL_COSTS[provider]?.[model as keyof typeof MODEL_COSTS[typeof provider]];
    if (!costs) {
      console.warn(`Unknown model cost for ${provider}/${model}, using default rates`);
      return 0;
    }

    const promptCost = (promptTokens / 1000) * costs.prompt;
    const completionCost = (completionTokens / 1000) * costs.completion;
    
    return Number((promptCost + completionCost).toFixed(6));
  }

  /**
   * Track LLM usage for an API call
   */
  async trackUsage(metrics: LlmUsageMetrics): Promise<void> {
    try {
      const cost = metrics.cost ?? this.calculateCost({
        provider: metrics.provider,
        model: metrics.model,
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens
      });

      const usageRecord: InsertLlmUsage = {
        agentId: metrics.agentId,
        provider: metrics.provider,
        model: metrics.model as any, // Type assertion for enum
        operation: metrics.operation,
        requestId: nanoid(),
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        totalTokens: metrics.totalTokens,
        requestDuration: metrics.requestDuration,
        cost: cost.toString(),
        success: metrics.success,
        errorMessage: metrics.errorMessage,
        metadata: metrics.metadata || {}
      };

      await storage.createLlmUsage(usageRecord);
      
      // Update daily aggregates
      await this.updateDailyAggregates(usageRecord);
      
      console.log(`LLM Usage tracked: ${metrics.provider}/${metrics.model} - ${metrics.totalTokens} tokens ($${cost.toFixed(4)})`);
    } catch (error) {
      console.error('Error tracking LLM usage:', error);
    }
  }

  /**
   * Update daily aggregates for efficient reporting
   */
  private async updateDailyAggregates(usage: InsertLlmUsage): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Try to get existing aggregate for today
      const existingAggregate = await storage.getLlmUsageAggregateForDate(
        usage.agentId,
        usage.provider,
        usage.model,
        usage.operation,
        today
      );

      if (existingAggregate) {
        // Update existing aggregate
        const updatedAggregate: Partial<InsertLlmUsageAggregates> = {
          totalRequests: existingAggregate.totalRequests + 1,
          successfulRequests: existingAggregate.successfulRequests + (usage.success ? 1 : 0),
          failedRequests: existingAggregate.failedRequests + (usage.success ? 0 : 1),
          totalPromptTokens: existingAggregate.totalPromptTokens + usage.promptTokens,
          totalCompletionTokens: existingAggregate.totalCompletionTokens + usage.completionTokens,
          totalTokens: existingAggregate.totalTokens + usage.totalTokens,
          totalCost: (parseFloat(existingAggregate.totalCost) + parseFloat(usage.cost || '0')).toFixed(6),
          avgRequestDuration: usage.requestDuration ? 
            Math.round((existingAggregate.avgRequestDuration || 0 + usage.requestDuration) / 2) : 
            existingAggregate.avgRequestDuration
        };

        await storage.updateLlmUsageAggregate(existingAggregate.id, updatedAggregate);
      } else {
        // Create new aggregate
        const newAggregate: InsertLlmUsageAggregates = {
          agentId: usage.agentId,
          provider: usage.provider,
          model: usage.model,
          operation: usage.operation,
          aggregateDate: today,
          totalRequests: 1,
          successfulRequests: usage.success ? 1 : 0,
          failedRequests: usage.success ? 0 : 1,
          totalPromptTokens: usage.promptTokens,
          totalCompletionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          totalCost: usage.cost || '0',
          avgRequestDuration: usage.requestDuration
        };

        await storage.createLlmUsageAggregate(newAggregate);
      }
    } catch (error) {
      console.error('Error updating daily aggregates:', error);
    }
  }

  /**
   * Get usage statistics for a specific agent
   */
  async getAgentUsageStats(agentId: string, days: number = 7): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successRate: number;
    avgRequestDuration: number;
    breakdown: Array<{
      provider: string;
      model: string;
      operation: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usage = await storage.getLlmUsageByDateRange(agentId, startDate, endDate);
      
      const totalRequests = usage.length;
      const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
      const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.cost || '0'), 0);
      const successfulRequests = usage.filter(u => u.success).length;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const avgRequestDuration = usage.length > 0 ? 
        usage.reduce((sum, u) => sum + (u.requestDuration || 0), 0) / usage.length : 0;

      // Group by provider/model/operation
      const breakdown = Object.values(
        usage.reduce((acc, u) => {
          const key = `${u.provider}-${u.model}-${u.operation}`;
          if (!acc[key]) {
            acc[key] = {
              provider: u.provider,
              model: u.model,
              operation: u.operation,
              requests: 0,
              tokens: 0,
              cost: 0
            };
          }
          acc[key].requests++;
          acc[key].tokens += u.totalTokens;
          acc[key].cost += parseFloat(u.cost || '0');
          return acc;
        }, {} as Record<string, any>)
      );

      return {
        totalRequests,
        totalTokens,
        totalCost: Number(totalCost.toFixed(6)),
        successRate: Number(successRate.toFixed(2)),
        avgRequestDuration: Math.round(avgRequestDuration),
        breakdown
      };
    } catch (error) {
      console.error('Error getting agent usage stats:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        successRate: 0,
        avgRequestDuration: 0,
        breakdown: []
      };
    }
  }

  /**
   * Get overall platform usage statistics
   */
  async getPlatformUsageStats(days: number = 7): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    topAgents: Array<{
      agentId: string;
      agentName: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
    topModels: Array<{
      provider: string;
      model: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
    dailyUsage: Array<{
      date: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const aggregates = await storage.getLlmUsageAggregatesByDateRange(startDate, endDate);
      
      const totalRequests = aggregates.reduce((sum, a) => sum + a.totalRequests, 0);
      const totalTokens = aggregates.reduce((sum, a) => sum + a.totalTokens, 0);
      const totalCost = aggregates.reduce((sum, a) => sum + parseFloat(a.totalCost), 0);

      // Group by agent
      const agentStats = Object.values(
        aggregates.reduce((acc, a) => {
          if (!acc[a.agentId]) {
            acc[a.agentId] = {
              agentId: a.agentId,
              agentName: '', // Will be filled by joining with agents table
              requests: 0,
              tokens: 0,
              cost: 0
            };
          }
          acc[a.agentId].requests += a.totalRequests;
          acc[a.agentId].tokens += a.totalTokens;
          acc[a.agentId].cost += parseFloat(a.totalCost);
          return acc;
        }, {} as Record<string, any>)
      ).sort((a, b) => b.tokens - a.tokens).slice(0, 10);

      // Group by model
      const modelStats = Object.values(
        aggregates.reduce((acc, a) => {
          const key = `${a.provider}-${a.model}`;
          if (!acc[key]) {
            acc[key] = {
              provider: a.provider,
              model: a.model,
              requests: 0,
              tokens: 0,
              cost: 0
            };
          }
          acc[key].requests += a.totalRequests;
          acc[key].tokens += a.totalTokens;
          acc[key].cost += parseFloat(a.totalCost);
          return acc;
        }, {} as Record<string, any>)
      ).sort((a, b) => b.tokens - a.tokens).slice(0, 10);

      // Group by date
      const dailyStats = Object.values(
        aggregates.reduce((acc, a) => {
          const dateKey = a.aggregateDate.toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = {
              date: dateKey,
              requests: 0,
              tokens: 0,
              cost: 0
            };
          }
          acc[dateKey].requests += a.totalRequests;
          acc[dateKey].tokens += a.totalTokens;
          acc[dateKey].cost += parseFloat(a.totalCost);
          return acc;
        }, {} as Record<string, any>)
      ).sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalRequests,
        totalTokens,
        totalCost: Number(totalCost.toFixed(6)),
        topAgents: agentStats,
        topModels: modelStats,
        dailyUsage: dailyStats
      };
    } catch (error) {
      console.error('Error getting platform usage stats:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        topAgents: [],
        topModels: [],
        dailyUsage: []
      };
    }
  }
}

export const llmUsageService = new LlmUsageService();