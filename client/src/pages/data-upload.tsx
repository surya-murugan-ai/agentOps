import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Server, Database, Activity, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function DataUploadPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [serverData, setServerData] = useState(`[
  {
    "hostname": "web-prod-01",
    "ipAddress": "10.0.1.100",
    "environment": "production",
    "location": "us-east-1a",
    "tags": ["web", "frontend", "nginx"]
  }
]`);
  const [metricsData, setMetricsData] = useState(`[
  {
    "hostname": "web-prod-01",
    "cpuUsage": 45.2,
    "memoryUsage": 68.5,
    "memoryTotal": 16384,
    "diskUsage": 45.0,
    "diskTotal": 500,
    "networkLatency": 2.3,
    "networkThroughput": 125.5,
    "processCount": 127
  }
]`);
  const [alertsData, setAlertsData] = useState(`[
  {
    "hostname": "web-prod-01",
    "title": "High CPU Usage",
    "description": "CPU usage exceeded 85% threshold",
    "severity": "critical",
    "metricType": "cpu",
    "metricValue": 87.5,
    "threshold": 85.0
  }
]`);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const uploadServersMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/servers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servers: data })
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      toast({ title: `Successfully uploaded ${result.count} servers` });
    },
  });

  const uploadMetricsMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/metrics/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: data })
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/range'] });
      toast({ title: `Successfully uploaded ${result.count} metric records` });
    },
  });

  const uploadAlertsMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/alerts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts: data })
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({ title: `Successfully uploaded ${result.count} alerts` });
    },
  });

  const connectExternalMutation = useMutation({
    mutationFn: async ({ endpoint, key }: { endpoint: string; key: string }) => {
      const response = await fetch('/api/integrations/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, apiKey: key })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "External data source connected successfully" });
    },
  });

  const testAgentsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Agent testing cycle initiated - check dashboard for results" });
    },
  });

  const handleServerUpload = () => {
    try {
      const data = JSON.parse(serverData);
      const servers = Array.isArray(data) ? data : [data];
      uploadServersMutation.mutate(servers);
    } catch (error) {
      toast({ title: "Invalid JSON format", variant: "destructive" });
    }
  };

  const handleMetricsUpload = () => {
    try {
      const data = JSON.parse(metricsData);
      const metrics = Array.isArray(data) ? data : [data];
      uploadMetricsMutation.mutate(metrics);
    } catch (error) {
      toast({ title: "Invalid JSON format", variant: "destructive" });
    }
  };

  const handleAlertsUpload = () => {
    try {
      const data = JSON.parse(alertsData);
      const alerts = Array.isArray(data) ? data : [data];
      uploadAlertsMutation.mutate(alerts);
    } catch (error) {
      toast({ title: "Invalid JSON format", variant: "destructive" });
    }
  };

  const handleExternalConnect = () => {
    if (!apiEndpoint || !apiKey) {
      toast({ title: "Please provide both endpoint and API key", variant: "destructive" });
      return;
    }
    connectExternalMutation.mutate({ endpoint: apiEndpoint, key: apiKey });
  };

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];

      if (extension === 'csv') {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }

      // Detect data type based on columns and upload appropriately
      if (data.length > 0) {
        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        
        if (columns.includes('hostname') && columns.includes('cpuUsage')) {
          // Metrics data
          await uploadMetricsMutation.mutateAsync(data);
        } else if (columns.includes('hostname') && columns.includes('ipAddress')) {
          // Server data
          await uploadServersMutation.mutateAsync(data);
        } else if (columns.includes('title') && columns.includes('severity')) {
          // Alert data
          await uploadAlertsMutation.mutateAsync(data);
        } else {
          toast({ 
            title: "Unknown data format", 
            description: "Could not determine data type from file columns",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const serverExample = `[
  {
    "hostname": "web-prod-01",
    "ipAddress": "10.0.1.100",
    "environment": "production",
    "location": "us-east-1a",
    "tags": ["web", "frontend", "nginx"]
  },
  {
    "hostname": "db-prod-01", 
    "ipAddress": "10.0.2.100",
    "environment": "production",
    "location": "us-east-1a",
    "tags": ["database", "postgresql"]
  }
]`;

  const metricsExample = `[
  {
    "hostname": "web-prod-01",
    "cpuUsage": 45.2,
    "memoryUsage": 68.5,
    "memoryTotal": 16384,
    "diskUsage": 45.0,
    "diskTotal": 500,
    "networkLatency": 2.3,
    "networkThroughput": 125.5,
    "processCount": 127,
    "timestamp": "2025-01-13T10:30:00Z"
  }
]`;

  const alertsExample = `[
  {
    "hostname": "web-prod-01",
    "title": "High CPU Usage",
    "description": "CPU usage exceeded 85% threshold",
    "severity": "critical",
    "metricType": "cpu",
    "metricValue": 87.5,
    "threshold": 85.0
  }
]`;

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Live Data Integration</h1>
          <p className="text-slate-400 mt-1">Upload your infrastructure data and test AI agents with real monitoring data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6 text-center">
              <Server className="mx-auto mb-4 text-primary" size={32} />
              <h3 className="text-white font-semibold mb-2">Upload Servers</h3>
              <p className="text-slate-400 text-sm">Add your infrastructure inventory</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6 text-center">
              <Activity className="mx-auto mb-4 text-success" size={32} />
              <h3 className="text-white font-semibold mb-2">Upload Metrics</h3>
              <p className="text-slate-400 text-sm">Historical performance data</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="mx-auto mb-4 text-warning" size={32} />
              <h3 className="text-white font-semibold mb-2">Upload Alerts</h3>
              <p className="text-slate-400 text-sm">Existing alert history</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="bg-dark-surface border-dark-border">
            <TabsTrigger value="upload">JSON Upload</TabsTrigger>
            <TabsTrigger value="files">CSV/Excel Upload</TabsTrigger>
            <TabsTrigger value="connect">External Sources</TabsTrigger>
            <TabsTrigger value="test">Test Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Server Upload */}
              <Card className="bg-dark-surface border-dark-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Server size={20} />
                    <span>Server Inventory</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label htmlFor="server-data" className="text-slate-300">JSON Data</Label>
                  <Textarea
                    id="server-data"
                    placeholder={serverExample}
                    value={serverData}
                    onChange={(e) => setServerData(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white h-32"
                  />
                  <Button 
                    onClick={handleServerUpload}
                    disabled={uploadServersMutation.isPending || !serverData}
                    className="w-full"
                    data-testid="button-upload-servers"
                  >
                    <Upload size={16} className="mr-2" />
                    {uploadServersMutation.isPending ? 'Uploading...' : 'Upload Servers'}
                  </Button>
                </CardContent>
              </Card>

              {/* Metrics Upload */}
              <Card className="bg-dark-surface border-dark-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Activity size={20} />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label htmlFor="metrics-data" className="text-slate-300">JSON Data</Label>
                  <Textarea
                    id="metrics-data"
                    placeholder={metricsExample}
                    value={metricsData}
                    onChange={(e) => setMetricsData(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white h-32"
                  />
                  <Button 
                    onClick={handleMetricsUpload}
                    disabled={uploadMetricsMutation.isPending || !metricsData}
                    className="w-full"
                    data-testid="button-upload-metrics"
                  >
                    <Upload size={16} className="mr-2" />
                    {uploadMetricsMutation.isPending ? 'Uploading...' : 'Upload Metrics'}
                  </Button>
                </CardContent>
              </Card>

              {/* Alerts Upload */}
              <Card className="bg-dark-surface border-dark-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <AlertTriangle size={20} />
                    <span>Alert History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label htmlFor="alerts-data" className="text-slate-300">JSON Data</Label>
                  <Textarea
                    id="alerts-data"
                    placeholder={alertsExample}
                    value={alertsData}
                    onChange={(e) => setAlertsData(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white h-32"
                  />
                  <Button 
                    onClick={handleAlertsUpload}
                    disabled={uploadAlertsMutation.isPending || !alertsData}
                    className="w-full"
                    data-testid="button-upload-alerts"
                  >
                    <Upload size={16} className="mr-2" />
                    {uploadAlertsMutation.isPending ? 'Uploading...' : 'Upload Alerts'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <FileText size={20} />
                  <span>CSV & Excel File Upload</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-slate-300 space-y-2">
                  <p>Upload CSV or Excel files containing your data. The system will automatically detect the data type based on column headers:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><strong>Server Data:</strong> Must include 'hostname' and 'ipAddress' columns</li>
                    <li><strong>Metrics Data:</strong> Must include 'hostname' and 'cpuUsage' columns</li>
                    <li><strong>Alert Data:</strong> Must include 'title' and 'severity' columns</li>
                  </ul>
                </div>
                
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  disabled={uploadingFile}
                  className="bg-slate-800 border-slate-600 text-white"
                  data-testid="input-file-upload"
                />
                
                {uploadingFile && (
                  <div className="flex items-center space-x-2 text-slate-300">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing file...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connect" className="space-y-6">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>Connect External Data Source</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api-endpoint" className="text-slate-300">API Endpoint</Label>
                    <Input
                      id="api-endpoint"
                      placeholder="https://prometheus.example.com/api/v1"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="api-key" className="text-slate-300">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleExternalConnect}
                  disabled={connectExternalMutation.isPending}
                  className="w-full"
                >
                  <Database size={16} className="mr-2" />
                  Connect Data Source
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <CheckCircle size={20} />
                  <span>Test AI Agents</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300">
                  After uploading your data, test all AI agents to see how they process your real infrastructure data.
                  This will trigger anomaly detection, predictive analytics, and remediation recommendations.
                </p>
                
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">What this test does:</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Runs anomaly detection on your uploaded metrics</li>
                    <li>• Generates predictive analytics for your servers</li>
                    <li>• Creates remediation recommendations for detected issues</li>
                    <li>• Tests the approval and compliance workflow</li>
                    <li>• Generates audit logs for all activities</li>
                  </ul>
                </div>

                <Button 
                  onClick={() => testAgentsMutation.mutate()}
                  disabled={testAgentsMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <Activity size={16} className="mr-2" />
                  Run Agent Test Cycle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}