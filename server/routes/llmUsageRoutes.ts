import { Router } from 'express';
import { llmUsageService } from '../services/llmUsageService';
import { storage } from '../storage';

const router = Router();

/**
 * Get LLM usage statistics for a specific agent
 * GET /api/llm-usage/agent/:agentId?days=7
 */
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const stats = await llmUsageService.getAgentUsageStats(agentId, days);

    res.json({
      agentId,
      period: `${days} days`,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching agent LLM usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch LLM usage statistics' });
  }
});

/**
 * Get platform-wide LLM usage statistics
 * GET /api/llm-usage/platform?days=7
 */
router.get('/platform', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const stats = await llmUsageService.getPlatformUsageStats(days);

    res.json({
      period: `${days} days`,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching platform LLM usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform usage statistics' });
  }
});

/**
 * Get detailed LLM usage history for an agent
 * GET /api/llm-usage/history/:agentId?days=7&limit=100
 */
router.get('/history/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    const limit = parseInt(req.query.limit as string) || 100;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await storage.getLlmUsageByDateRange(agentId, startDate, endDate);

    // Limit results for performance
    const limitedUsage = usage.slice(0, limit);

    res.json({
      agentId,
      period: `${days} days`,
      total: usage.length,
      returned: limitedUsage.length,
      usage: limitedUsage.map(u => ({
        id: u.id,
        provider: u.provider,
        model: u.model,
        operation: u.operation,
        promptTokens: u.promptTokens,
        completionTokens: u.completionTokens,
        totalTokens: u.totalTokens,
        cost: parseFloat(u.cost || '0'),
        requestDuration: u.requestDuration,
        success: u.success,
        errorMessage: u.errorMessage,
        timestamp: u.timestamp,
        metadata: u.metadata
      }))
    });
  } catch (error) {
    console.error('Error fetching LLM usage history:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

/**
 * Get LLM cost breakdown by model and provider
 * GET /api/llm-usage/cost-breakdown?days=7
 */
router.get('/cost-breakdown', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const aggregates = await storage.getLlmUsageAggregatesByDateRange(startDate, endDate);

    // Group by provider and model
    const breakdown = aggregates.reduce((acc, aggregate) => {
      const key = `${aggregate.provider}-${aggregate.model}`;
      if (!acc[key]) {
        acc[key] = {
          provider: aggregate.provider,
          model: aggregate.model,
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          operations: {}
        };
      }

      acc[key].totalRequests += aggregate.totalRequests;
      acc[key].totalTokens += aggregate.totalTokens;
      acc[key].totalCost += parseFloat(aggregate.totalCost);

      // Track operations
      if (!acc[key].operations[aggregate.operation]) {
        acc[key].operations[aggregate.operation] = {
          requests: 0,
          tokens: 0,
          cost: 0
        };
      }
      acc[key].operations[aggregate.operation].requests += aggregate.totalRequests;
      acc[key].operations[aggregate.operation].tokens += aggregate.totalTokens;
      acc[key].operations[aggregate.operation].cost += parseFloat(aggregate.totalCost);

      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(breakdown).sort((a: any, b: any) => b.totalCost - a.totalCost);

    res.json({
      period: `${days} days`,
      totalProviders: result.length,
      totalCost: result.reduce((sum: number, item: any) => sum + item.totalCost, 0),
      breakdown: result
    });
  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch cost breakdown' });
  }
});

/**
 * Get LLM usage summary dashboard data
 * GET /api/llm-usage/summary?days=7
 */
router.get('/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    // Get platform stats and all agents
    const [platformStats, agents] = await Promise.all([
      llmUsageService.getPlatformUsageStats(days),
      storage.getAllAgents()
    ]);

    // Calculate additional metrics
    const avgCostPerRequest = platformStats.totalRequests > 0 
      ? platformStats.totalCost / platformStats.totalRequests 
      : 0;

    const avgTokensPerRequest = platformStats.totalRequests > 0 
      ? platformStats.totalTokens / platformStats.totalRequests 
      : 0;

    // Get top spending agents with names
    const topAgentsWithNames = platformStats.topAgents.map(agent => {
      const agentInfo = agents.find(a => a.id === agent.agentId);
      return {
        ...agent,
        agentName: agentInfo?.name || agent.agentId
      };
    });

    res.json({
      period: `${days} days`,
      summary: {
        totalRequests: platformStats.totalRequests,
        totalTokens: platformStats.totalTokens,
        totalCost: Number(platformStats.totalCost.toFixed(6)),
        avgCostPerRequest: Number(avgCostPerRequest.toFixed(6)),
        avgTokensPerRequest: Math.round(avgTokensPerRequest),
        totalAgents: topAgentsWithNames.length,
        totalModels: platformStats.topModels.length
      },
      topAgents: topAgentsWithNames,
      topModels: platformStats.topModels,
      dailyUsage: platformStats.dailyUsage
    });
  } catch (error) {
    console.error('Error fetching LLM usage summary:', error);
    res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

export default router;