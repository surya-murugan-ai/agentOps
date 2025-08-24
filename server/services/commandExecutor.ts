import { exec } from 'child_process';
import { promisify } from 'util';
import { storage } from '../storage';

const execAsync = promisify(exec);

export interface ServerConnection {
  id: string;
  hostname: string;
  connectionType: 'ssh' | 'winrm' | 'api' | 'local';
  connectionConfig: {
    host?: string;
    port?: number;
    username?: string;
    keyPath?: string;
    apiEndpoint?: string;
    apiKey?: string;
    timeout?: number;
  };
}

export interface CommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  timestamp: string;
}

export interface RemediationCommand {
  id: string;
  serverId: string;
  actionType: string;
  command: string;
  parameters: Record<string, any>;
  safetyChecks: string[];
  rollbackCommand?: string;
  maxExecutionTime: number;
  requiresElevation: boolean;
}

export class CommandExecutor {
  private static instance: CommandExecutor;
  private connectionPool = new Map<string, ServerConnection>();
  
  public static getInstance(): CommandExecutor {
    if (!CommandExecutor.instance) {
      CommandExecutor.instance = new CommandExecutor();
    }
    return CommandExecutor.instance;
  }

  /**
   * Register a server connection for command execution
   */
  async registerServerConnection(connection: ServerConnection): Promise<void> {
    // Validate connection configuration
    await this.validateConnection(connection);
    this.connectionPool.set(connection.id, connection);
    
    console.log(`CommandExecutor: Registered connection for server ${connection.hostname}`);
  }

  /**
   * Get all registered server connections
   */
  getRegisteredConnections(): ServerConnection[] {
    return Array.from(this.connectionPool.values());
  }

  /**
   * Remove a server connection
   */
  removeConnection(serverId: string): void {
    this.connectionPool.delete(serverId);
    console.log(`CommandExecutor: Removed connection for server ${serverId}`);
  }

