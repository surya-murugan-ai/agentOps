import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";

interface AlertThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
  network: {
    latencyWarning: number;
    latencyCritical: number;
    throughputWarning: number;
  };
}

interface ThresholdConfig {
  [environment: string]: AlertThresholds;
}

export default function ThresholdManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEnvironment, setSelectedEnvironment] = useState("production");
  const [editedThresholds, setEditedThresholds] = useState<AlertThresholds | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: thresholds, isLoading } = useQuery<ThresholdConfig>({
    queryKey: ["/api/thresholds"],
  });

  const updateThresholdsMutation = useMutation({
    mutationFn: async ({ environment, thresholds }: { environment: string; thresholds: Partial<AlertThresholds> }) => {
      return apiRequest(`/api/thresholds/${environment}`, {
        method: "PUT",
        body: JSON.stringify(thresholds),
      });
    },
    onSuccess: () => {
      toast({
        title: "Thresholds Updated",
        description: `Successfully updated ${selectedEnvironment} thresholds`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/thresholds"] });
      setHasChanges(false);
      setEditedThresholds(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update thresholds",
        variant: "destructive",
      });
    },
  });

  const resetThresholdsMutation = useMutation({
    mutationFn: async (environment: string) => {
      return apiRequest(`/api/thresholds/${environment}/reset`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Thresholds Reset",
        description: `Reset ${selectedEnvironment} to default values`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/thresholds"] });
      setHasChanges(false);
      setEditedThresholds(null);
    },
  });

  useEffect(() => {
    if (thresholds && selectedEnvironment && thresholds[selectedEnvironment]) {
      setEditedThresholds({ ...thresholds[selectedEnvironment] });
      setHasChanges(false);
    }
  }, [thresholds, selectedEnvironment]);

  const handleThresholdChange = (
    category: keyof AlertThresholds,
    field: string,
    value: number
  ) => {
    if (!editedThresholds) return;

    const updated = { ...editedThresholds };
    (updated[category] as any)[field] = value;
    setEditedThresholds(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!editedThresholds || !hasChanges) return;
    updateThresholdsMutation.mutate({
      environment: selectedEnvironment,
      thresholds: editedThresholds,
    });
  };

  const handleReset = () => {
    resetThresholdsMutation.mutate(selectedEnvironment);
  };

  const getThresholdStatus = (current: number, warning: number, critical: number) => {
    if (current >= critical) return { status: "critical", color: "bg-red-500" };
    if (current >= warning) return { status: "warning", color: "bg-yellow-500" };
    return { status: "normal", color: "bg-green-500" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentThresholds = editedThresholds || thresholds?.[selectedEnvironment];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold" data-testid="title-threshold-management">
            Threshold Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Unsaved Changes
            </Badge>
          )}
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={resetThresholdsMutation.isPending}
            data-testid="button-reset-thresholds"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateThresholdsMutation.isPending}
            data-testid="button-save-thresholds"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Configure monitoring thresholds for different environments. Changes apply immediately to all agents.
      </div>

      <Tabs value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="production" data-testid="tab-production">
            Production
          </TabsTrigger>
          <TabsTrigger value="staging" data-testid="tab-staging">
            Staging
          </TabsTrigger>
          <TabsTrigger value="development" data-testid="tab-development">
            Development
          </TabsTrigger>
          <TabsTrigger value="default" data-testid="tab-default">
            Default
          </TabsTrigger>
        </TabsList>

        {["production", "staging", "development", "default"].map((env) => (
          <TabsContent key={env} value={env} className="space-y-6">
            {currentThresholds && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* CPU Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      CPU Usage Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`cpu-warning-${env}`}>Warning (%)</Label>
                        <Input
                          id={`cpu-warning-${env}`}
                          type="number"
                          min="0"
                          max="100"
                          value={currentThresholds.cpu.warning}
                          onChange={(e) =>
                            handleThresholdChange("cpu", "warning", parseInt(e.target.value))
                          }
                          data-testid="input-cpu-warning"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`cpu-critical-${env}`}>Critical (%)</Label>
                        <Input
                          id={`cpu-critical-${env}`}
                          type="number"
                          min="0"
                          max="100"
                          value={currentThresholds.cpu.critical}
                          onChange={(e) =>
                            handleThresholdChange("cpu", "critical", parseInt(e.target.value))
                          }
                          data-testid="input-cpu-critical"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current range: Warning at {currentThresholds.cpu.warning}%, Critical at{" "}
                      {currentThresholds.cpu.critical}%
                    </div>
                  </CardContent>
                </Card>

                {/* Memory Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Memory Usage Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`memory-warning-${env}`}>Warning (%)</Label>
                        <Input
                          id={`memory-warning-${env}`}
                          type="number"
                          min="0"
                          max="100"
                          value={currentThresholds.memory.warning}
                          onChange={(e) =>
                            handleThresholdChange("memory", "warning", parseInt(e.target.value))
                          }
                          data-testid="input-memory-warning"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`memory-critical-${env}`}>Critical (%)</Label>
                        <Input
                          id={`memory-critical-${env}`}
                          type="number"
                          min="0"
                          max="100"
                          value={currentThresholds.memory.critical}
                          onChange={(e) =>
                            handleThresholdChange("memory", "critical", parseInt(e.target.value))
                          }
                          data-testid="input-memory-critical"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Disk Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      Disk Usage Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`disk-warning-${env}`}>Warning (%)</Label>
                        <Input
                          id={`disk-warning-${env}`}
                          type="number"
                          min="0"
                          max="100"
                          value={currentThresholds.disk.warning}
                          onChange={(e) =>
                            handleThresholdChange("disk", "warning", parseInt(e.target.value))
                          }
                          data-testid="input-disk-warning"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`disk-critical-${env}`}>Critical (%)</Label>
                        <Input
                          id={`disk-critical-${env}`}
                          type="number"
                          min="0"
                          max="100"
                          value={currentThresholds.disk.critical}
                          onChange={(e) =>
                            handleThresholdChange("disk", "critical", parseInt(e.target.value))
                          }
                          data-testid="input-disk-critical"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Network Thresholds */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      Network Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`latency-warning-${env}`}>Latency Warning (ms)</Label>
                        <Input
                          id={`latency-warning-${env}`}
                          type="number"
                          min="0"
                          value={currentThresholds.network.latencyWarning}
                          onChange={(e) =>
                            handleThresholdChange("network", "latencyWarning", parseInt(e.target.value))
                          }
                          data-testid="input-latency-warning"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`latency-critical-${env}`}>Latency Critical (ms)</Label>
                        <Input
                          id={`latency-critical-${env}`}
                          type="number"
                          min="0"
                          value={currentThresholds.network.latencyCritical}
                          onChange={(e) =>
                            handleThresholdChange("network", "latencyCritical", parseInt(e.target.value))
                          }
                          data-testid="input-latency-critical"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`throughput-warning-${env}`}>Min Throughput (Mbps)</Label>
                      <Input
                        id={`throughput-warning-${env}`}
                        type="number"
                        min="0"
                        value={currentThresholds.network.throughputWarning}
                        onChange={(e) =>
                          handleThresholdChange("network", "throughputWarning", parseInt(e.target.value))
                        }
                        data-testid="input-throughput-warning"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Environment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Environment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <div>
                    <strong>Production:</strong> Strictest thresholds for critical systems
                  </div>
                  <div>
                    <strong>Staging:</strong> Moderate thresholds for testing environments
                  </div>
                  <div>
                    <strong>Development:</strong> Relaxed thresholds for development work
                  </div>
                  <div>
                    <strong>Default:</strong> Fallback configuration for unclassified servers
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}