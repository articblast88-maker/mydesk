import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Shield,
  Plus,
  MoreHorizontal,
  Loader2,
  Users,
  Ticket,
  BookOpen,
  MessageSquare,
  BarChart3,
  Settings,
  Tag,
  Lock,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentRole, User } from "@shared/schema";

const roleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  agentType: z.enum(["support_agent", "field_agent", "collaborator"]),
  permissions: z.any(),
});

type RoleForm = z.infer<typeof roleSchema>;

interface RolePermissions {
  tickets: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    reply: boolean;
    reassign: boolean;
    merge: boolean;
    createChild: boolean;
  };
  solutions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    publish: boolean;
  };
  forums: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    moderate: boolean;
  };
  customers: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
  };
  analytics: {
    view: boolean;
    createReports: boolean;
    manageDashboards: boolean;
  };
  admin: {
    viewSettings: boolean;
    manageAgents: boolean;
    manageRoles: boolean;
    manageGroups: boolean;
    manageBilling: boolean;
    manageIntegrations: boolean;
  };
  general: {
    createTags: boolean;
    scheduleOutOfOffice: boolean;
  };
}

const defaultPermissions: RolePermissions = {
  tickets: { view: true, create: false, edit: false, delete: false, reply: false, reassign: false, merge: false, createChild: false },
  solutions: { view: true, create: false, edit: false, delete: false, publish: false },
  forums: { view: true, create: false, edit: false, delete: false, moderate: false },
  customers: { view: true, create: false, edit: false, delete: false, export: false },
  analytics: { view: false, createReports: false, manageDashboards: false },
  admin: { viewSettings: false, manageAgents: false, manageRoles: false, manageGroups: false, manageBilling: false, manageIntegrations: false },
  general: { createTags: false, scheduleOutOfOffice: true }
};

const permissionLabels: Record<string, Record<string, string>> = {
  tickets: {
    view: "View tickets",
    create: "Create tickets",
    edit: "Edit ticket properties",
    delete: "Delete tickets",
    reply: "Reply to tickets",
    reassign: "Reassign tickets",
    merge: "Merge tickets",
    createChild: "Create child tickets"
  },
  solutions: {
    view: "View knowledge base",
    create: "Create articles",
    edit: "Edit articles",
    delete: "Delete articles",
    publish: "Publish articles"
  },
  forums: {
    view: "View forums",
    create: "Create topics",
    edit: "Edit topics",
    delete: "Delete topics",
    moderate: "Moderate forums"
  },
  customers: {
    view: "View customers",
    create: "Create contacts/companies",
    edit: "Edit contacts/companies",
    delete: "Delete contacts/companies",
    export: "Export customer data"
  },
  analytics: {
    view: "View analytics",
    createReports: "Create reports",
    manageDashboards: "Manage dashboards"
  },
  admin: {
    viewSettings: "View admin settings",
    manageAgents: "Manage agents",
    manageRoles: "Manage roles",
    manageGroups: "Manage groups",
    manageBilling: "Manage billing",
    manageIntegrations: "Manage integrations"
  },
  general: {
    createTags: "Create new tags",
    scheduleOutOfOffice: "Schedule out of office"
  }
};

const categoryIcons: Record<string, typeof Ticket> = {
  tickets: Ticket,
  solutions: BookOpen,
  forums: MessageSquare,
  customers: Users,
  analytics: BarChart3,
  admin: Settings,
  general: Tag
};

const categoryLabels: Record<string, string> = {
  tickets: "Tickets",
  solutions: "Knowledge Base",
  forums: "Forums",
  customers: "Customers",
  analytics: "Analytics",
  admin: "Administration",
  general: "General"
};

