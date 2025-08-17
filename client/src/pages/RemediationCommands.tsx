import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Terminal, Play, Settings, Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ServerConnection {
  serverId: string;
  hostname: string;
  connectionType: 'ssh' | 'winrm' | 'api' | 'local';
  status: 'registered' | 'testing' | 'error';
}

interface CommandTemplate {
  actionType: string;
  description: string;
  osSupport: string[];
  safetyChecks: string[];
  requiredParameters: string[];
}

interface CommandResult {
  success: boolean;
  output: string;
  error: string;
  executionTime: number;
  exitCode: number;
  timestamp: string;
}

export default function RemediationCommands() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [connectionForm, setConnectionForm] = useState({
    serverId: '',
    connectionType: 'ssh',
    host: '',
    port: '22',
    username: '',
    keyPath: '',
    apiEndpoint: '',
    apiKey: ''
  });

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ['/api/servers'],
  });

  // Fetch registered connections
  const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
    queryKey: ['/api/commands/connections'],
    retry: false,
  });

  const connections = connectionsData?.connections || [];

  // Fetch command templates
  const { data: templatesData } = useQuery({
    queryKey: ['/api/commands/templates'],
    retry: false,
  });

  const templates = templatesData?.templates || [];

  // Register server connection mutation
  const registerConnectionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commands/connections', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commands/connections'] });
      toast({
        title: "Connection Registered",
        description: "Server connection registered successfully",
      });
      setConnectionForm({
        serverId: '',
        connectionType: 'ssh',
        host: '',
        port: '22',
        username: '',
        keyPath: '',
        apiEndpoint: '',
        apiKey: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: (serverId: string) => apiRequest(`/api/commands/connections/${serverId}/test`, 'POST'),
    onSuccess: (result: any) => {
      toast({
        title: result.success ? "Connection Test Passed" : "Connection Test Failed",
        description: result.success ? result.output : result.error,
        variant: result.success ? "default" : "destructive",
      });
    },
  });

  // Execute command mutation
  const executeCommandMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commands/execute', 'POST', data),
    onSuccess: (result: CommandResult) => {
      toast({
        title: result.success ? "Command Executed Successfully" : "Command Failed",
        description: `${result.success ? result.output : result.error} (${result.executionTime}ms)`,
        variant: result.success ? "default" : "destructive",
      });
    },
  });

  const handleRegisterConnection = () => {
    const { serverId, connectionType, ...config } = connectionForm;
    
    if (!serverId) {
      toast({
        title: "Server Required",
        description: "Please select a server",
        variant: "destructive",
      });
      return;
    }

    const connectionConfig: any = {};

    if (connectionType === 'ssh' || connectionType === 'winrm') {
      connectionConfig.host = config.host;
      connectionConfig.port = parseInt(config.port);
      connectionConfig.username = config.username;
      if (config.keyPath) connectionConfig.keyPath = config.keyPath;
    } else if (connectionType === 'api') {
      connectionConfig.apiEndpoint = config.apiEndpoint;
      connectionConfig.apiKey = config.apiKey;
    }

    registerConnectionMutation.mutate({
      serverId,
      connectionType,
      connectionConfig
    });
  };

  const handleExecuteTemplate = () => {
    if (!selectedServer || !selectedTemplate) {
      toast({
        title: "Missing Selection",
        description: "Please select both a server and command template",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find((t: CommandTemplate) => t.actionType === selectedTemplate);
    if (!template) return;

    executeCommandMutation.mutate({
      serverId: selectedServer,
      actionType: selectedTemplate,
      command: `template:${selectedTemplate}`,
      parameters,
      maxExecutionTime: 300
    });
  };

  const handleExecuteCustom = () => {
    if (!selectedServer || !customCommand) {
      toast({
        title: "Missing Input",
        description: "Please select a server and enter a command",
        variant: "destructive",
      });
      return;
    }

    executeCommandMutation.mutate({
      serverId: selectedServer,
      actionType: 'custom_command',
      command: customCommand,
      parameters: {},
      maxExecutionTime: 300
    });
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'testing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="remediation-commands-page">
      <div className="flex items-center gap-2">
        <Terminal className="h-6 w-6" />
        <h1 className="text-3xl font-bold" data-testid="page-title">Remediation Commands</h1>
      </div>
      
      <p className="text-muted-foreground" data-testid="page-description">
        Execute automated remediation commands on monitored servers through secure connections.
      </p>

      <Tabs defaultValue="execute" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="execute" data-testid="tab-execute">Execute Commands</TabsTrigger>
          <TabsTrigger value="connections" data-testid="tab-connections">Server Connections</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Command Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="execute" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template-based Commands */}
            <Card data-testid="template-commands-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Template Commands
                </CardTitle>
                <CardDescription>
                  Execute pre-approved command templates with built-in safety checks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-server">Target Server</Label>
                  <Select value={selectedServer} onValueChange={setSelectedServer}>
                    <SelectTrigger data-testid="select-server">
                      <SelectValue placeholder="Select server..." />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((conn: ServerConnection) => (
                        <SelectItem key={conn.serverId} value={conn.serverId}>
                          {conn.hostname} ({conn.connectionType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="template-select">Command Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template: CommandTemplate) => (
                        <SelectItem key={template.actionType} value={template.actionType}>
                          {template.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="space-y-3">
                    <Label>Parameters</Label>
                    {templates.find((t: CommandTemplate) => t.actionType === selectedTemplate)?.requiredParameters.map((param: string) => (
                      <div key={param}>
                        <Label htmlFor={`param-${param}`} className="text-sm">{param}</Label>
                        <Input
                          id={`param-${param}`}
                          placeholder={`Enter ${param}`}
                          value={parameters[param] || ''}
                          onChange={(e) => setParameters(prev => ({ ...prev, [param]: e.target.value }))}
                          data-testid={`input-param-${param}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleExecuteTemplate}
                  disabled={!selectedServer || !selectedTemplate || executeCommandMutation.isPending}
                  className="w-full"
                  data-testid="button-execute-template"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {executeCommandMutation.isPending ? 'Executing...' : 'Execute Template'}
                </Button>
              </CardContent>
            </Card>

            {/* Custom Commands */}
            <Card data-testid="custom-commands-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Custom Commands
                </CardTitle>
                <CardDescription>
                  Execute custom commands with manual safety verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Custom commands bypass safety templates. Use with caution on production servers.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="custom-server">Target Server</Label>
                  <Select value={selectedServer} onValueChange={setSelectedServer}>
                    <SelectTrigger data-testid="select-custom-server">
                      <SelectValue placeholder="Select server..." />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((conn: ServerConnection) => (
                        <SelectItem key={conn.serverId} value={conn.serverId}>
                          {conn.hostname} ({conn.connectionType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="custom-command">Command</Label>
                  <Textarea
                    id="custom-command"
                    placeholder="Enter custom command..."
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    className="font-mono text-sm"
                    rows={4}
                    data-testid="textarea-custom-command"
                  />
                </div>

                <Button
                  onClick={handleExecuteCustom}
                  disabled={!selectedServer || !customCommand || executeCommandMutation.isPending}
                  className="w-full"
                  variant="outline"
                  data-testid="button-execute-custom"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {executeCommandMutation.isPending ? 'Executing...' : 'Execute Custom'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Register New Connection */}
            <Card data-testid="register-connection-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Register Server Connection
                </CardTitle>
                <CardDescription>
                  Configure secure connections to servers for command execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="conn-server">Server</Label>
                  <Select value={connectionForm.serverId} onValueChange={(value) => 
                    setConnectionForm(prev => ({ ...prev, serverId: value }))
                  }>
                    <SelectTrigger data-testid="select-connection-server">
                      <SelectValue placeholder="Select server..." />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.filter((server: any) => 
                        !connections.some((conn: ServerConnection) => conn.serverId === server.id)
                      ).map((server: any) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.hostname} ({server.environment})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="conn-type">Connection Type</Label>
                  <Select value={connectionForm.connectionType} onValueChange={(value) =>
                    setConnectionForm(prev => ({ ...prev, connectionType: value }))
                  }>
                    <SelectTrigger data-testid="select-connection-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ssh">SSH</SelectItem>
                      <SelectItem value="winrm">WinRM</SelectItem>
                      <SelectItem value="api">REST API</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(connectionForm.connectionType === 'ssh' || connectionForm.connectionType === 'winrm') && (
                  <>
                    <div>
                      <Label htmlFor="conn-host">Host/IP Address</Label>
                      <Input
                        id="conn-host"
                        value={connectionForm.host}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="192.168.1.100"
                        data-testid="input-connection-host"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="conn-port">Port</Label>
                        <Input
                          id="conn-port"
                          value={connectionForm.port}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, port: e.target.value }))}
                          data-testid="input-connection-port"
                        />
                      </div>
                      <div>
                        <Label htmlFor="conn-username">Username</Label>
                        <Input
                          id="conn-username"
                          value={connectionForm.username}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, username: e.target.value }))}
                          data-testid="input-connection-username"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="conn-key">SSH Key Path (optional)</Label>
                      <Input
                        id="conn-key"
                        value={connectionForm.keyPath}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, keyPath: e.target.value }))}
                        placeholder="/path/to/private/key"
                        data-testid="input-connection-key"
                      />
                    </div>
                  </>
                )}

                {connectionForm.connectionType === 'api' && (
                  <>
                    <div>
                      <Label htmlFor="conn-endpoint">API Endpoint</Label>
                      <Input
                        id="conn-endpoint"
                        value={connectionForm.apiEndpoint}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                        placeholder="https://api.example.com/execute"
                        data-testid="input-api-endpoint"
                      />
                    </div>
                    <div>
                      <Label htmlFor="conn-api-key">API Key</Label>
                      <Input
                        id="conn-api-key"
                        type="password"
                        value={connectionForm.apiKey}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        data-testid="input-api-key"
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleRegisterConnection}
                  disabled={registerConnectionMutation.isPending}
                  className="w-full"
                  data-testid="button-register-connection"
                >
                  {registerConnectionMutation.isPending ? 'Registering...' : 'Register Connection'}
                </Button>
              </CardContent>
            </Card>

            {/* Active Connections */}
            <Card data-testid="active-connections-card">
              <CardHeader>
                <CardTitle>Active Connections</CardTitle>
                <CardDescription>
                  Manage registered server connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {connectionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : connections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No connections registered
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {connections.map((conn: ServerConnection) => (
                        <div key={conn.serverId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getConnectionStatusIcon(conn.status)}
                            <div>
                              <p className="font-medium" data-testid={`connection-hostname-${conn.serverId}`}>
                                {conn.hostname}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {conn.connectionType.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={conn.status === 'registered' ? 'default' : 'secondary'}>
                              {conn.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testConnectionMutation.mutate(conn.serverId)}
                              disabled={testConnectionMutation.isPending}
                              data-testid={`button-test-connection-${conn.serverId}`}
                            >
                              Test
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card data-testid="templates-overview-card">
            <CardHeader>
              <CardTitle>Available Command Templates</CardTitle>
              <CardDescription>
                Pre-configured safe command templates for common remediation tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.map((template: CommandTemplate) => (
                  <Card key={template.actionType} className="p-4" data-testid={`template-card-${template.actionType}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{template.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          Action: {template.actionType}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {template.osSupport.map((os) => (
                            <Badge key={os} variant="secondary" className="text-xs">
                              {os.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-view-template-${template.actionType}`}>
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{template.description}</DialogTitle>
                            <DialogDescription>
                              Template details and safety information
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Required Parameters:</h4>
                              <div className="flex flex-wrap gap-2">
                                {template.requiredParameters.map((param) => (
                                  <Badge key={param} variant="outline">
                                    {param}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Safety Checks:</h4>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {template.safetyChecks.map((check, index) => (
                                  <li key={index} className="text-muted-foreground">
                                    {check}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}