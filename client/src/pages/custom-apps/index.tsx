import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Puzzle, ExternalLink, Settings, Trash2, MoreHorizontal, Loader2, 
  Code, Store, Wrench, Download, Star, Clock, Users, BarChart3, 
  MessageSquare, CreditCard, Calendar, Globe, Zap, Search, Eye, FileCode 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CustomApp } from "@shared/schema";

const appSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  appUrl: z.string().url("Must be a valid URL"),
  placement: z.enum(["ticket_sidebar", "dashboard", "nav_bar"]),
  icon: z.string().optional(),
  scriptContent: z.string().optional(),
  scriptFileName: z.string().optional(),
});

type AppForm = z.infer<typeof appSchema>;

interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  appUrl: string;
  placement: "ticket_sidebar" | "dashboard" | "nav_bar";
  icon: typeof Puzzle;
  category: string;
  author: string;
  rating: number;
  installs: string;
  featured?: boolean;
}

const marketplaceApps: MarketplaceApp[] = [
  {
    id: "customer-timeline",
    name: "Customer Timeline",
    description: "View complete customer interaction history",
    longDescription: "See all tickets, chats, and interactions from a customer in a beautiful timeline view. Great for understanding customer context quickly.",
    appUrl: "https://helpdesk-apps.example.com/customer-timeline",
    placement: "ticket_sidebar",
    icon: Clock,
    category: "Customer Intelligence",
    author: "HelpDesk Team",
    rating: 4.8,
    installs: "10K+",
    featured: true,
  },
  {
    id: "sentiment-analyzer",
    name: "Sentiment Analyzer",
    description: "AI-powered customer sentiment detection",
    longDescription: "Automatically detect customer sentiment from ticket content. Shows positive, negative, or neutral indicators to help agents prioritize responses.",
    appUrl: "https://helpdesk-apps.example.com/sentiment",
    placement: "ticket_sidebar",
    icon: BarChart3,
    category: "AI & Automation",
    author: "HelpDesk Team",
    rating: 4.5,
    installs: "5K+",
    featured: true,
  },
  {
    id: "quick-responses",
    name: "Quick Responses Pro",
    description: "Enhanced canned responses with variables",
    longDescription: "Supercharge your responses with dynamic variables, personalization, and smart suggestions based on ticket content.",
    appUrl: "https://helpdesk-apps.example.com/quick-responses",
    placement: "ticket_sidebar",
    icon: MessageSquare,
    category: "Productivity",
    author: "AppWorks",
    rating: 4.7,
    installs: "8K+",
  },
  {
    id: "customer-notes",
    name: "Customer Notes",
    description: "Add private notes about customers",
    longDescription: "Keep track of important customer information with private notes that persist across all their tickets.",
    appUrl: "https://helpdesk-apps.example.com/customer-notes",
    placement: "ticket_sidebar",
    icon: Users,
    category: "Customer Intelligence",
    author: "HelpDesk Team",
    rating: 4.6,
    installs: "7K+",
  },
  {
    id: "stripe-integration",
    name: "Stripe Payments",
    description: "View customer payment history from Stripe",
    longDescription: "Connect to Stripe to see customer subscription status, recent payments, and billing information directly in the ticket sidebar.",
    appUrl: "https://helpdesk-apps.example.com/stripe",
    placement: "ticket_sidebar",
    icon: CreditCard,
    category: "Integrations",
    author: "Stripe Partners",
    rating: 4.9,
    installs: "15K+",
    featured: true,
  },
  {
    id: "calendar-scheduler",
    name: "Calendar Scheduler",
    description: "Schedule meetings with customers",
    longDescription: "Allow customers to book time slots directly from the ticket. Integrates with Google Calendar and Outlook.",
    appUrl: "https://helpdesk-apps.example.com/calendar",
    placement: "ticket_sidebar",
    icon: Calendar,
    category: "Productivity",
    author: "ScheduleIt",
    rating: 4.4,
    installs: "3K+",
  },
  {
    id: "translation-hub",
    name: "Translation Hub",
    description: "Auto-translate tickets and responses",
    longDescription: "Automatically detect and translate incoming tickets. Supports 50+ languages with one-click translation.",
    appUrl: "https://helpdesk-apps.example.com/translate",
    placement: "ticket_sidebar",
    icon: Globe,
    category: "AI & Automation",
    author: "LinguaTech",
    rating: 4.3,
    installs: "4K+",
  },
  {
    id: "workflow-automator",
    name: "Workflow Automator",
    description: "Custom ticket workflows and macros",
    longDescription: "Create complex multi-step workflows that can be triggered with a single click. Perfect for repetitive tasks.",
    appUrl: "https://helpdesk-apps.example.com/workflows",
    placement: "ticket_sidebar",
    icon: Zap,
    category: "Productivity",
    author: "AutomateHQ",
    rating: 4.6,
    installs: "6K+",
  },
];

