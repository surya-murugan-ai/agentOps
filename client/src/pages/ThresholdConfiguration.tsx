import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, RefreshCw, TestTube } from "lucide-react";

interface AlertThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  network: { 
    latencyWarning: number; 
    latencyCritical: number; 
    throughputWarning: number; 
  };
}

interface ThresholdConfig {
  [environment: string]: AlertThresholds;
}

export default function ThresholdConfiguration() {
  const [thresholds, setThresholds] = useState<ThresholdConfig>({});
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('production');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const environments = ['production', 'staging', 'development', 'default'];

  useEffect(() => {
    document.title = "Threshold Configuration - AgentOps";
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/thresholds');
      if (response.ok) {
        const data = await response.json();
        setThresholds(data.thresholds);
      } else {
        throw new Error('Failed to load thresholds');
      }
    } catch (error) {
      toast({
        title: "Error Loading Thresholds",
        description: "Failed to load threshold configurations from server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveThresholds = async () => {
    try {
      setSaving(true);
      const envThresholds = thresholds[selectedEnvironment];
      
      const response = await fetch(`/api/thresholds/${selectedEnvironment}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds: envThresholds })
      });

      if (response.ok) {
        toast({
          title: "Thresholds Updated",
          description: `Successfully updated thresholds for ${selectedEnvironment} environment.`,
        });
      } else {
        throw new Error('Failed to save thresholds');
      }
    } catch (error) {
      toast({
        title: "Error Saving Thresholds",
        description: "Failed to save threshold configurations.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      const response = await fetch(`/api/thresholds/${selectedEnvironment}/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setThresholds(prev => ({ ...prev, [selectedEnvironment]: data.thresholds }));
        toast({
          title: "Thresholds Reset",
          description: `Reset ${selectedEnvironment} thresholds to defaults.`,
        });
      } else {
        throw new Error('Failed to reset thresholds');
      }
    } catch (error) {
      toast({
        title: "Error Resetting Thresholds",
        description: "Failed to reset threshold configurations.",
        variant: "destructive",
      });
    }
  };

  const testThreshold = async (metricType: 'cpu' | 'memory' | 'disk', value: number) => {
    try {
      setTesting(true);
      const response = await fetch('/api/thresholds/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metricType, 
          value, 
          environment: selectedEnvironment 
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.result;
        toast({
          title: "Threshold Test Result",
          description: `${value}% ${metricType.toUpperCase()} usage → ${result.severity.toUpperCase()} alert`,
          variant: result.severity === 'critical' ? 'destructive' : 'default',
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test threshold value.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const updateThreshold = (
    metricType: 'cpu' | 'memory' | 'disk',
    thresholdType: 'warning' | 'critical',
    value: number
  ) => {
    setThresholds(prev => ({
      ...prev,
      [selectedEnvironment]: {
        ...prev[selectedEnvironment],
        [metricType]: {
          ...prev[selectedEnvironment]?.[metricType],
          [thresholdType]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading threshold configurations...</p>
        </div>
      </div>
    );
  }

  const currentThresholds = thresholds[selectedEnvironment] || {
    cpu: { warning: 85, critical: 95 },
    memory: { warning: 85, critical: 95 },
    disk: { warning: 80, critical: 90 },
    network: { latencyWarning: 100, latencyCritical: 500, throughputWarning: 10 }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Alert Threshold Configuration</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Configure monitoring thresholds for different environments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
            <SelectTrigger className="w-40" data-testid="select-environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {environments.map(env => (
                <SelectItem key={env} value={env}>
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={resetToDefaults}
            data-testid="button-reset-defaults"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>

          <Button 
            onClick={saveThresholds} 
            disabled={saving}
            data-testid="button-save-thresholds"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              CPU Usage Thresholds
              <Badge variant="outline">Percentage</Badge>
            </CardTitle>
            <CardDescription>
              Configure CPU usage alert thresholds for {selectedEnvironment} environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpu-warning">Warning Threshold (%)</Label>
              <Input
                id="cpu-warning"
                type="number"
                min="0"
                max="100"
                value={currentThresholds.cpu.warning}
                onChange={(e) => updateThreshold('cpu', 'warning', parseInt(e.target.value) || 0)}
                data-testid="input-cpu-warning"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cpu-critical">Critical Threshold (%)</Label>
              <Input
                id="cpu-critical"
                type="number"
                min="0"
                max="100"
                value={currentThresholds.cpu.critical}
                onChange={(e) => updateThreshold('cpu', 'critical', parseInt(e.target.value) || 0)}
                data-testid="input-cpu-critical"
              />
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => testThreshold('cpu', 87)}
              disabled={testing}
              data-testid="button-test-cpu"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test with 87% CPU
            </Button>
          </CardContent>
        </Card>

        {/* Memory Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Memory Usage Thresholds
              <Badge variant="outline">Percentage</Badge>
            </CardTitle>
            <CardDescription>
              Configure memory usage alert thresholds for {selectedEnvironment} environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memory-warning">Warning Threshold (%)</Label>
              <Input
                id="memory-warning"
                type="number"
                min="0"
                max="100"
                value={currentThresholds.memory.warning}
                onChange={(e) => updateThreshold('memory', 'warning', parseInt(e.target.value) || 0)}
                data-testid="input-memory-warning"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memory-critical">Critical Threshold (%)</Label>
              <Input
                id="memory-critical"
                type="number"
                min="0"
                max="100"
                value={currentThresholds.memory.critical}
                onChange={(e) => updateThreshold('memory', 'critical', parseInt(e.target.value) || 0)}
                data-testid="input-memory-critical"
              />
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => testThreshold('memory', 92)}
              disabled={testing}
              data-testid="button-test-memory"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test with 92% Memory
            </Button>
          </CardContent>
        </Card>

        {/* Disk Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Disk Usage Thresholds
              <Badge variant="outline">Percentage</Badge>
            </CardTitle>
            <CardDescription>
              Configure disk usage alert thresholds for {selectedEnvironment} environment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disk-warning">Warning Threshold (%)</Label>
              <Input
                id="disk-warning"
                type="number"
                min="0"
                max="100"
                value={currentThresholds.disk.warning}
                onChange={(e) => updateThreshold('disk', 'warning', parseInt(e.target.value) || 0)}
                data-testid="input-disk-warning"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="disk-critical">Critical Threshold (%)</Label>
              <Input
                id="disk-critical"
                type="number"
                min="0"
                max="100"
                value={currentThresholds.disk.critical}
                onChange={(e) => updateThreshold('disk', 'critical', parseInt(e.target.value) || 0)}
                data-testid="input-disk-critical"
              />
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => testThreshold('disk', 83)}
              disabled={testing}
              data-testid="button-test-disk"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test with 83% Disk
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration Summary</CardTitle>
          <CardDescription>
            Overview of all threshold settings for {selectedEnvironment} environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-2">CPU Thresholds</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Warning: {currentThresholds.cpu.warning}% | Critical: {currentThresholds.cpu.critical}%
              </p>
            </div>
            
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-2">Memory Thresholds</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Warning: {currentThresholds.memory.warning}% | Critical: {currentThresholds.memory.critical}%
              </p>
            </div>
            
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold mb-2">Disk Thresholds</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Warning: {currentThresholds.disk.warning}% | Critical: {currentThresholds.disk.critical}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}