  /**
   * Execute a remediation command on a specific server
   */
  async executeCommand(command: RemediationCommand): Promise<CommandResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`CommandExecutor: Executing ${command.actionType} on server ${command.serverId}`);
      
      // Get server connection
      const connection = this.connectionPool.get(command.serverId);
      if (!connection) {
        throw new Error(`No connection registered for server ${command.serverId}`);
      }

      // Run safety checks first
      await this.runSafetyChecks(command, connection);
      
      // Execute the actual command based on connection type
      let result: CommandResult;
      switch (connection.connectionType) {
        case 'ssh':
          result = await this.executeSSHCommand(command, connection);
          break;
        case 'winrm':
          result = await this.executeWinRMCommand(command, connection);
          break;
        case 'api':
          result = await this.executeAPICommand(command, connection);
          break;
        case 'local':
          result = await this.executeLocalCommand(command);
          break;
        default:
          throw new Error(`Unsupported connection type: ${connection.connectionType}`);
      }

      // Log execution results
      await this.logExecution(command, result, connection);
      
      const executionTime = Date.now() - startTime;
      return {
        ...result,
        executionTime,
        timestamp
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorResult: CommandResult = {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error.message || String(error),
        executionTime,
        timestamp
      };
      
      await this.logExecution(command, errorResult, this.connectionPool.get(command.serverId));
      return errorResult;
    }
  }

  /**
   * Execute command via SSH
   */
  private async executeSSHCommand(command: RemediationCommand, connection: ServerConnection): Promise<CommandResult> {
    const { NodeSSH } = require('node-ssh');
    const ssh = new NodeSSH();

    try {
      await ssh.connect({
        host: connection.connectionConfig.host!,
        port: connection.connectionConfig.port || 22,
        username: connection.connectionConfig.username!,
        privateKey: connection.connectionConfig.keyPath,
        readyTimeout: connection.connectionConfig.timeout || 30000,
      });

      const fullCommand = this.buildFullCommand(command);
      console.log(`CommandExecutor: SSH executing: ${fullCommand}`);

      const result = await ssh.execCommand(fullCommand, {
        execOptions: {
          timeout: command.maxExecutionTime * 1000,
        }
      });

      ssh.dispose();

      return {
        success: result.code === 0,
        exitCode: result.code || 0,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime: 0, // Will be set by caller
        timestamp: ''
      };

    } catch (error) {
      ssh.dispose();
      throw error;
    }
  }

  /**
   * Execute command via Windows Remote Management
   */
  private async executeWinRMCommand(command: RemediationCommand, connection: ServerConnection): Promise<CommandResult> {
    // Implementation for WinRM would go here
    // This would use libraries like 'winrm' or 'node-winrm'
    throw new Error('WinRM execution not yet implemented');
  }

  /**
   * Execute command via REST API
   */
  private async executeAPICommand(command: RemediationCommand, connection: ServerConnection): Promise<CommandResult> {
    const fetch = require('node-fetch');
    
    const payload = {
      command: this.buildFullCommand(command),
      parameters: command.parameters,
      timeout: command.maxExecutionTime
    };

    const response = await fetch(connection.connectionConfig.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.connectionConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as any;
    
    return {
      success: response.ok && result.exitCode === 0,
      exitCode: result.exitCode || (response.ok ? 0 : 1),
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      executionTime: 0,
      timestamp: ''
    };
  }

  /**
   * Execute command locally (for testing or local server management)
   */
  private async executeLocalCommand(command: RemediationCommand): Promise<CommandResult> {
    const fullCommand = this.buildFullCommand(command);
    console.log(`CommandExecutor: Local executing: ${fullCommand}`);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: command.maxExecutionTime * 1000,
      });

      return {
        success: true,
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || '',
        executionTime: 0,
        timestamp: ''
      };

    } catch (error: any) {
      return {
        success: false,
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        executionTime: 0,
        timestamp: ''
      };
    }
  }

  /**
   * Build the full command with safety wrappers and parameters
   */
  private buildFullCommand(command: RemediationCommand): string {
    let fullCommand = command.command;
    
    // Substitute parameters
    for (const [key, value] of Object.entries(command.parameters)) {
      fullCommand = fullCommand.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }
    
    // Note: timeout is handled by the execAsync timeout option, not command wrapper
    // This prevents issues with Windows vs Unix timeout commands
    
    return fullCommand;
  }

  /**
   * Run safety checks before executing commands
   */
  private async runSafetyChecks(command: RemediationCommand, connection: ServerConnection): Promise<void> {
    for (const check of command.safetyChecks) {
      console.log(`CommandExecutor: Running safety check: ${check}`);
      
      // Execute safety check command first
      try {
        let checkResult: CommandResult;
        
        if (connection.connectionType === 'local') {
          checkResult = await this.executeLocalCommand({
            ...command,
            command: check,
            maxExecutionTime: 30, // Quick safety checks
          });
        } else {
          checkResult = await this.executeSSHCommand({
            ...command,
            command: check,
            maxExecutionTime: 30, // Quick safety checks
          }, connection);
        }
        
        if (!checkResult.success) {
          throw new Error(`Safety check failed: ${check} - ${checkResult.stderr}`);
        }
      } catch (error) {
        throw new Error(`Safety check "${check}" failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate server connection
   */
  private async validateConnection(connection: ServerConnection): Promise<void> {
    switch (connection.connectionType) {
      case 'ssh':
        if (!connection.connectionConfig.host || !connection.connectionConfig.username) {
          throw new Error('SSH connection requires host and username');
        }
        break;
      case 'api':
        if (!connection.connectionConfig.apiEndpoint) {
          throw new Error('API connection requires apiEndpoint');
        }
        break;
      case 'winrm':
        if (!connection.connectionConfig.host || !connection.connectionConfig.username) {
          throw new Error('WinRM connection requires host and username');
        }
        break;
      case 'local':
        // Local connections don't need validation
        break;
      default:
        throw new Error(`Unsupported connection type: ${connection.connectionType}`);
    }
  }

  /**
   * Log command execution for audit trail
   */
  private async logExecution(
    command: RemediationCommand, 
    result: CommandResult, 
    connection?: ServerConnection
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        id: `cmd-${Date.now()}`,
        action: `command_execution`,
        entityType: 'server',
        entityId: command.serverId,
        userId: 'system',
        timestamp: new Date(),
        details: JSON.stringify({
          actionType: command.actionType,
          command: command.command,
          success: result.success,
          exitCode: result.exitCode,
          executionTime: result.executionTime,
          connectionType: connection?.connectionType,
          hostname: connection?.hostname,
        })
      });
    } catch (error: any) {
      console.error('CommandExecutor: Failed to log execution:', error);
    }
  }

  /**
   * Get registered connections for monitoring
   */
  getRegisteredConnections(): ServerConnection[] {
    return Array.from(this.connectionPool.values());
  }

  /**
   * Remove a server connection
   */
  removeConnection(serverId: string): void {
    this.connectionPool.delete(serverId);
  }
}

// Predefined safe commands for common remediation actions
export const SAFE_COMMANDS = {
  restart_service: {
    linux: 'sudo systemctl restart ${service_name}',
    windows: 'Restart-Service -Name "${service_name}" -Force',
    safetyChecks: ['systemctl is-active ${service_name}']
  },
  stop_service: {
    linux: 'sudo systemctl stop ${service_name}',
    windows: 'Stop-Service -Name "${service_name}" -Force',
    safetyChecks: ['systemctl is-active ${service_name}']
  },
  cleanup_temp_files: {
    linux: 'find ${path} -type f -mtime +${days} -delete',
    windows: 'Get-ChildItem -Path "${path}" -Recurse | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-${days})} | Remove-Item -Force',
    safetyChecks: ['test -d ${path}', 'df -h ${path}']
  },
  clear_cache: {
    linux: 'sudo rm -rf ${cache_path}/* && sudo systemctl restart ${service_name}',
    windows: 'Remove-Item -Path "${cache_path}\\*" -Recurse -Force; Restart-Service -Name "${service_name}"',
    safetyChecks: ['test -d ${cache_path}']
  },
  memory_optimization: {
    linux: 'sudo sysctl vm.drop_caches=3 && sudo systemctl restart ${service_name}',
    windows: 'Clear-Host; [GC]::Collect(); Restart-Service -Name "${service_name}"',
    safetyChecks: ['free -m']
  }
};