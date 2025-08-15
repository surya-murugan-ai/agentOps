import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import ServersPage from "@/pages/servers";
import AgentsPage from "@/pages/agents";
import AgentSettingsPage from "@/pages/agent-settings";
import AlertsPage from "@/pages/alerts";
import RemediationsPage from "@/pages/remediations";
import AuditPage from "@/pages/audit";
import AnalyticsPage from "@/pages/analytics";
import AdvancedAnalyticsPage from "@/pages/analytics-advanced";
import LlmAnalyticsPage from "@/pages/llm-analytics";
import DataUploadPage from "@/pages/data-upload";
import DataViewPage from "@/pages/data-view";
import DataManagementPage from "@/pages/data-management";
import SettingsPage from "@/pages/Settings";
import WorkflowPage from "@/pages/workflows-operational";
import AgentControlPage from "@/pages/agent-control";
import CloudInfrastructurePage from "@/pages/cloud-infrastructure";
import HelpPage from "@/pages/help";
import NotFound from "@/pages/not-found";
import { AIAssistant } from "@/components/chat/AIAssistant";
import { SystemNotifications } from "@/components/notifications/SystemNotifications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/servers" component={ServersPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/agent-settings" component={AgentSettingsPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/remediations" component={RemediationsPage} />
      <Route path="/audit" component={AuditPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/analytics-advanced" component={AdvancedAnalyticsPage} />
      <Route path="/llm-analytics" component={LlmAnalyticsPage} />
      <Route path="/data-view" component={DataViewPage} />
      <Route path="/data-upload" component={DataUploadPage} />
      <Route path="/data-management" component={DataManagementPage} />
      <Route path="/workflows" component={WorkflowPage} />
      <Route path="/agent-control" component={AgentControlPage} />
      <Route path="/cloud-infrastructure" component={CloudInfrastructurePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/help" component={HelpPage} />
      <Route component={NotFound} />
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
