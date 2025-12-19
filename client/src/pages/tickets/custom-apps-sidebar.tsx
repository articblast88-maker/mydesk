import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Puzzle, ExternalLink, RefreshCw, Settings, FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DCGenerationWidget } from "@/components/dc-generation-widget";
import type { Ticket, CustomApp } from "@shared/schema";

interface CustomAppsSidebarProps {
  ticket: Ticket & { customer: { id: string; name: string; email: string } };
  apps: CustomApp[];
  onClose: () => void;
}

type BuiltInApp = {
  id: string;
  name: string;
  type: "builtin";
  component: "dc-generation";
};

type AppItem = CustomApp | BuiltInApp;

const builtInApps: BuiltInApp[] = [
  {
    id: "builtin-dc-generation",
    name: "DC Generation",
    type: "builtin",
    component: "dc-generation",
  },
];

export default function CustomAppsSidebar({ ticket, apps, onClose }: CustomAppsSidebarProps) {
  const [activeAppId, setActiveAppId] = useState<string>(builtInApps[0]?.id || "");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeCustomApps = apps.filter((app) => app.isActive && app.placement === "ticket_sidebar");
  
  const allApps: AppItem[] = [...builtInApps, ...activeCustomApps];
  
  const activeApp = allApps.find((app) => app.id === activeAppId);

  useEffect(() => {
    if (allApps.length > 0 && !activeApp) {
      setActiveAppId(allApps[0].id);
    }
  }, [allApps, activeApp]);

  useEffect(() => {
    if (!iframeRef.current || !activeApp || "type" in activeApp) return;

    const ticketContext = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      customer: {
        id: ticket.customer.id,
        name: ticket.customer.name,
        email: ticket.customer.email,
      },
      tags: ticket.tags,
      customFields: ticket.customFields,
    };

    const sendContext = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "HELPDESK_TICKET_CONTEXT", data: ticketContext },
        "*"
      );
    };

    const iframe = iframeRef.current;
    iframe.addEventListener("load", sendContext);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "HELPDESK_APP_READY") {
        sendContext();
      }
      if (event.data?.type === "HELPDESK_APP_ACTION") {
        console.log("App action:", event.data.action);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      iframe.removeEventListener("load", sendContext);
      window.removeEventListener("message", handleMessage);
    };
  }, [activeApp, ticket]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const isBuiltInApp = (app: AppItem): app is BuiltInApp => "type" in app && app.type === "builtin";

  const renderAppContent = () => {
    if (!activeApp) return null;

    if (isBuiltInApp(activeApp)) {
      if (activeApp.component === "dc-generation") {
        return (
          <div className="p-4">
            <DCGenerationWidget ticketId={ticket.id} ticketCategory={ticket.category} />
          </div>
        );
      }
      return null;
    }

    return (
      <>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{activeApp.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} data-testid="button-refresh-app">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-app-settings">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={activeApp.appUrl} target="_blank" rel="noopener noreferrer" data-testid="button-open-app-external">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <iframe
            ref={iframeRef}
            src={activeApp.appUrl}
            className="h-full w-full border-0"
            title={activeApp.name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            data-testid={`iframe-app-${activeApp.id}`}
          />
        </div>
      </>
    );
  };

  return (
    <div className="fixed right-0 top-0 z-40 h-full w-96 border-l bg-background shadow-lg" data-testid="custom-apps-sidebar">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Puzzle className="h-4 w-4" />
          <span className="font-medium">Apps</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-apps">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-[calc(100%-3.5rem)] flex-col">
        {allApps.length > 1 && (
          <div className="border-b p-2">
            <Tabs
              value={activeAppId}
              onValueChange={(id) => setActiveAppId(id)}
            >
              <TabsList className="w-full justify-start flex-wrap gap-1">
                {allApps.map((app) => (
                  <TabsTrigger key={app.id} value={app.id} className="text-xs" data-testid={`tab-app-${app.id}`}>
                    {isBuiltInApp(app) && <FileText className="h-3 w-3 mr-1" />}
                    {app.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {allApps.length === 1 && (
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{allApps[0].name}</span>
          </div>
        )}

        <ScrollArea className="flex-1">
          {renderAppContent()}
        </ScrollArea>
      </div>
    </div>
  );
}
