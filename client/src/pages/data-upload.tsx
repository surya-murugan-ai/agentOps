import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Server, Database, Activity, AlertTriangle, CheckCircle, FileText, X, Eye, Download, RefreshCw, CloudUpload, FileSpreadsheet, Settings, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface UploadState {
  isUploading: boolean;
  progress: number;
  currentFile?: File;
  previewData?: any[];
  dataType?: string;
  validationErrors?: string[];
  processed?: number;
  total?: number;
  successful?: number;
  failed?: number;
  timeElapsed?: number;
  timeRemaining?: number;
  status?: 'processing' | 'completed' | 'error';
  errors?: string[];
}

interface DataTemplate {
  type: string;
  name: string;
  description: string;
  requiredFields: string[];
  example: any;
  icon: any;
}

export default function DataUploadPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ isUploading: false, progress: 0 });
  const [selectedDataType, setSelectedDataType] = useState<string>('auto');
  const [showPreview, setShowPreview] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  // WebSocket connection for real-time progress updates
  useEffect(() => {
    try {
      // Use secure WebSocket for HTTPS and regular for HTTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'upload_progress') {
            setUploadState(prev => ({
              ...prev,
              progress: data.data.progress || 0,
              processed: data.data.processed,
              total: data.data.total,
              successful: data.data.successful,
              failed: data.data.failed,
              timeElapsed: data.data.timeElapsed,
              timeRemaining: data.data.timeRemaining,
              status: data.data.status,
              errors: data.data.errors
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      // Continue without WebSocket - progress will still work via polling
    }
  }, []);

  // Get current data counts for context
  const { data: currentStats } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
  });

  const dataTemplates: DataTemplate[] = [
    {
      type: 'servers',
      name: 'Server Inventory',
      description: 'Infrastructure servers and their configurations',
      requiredFields: ['hostname'],
      icon: Server,
      example: {
        hostname: "web-prod-01",
        ipAddress: "10.0.1.100", 
        environment: "production",
        location: "us-east-1a",
        tags: ["web", "frontend"]
      }
    },
    {
      type: 'metrics',
      name: 'Performance Metrics',
      description: 'Real-time and historical server performance data',
      requiredFields: ['serverid'],
      icon: Activity,
      example: {
        serverid: "SRV-001",
        timestamp: "2025-01-13T10:30:00Z",
        cpu_usage: 75.2,
        memory_usage: 68.5,
        disk_usage: 45.3,
        network_latency: 12.4
      }
    },
    {
      type: 'alerts',
      name: 'Alert History',
      description: 'Historical alerts and incidents',
      requiredFields: ['title', 'severity'],
      icon: AlertTriangle,
      example: {
        hostname: "web-prod-01",
        title: "High CPU Usage",
        description: "CPU exceeded threshold",
        severity: "critical",
        metricType: "cpu",
        metricValue: 87.5,
        threshold: 85.0
      }
    },
    {
      type: 'remediations',
      name: 'Remediation Actions',
      description: 'Automated remediation actions and workflows',
      requiredFields: ['title', 'actionType'],
      icon: Settings,
      example: {
        hostname: "web-prod-01",
        title: "Restart Apache Service",
        description: "Automatically restart web service due to high memory usage",
        actionType: "restart_service",
        confidence: 85.0,
        estimatedDowntime: 30,
        status: "pending"
      }
    },
    {
      type: 'audit-logs',
      name: 'Audit Logs',
      description: 'System audit trail and compliance logs',
      requiredFields: ['action', 'status'],
      icon: FileText,
      example: {
        hostname: "web-prod-01",
        agentName: "Remediation Executor",
        action: "restart_service",
        details: "Restarted Apache service on web-prod-01",
        status: "success",
        impact: "Service restored, response time improved",
        timestamp: "2025-01-13T10:45:00Z"
      }
    }
  ];

  const uploadDataMutation = useMutation({
    mutationFn: async ({ data, type }: { data: any[], type: string }) => {
      setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));
      
      // Use smart upload endpoint when auto-detect is selected
      const useSmartUpload = selectedDataType === 'auto' || type === 'auto';
      
      const endpoint = useSmartUpload ? '/api/data/smart-upload' :
                     type === 'servers' ? '/api/servers/bulk' :
                     type === 'metrics' ? '/api/metrics/bulk' :
                     type === 'alerts' ? '/api/alerts/bulk' :
                     type === 'remediations' ? '/api/remediation-actions/bulk' :
                     type === 'audit-logs' ? '/api/audit-logs/bulk' :
                     '/api/data/smart-upload';
      
      const payload = useSmartUpload ? { data } :
                     type === 'servers' ? { servers: data } :
                     type === 'metrics' ? { metrics: data } :
                     type === 'alerts' ? { alerts: data } :
                     type === 'remediations' ? { remediations: data } :
                     type === 'audit-logs' ? { auditLogs: data } :
                     { data };

      // Don't simulate progress anymore - WebSocket will handle it

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Progress will be updated via WebSocket
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (result, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/range'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      
      const confidence = result.confidence ? ` (${Math.round(result.confidence * 100)}% confidence)` : '';
      const dataTypeInfo = result.dataType ? ` as ${result.dataType}` : '';
      
      toast({ 
        title: `✅ Upload Complete`, 
        description: `Successfully uploaded ${result.count} records${dataTypeInfo}${confidence}`
      });
      
      setTimeout(() => {
        setUploadState({ isUploading: false, progress: 0 });
      }, 2000); // Keep results visible for 2 seconds
      setShowPreview(false);
    },
    onError: (error) => {
      toast({ 
        title: "Upload Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
      setUploadState({ isUploading: false, progress: 0, status: 'error' });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: async (type: string) => {
      const template = dataTemplates.find(t => t.type === type);
      if (!template) throw new Error('Template not found');
      
      const sampleData = Array.from({ length: 3 }, () => ({ ...template.example }));
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, template.name);
      
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: (_, type) => {
      toast({ title: `📁 Template Downloaded`, description: `${type} template ready for use` });
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
      toast({ title: "🔗 External Connection Established", description: "Data source connected successfully" });
    },
  });

  const validateData = (data: any[], type: string): string[] => {
    const errors: string[] = [];
    const template = dataTemplates.find(t => t.type === type);
    
    if (!template) {
      errors.push('Unknown data type');
      return errors;
    }

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('Data must be a non-empty array');
      return errors;
    }

    // Flexible field validation based on data type
    if (type === 'servers') {
      const firstRow = data[0];
      const columns = Object.keys(firstRow).map(col => col.toLowerCase());
      
      const hasIdentifier = columns.some(col => 
        col.includes('hostname') || col.includes('host') || 
        col.includes('serverid') || col.includes('server_id') || 
        col.includes('id') || col.includes('name')
      );
      
      if (!hasIdentifier) {
        errors.push('Server data must have at least one identifier field (hostname, serverid, id, etc.)');
      }
    } else if (type === 'metrics') {
      const firstRow = data[0];
      const columns = Object.keys(firstRow).map(col => col.toLowerCase());
      
      const hasIdentifier = columns.some(col => 
        col.includes('hostname') || col.includes('host') || 
        col.includes('serverid') || col.includes('server_id') || 
        col.includes('id') || col.includes('name')
      );
      
      const hasMetric = columns.some(col => 
        col.includes('cpu') || col.includes('memory') || col.includes('disk') || 
        col.includes('usage') || col.includes('latency') || col.includes('network')
      );
      
      if (!hasIdentifier) {
        errors.push('Metrics data must have at least one server identifier field (hostname, serverid, etc.)');
      }
      
      if (!hasMetric) {
        errors.push('Metrics data must have at least one performance metric field (cpu, memory, disk, etc.)');
      }
    } else {
      // For other data types, use the original validation
      const missingFields = template.requiredFields.filter(field => 
        !data.every(item => item.hasOwnProperty(field))
      );

      if (missingFields.length > 0) {
        errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      }
    }

    // Additional validations
    if (type === 'servers') {
      data.forEach((item, index) => {
        if (item.ipAddress && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(item.ipAddress)) {
          errors.push(`Row ${index + 1}: Invalid IP address format`);
        }
      });
    }

    if (type === 'metrics') {
      data.forEach((item, index) => {
        if (item.cpuUsage && (item.cpuUsage < 0 || item.cpuUsage > 100)) {
          errors.push(`Row ${index + 1}: CPU usage must be between 0-100`);
        }
      });
    }

    if (type === 'alerts') {
      const validSeverities = ['critical', 'warning', 'info'];
      data.forEach((item, index) => {
        if (item.severity && !validSeverities.includes(item.severity)) {
          errors.push(`Row ${index + 1}: Invalid severity level`);
        }
      });
    }

    return errors;
  };

  const detectDataType = (data: any[]): string => {
    if (!data || data.length === 0) return 'unknown';
    
    const firstRow = data[0];
    const columns = Object.keys(firstRow).map(col => col.toLowerCase());
    
    console.log('Detecting data type for columns:', columns);
    
    // Enhanced matching for servers data
    const hasServerId = columns.some(col => col.includes('serverid') || col.includes('server_id') || col.includes('id'));
    const hasHostname = columns.some(col => col.includes('hostname') || col.includes('host') || col.includes('server'));
    const hasLocation = columns.some(col => col.includes('location') || col.includes('region') || col.includes('datacenter'));
    const hasOwner = columns.some(col => col.includes('owner') || col.includes('team') || col.includes('group'));
    const hasSla = columns.some(col => col.includes('sla') || col.includes('tier') || col.includes('priority'));
    const hasIpAddress = columns.some(col => col.includes('ip') || col.includes('address'));
    const hasEnvironment = columns.some(col => col.includes('env') || col.includes('environment'));
    
    // Enhanced matching for metrics data
    const hasCpu = columns.some(col => col.includes('cpu') || col.includes('processor'));
    const hasMemory = columns.some(col => col.includes('memory') || col.includes('mem') || col.includes('ram'));
    const hasUsage = columns.some(col => col.includes('usage') || col.includes('percent') || col.includes('%'));
    const hasTimestamp = columns.some(col => col.includes('timestamp') || col.includes('time') || col.includes('date'));
    
    // Enhanced matching for alerts data
    const hasTitle = columns.some(col => col.includes('title') || col.includes('message') || col.includes('description'));
    const hasSeverity = columns.some(col => col.includes('severity') || col.includes('level') || col.includes('priority'));
    const hasAlert = columns.some(col => col.includes('alert') || col.includes('incident'));
    
    // Enhanced matching for remediation actions
    const hasActionType = columns.some(col => col.includes('action') || col.includes('type'));
    const hasConfidence = columns.some(col => col.includes('confidence') || col.includes('score'));
    const hasRemediation = columns.some(col => col.includes('remediation') || col.includes('fix'));
    
    // Enhanced matching for audit logs
    const hasStatus = columns.some(col => col.includes('status') || col.includes('result'));
    const hasImpact = columns.some(col => col.includes('impact') || col.includes('effect'));
    const hasAudit = columns.some(col => col.includes('audit') || col.includes('log'));
    
    // Server detection - prioritize server-specific patterns
    if ((hasServerId || hasHostname) && (hasLocation || hasOwner || hasSla || hasIpAddress || hasEnvironment)) {
      console.log('Detected as servers data');
      return 'servers';
    }
    
    // Metrics detection - must have performance indicators
    if ((hasHostname || hasServerId) && (hasCpu || hasMemory || hasUsage) && hasTimestamp) {
      console.log('Detected as metrics data');
      return 'metrics';
    }
    
    // Alert detection
    if ((hasTitle || hasAlert) && hasSeverity) {
      console.log('Detected as alerts data');
      return 'alerts';
    }
    
    // Remediation detection
    if ((hasTitle || hasRemediation) && (hasActionType || hasConfidence)) {
      console.log('Detected as remediations data');
      return 'remediations';
    }
    
    // Audit logs detection
    if ((hasActionType || hasAudit) && hasStatus) {
      console.log('Detected as audit-logs data');
      return 'audit-logs';
    }
    
    // Additional fallback detection patterns
    if (hasStatus && (hasHostname || hasServerId)) {
      console.log('Detected as servers data (fallback)');
      return 'servers';
    }
    
    if (hasTimestamp && (hasCpu || hasMemory)) {
      console.log('Detected as metrics data (fallback)');
      return 'metrics';
    }
    
    console.log('Could not detect data type, returning unknown');
    return 'unknown';
  };

  const processFileData = useCallback(async (file: File) => {
    setUploadState({ isUploading: true, progress: 10, currentFile: file });
    
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];

      if (extension === 'csv') {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet);
      } else if (extension === 'json') {
        const text = await file.text();
        data = JSON.parse(text);
      } else {
        throw new Error('Unsupported file format. Use CSV, Excel, or JSON files.');
      }

      setUploadState(prev => ({ ...prev, progress: 50 }));

      const detectedType = selectedDataType === 'auto' ? detectDataType(data) : selectedDataType;
      const validationErrors = validateData(data, detectedType);

      setUploadState({
        isUploading: false,
        progress: 100,
        currentFile: file,
        previewData: data.slice(0, 10), // Show first 10 rows
        dataType: detectedType,
        validationErrors
      });

      setShowPreview(true);

    } catch (error) {
      toast({ 
        title: "Processing Failed", 
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
      setUploadState({ isUploading: false, progress: 0 });
    }
  }, [selectedDataType]);

  const handleExternalConnect = () => {
    if (!apiEndpoint || !apiKey) {
      toast({ title: "Please provide both endpoint and API key", variant: "destructive" });
      return;
    }
    connectExternalMutation.mutate({ endpoint: apiEndpoint, key: apiKey });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFileData(files[0]);
    }
  }, [processFileData]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFileData(files[0]);
    }
  }, [processFileData]);

  const confirmUpload = () => {
    if (uploadState.previewData && uploadState.dataType) {
      uploadDataMutation.mutate({ 
        data: uploadState.previewData, 
        type: uploadState.dataType 
      });
    }
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Advanced Data Integration</h1>
              <p className="text-slate-400 mt-1">Upload, validate, and manage your infrastructure data with intelligent processing</p>
            </div>
            <div className="flex items-center space-x-4">
              {currentStats && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-slate-300">
                    <span className="text-white font-semibold">{currentStats.totalServers}</span> Servers
                  </div>
                  <div className="text-slate-300">
                    <span className="text-white font-semibold">{currentStats.activeAlerts}</span> Alerts
                  </div>
                  <div className="text-slate-300">
                    <span className="text-white font-semibold">{currentStats.activeAgents}</span> Agents
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Type Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {dataTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.type} className="bg-dark-surface border-dark-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="text-primary" size={32} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadTemplateMutation.mutate(template.type)}
                      className="text-slate-400 hover:text-white"
                      data-testid={`button-download-${template.type}-template`}
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{template.name}</h3>
                  <p className="text-slate-400 text-sm mb-3">{template.description}</p>
                  <div className="text-xs text-slate-500">
                    Required: {template.requiredFields.join(', ')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="smart-upload" className="space-y-6">
          <TabsList className="bg-dark-surface border-dark-border">
            <TabsTrigger value="smart-upload">🎯 Smart Upload</TabsTrigger>
            <TabsTrigger value="templates">📋 Templates</TabsTrigger>
            <TabsTrigger value="integrations">🔗 Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="smart-upload" className="space-y-6">
            {/* Smart Upload Area */}
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <CloudUpload size={24} />
                  <span>Intelligent File Upload</span>
                </CardTitle>
                <div className="flex items-center space-x-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="data-type" className="text-slate-300">Data Type:</Label>
                    <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">🤖 Auto-detect with LLM</SelectItem>
                        <SelectItem value="servers">Servers</SelectItem>
                        <SelectItem value="metrics">Metrics</SelectItem>
                        <SelectItem value="alerts">Alerts</SelectItem>
                        <SelectItem value="remediations">Remediations</SelectItem>
                        <SelectItem value="audit-logs">Audit Logs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver 
                      ? 'border-primary bg-primary/10' 
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <FileSpreadsheet className="mx-auto text-slate-400" size={48} />
                    <div>
                      <h3 className="text-white text-lg font-semibold mb-2">
                        Drag & Drop Files Here
                      </h3>
                      <p className="text-slate-400 mb-4">
                        Support for CSV, Excel (.xlsx/.xls), and JSON files
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadState.isUploading}
                        data-testid="button-select-file"
                      >
                        <Upload size={16} className="mr-2" />
                        Select File
                      </Button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {uploadState.isUploading && (
                      <div className="space-y-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-white font-medium">
                              {uploadState.status === 'completed' ? 'Upload Complete' : 'Processing Upload'}
                            </span>
                          </div>
                          {uploadState.timeElapsed && (
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1 text-slate-400">
                                <Clock size={14} />
                                <span>{uploadState.timeElapsed}s elapsed</span>
                              </div>
                              {uploadState.timeRemaining && uploadState.timeRemaining > 0 && (
                                <span className="text-slate-400">
                                  ~{uploadState.timeRemaining}s remaining
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-300">
                              {uploadState.currentFile?.name}
                            </span>
                            <span className="text-slate-400">
                              {uploadState.progress || 0}%
                            </span>
                          </div>
                          <Progress 
                            value={uploadState.progress || 0} 
                            className="w-full h-2" 
                          />
                        </div>

                        {uploadState.total && (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-white font-semibold">
                                {uploadState.processed || 0}
                              </div>
                              <div className="text-slate-400">Processed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-400 font-semibold">
                                {uploadState.successful || 0}
                              </div>
                              <div className="text-slate-400">Successful</div>
                            </div>
                            <div className="text-center">
                              <div className="text-red-400 font-semibold">
                                {uploadState.failed || 0}
                              </div>
                              <div className="text-slate-400">Failed</div>
                            </div>
                          </div>
                        )}

                        {uploadState.errors && uploadState.errors.length > 0 && (
                          <div className="mt-3">
                            <Alert className="bg-red-900/20 border-red-800">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-red-300">
                                {uploadState.errors.slice(0, 2).join(', ')}
                                {uploadState.errors.length > 2 && ` (and ${uploadState.errors.length - 2} more)`}
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* File Format Guide */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dataTemplates.map((template) => (
                    <div key={template.type} className="bg-slate-800 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">{template.name}</h4>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>Required: <span className="text-slate-300">{template.requiredFields.join(', ')}</span></div>
                        <div className="font-mono text-slate-500 mt-2">
                          Example: {JSON.stringify(template.example, null, 2).slice(0, 100)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Preview Modal */}
            {showPreview && uploadState.previewData && (
              <Card className="bg-dark-surface border-dark-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Eye size={20} />
                    <span>Data Preview & Validation</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    <X size={16} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                        {uploadState.dataType?.toUpperCase()}
                      </Badge>
                      <span className="text-slate-300">
                        {uploadState.previewData.length} records detected
                      </span>
                      {selectedDataType === 'auto' && (
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                          🤖 LLM Analyzed
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowPreview(false)}
                        disabled={uploadDataMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={confirmUpload}
                        disabled={uploadDataMutation.isPending || uploadState.dataType === 'unknown'}
                        data-testid="button-confirm-upload"
                      >
                        {uploadDataMutation.isPending ? (
                          <>
                            <RefreshCw size={16} className="mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="mr-2" />
                            Confirm Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {uploadState.validationErrors && uploadState.validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle size={16} />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Validation Issues Found:</div>
                        <ul className="list-disc pl-4 space-y-1">
                          {uploadState.validationErrors.map((error, index) => (
                            <li key={index} className="text-sm">{error}</li>
                          ))}
                        </ul>
                        {uploadState.dataType === 'unknown' && (
                          <div className="mt-3 p-3 bg-slate-700 rounded">
                            <p className="text-sm text-slate-300 mb-2">
                              Can't automatically detect data type. Please select manually:
                            </p>
                            <Select 
                              value={selectedDataType} 
                              onValueChange={(value) => {
                                setSelectedDataType(value);
                                if (uploadState.currentFile) {
                                  processFileData(uploadState.currentFile);
                                }
                              }}
                            >
                              <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="servers">Servers</SelectItem>
                                <SelectItem value="metrics">Metrics</SelectItem>
                                <SelectItem value="alerts">Alerts</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Upload Progress */}
                  {uploadDataMutation.isPending && (
                    <div className="space-y-2">
                      <Progress value={uploadState.progress} className="w-full" />
                      <p className="text-slate-400 text-sm text-center">
                        Uploading {uploadState.dataType} data...
                      </p>
                    </div>
                  )}

                  {/* Data Preview Table */}
                  <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-auto">
                    {uploadState.previewData && uploadState.previewData.length > 0 && (
                      <div className="w-full">
                        {/* Table Header */}
                        <div className="grid gap-2 p-3 bg-slate-700 rounded-t-lg border-b border-slate-600"
                             style={{ 
                               gridTemplateColumns: Object.keys(uploadState.previewData[0]).map(() => 'minmax(120px, 1fr)').join(' ')
                             }}>
                          {Object.keys(uploadState.previewData[0]).map((key) => (
                            <div key={key} className="text-slate-300 font-semibold text-sm truncate" title={key}>
                              {key}
                            </div>
                          ))}
                        </div>
                        
                        {/* Table Body */}
                        <div className="space-y-1">
                          {uploadState.previewData.slice(0, 5).map((row, index) => {
                            const columns = Object.keys(uploadState.previewData[0]);
                            return (
                              <div 
                                key={index} 
                                className="grid gap-2 p-3 hover:bg-slate-700/50 border-b border-slate-700/30"
                                style={{ 
                                  gridTemplateColumns: columns.map(() => 'minmax(120px, 1fr)').join(' ')
                                }}
                              >
                                {columns.map((columnKey, cellIndex) => {
                                  const value = row[columnKey];
                                  return (
                                    <div 
                                      key={cellIndex} 
                                      className="text-slate-300 text-sm truncate" 
                                      title={String(value)}
                                    >
                                      {String(value).length > 25 
                                        ? String(value).substring(0, 25) + '...' 
                                        : String(value)
                                      }
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {uploadState.previewData && uploadState.previewData.length > 5 && (
                      <p className="text-slate-400 text-sm mt-2 text-center">
                        Showing 5 of {uploadState.previewData.length} rows
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dataTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card key={template.type} className="bg-dark-surface border-dark-border">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Icon size={20} />
                        <span>{template.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-slate-400 text-sm">{template.description}</p>
                      
                      <div className="space-y-2">
                        <h4 className="text-slate-300 font-medium">Required Fields:</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.requiredFields.map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-slate-300 font-medium">Example Data:</h4>
                        <div className="bg-slate-800 rounded p-3 text-xs font-mono text-slate-400 overflow-auto max-h-32">
                          {JSON.stringify(template.example, null, 2)}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          onClick={() => downloadTemplateMutation.mutate(template.type)}
                          disabled={downloadTemplateMutation.isPending}
                          className="flex-1"
                          data-testid={`button-download-${template.type}-template`}
                        >
                          <Download size={16} className="mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white">📁 Template Usage Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="text-white font-medium mb-2">Step 1: Download Template</h4>
                    <p className="text-slate-400">Click the download button for your data type to get a pre-formatted Excel template with example data.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Step 2: Fill Your Data</h4>
                    <p className="text-slate-400">Replace the example data with your actual infrastructure data, maintaining the column structure.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Step 3: Upload & Validate</h4>
                    <p className="text-slate-400">Use the Smart Upload tab to upload your filled template. The system will validate and preview your data.</p>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-2">Step 4: Confirm Import</h4>
                    <p className="text-slate-400">Review the preview and confirm to import your data into the AgentOps platform.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-dark-surface border-dark-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Database size={20} />
                    <span>External API Connection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint" className="text-slate-300">API Endpoint URL</Label>
                    <Input
                      id="api-endpoint"
                      placeholder="https://api.example.com/metrics"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key" className="text-slate-300">API Key / Token</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Your API authentication key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Button 
                    onClick={handleExternalConnect}
                    disabled={connectExternalMutation.isPending || !apiEndpoint || !apiKey}
                    className="w-full"
                    data-testid="button-connect-external"
                  >
                    <Database size={16} className="mr-2" />
                    {connectExternalMutation.isPending ? 'Connecting...' : 'Test Connection'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-dark-surface border-dark-border">
                <CardHeader>
                  <CardTitle className="text-white">🔗 Supported Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800 rounded-lg p-3">
                        <h4 className="text-white font-medium mb-1">Monitoring Tools</h4>
                        <ul className="text-slate-400 text-sm space-y-1">
                          <li>• Prometheus</li>
                          <li>• Datadog</li>
                          <li>• New Relic</li>
                          <li>• Grafana</li>
                        </ul>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <h4 className="text-white font-medium mb-1">Cloud Platforms</h4>
                        <ul className="text-slate-400 text-sm space-y-1">
                          <li>• AWS CloudWatch</li>
                          <li>• Azure Monitor</li>
                          <li>• GCP Monitoring</li>
                          <li>• Custom APIs</li>
                        </ul>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertTriangle size={16} />
                      <AlertDescription className="text-sm">
                        <strong>Note:</strong> API integrations will pull data in real-time and may incur costs based on your external service usage. Always test with small datasets first.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white">⚙️ Integration Setup Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-2">
                    <div className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center text-primary font-bold">1</div>
                    <h4 className="text-white font-medium">Obtain API Credentials</h4>
                    <p className="text-slate-400">Get your API key or authentication token from your monitoring service provider.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center text-primary font-bold">2</div>
                    <h4 className="text-white font-medium">Configure Endpoint</h4>
                    <p className="text-slate-400">Enter the API endpoint URL and authentication details in the form above.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-primary/20 rounded-full w-8 h-8 flex items-center justify-center text-primary font-bold">3</div>
                    <h4 className="text-white font-medium">Test & Monitor</h4>
                    <p className="text-slate-400">Test the connection and monitor your data flow in the dashboard.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}