import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TicketsList from "@/pages/tickets/index";
import TicketDetail from "@/pages/tickets/ticket-detail";
import KnowledgeBase from "@/pages/knowledge-base/index";
import Customers from "@/pages/customers/index";
import CustomerDetail from "@/pages/customers/customer-detail";
import CustomApps from "@/pages/custom-apps/index";
import CannedResponses from "@/pages/canned-responses/index";
import Automations from "@/pages/automations/index";
import Reports from "@/pages/reports/index";
import SettingsPage from "@/pages/settings/index";
import ApiKeysPage from "@/pages/settings/api-keys";
import CustomerPortalPage from "@/pages/customer-portal-page";
import DevelopersPage from "@/pages/developers/index";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tickets" component={TicketsList} />
      <Route path="/tickets/:id" component={TicketDetail} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/users">{() => { window.location.replace("/settings"); return null; }}</Route>
      <Route path="/customers" component={Customers} />
      <Route path="/customers/:id" component={CustomerDetail} />
      <Route path="/apps" component={CustomApps} />
      <Route path="/canned-responses" component={CannedResponses} />
      <Route path="/automations" component={Automations} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/api-keys" component={ApiKeysPage} />
      <Route path="/developers" component={DevelopersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-h-0">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <AdminRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  const [location] = useLocation();
  const isCustomerPortal = location.startsWith("/portal");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="helpdesk-theme">
        <TooltipProvider>
          {isCustomerPortal ? (
            <Switch>
              <Route path="/portal" component={CustomerPortalPage} />
            </Switch>
          ) : (
            <AdminLayout />
          )}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
