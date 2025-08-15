import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  BarChart3
} from "lucide-react";

interface LlmUsageSummary {
  period: string;
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    avgCostPerRequest: number;
    avgTokensPerRequest: number;
    totalAgents: number;
    totalModels: number;
  };
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
}

interface CostBreakdown {
  period: string;
  totalProviders: number;
  totalCost: number;
  breakdown: Array<{
    provider: string;
    model: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    operations: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
    }>;
  }>;
}

export default function LlmAnalytics() {
  const { data: summary, isLoading: summaryLoading } = useQuery<LlmUsageSummary>({
    queryKey: ["/api/llm-usage/summary"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: costBreakdown, isLoading: costLoading } = useQuery<CostBreakdown>({
    queryKey: ["/api/llm-usage/cost-breakdown"],
    refetchInterval: 30000
  });

  if (summaryLoading || costLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className="p-6 space-y-6" data-testid="llm-analytics-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
          LLM Analytics & Usage Monitoring
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track AI API costs, token usage, and performance across all agents
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="metric-total-requests">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(summary?.summary.totalRequests || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-total-tokens">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(summary?.summary.totalTokens || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-total-cost">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary?.summary.totalCost || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="metric-avg-cost">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Cost/Request</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary?.summary.avgCostPerRequest || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4" data-testid="analytics-tabs">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" data-testid="tab-agents">Top Agents</TabsTrigger>
          <TabsTrigger value="models" data-testid="tab-models">Model Usage</TabsTrigger>
          <TabsTrigger value="cost-breakdown" data-testid="tab-cost-breakdown">Cost Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4" data-testid="tab-content-agents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Top Performing Agents
              </CardTitle>
              <CardDescription>
                AI agents ranked by token usage and API costs over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary?.topAgents.map((agent, index) => (
                  <div key={agent.agentId} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`agent-${agent.agentId}`}>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {agent.agentName || agent.agentId}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(agent.requests)} requests • {formatNumber(agent.tokens)} tokens
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(agent.cost)}
                      </p>
                      <Progress 
                        value={(agent.cost / (summary?.summary.totalCost || 1)) * 100} 
                        className="w-24 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4" data-testid="tab-content-models">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Model Performance
              </CardTitle>
              <CardDescription>
                LLM model usage statistics and cost efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary?.topModels.map((model, index) => (
                  <div key={`${model.provider}-${model.model}`} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`model-${model.provider}-${model.model}`}>
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge className="capitalize">
                            {model.provider}
                          </Badge>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {model.model}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(model.requests)} requests • {formatNumber(model.tokens)} tokens
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(model.cost)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatCurrency(model.cost / (model.requests || 1))}/req
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-breakdown" className="space-y-4" data-testid="tab-content-cost-breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Detailed Cost Analysis
              </CardTitle>
              <CardDescription>
                Cost breakdown by provider, model, and operation type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {costBreakdown?.breakdown.map((item) => (
                  <div key={`${item.provider}-${item.model}`} className="border rounded-lg p-4" data-testid={`cost-breakdown-${item.provider}-${item.model}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge className="capitalize">
                          {item.provider}
                        </Badge>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {item.model}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatCurrency(item.totalCost)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(item.totalTokens)} tokens
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(item.operations).map(([operation, stats]) => (
                        <div key={operation} className="bg-gray-50 dark:bg-gray-800 rounded p-3" data-testid={`operation-${operation}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-white capitalize">
                              {operation.replace('_', ' ')}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {stats.requests}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                              <span className="font-medium">{formatCurrency(stats.cost)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                              <span className="font-medium">{formatNumber(stats.tokens)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Daily Usage Trends */}
      {summary?.dailyUsage && summary.dailyUsage.length > 0 && (
        <Card data-testid="daily-usage-chart">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Daily Usage Trends
            </CardTitle>
            <CardDescription>
              Daily API costs and token usage over the last {summary.period}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.dailyUsage.map((day) => (
                <div key={day.date} className="flex items-center justify-between p-3 border rounded" data-testid={`daily-usage-${day.date}`}>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(day.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(day.requests)} requests
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(day.cost)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatNumber(day.tokens)} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}