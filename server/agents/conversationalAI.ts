import OpenAI from 'openai';
import type { DatabaseStorage } from '../storage';
import { nanoid } from 'nanoid';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ConversationSession {
  id: string;
  userId?: string;
  messages: ConversationMessage[];
  context: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class ConversationalAIAgent {
  public id: string = 'conversational-ai-001';
  public name: string = 'Conversational AI Assistant';
  public type: string = 'conversational_ai';
  private openai: OpenAI;
  private storage: DatabaseStorage;
  private agentId: string;
  private sessions: Map<string, ConversationSession> = new Map();
  private isRunning = false;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.agentId = this.id;
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async start(): Promise<void> {
    console.log('Conversational AI: Starting conversational AI agent...');
    this.isRunning = true;

    try {
      // Register this agent in the database
      await this.storage.createAgent({
        id: this.id,
        name: this.name,
        type: this.type as any,
        status: 'active',
        config: {
          model: 'gpt-4o',
          maxTokens: 2000,
          temperature: 0.7,
          capabilities: [
            'data_analysis',
            'report_generation', 
            'help_assistance',
            'platform_insights',
            'agent_coordination'
          ]
        },
      });

      console.log('Conversational AI: Agent started successfully');
    } catch (error) {
      console.error('Conversational AI: Error starting agent:', error);
      this.isRunning = false;
    }
  }

  async stop(): Promise<void> {
    console.log('Conversational AI: Stopping conversational AI agent...');
    this.isRunning = false;
    
    try {
      await this.storage.updateAgent(this.agentId, {
        status: 'inactive',
      });
    } catch (error) {
      console.error('Conversational AI: Error stopping agent:', error);
    }
  }

  async createSession(userId?: string): Promise<string> {
    const sessionId = nanoid();
    const session: ConversationSession = {
      id: sessionId,
      userId,
      messages: [{
        id: nanoid(),
        role: 'system',
        content: this.getSystemPrompt(),
        timestamp: new Date().toISOString(),
      }],
      context: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    const userMsg: ConversationMessage = {
      id: nanoid(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    try {
      // Get platform context for the AI
      const platformContext = await this.getPlatformContext();
      
      // Prepare messages for OpenAI
      const messages = [
        {
          role: 'system' as const,
          content: this.getSystemPrompt() + '\n\nCurrent Platform Context:\n' + JSON.stringify(platformContext, null, 2),
        },
        ...session.messages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })).filter(msg => msg.role !== 'system'),
      ];

      // Call OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      });

      const assistantResponse = response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

      // Add assistant response to session
      const assistantMsg: ConversationMessage = {
        id: nanoid(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      };
      session.messages.push(assistantMsg);

      // Update session
      session.updatedAt = new Date().toISOString();
      
      return assistantResponse;
    } catch (error) {
      console.error('Conversational AI: Error processing message:', error);
      return 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.';
    }
  }

  private getSystemPrompt(): string {
    return `You are an AI assistant for the AgentOps platform - an AI-powered server health monitoring and automated remediation system for financial institutions.

Your role is to help users by:
1. Analyzing platform data (servers, metrics, alerts, remediation actions, etc.)
2. Generating insights and reports from monitoring data
3. Explaining agent behaviors and system status
4. Providing help and guidance for using the platform
5. Answering questions about infrastructure health and performance

You have access to real-time data from:
- Server metrics and health status
- Active alerts and their severity levels
- AI agent performance and status
- Remediation actions and their outcomes
- Cloud infrastructure resources and costs
- Audit logs and compliance data
- Anomaly detection results
- Predictive analytics forecasts

Guidelines:
- Always base responses on actual platform data when available
- Provide actionable insights and recommendations
- Explain technical concepts in clear, business-friendly language
- Flag critical issues that require immediate attention
- Suggest proactive measures to prevent problems
- Be concise but comprehensive in your analysis
- Include relevant metrics and trends in your responses

When users ask about:
- System health: Analyze current metrics, alerts, and trends
- Performance issues: Identify root causes and suggest solutions
- Cost optimization: Analyze cloud resource usage and costs
- Compliance: Review audit logs and remediation actions
- Predictions: Explain forecasted issues and preventive measures`;
  }

  private async getPlatformContext(): Promise<any> {
    try {
      const [
        servers,
        alerts,
        agents,
        recentMetrics,
        cloudResources,
        cloudConnections,
        auditLogs,
        predictions,
        remediationActions
      ] = await Promise.all([
        this.storage.getAllServers(),
        this.storage.getAllAlerts(),
        this.storage.getAllAgents(),
        this.getRecentMetrics(),
        this.storage.getAllCloudResources(),
        this.storage.getAllCloudConnections(),
        this.getRecentAuditLogs(),
        this.getRecentPredictions(),
        this.getRecentRemediationActions()
      ]);

      return {
        timestamp: new Date().toISOString(),
        servers: {
          total: servers.length,
          healthy: servers.filter(s => s.status === 'healthy').length,
          warning: servers.filter(s => s.status === 'warning').length,
          critical: servers.filter(s => s.status === 'critical').length,
          details: servers.map(s => ({
            hostname: s.hostname,
            status: s.status,
            environment: s.environment
          }))
        },
        alerts: {
          total: alerts.length,
          active: alerts.filter(a => a.status === 'active').length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          recent: alerts.slice(0, 5).map(a => ({
            title: a.title,
            severity: a.severity,
            status: a.status,
            createdAt: a.createdAt
          }))
        },
        agents: {
          total: agents.length,
          active: agents.filter(a => a.status === 'active').length,
          details: agents.map(a => ({
            name: a.name,
            type: a.type,
            status: a.status,
            lastHeartbeat: a.lastHeartbeat
          }))
        },
        cloudInfrastructure: {
          resources: cloudResources.length,
          connections: cloudConnections.length,
          totalCost: cloudResources.reduce((sum, r) => sum + parseFloat(r.cost || '0'), 0),
          providers: Array.from(new Set(cloudResources.map(r => r.provider)))
        },
        recentActivity: {
          metrics: recentMetrics.length,
          auditLogs: auditLogs.length,
          predictions: predictions.length,
          remediations: remediationActions.length
        }
      };
    } catch (error) {
      console.error('Conversational AI: Error getting platform context:', error);
      return {
        error: 'Unable to retrieve current platform context',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getRecentMetrics(): Promise<any[]> {
    try {
      // Get metrics from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const allMetrics = await this.storage.getAllMetrics();
      return allMetrics.filter(m => m.timestamp >= oneHourAgo);
    } catch (error) {
      console.error('Error getting recent metrics:', error);
      return [];
    }
  }

  private async getRecentAuditLogs(): Promise<any[]> {
    try {
      const logs = await this.storage.getAuditLogs(10);
      return logs; // Get last 10 audit logs
    } catch (error) {
      console.error('Error getting recent audit logs:', error);
      return [];
    }
  }

  private async getRecentPredictions(): Promise<any[]> {
    try {
      // Get predictions from the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const predictions = await this.storage.getRecentPredictions();
      return predictions.filter((p: any) => p.predictedAt >= oneDayAgo);
    } catch (error) {
      console.error('Error getting recent predictions:', error);
      return [];
    }
  }

  private async getRecentRemediationActions(): Promise<any[]> {
    try {
      const actions = await this.storage.getRemediationActions();
      return actions.slice(0, 10); // Get last 10 remediation actions
    } catch (error) {
      console.error('Error getting recent remediation actions:', error);
      return [];
    }
  }

  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    const session = this.sessions.get(sessionId);
    return session?.messages.filter(m => m.role !== 'system') || [];
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  getAgentStatus() {
    return {
      id: this.agentId,
      name: 'Conversational AI Assistant',
      isRunning: this.isRunning,
      activeSessions: this.sessions.size,
      capabilities: [
        'Data Analysis',
        'Report Generation',
        'Help & Support',
        'Platform Insights',
        'Agent Coordination'
      ]
    };
  }

  // Required interface methods
  isRunning(): boolean {
    return this.isRunning;
  }

  getStatus() {
    return this.getAgentStatus();
  }
}