const categories = ["All", "Featured", "Customer Intelligence", "AI & Automation", "Productivity", "Integrations"];

export default function CustomApps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarketplaceApp, setSelectedMarketplaceApp] = useState<MarketplaceApp | null>(null);
  const [viewingScript, setViewingScript] = useState<CustomApp | null>(null);

  const { data: apps, isLoading } = useQuery<CustomApp[]>({
    queryKey: ["/api/custom-apps"],
  });

  const form = useForm<AppForm>({
    resolver: zodResolver(appSchema),
    defaultValues: {
      name: "",
      description: "",
      appUrl: "",
      placement: "ticket_sidebar",
      icon: "",
      scriptContent: "",
      scriptFileName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AppForm) => {
      return apiRequest("POST", "/api/custom-apps", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-apps"] });
      toast({ title: "App created", description: "The custom app has been created successfully." });
      form.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const installMutation = useMutation({
    mutationFn: async (app: MarketplaceApp) => {
      if (installedAppNames.has(app.name)) {
        throw new Error("This app is already installed");
      }
      return apiRequest("POST", "/api/custom-apps", {
        name: app.name,
        description: app.description,
        appUrl: app.appUrl,
        placement: app.placement,
      });
    },
    onSuccess: (_, app) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-apps"] });
      toast({ 
        title: "App installed", 
        description: `${app.name} has been installed successfully.` 
      });
      setSelectedMarketplaceApp(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/custom-apps/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-apps"] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/custom-apps/${id}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-apps"] });
      toast({ title: "App uninstalled", description: "The app has been deactivated. You can reinstall it from the Installed tab." });
    },
  });

  const installedApps = apps?.filter((app) => app.isActive) || [];
  const installedAppNames = new Set(apps?.map(app => app.name) || []);

  const handleDownloadScript = async (app: CustomApp) => {
    try {
      const res = await fetch(`/api/custom-apps/${app.id}/script`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to download script");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = app.scriptFileName || `${app.name.toLowerCase().replace(/\s+/g, '-')}-script.js`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredMarketplaceApps = marketplaceApps.filter(app => {
    const matchesCategory = selectedCategory === "All" || 
      (selectedCategory === "Featured" && app.featured) ||
      app.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Custom Apps</h1>
          <p className="text-muted-foreground">Extend your helpdesk with custom iframe-based apps</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-app">
          <Plus className="mr-2 h-4 w-4" />
          Create App
        </Button>
      </div>

      <Tabs defaultValue="installed">
        <TabsList>
          <TabsTrigger value="installed" data-testid="tab-installed">
            <Puzzle className="mr-2 h-4 w-4" />
            Installed ({installedApps.length})
          </TabsTrigger>
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">
            <Store className="mr-2 h-4 w-4" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="builder" data-testid="tab-builder">
            <Wrench className="mr-2 h-4 w-4" />
            App Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6">
          {isLoading ? (
            <TableSkeleton />
          ) : !installedApps.length ? (
            <EmptyState
              icon={Puzzle}
              title="No apps installed"
              description="Install apps from the marketplace or create your own"
              action={{ label: "Browse Marketplace", onClick: () => {} }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {installedApps.map((app) => (
                <Card key={app.id} className="hover-elevate" data-testid={`card-app-${app.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <Puzzle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{app.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {app.placement.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={app.appUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open App
                            </a>
                          </DropdownMenuItem>
                          {app.scriptContent && (
                            <>
                              <DropdownMenuItem onClick={() => setViewingScript(app)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Script
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadScript(app)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Script
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => uninstallMutation.mutate(app.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Uninstall
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.description || "No description provided"}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {app.placement.replace("_", " ")}
                    </span>
                    <Switch
                      checked={app.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: app.id, isActive: checked })}
                      data-testid={`switch-app-${app.id}`}
                    />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="mt-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-apps"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {filteredMarketplaceApps.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Search}
                  title="No apps found"
                  description="Try adjusting your search or category filter"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarketplaceApps.map((app) => {
                const Icon = app.icon;
                const isInstalled = installedAppNames.has(app.name);
                
                return (
                  <Card 
                    key={app.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedMarketplaceApp(app)}
                    data-testid={`card-marketplace-app-${app.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base truncate">{app.name}</CardTitle>
                            {app.featured && (
                              <Badge className="shrink-0">Featured</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{app.author}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {app.description}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {app.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {app.installs}
                        </span>
                      </div>
                      {isInstalled ? (
                        <Badge variant="secondary">Installed</Badge>
                      ) : (
                        <Badge variant="outline">{app.category}</Badge>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>App Builder</CardTitle>
              <CardDescription>Create custom apps using our SDK and API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <h3 className="font-medium mb-2">Getting Started</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Custom apps are iframe-based applications that can access ticket context through our postMessage API.
                  Apps are loaded in a 360px wide sidebar panel next to the ticket.
                </p>
                <div className="rounded-md bg-background border p-4 font-mono text-sm overflow-x-auto">
                  <pre>{`// Listen for ticket context
window.addEventListener('message', (event) => {
  if (event.data.type === 'HELPDESK_TICKET_CONTEXT') {
    const ticket = event.data.data;
    // ticket.id, ticket.subject, ticket.customer, etc.
  }
});

// Signal app is ready to receive context
parent.postMessage({ type: 'HELPDESK_APP_READY' }, '*');

// Send actions back to HelpDesk
parent.postMessage({ 
  type: 'HELPDESK_APP_ACTION',
  action: { type: 'add_note', content: 'Hello!' }
}, '*');`}</pre>
                </div>
              </div>
              
              <div className="rounded-md border p-4">
                <h3 className="font-medium mb-2">Available Context</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.id</code>
                    <span>Ticket UUID</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.ticketNumber</code>
                    <span>Display number</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.subject</code>
                    <span>Ticket subject</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.status</code>
                    <span>Current status</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.customer</code>
                    <span>Customer info (id, name, email)</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.tags</code>
                    <span>Array of tags</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-muted-foreground">ticket.customFields</code>
                    <span>Custom field values</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <Code className="mr-2 h-4 w-4" />
                  View Documentation
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create App
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Custom App</SheetTitle>
            <SheetDescription>Add a new iframe-based app to your helpdesk.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Custom App" {...field} data-testid="input-app-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://myapp.example.com" {...field} data-testid="input-app-url" />
                    </FormControl>
                    <FormDescription>The URL that will be loaded in the iframe</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="placement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placement</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-placement">
                          <SelectValue placeholder="Select placement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ticket_sidebar">Ticket Sidebar (360px panel)</SelectItem>
                        <SelectItem value="dashboard">Dashboard Widget</SelectItem>
                        <SelectItem value="nav_bar">Navigation Bar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What does this app do?" {...field} data-testid="input-app-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scriptContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script Content (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="// Paste your custom app JavaScript code here..." 
                        className="font-mono text-xs min-h-[100px]"
                        {...field} 
                        data-testid="input-app-script" 
                      />
                    </FormControl>
                    <FormDescription>
                      Paste your custom app script to store and download later
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scriptFileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Script File Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="my-app.js" {...field} data-testid="input-app-script-filename" />
                    </FormControl>
                    <FormDescription>
                      Name for the downloaded file (defaults to app-name-script.js)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-app">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create App
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedMarketplaceApp} onOpenChange={() => setSelectedMarketplaceApp(null)}>
        <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
          {selectedMarketplaceApp && (
            <>
              <SheetHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                    <selectedMarketplaceApp.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="flex items-center gap-2">
                      {selectedMarketplaceApp.name}
                      {selectedMarketplaceApp.featured && <Badge>Featured</Badge>}
                    </SheetTitle>
                    <SheetDescription>{selectedMarketplaceApp.author}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {selectedMarketplaceApp.rating} rating
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    {selectedMarketplaceApp.installs} installs
                  </span>
                  <Badge variant="outline">{selectedMarketplaceApp.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedMarketplaceApp.longDescription}
                </p>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    This app will be loaded in a {selectedMarketplaceApp.placement.replace("_", " ")} 
                    {selectedMarketplaceApp.placement === "ticket_sidebar" && " (360px panel)"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedMarketplaceApp(null)}>
                  Cancel
                </Button>
                {installedAppNames.has(selectedMarketplaceApp.name) ? (
                  <Button disabled>
                    Already Installed
                  </Button>
                ) : (
                  <Button 
                    onClick={() => installMutation.mutate(selectedMarketplaceApp)}
                    disabled={installMutation.isPending}
                    data-testid="button-install-app"
                  >
                    {installMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* View Script Sheet */}
      <Sheet open={!!viewingScript} onOpenChange={() => setViewingScript(null)}>
        <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {viewingScript?.name} - Script
            </SheetTitle>
            <SheetDescription>
              View the source code for this custom app
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 border rounded-md bg-muted/50 p-4 overflow-auto max-h-[60vh]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {viewingScript?.scriptContent || "No script content available"}
            </pre>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setViewingScript(null)}>
              Close
            </Button>
            {viewingScript?.scriptContent && (
              <Button onClick={() => viewingScript && handleDownloadScript(viewingScript)}>
                <Download className="mr-2 h-4 w-4" />
                Download Script
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
