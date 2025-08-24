import { Router } from 'express';
import { CommandExecutor, ServerConnection } from '../services/commandExecutor';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

export const commandExecutionRoutes = Router();

/**
 * Register a new server connection for command execution
 */
commandExecutionRoutes.post('/connections', async (req, res) => {
  try {
    const { serverId, connectionType, connectionConfig } = req.body;

    if (!serverId || !connectionType || !connectionConfig) {
      return res.status(400).json({
        error: 'Missing required fields: serverId, connectionType, connectionConfig'
      });
    }

    // Get server details
    const server = await storage.getServer(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const connection: ServerConnection = {
      id: serverId,
      hostname: server.hostname,
      connectionType,
      connectionConfig: {
        ...connectionConfig,
        timeout: connectionConfig.timeout || 30000,
      }
    };

    const executor = CommandExecutor.getInstance();
    await executor.registerServerConnection(connection);

    // Log the connection registration
    await storage.createAuditLog({
      id: nanoid(),
      action: 'server_connection_registered',
      entityType: 'server',
      entityId: serverId,
      userId: 'system', // In real app, get from authenticated user
      timestamp: new Date(),
      details: JSON.stringify({
        connectionType,
        hostname: server.hostname
      })
    });

    res.json({
      success: true,
      message: `Connection registered for server ${server.hostname}`,
      connection: {
        serverId,
        hostname: server.hostname,
        connectionType,
        status: 'registered'
      }
    });

  } catch (error: any) {
    console.error('Error registering server connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all registered server connections
 */
commandExecutionRoutes.get('/connections', async (req, res) => {
  try {
    const executor = CommandExecutor.getInstance();
    const connections = executor.getRegisteredConnections();

    res.json({
      connections: connections.map(conn => ({
        serverId: conn.id,
        hostname: conn.hostname,
        connectionType: conn.connectionType,
        status: 'registered'
      }))
    });

  } catch (error: any) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test a server connection
 */
commandExecutionRoutes.post('/connections/:serverId/test', async (req, res) => {
  try {
    const { serverId } = req.params;
    const executor = CommandExecutor.getInstance();

    // Try executing a simple test command
    const testResult = await executor.executeCommand({
      id: `test-${Date.now()}`,
      serverId,
      actionType: 'test_connection',
      command: 'echo "Connection test successful"',
      parameters: {},
      safetyChecks: [],
      maxExecutionTime: 30,
      requiresElevation: false
    });

    res.json({
      success: testResult.success,
      output: testResult.stdout,
      error: testResult.stderr,
      executionTime: testResult.executionTime
    });

  } catch (error: any) {
    console.error('Error testing connection:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Execute a custom command on a server
 */
commandExecutionRoutes.post('/execute', async (req, res) => {
  try {
    const { serverId, actionType, command, parameters = {}, safetyChecks = [], maxExecutionTime = 300 } = req.body;

    if (!serverId || !actionType || !command) {
      return res.status(400).json({
        error: 'Missing required fields: serverId, actionType, command'
      });
    }

    const executor = CommandExecutor.getInstance();
    
    // Check if server connection exists, if not create a local connection for testing
    const connection = executor.getRegisteredConnections().find(c => c.id === serverId);
    if (!connection) {
      console.log(`No connection registered for server ${serverId}, creating local connection for testing`);
      
      // Create a local connection for testing purposes
      await executor.registerServerConnection({
        id: serverId,
        hostname: `server-${serverId}`,
        connectionType: 'local',
        connectionConfig: {
          timeout: maxExecutionTime * 1000
        }
      });
    }
    
    const result = await executor.executeCommand({
      id: `manual-${Date.now()}`,
      serverId,
      actionType,
      command,
      parameters,
      safetyChecks,
      maxExecutionTime,
      requiresElevation: req.body.requiresElevation !== false
    });

    // Log the manual execution
    await storage.createAuditLog({
      id: nanoid(),
      action: 'manual_command_execution',
      entityType: 'server',
      entityId: serverId,
      userId: 'system', // In real app, get from authenticated user
      timestamp: new Date(),
      details: JSON.stringify({
        actionType,
        command,
        success: result.success,
        executionTime: result.executionTime
      })
    });

    res.json({
      success: result.success,
      output: result.stdout,
      error: result.stderr,
      executionTime: result.executionTime,
      exitCode: result.exitCode,
      timestamp: result.timestamp
    });

  } catch (error: any) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove a server connection
 */
commandExecutionRoutes.delete('/connections/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const executor = CommandExecutor.getInstance();
    
    executor.removeConnection(serverId);
    
    res.json({ 
      success: true, 
      message: `Connection removed for server ${serverId}` 
    });

  } catch (error: any) {
    console.error('Error removing connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available command templates
 */
commandExecutionRoutes.get('/templates', async (req, res) => {
  try {
    const { SAFE_COMMANDS } = await import('../services/commandExecutor');
    
    res.json({
      templates: Object.keys(SAFE_COMMANDS).map(actionType => ({
        actionType,
        description: getActionDescription(actionType),
        osSupport: Object.keys(SAFE_COMMANDS[actionType as keyof typeof SAFE_COMMANDS]).filter(key => key !== 'safetyChecks'),
        safetyChecks: SAFE_COMMANDS[actionType as keyof typeof SAFE_COMMANDS].safetyChecks || [],
        requiredParameters: extractParametersFromTemplate(SAFE_COMMANDS[actionType as keyof typeof SAFE_COMMANDS])
      }))
    });

  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

function getActionDescription(actionType: string): string {
  const descriptions: Record<string, string> = {
    restart_service: 'Restart a system service',
    stop_service: 'Stop a system service',
    cleanup_temp_files: 'Clean up temporary files older than specified days',
    clear_cache: 'Clear application cache and restart service',
    memory_optimization: 'Clear system caches and optimize memory usage'
  };
  return descriptions[actionType] || actionType.replace('_', ' ');
}

function extractParametersFromTemplate(template: any): string[] {
  const params = new Set<string>();
  const templateStr = JSON.stringify(template);
  const matches = templateStr.match(/\$\{([^}]+)\}/g) || [];
  
  matches.forEach(match => {
    const param = match.slice(2, -1); // Remove ${ and }
    params.add(param);
  });
  
  return Array.from(params);
}