import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, TestTube, Trash2, Eye, EyeOff, Key, Shield, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  description?: string;
  isActive: boolean;
  isSecure: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  isEnabled: boolean;
  config: Record<string, any>;
  lastTestAt?: string;
  lastTestStatus?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSetting, setNewSetting] = useState({
    category: "api_keys",
    key: "",
    value: "",
    description: "",
    isSecure: true
  });
  const [newIntegration, setNewIntegration] = useState({
    name: "",
    type: "ai_provider",
    config: {}
  });
  const [showSecureValues, setShowSecureValues] = useState<Record<string, boolean>>({});

  // Fetch settings
  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    select: (data: SystemSetting[]) => data
  });

  // Fetch integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['/api/integrations'],
    select: (data: Integration[]) => data
  });

  // Create setting mutation
  const createSettingMutation = useMutation({
    mutationFn: (setting: typeof newSetting) => apiRequest('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setting)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setNewSetting({ category: "api_keys", key: "", value: "", description: "", isSecure: true });
      toast({ description: "Setting created successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to create setting" });
    }
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SystemSetting> }) => 
      apiRequest(`/api/settings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ description: "Setting updated successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to update setting" });
    }
  });

  // Delete setting mutation
  const deleteSettingMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ description: "Setting deleted successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to delete setting" });
    }
  });

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: (integration: typeof newIntegration) => apiRequest('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(integration)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setNewIntegration({ name: "", type: "ai_provider", config: {} });
      toast({ description: "Integration created successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to create integration" });
    }
  });

  // Update integration mutation
  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Integration> }) => 
      apiRequest(`/api/integrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ description: "Integration updated successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to update integration" });
    }
  });

  // Test integration mutation
  const testIntegrationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/integrations/${id}/test`, { method: 'POST' }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ 
        description: data.success ? "Integration test successful" : `Test failed: ${data.message}`,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to test integration" });
    }
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/integrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ description: "Integration deleted successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to delete integration" });
    }
  });

  const toggleSecureValue = (settingId: string) => {
    setShowSecureValues(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const maskValue = (value: string, isSecure: boolean, isVisible: boolean) => {
    if (!isSecure || isVisible) return value;
    return "••••••••••••••••";
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">Not tested</Badge>;
    }
  };

  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Settings</h1>
          <p className="text-muted-foreground">Manage API keys, integrations, and system configuration</p>
        </div>
        <Settings2 className="h-8 w-8 text-muted-foreground" />
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">API Keys & Settings</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6">
          {/* Add New Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Setting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newSetting.category} 
                    onValueChange={(value) => setNewSetting(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_keys">API Keys</SelectItem>
                      <SelectItem value="integrations">Integrations</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    value={newSetting.key}
                    onChange={(e) => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="e.g., openai_api_key"
                    data-testid="input-setting-key"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type={newSetting.isSecure ? "password" : "text"}
                  value={newSetting.value}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter value"
                  data-testid="input-setting-value"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  data-testid="textarea-setting-description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={newSetting.isSecure}
                  onCheckedChange={(checked) => setNewSetting(prev => ({ ...prev, isSecure: checked }))}
                  data-testid="switch-setting-secure"
                />
                <Label htmlFor="secure" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Secure (hide value)
                </Label>
              </div>
              <Button 
                onClick={() => createSettingMutation.mutate(newSetting)}
                disabled={!newSetting.key || !newSetting.value || createSettingMutation.isPending}
                data-testid="button-create-setting"
              >
                {createSettingMutation.isPending ? "Creating..." : "Create Setting"}
              </Button>
            </CardContent>
          </Card>

          {/* Settings by Category */}
          {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category.replace('_', ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categorySettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`setting-${setting.key}`}>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{setting.key}</code>
                          {setting.isSecure && <Key className="h-4 w-4 text-muted-foreground" />}
                          <Badge variant={setting.isActive ? "default" : "secondary"}>
                            {setting.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-muted-foreground">
                            {maskValue(setting.value, setting.isSecure, showSecureValues[setting.id])}
                          </code>
                          {setting.isSecure && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSecureValue(setting.id)}
                              data-testid={`button-toggle-visibility-${setting.key}`}
                            >
                              {showSecureValues[setting.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={setting.isActive}
                          onCheckedChange={(checked) => 
                            updateSettingMutation.mutate({ id: setting.id, updates: { isActive: checked } })
                          }
                          data-testid={`switch-setting-active-${setting.key}`}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSettingMutation.mutate(setting.id)}
                          data-testid={`button-delete-setting-${setting.key}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          {/* Add New Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="integration-name">Name</Label>
                  <Select 
                    value={newIntegration.name} 
                    onValueChange={(value) => setNewIntegration(prev => ({ ...prev, name: value }))}
                  >
                    <SelectTrigger data-testid="select-integration-name">
                      <SelectValue placeholder="Select integration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OpenAI">OpenAI</SelectItem>
                      <SelectItem value="Anthropic">Anthropic</SelectItem>
                      <SelectItem value="Slack">Slack</SelectItem>
                      <SelectItem value="PagerDuty">PagerDuty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="integration-type">Type</Label>
                  <Select 
                    value={newIntegration.type} 
                    onValueChange={(value) => setNewIntegration(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger data-testid="select-integration-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai_provider">AI Provider</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => createIntegrationMutation.mutate(newIntegration)}
                disabled={!newIntegration.name || createIntegrationMutation.isPending}
                data-testid="button-create-integration"
              >
                {createIntegrationMutation.isPending ? "Creating..." : "Create Integration"}
              </Button>
            </CardContent>
          </Card>

          {/* Integrations List */}
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id} data-testid={`integration-${integration.name}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {integration.name}
                      <Badge variant="outline">{integration.type.replace('_', ' ')}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(integration.lastTestStatus)}
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={(checked) => 
                          updateIntegrationMutation.mutate({ id: integration.id, updates: { isEnabled: checked } })
                        }
                        data-testid={`switch-integration-enabled-${integration.name}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {integration.lastTestAt && (
                        <p className="text-sm text-muted-foreground">
                          Last tested: {new Date(integration.lastTestAt).toLocaleString()}
                        </p>
                      )}
                      {integration.errorMessage && (
                        <p className="text-sm text-destructive">{integration.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testIntegrationMutation.mutate(integration.id)}
                        disabled={testIntegrationMutation.isPending}
                        data-testid={`button-test-integration-${integration.name}`}
                      >
                        <TestTube className="h-4 w-4 mr-1" />
                        {testIntegrationMutation.isPending ? "Testing..." : "Test"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                        data-testid={`button-delete-integration-${integration.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}