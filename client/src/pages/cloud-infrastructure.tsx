import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, 
  Plus, 
  Settings, 
  Activity, 
  DollarSign,
  Globe,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

interface CloudResource {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: 'ec2' | 'vm' | 'rds' | 's3' | 'storage_account';
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  environment: string;
  status: string;
  configuration: any;
  tags: Record<string, any>;
  cost: string;
  lastSync: string;
  createdAt: string;
}

interface CloudConnection {
  id: string;
  name: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  accountId?: string;
  isActive: boolean;
  lastTestResult?: {
    status: 'success' | 'error';
    message: string;
    timestamp: string;
  };
}

export default function CloudInfrastructure() {
  const { data: cloudResources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['/api/cloud-resources'],
    refetchInterval: 30000,
  });

  const { data: cloudConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['/api/cloud-connections'],
    refetchInterval: 60000,
  });

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws':
        return '🟠';
      case 'azure':
        return '🔵';
      case 'gcp':
        return '🔴';
      default:
        return '☁️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      case 'starting':
        return 'bg-yellow-500';
      case 'stopping':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getResourceTypeDisplay = (type: string) => {
    switch (type) {
      case 'ec2':
        return 'EC2 Instance';
      case 'vm':
        return 'Virtual Machine';
      case 'rds':
        return 'RDS Database';
      case 's3':
        return 'S3 Bucket';
      case 'storage_account':
        return 'Storage Account';
      default:
        return type.toUpperCase();
    }
  };

  const handleTriggerDiscovery = async () => {
    try {
      const response = await fetch('/api/cloud-discovery/trigger', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Refresh the data after triggering discovery
        window.location.reload();
      }
    } catch (error) {
      console.error('Error triggering cloud discovery:', error);
    }
  };

  if (resourcesLoading || connectionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading cloud infrastructure...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cloud Infrastructure</h1>
          <p className="text-muted-foreground">
            Monitor and manage your AWS, Azure, and GCP resources
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleTriggerDiscovery} data-testid="button-trigger-discovery">
            <RefreshCw className="h-4 w-4 mr-2" />
            Trigger Discovery
          </Button>
          <Button data-testid="button-add-connection">
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-resources">
              {cloudResources.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-running-resources">
              {cloudResources.filter((r: CloudResource) => r.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-monthly-cost">
              ${cloudResources.reduce((sum: number, r: CloudResource) => sum + parseFloat(r.cost || '0'), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-providers-count">
              {new Set(cloudResources.map((r: CloudResource) => r.provider)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Connected
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          {cloudResources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cloud Resources Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect your cloud providers to start monitoring your infrastructure
                </p>
                <Button data-testid="button-setup-first-connection">
                  <Plus className="h-4 w-4 mr-2" />
                  Setup First Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cloudResources.map((resource: CloudResource) => (
                <Card key={resource.id} data-testid={`card-resource-${resource.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getProviderIcon(resource.provider)}</span>
                        <div>
                          <CardTitle className="text-lg">{resource.resourceName}</CardTitle>
                          <CardDescription>
                            {getResourceTypeDisplay(resource.resourceType)} • {resource.region}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {resource.environment}
                        </Badge>
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(resource.status)}`} />
                        <span className="text-sm text-muted-foreground capitalize">
                          {resource.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Resource Details</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-muted-foreground">ID:</span> {resource.resourceId}</div>
                          <div><span className="text-muted-foreground">Provider:</span> {resource.provider.toUpperCase()}</div>
                          <div><span className="text-muted-foreground">Type:</span> {getResourceTypeDisplay(resource.resourceType)}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Cost & Billing</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-muted-foreground">Monthly Cost:</span> ${resource.cost}</div>
                          <div><span className="text-muted-foreground">Last Sync:</span> {new Date(resource.lastSync).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(resource.tags || {}).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          {cloudConnections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cloud Connections</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add your first cloud provider connection to start monitoring
                </p>
                <Button data-testid="button-add-first-connection">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cloudConnections.map((connection: CloudConnection) => (
                <Card key={connection.id} data-testid={`card-connection-${connection.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getProviderIcon(connection.provider)}</span>
                        <div>
                          <CardTitle className="text-lg">{connection.name}</CardTitle>
                          <CardDescription>
                            {connection.provider.toUpperCase()} • {connection.region}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={connection.isActive ? "default" : "secondary"}>
                          {connection.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {connection.lastTestResult && (
                          <Badge 
                            variant={connection.lastTestResult.status === 'success' ? "default" : "destructive"}
                          >
                            {connection.lastTestResult.status === 'success' ? '✓' : '✗'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {connection.accountId && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Account ID:</span> {connection.accountId}
                        </div>
                      )}
                      
                      {connection.lastTestResult && (
                        <div className="flex items-start space-x-2">
                          {connection.lastTestResult.status === 'error' && (
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                          )}
                          <div className="text-sm">
                            <span className="text-muted-foreground">Last Test:</span> {connection.lastTestResult.message}
                            <div className="text-xs text-muted-foreground">
                              {new Date(connection.lastTestResult.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}