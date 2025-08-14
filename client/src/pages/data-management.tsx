import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Trash2, CheckCircle, AlertTriangle, BarChart3, Sparkles } from "lucide-react";

interface DataQualitySummary {
  servers: {
    total: number;
    withMissingFields: number;
    qualityScore: number;
  };
  metrics: {
    total: number;
    withNullValues: number;
    qualityScore: number;
  };
  alerts: {
    total: number;
    withMissingFields: number;
    qualityScore: number;
  };
  overall: {
    totalRecords: number;
    totalIssues: number;
    overallQualityScore: number;
  };
}

interface CleaningOptions {
  removeDuplicates: boolean;
  handleMissingValues: boolean;
  normalizeValues: boolean;
  validateDataTypes: boolean;
  cleanOutliers: boolean;
}

interface CleaningResult {
  duplicatesRemoved: number;
  missingValuesHandled: number;
  outliersDetected: number;
  recordsProcessed: number;
  dataQualityScore: number;
}

export default function DataManagement() {
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    removeDuplicates: true,
    handleMissingValues: true,
    normalizeValues: true,
    validateDataTypes: true,
    cleanOutliers: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data quality summary
  const { data: qualitySummary, isLoading: qualityLoading } = useQuery<{ data: DataQualitySummary }>({
    queryKey: ["/api/data-cleaning/quality-summary"],
  });

  // Clean servers mutation
  const cleanServersMutation = useMutation({
    mutationFn: () => apiRequest("/api/data-cleaning/servers", {
      method: "POST",
      body: cleaningOptions,
    }),
    onSuccess: (data) => {
      toast({
        title: "Server Data Cleaned",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-cleaning/quality-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
    },
    onError: (error) => {
      toast({
        title: "Cleaning Failed",
        description: error instanceof Error ? error.message : "Failed to clean server data",
        variant: "destructive",
      });
    },
  });

  // Clean metrics mutation
  const cleanMetricsMutation = useMutation({
    mutationFn: () => apiRequest("/api/data-cleaning/metrics", {
      method: "POST",
      body: cleaningOptions,
    }),
    onSuccess: (data) => {
      toast({
        title: "Metrics Data Cleaned",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-cleaning/quality-summary"] });
    },
    onError: (error) => {
      toast({
        title: "Cleaning Failed",
        description: error instanceof Error ? error.message : "Failed to clean metrics data",
        variant: "destructive",
      });
    },
  });

  // Clean alerts mutation
  const cleanAlertsMutation = useMutation({
    mutationFn: () => apiRequest("/api/data-cleaning/alerts", {
      method: "POST",
      body: cleaningOptions,
    }),
    onSuccess: (data) => {
      toast({
        title: "Alerts Data Cleaned",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-cleaning/quality-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error) => {
      toast({
        title: "Cleaning Failed",
        description: error instanceof Error ? error.message : "Failed to clean alerts data",
        variant: "destructive",
      });
    },
  });

  // Full clean mutation
  const fullCleanMutation = useMutation({
    mutationFn: () => apiRequest("/api/data-cleaning/full-clean", {
      method: "POST",
      body: cleaningOptions,
    }),
    onSuccess: (data) => {
      toast({
        title: "Comprehensive Cleaning Complete",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/data-cleaning/quality-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error) => {
      toast({
        title: "Cleaning Failed",
        description: error instanceof Error ? error.message : "Failed to perform comprehensive cleaning",
        variant: "destructive",
      });
    },
  });

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getQualityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">Clean, normalize, and validate your monitoring data</p>
        </div>
      </div>

      {/* Data Quality Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Quality</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {qualityLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  <span className={getQualityColor(qualitySummary?.data.overall.overallQualityScore || 0)}>
                    {Math.round(qualitySummary?.data.overall.overallQualityScore || 0)}%
                  </span>
                </div>
                <Progress value={qualitySummary?.data.overall.overallQualityScore || 0} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {qualitySummary?.data.overall.totalRecords || 0} total records
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Data</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {qualityLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  <span className={getQualityColor(qualitySummary?.data.servers.qualityScore || 0)}>
                    {Math.round(qualitySummary?.data.servers.qualityScore || 0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {getQualityBadge(qualitySummary?.data.servers.qualityScore || 0)}
                  <span className="text-xs text-muted-foreground">
                    {qualitySummary?.data.servers.total || 0} servers
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metrics Data</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {qualityLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  <span className={getQualityColor(qualitySummary?.data.metrics.qualityScore || 0)}>
                    {Math.round(qualitySummary?.data.metrics.qualityScore || 0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {getQualityBadge(qualitySummary?.data.metrics.qualityScore || 0)}
                  <span className="text-xs text-muted-foreground">
                    {qualitySummary?.data.metrics.total || 0} metrics
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Data</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {qualityLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  <span className={getQualityColor(qualitySummary?.data.alerts.qualityScore || 0)}>
                    {Math.round(qualitySummary?.data.alerts.qualityScore || 0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {getQualityBadge(qualitySummary?.data.alerts.qualityScore || 0)}
                  <span className="text-xs text-muted-foreground">
                    {qualitySummary?.data.alerts.total || 0} alerts
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Cleaning Controls */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cleaning Options */}
        <Card>
          <CardHeader>
            <CardTitle>Cleaning Options</CardTitle>
            <CardDescription>
              Configure which data cleaning operations to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeDuplicates"
                checked={cleaningOptions.removeDuplicates}
                onCheckedChange={(checked) =>
                  setCleaningOptions(prev => ({ ...prev, removeDuplicates: !!checked }))
                }
                data-testid="checkbox-remove-duplicates"
              />
              <label htmlFor="removeDuplicates" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Remove Duplicates
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="handleMissingValues"
                checked={cleaningOptions.handleMissingValues}
                onCheckedChange={(checked) =>
                  setCleaningOptions(prev => ({ ...prev, handleMissingValues: !!checked }))
                }
                data-testid="checkbox-handle-missing-values"
              />
              <label htmlFor="handleMissingValues" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Handle Missing Values
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="normalizeValues"
                checked={cleaningOptions.normalizeValues}
                onCheckedChange={(checked) =>
                  setCleaningOptions(prev => ({ ...prev, normalizeValues: !!checked }))
                }
                data-testid="checkbox-normalize-values"
              />
              <label htmlFor="normalizeValues" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Normalize Values
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="validateDataTypes"
                checked={cleaningOptions.validateDataTypes}
                onCheckedChange={(checked) =>
                  setCleaningOptions(prev => ({ ...prev, validateDataTypes: !!checked }))
                }
                data-testid="checkbox-validate-data-types"
              />
              <label htmlFor="validateDataTypes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Validate Data Types
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleanOutliers"
                checked={cleaningOptions.cleanOutliers}
                onCheckedChange={(checked) =>
                  setCleaningOptions(prev => ({ ...prev, cleanOutliers: !!checked }))
                }
                data-testid="checkbox-clean-outliers"
              />
              <label htmlFor="cleanOutliers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Clean Outliers
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Cleaning Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Data Cleaning Actions</CardTitle>
            <CardDescription>
              Execute cleaning operations on specific data types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => cleanServersMutation.mutate()}
              disabled={cleanServersMutation.isPending}
              className="w-full"
              data-testid="button-clean-servers"
            >
              {cleanServersMutation.isPending ? "Cleaning..." : "Clean Server Data"}
            </Button>

            <Button
              onClick={() => cleanMetricsMutation.mutate()}
              disabled={cleanMetricsMutation.isPending}
              className="w-full"
              variant="outline"
              data-testid="button-clean-metrics"
            >
              {cleanMetricsMutation.isPending ? "Cleaning..." : "Clean Metrics Data"}
            </Button>

            <Button
              onClick={() => cleanAlertsMutation.mutate()}
              disabled={cleanAlertsMutation.isPending}
              className="w-full"
              variant="outline"
              data-testid="button-clean-alerts"
            >
              {cleanAlertsMutation.isPending ? "Cleaning..." : "Clean Alerts Data"}
            </Button>

            <div className="pt-3 border-t">
              <Button
                onClick={() => fullCleanMutation.mutate()}
                disabled={fullCleanMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                data-testid="button-full-clean"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {fullCleanMutation.isPending ? "Performing Full Clean..." : "Comprehensive Data Cleaning"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Details */}
      {qualitySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Details</CardTitle>
            <CardDescription>
              Detailed breakdown of data quality issues by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Server Data Issues</h4>
                <div className="text-sm text-muted-foreground">
                  <p>{qualitySummary.data.servers.withMissingFields} records with missing fields</p>
                  <p>out of {qualitySummary.data.servers.total} total servers</p>
                </div>
                <Progress value={(1 - qualitySummary.data.servers.withMissingFields / qualitySummary.data.servers.total) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Metrics Data Issues</h4>
                <div className="text-sm text-muted-foreground">
                  <p>{qualitySummary.data.metrics.withNullValues} records with null values</p>
                  <p>out of {qualitySummary.data.metrics.total} total metrics</p>
                </div>
                <Progress value={(1 - qualitySummary.data.metrics.withNullValues / qualitySummary.data.metrics.total) * 100} className="h-2" />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Alerts Data Issues</h4>
                <div className="text-sm text-muted-foreground">
                  <p>{qualitySummary.data.alerts.withMissingFields} records with missing fields</p>
                  <p>out of {qualitySummary.data.alerts.total} total alerts</p>
                </div>
                <Progress value={(1 - qualitySummary.data.alerts.withMissingFields / qualitySummary.data.alerts.total) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}