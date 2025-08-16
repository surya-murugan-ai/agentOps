import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import { AIAssistant } from "@/components/chat/AIAssistant";

// Lazy load heavy pages to reduce initial bundle size
const ServersPage = lazy(() => import("@/pages/servers"));
const AgentsPage = lazy(() => import("@/pages/agents"));
const AgentSettingsPage = lazy(() => import("@/pages/agent-settings"));
const AlertsPage = lazy(() => import("@/pages/alerts"));
const RemediationsPage = lazy(() => import("@/pages/remediations"));
const AuditPage = lazy(() => import("@/pages/audit"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const AdvancedAnalyticsPage = lazy(() => import("@/pages/analytics-advanced"));
const LlmAnalyticsPage = lazy(() => import("@/pages/llm-analytics"));
const DataUploadPage = lazy(() => import("@/pages/data-upload"));
const DataViewPage = lazy(() => import("@/pages/data-view"));
const DataManagementPage = lazy(() => import("@/pages/data-management"));
const ThresholdManagementPage = lazy(() => import("@/pages/threshold-management"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const WorkflowPage = lazy(() => import("@/pages/workflows-operational"));
const AgentControlPage = lazy(() => import("@/pages/agent-control"));
const CloudInfrastructurePage = lazy(() => import("@/pages/cloud-infrastructure"));
const HelpPage = lazy(() => import("@/pages/help"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen bg-gray-950 text-white p-6">
    <div className="flex items-center justify-center h-96">
      <Card className="p-8 bg-gray-900 border-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </Card>
    </div>
  </div>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/servers">
        <Suspense fallback={<PageLoader />}>
          <ServersPage />
        </Suspense>
      </Route>
      <Route path="/agents">
        <Suspense fallback={<PageLoader />}>
          <AgentsPage />
        </Suspense>
      </Route>
      <Route path="/agent-settings">
        <Suspense fallback={<PageLoader />}>
          <AgentSettingsPage />
        </Suspense>
      </Route>
      <Route path="/alerts">
        <Suspense fallback={<PageLoader />}>
          <AlertsPage />
        </Suspense>
      </Route>
      <Route path="/remediations">
        <Suspense fallback={<PageLoader />}>
          <RemediationsPage />
        </Suspense>
      </Route>
      <Route path="/audit">
        <Suspense fallback={<PageLoader />}>
          <AuditPage />
        </Suspense>
      </Route>
      <Route path="/analytics">
        <Suspense fallback={<PageLoader />}>
          <AnalyticsPage />
        </Suspense>
      </Route>
      <Route path="/analytics-advanced">
        <Suspense fallback={<PageLoader />}>
          <AdvancedAnalyticsPage />
        </Suspense>
      </Route>
      <Route path="/llm-analytics">
        <Suspense fallback={<PageLoader />}>
          <LlmAnalyticsPage />
        </Suspense>
      </Route>
      <Route path="/data-view">
        <Suspense fallback={<PageLoader />}>
          <DataViewPage />
        </Suspense>
      </Route>
      <Route path="/data-upload">
        <Suspense fallback={<PageLoader />}>
          <DataUploadPage />
        </Suspense>
      </Route>
      <Route path="/data-management">
        <Suspense fallback={<PageLoader />}>
          <DataManagementPage />
        </Suspense>
      </Route>
      <Route path="/threshold-management">
        <Suspense fallback={<PageLoader />}>
          <ThresholdManagementPage />
        </Suspense>
      </Route>
      <Route path="/workflows">
        <Suspense fallback={<PageLoader />}>
          <WorkflowPage />
        </Suspense>
      </Route>
      <Route path="/agent-control">
        <Suspense fallback={<PageLoader />}>
          <AgentControlPage />
        </Suspense>
      </Route>
      <Route path="/cloud-infrastructure">
        <Suspense fallback={<PageLoader />}>
          <CloudInfrastructurePage />
        </Suspense>
      </Route>
      <Route path="/settings">
        <Suspense fallback={<PageLoader />}>
          <SettingsPage />
        </Suspense>
      </Route>
      <Route path="/help">
        <Suspense fallback={<PageLoader />}>
          <HelpPage />
        </Suspense>
      </Route>
      <Route>
        <Suspense fallback={<PageLoader />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
          <AIAssistant />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
