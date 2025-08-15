import type { Express } from 'express';
import { agentManager } from '../agents';

export function registerConversationalAIRoutes(app: Express) {
  // Create a new conversation session
  app.post('/api/ai-chat/session', async (req, res) => {
    try {
      const conversationalAgent = agentManager.getAgent('conversational-ai-001');
      if (!conversationalAgent) {
        return res.status(503).json({ error: 'Conversational AI agent not available' });
      }

      const sessionId = await (conversationalAgent as any).createSession(req.body.userId);
      res.json({ sessionId });
    } catch (error) {
      console.error('Error creating AI chat session:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  // Send a message to the AI
  app.post('/api/ai-chat/message', async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Session ID and message are required' });
      }

      const conversationalAgent = agentManager.getAgent('conversational-ai-001');
      if (!conversationalAgent) {
        return res.status(503).json({ error: 'Conversational AI agent not available' });
      }

      const response = await (conversationalAgent as any).processMessage(sessionId, message);
      res.json({ 
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing AI chat message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Get conversation history
  app.get('/api/ai-chat/session/:sessionId/messages', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const conversationalAgent = agentManager.getAgent('conversational-ai-001');
      if (!conversationalAgent) {
        return res.status(503).json({ error: 'Conversational AI agent not available' });
      }

      const messages = await (conversationalAgent as any).getSessionMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error('Error getting AI chat messages:', error);
      res.status(500).json({ error: 'Failed to get conversation history' });
    }
  });

  // Delete a conversation session
  app.delete('/api/ai-chat/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const conversationalAgent = agentManager.getAgent('conversational-ai-001');
      if (!conversationalAgent) {
        return res.status(503).json({ error: 'Conversational AI agent not available' });
      }

      await (conversationalAgent as any).deleteSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting AI chat session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  // Get AI agent status
  app.get('/api/ai-chat/status', async (req, res) => {
    try {
      const conversationalAgent = agentManager.getAgent('conversational-ai-001');
      if (!conversationalAgent) {
        return res.status(503).json({ error: 'Conversational AI agent not available' });
      }

      const status = (conversationalAgent as any).getAgentStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting AI chat status:', error);
      res.status(500).json({ error: 'Failed to get agent status' });
    }
  });
}