export default function RolesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AgentRole | null>(null);
  const [viewingRole, setViewingRole] = useState<AgentRole | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions);

  const { data: roles, isLoading } = useQuery<AgentRole[]>({
    queryKey: ["/api/agent-roles"],
  });

  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      agentType: "support_agent",
      permissions: defaultPermissions,
    },
  });

  useEffect(() => {
    if (editingRole) {
      form.reset({
        name: editingRole.name,
        description: editingRole.description || "",
        agentType: (editingRole.agentType as "support_agent" | "field_agent" | "collaborator") || "support_agent",
        permissions: editingRole.permissions,
      });
      setPermissions(editingRole.permissions as RolePermissions || defaultPermissions);
    } else {
      form.reset({
        name: "",
        description: "",
        agentType: "support_agent",
        permissions: defaultPermissions,
      });
      setPermissions(defaultPermissions);
    }
  }, [editingRole, form]);

  const seedRolesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/agent-roles/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-roles"] });
      toast({ title: "Default roles created", description: "The default Freshdesk-style roles have been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoleForm) => {
      if (editingRole) {
        return apiRequest("PATCH", `/api/agent-roles/${editingRole.id}`, { ...data, permissions });
      }
      return apiRequest("POST", "/api/agent-roles", { ...data, permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-roles"] });
      toast({ 
        title: editingRole ? "Role updated" : "Role created", 
        description: editingRole ? "The role has been updated." : "The custom role has been created." 
      });
      form.reset();
      setDialogOpen(false);
      setEditingRole(null);
      setPermissions(defaultPermissions);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/agent-roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-roles"] });
      toast({ title: "Role deleted", description: "The role has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const togglePermission = (category: string, permission: string) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof RolePermissions],
        [permission]: !prev[category as keyof RolePermissions][permission as keyof typeof prev[keyof RolePermissions]]
      }
    }));
  };

  const countActivePermissions = (perms: RolePermissions) => {
    let count = 0;
    Object.values(perms).forEach(category => {
      Object.values(category).forEach(value => {
        if (value) count++;
      });
    });
    return count;
  };

  const handleSubmit = (data: RoleForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Agent Roles</h2>
          <p className="text-sm text-muted-foreground">
            Define what agents can see and do within your helpdesk
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(!roles || roles.length === 0) && (
            <Button 
              variant="outline" 
              onClick={() => seedRolesMutation.mutate()}
              disabled={seedRolesMutation.isPending}
              data-testid="button-seed-roles"
            >
              {seedRolesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Default Roles
            </Button>
          )}
          <Button onClick={() => { setEditingRole(null); setDialogOpen(true); }} data-testid="button-add-role">
            <Plus className="mr-2 h-4 w-4" />
            New Role
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !roles?.length ? (
        <EmptyState
          icon={Shield}
          title="No roles configured"
          description="Create roles to control agent permissions"
          action={{ 
            label: "Create Default Roles", 
            onClick: () => seedRolesMutation.mutate() 
          }}
        />
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="hover-elevate" data-testid={`card-role-${role.id}`}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{role.name}</p>
                      {role.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {role.description || "No description"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {role.permissions ? countActivePermissions(role.permissions as RolePermissions) : 0} permissions
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {role.agentType?.replace("_", " ") || "Support Agent"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-role-menu-${role.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => { setViewingRole(role); setViewDialogOpen(true); }}
                        data-testid={`menu-view-${role.id}`}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Permissions
                      </DropdownMenuItem>
                      {!role.isDefault && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => { setEditingRole(role); setDialogOpen(true); }}
                            data-testid={`menu-edit-${role.id}`}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(role.id)}
                            className="text-destructive"
                            data-testid={`menu-delete-${role.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Role
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingRole(null); }}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>{editingRole ? "Edit Role" : "Create Custom Role"}</SheetTitle>
            <SheetDescription>
              {editingRole 
                ? "Update the role settings and permissions" 
                : "Define a new role with specific permissions for your agents"}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 min-h-0 flex flex-col mt-4">
              <ScrollArea className="flex-1 min-h-0 pr-4" hideScrollbar>
                <div className="space-y-4 pb-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Senior Agent" {...field} data-testid="input-role-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what this role can do..." 
                            {...field} 
                            data-testid="input-role-description" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-agent-type">
                              <SelectValue placeholder="Select agent type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="support_agent">Support Agent</SelectItem>
                            <SelectItem value="field_agent">Field Agent</SelectItem>
                            <SelectItem value="collaborator">Collaborator</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the type of agent this role applies to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-4">Permissions</h3>
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(permissions).map(([category, categoryPerms]) => {
                        const Icon = categoryIcons[category] || Shield;
                        return (
                          <AccordionItem key={category} value={category}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span>{categoryLabels[category] || category}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {Object.values(categoryPerms).filter(Boolean).length}/{Object.keys(categoryPerms).length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid gap-3 pl-6 pt-2">
                                {Object.entries(categoryPerms).map(([perm, value]) => (
                                  <div key={perm} className="flex items-center gap-3">
                                    <Checkbox
                                      id={`${category}-${perm}`}
                                      checked={value as boolean}
                                      onCheckedChange={() => togglePermission(category, perm)}
                                      data-testid={`checkbox-${category}-${perm}`}
                                    />
                                    <Label 
                                      htmlFor={`${category}-${perm}`} 
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {permissionLabels[category]?.[perm] || perm}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setDialogOpen(false); setEditingRole(null); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-role">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRole ? "Update Role" : "Create Role"}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {viewingRole?.name}
              {viewingRole?.isDefault && <Badge variant="secondary">Default</Badge>}
            </SheetTitle>
            <SheetDescription>
              {viewingRole?.description || "No description provided"}
            </SheetDescription>
          </SheetHeader>
          {viewingRole && (
            <ScrollArea className="max-h-[60vh] mt-4" hideScrollbar>
              <div className="space-y-4">
                {Object.entries(viewingRole.permissions as RolePermissions || {}).map(([category, categoryPerms]) => {
                  const Icon = categoryIcons[category] || Shield;
                  const activeCount = Object.values(categoryPerms).filter(Boolean).length;
                  if (activeCount === 0) return null;
                  
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{categoryLabels[category]}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-6">
                        {Object.entries(categoryPerms)
                          .filter(([_, value]) => value)
                          .map(([perm]) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {permissionLabels[category]?.[perm] || perm}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
