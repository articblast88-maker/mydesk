import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Users,
  Shield,
  Bell,
  Clock,
  Plus,
  MoreHorizontal,
  Loader2,
  Mail,
  Building,
  Globe,
  FileText,
  Download,
} from "lucide-react";
import TicketFields from "./ticket-fields";
import ContactFields from "./contact-fields";
import CompanyFields from "./company-fields";
import ExportHistory from "./export-history";
import RolesSettings from "./roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, SlaPolicy } from "@shared/schema";

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["agent", "admin"]),
  ticketScope: z.enum(["global", "group", "restricted"]),
});

type AgentForm = z.infer<typeof agentSchema>;

const slaSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseTime: z.coerce.number().min(1, "Must be at least 1 minute"),
  resolutionTime: z.coerce.number().min(1, "Must be at least 1 minute"),
});

type SlaForm = z.infer<typeof slaSchema>;

const editAgentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  isActive: z.boolean(),
  ticketScope: z.enum(["global", "group", "restricted"]),
});

type EditAgentForm = z.infer<typeof editAgentSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<User | null>(null);
  const [slaDialogOpen, setSlaDialogOpen] = useState(false);

  const { data: agents, isLoading: agentsLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const teamMembers = agents?.filter(u => u.role === "agent" || u.role === "admin");

  const { data: slaPolicies, isLoading: slaLoading } = useQuery<SlaPolicy[]>({
    queryKey: ["/api/sla-policies"],
  });

  const agentForm = useForm<AgentForm>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      role: "agent",
      ticketScope: "global",
    },
  });

  const editAgentForm = useForm<EditAgentForm>({
    resolver: zodResolver(editAgentSchema),
    defaultValues: {
      name: "",
      email: "",
      isActive: true,
      ticketScope: "global",
    },
  });

  const slaForm = useForm<SlaForm>({
    resolver: zodResolver(slaSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: "medium",
      firstResponseTime: 60,
      resolutionTime: 480,
    },
  });

  const handleEditAgent = (agent: User) => {
    setEditingAgent(agent);
    editAgentForm.reset({
      name: agent.name,
      email: agent.email,
      isActive: agent.isActive,
      ticketScope: (agent.ticketScope as "global" | "group" | "restricted") || "global",
    });
    setEditDialogOpen(true);
  };

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentForm) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Agent created", description: "The agent has been added to your team." });
      agentForm.reset();
      setAgentDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditAgentForm }) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Agent updated", description: "The agent has been updated." });
      setEditDialogOpen(false);
      setEditingAgent(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleAgentActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/users/${id}`, { isActive: !isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ 
        title: variables.isActive ? "Agent deactivated" : "Agent activated", 
        description: `The agent has been ${variables.isActive ? "deactivated" : "activated"}.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createSlaMutation = useMutation({
    mutationFn: async (data: SlaForm) => {
      return apiRequest("POST", "/api/sla-policies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sla-policies"] });
      toast({ title: "SLA Policy created", description: "The SLA policy has been created." });
      slaForm.reset();
      setSlaDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground">Manage your helpdesk configuration</p>
      </div>

      <Tabs defaultValue="team">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="ticket-fields" data-testid="tab-ticket-fields">
            <FileText className="mr-2 h-4 w-4" />
            Ticket Fields
          </TabsTrigger>
          <TabsTrigger value="contact-fields" data-testid="tab-contact-fields">
            <Users className="mr-2 h-4 w-4" />
            Contact Fields
          </TabsTrigger>
          <TabsTrigger value="company-fields" data-testid="tab-company-fields">
            <Building className="mr-2 h-4 w-4" />
            Company Fields
          </TabsTrigger>
          <TabsTrigger value="export-history" data-testid="tab-export-history">
            <Download className="mr-2 h-4 w-4" />
            Export History
          </TabsTrigger>
          <TabsTrigger value="sla" data-testid="tab-sla">
            <Clock className="mr-2 h-4 w-4" />
            SLA Policies
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="mr-2 h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Team Members</h2>
              <p className="text-sm text-muted-foreground">Manage agents and admins</p>
            </div>
            <Button onClick={() => setAgentDialogOpen(true)} data-testid="button-add-agent">
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </div>

          {agentsLoading ? (
            <TableSkeleton />
          ) : !teamMembers?.length ? (
            <EmptyState
              icon={Users}
              title="No team members"
              description="Add agents to your support team"
              action={{ label: "Add Agent", onClick: () => setAgentDialogOpen(true) }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamMembers.map((agent) => (
                <Card key={agent.id} className="hover-elevate" data-testid={`card-agent-${agent.id}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={agent.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {agent.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={agent.role === "admin" ? "default" : "secondary"}>
                        {agent.role}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {agent.ticketScope === "global" ? "All Tickets" : 
                         agent.ticketScope === "group" ? "Group" : 
                         agent.ticketScope === "restricted" ? "Assigned Only" : "All Tickets"}
                      </Badge>
                      <Badge variant={agent.isActive ? "outline" : "secondary"}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-agent-menu-${agent.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditAgent(agent)} data-testid={`button-edit-agent-${agent.id}`}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleAgentActiveMutation.mutate({ id: agent.id, isActive: agent.isActive })}
                            className="text-destructive"
                            data-testid={`button-deactivate-agent-${agent.id}`}
                          >
                            {agent.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ticket-fields" className="mt-6">
          <TicketFields />
        </TabsContent>

        <TabsContent value="contact-fields" className="mt-6">
          <ContactFields />
        </TabsContent>

        <TabsContent value="company-fields" className="mt-6">
          <CompanyFields />
        </TabsContent>

        <TabsContent value="export-history" className="mt-6">
          <ExportHistory />
        </TabsContent>

        <TabsContent value="sla" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">SLA Policies</h2>
              <p className="text-sm text-muted-foreground">Define response and resolution time targets</p>
            </div>
            <Button onClick={() => setSlaDialogOpen(true)} data-testid="button-add-sla">
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Button>
          </div>

          {slaLoading ? (
            <TableSkeleton />
          ) : !slaPolicies?.length ? (
            <EmptyState
              icon={Clock}
              title="No SLA policies"
              description="Create policies to track response times"
              action={{ label: "Add Policy", onClick: () => setSlaDialogOpen(true) }}
            />
          ) : (
            <div className="grid gap-4">
              {slaPolicies.map((policy) => (
                <Card key={policy.id} className="hover-elevate" data-testid={`card-sla-${policy.id}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{policy.name}</p>
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{policy.priority}</Badge>
                      <div className="text-right">
                        <p className="text-sm">First Response: <span className="font-medium">{policy.firstResponseTime}m</span></p>
                        <p className="text-sm">Resolution: <span className="font-medium">{policy.resolutionTime}m</span></p>
                      </div>
                      <Switch checked={policy.isActive} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesSettings />
        </TabsContent>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Basic details about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input placeholder="Acme Inc." defaultValue="HelpDesk Demo" data-testid="input-company-name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Support Email</label>
                  <Input placeholder="support@company.com" defaultValue="support@helpdesk.com" data-testid="input-support-email" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <Select defaultValue="utc">
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button data-testid="button-save-general">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Notifications</CardTitle>
              <CardDescription>Configure when to send email alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "New ticket created", description: "Notify when a new ticket is submitted" },
                { label: "Ticket assigned", description: "Notify when a ticket is assigned to you" },
                { label: "Customer reply", description: "Notify when a customer replies to a ticket" },
                { label: "SLA breach warning", description: "Notify before SLA deadline is reached" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked data-testid={`switch-notification-${i}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <SheetContent className="w-full sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Add Team Member</SheetTitle>
            <SheetDescription>Add a new agent or admin to your team.</SheetDescription>
          </SheetHeader>
          <Form {...agentForm}>
            <form onSubmit={agentForm.handleSubmit((data) => createAgentMutation.mutate(data))} className="mt-4 space-y-4">
              <FormField
                control={agentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-agent-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={agentForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@company.com" type="email" {...field} data-testid="input-agent-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={agentForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe@email.com" {...field} data-testid="input-agent-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={agentForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-agent-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={agentForm.control}
                name="ticketScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Access Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-agent-scope">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="global">Global Access - View all tickets</SelectItem>
                        <SelectItem value="group">Group Access - View group tickets only</SelectItem>
                        <SelectItem value="restricted">Restricted - View assigned tickets only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={agentForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="********" type="password" {...field} data-testid="input-agent-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setAgentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAgentMutation.isPending} data-testid="button-submit-agent">
                  {createAgentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Agent
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={slaDialogOpen} onOpenChange={setSlaDialogOpen}>
        <SheetContent className="w-full sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Create SLA Policy</SheetTitle>
            <SheetDescription>Define response and resolution time targets.</SheetDescription>
          </SheetHeader>
          <Form {...slaForm}>
            <form onSubmit={slaForm.handleSubmit((data) => createSlaMutation.mutate(data))} className="mt-4 space-y-4">
              <FormField
                control={slaForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Standard Support" {...field} data-testid="input-sla-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={slaForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-sla-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={slaForm.control}
                  name="firstResponseTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Response (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-sla-response" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={slaForm.control}
                  name="resolutionTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-sla-resolution" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setSlaDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSlaMutation.isPending} data-testid="button-submit-sla">
                  {createSlaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Policy
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <SheetContent className="w-full sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Edit Team Member</SheetTitle>
            <SheetDescription>Update agent or admin information.</SheetDescription>
          </SheetHeader>
          <Form {...editAgentForm}>
            <form onSubmit={editAgentForm.handleSubmit((data) => editingAgent && updateAgentMutation.mutate({ id: editingAgent.id, data }))} className="mt-4 space-y-4">
              <FormField
                control={editAgentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-agent-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAgentForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-agent-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAgentForm.control}
                name="ticketScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Access Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-agent-scope">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="global">Global Access - View all tickets</SelectItem>
                        <SelectItem value="group">Group Access - View group tickets only</SelectItem>
                        <SelectItem value="restricted">Restricted - View assigned tickets only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAgentForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {field.value ? "Agent can access the system" : "Agent is deactivated"}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-agent-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAgentMutation.isPending} data-testid="button-update-agent">
                  {updateAgentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
