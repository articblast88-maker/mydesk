import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { CustomFieldDefinition } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, Zap, Edit, Trash2, MoreHorizontal, Loader2, Play, ArrowRight, 
  Clock, RefreshCw, FileEdit, X, AlertCircle 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AutomationRule } from "@shared/schema";

const ruleTypeLabels: Record<string, { label: string; description: string; icon: typeof Zap }> = {
  ticket_creation: { 
    label: "Ticket Creation", 
    description: "Runs when a new ticket is created",
    icon: Zap 
  },
  ticket_update: { 
    label: "Ticket Updates", 
    description: "Runs when ticket properties change",
    icon: FileEdit 
  },
  time_trigger: { 
    label: "Time Triggers", 
    description: "Runs hourly on matching tickets",
    icon: Clock 
  },
};

const baseTriggersByType: Record<string, { value: string; label: string }[]> = {
  ticket_creation: [
    { value: "on_create", label: "When ticket is created" },
  ],
  ticket_update: [
    { value: "status_changed", label: "Status is changed" },
    { value: "priority_changed", label: "Priority is changed" },
    { value: "assignee_changed", label: "Assignee is changed" },
    { value: "reply_added", label: "Reply is added" },
    { value: "note_added", label: "Internal note is added" },
    { value: "tag_added", label: "Tag is added" },
    { value: "any_update", label: "Any property is updated" },
  ],
  time_trigger: [
    { value: "hourly", label: "Every hour" },
    { value: "every_2_hours", label: "Every 2 hours" },
    { value: "every_4_hours", label: "Every 4 hours" },
    { value: "daily", label: "Once daily" },
  ],
};

const baseConditionFields = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "category", label: "Category" },
  { value: "channel", label: "Channel" },
  { value: "tags", label: "Tags" },
  { value: "subject", label: "Subject" },
  { value: "description", label: "Description" },
  { value: "hours_since_created", label: "Hours since created" },
  { value: "hours_since_updated", label: "Hours since last update" },
  { value: "assignee", label: "Assignee" },
];

const baseConditionOperators: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  priority: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  category: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
    { value: "contains", label: "contains" },
  ],
  channel: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  tags: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
  ],
  subject: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "starts_with", label: "starts with" },
  ],
  description: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
  ],
  hours_since_created: [
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
  ],
  hours_since_updated: [
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
  ],
  assignee: [
    { value: "is_set", label: "is assigned" },
    { value: "is_not_set", label: "is not assigned" },
  ],
};

const baseActionTypes = [
  { value: "set_status", label: "Set status" },
  { value: "set_priority", label: "Set priority" },
  { value: "set_category", label: "Set category" },
  { value: "assign_to", label: "Assign to agent" },
  { value: "add_tag", label: "Add tag" },
  { value: "remove_tag", label: "Remove tag" },
  { value: "send_email", label: "Send email notification" },
  { value: "add_note", label: "Add internal note" },
];

function getOperatorsForFieldType(fieldType: string): { value: string; label: string }[] {
  switch (fieldType) {
    case "text":
    case "textarea":
      return [
        { value: "is", label: "is" },
        { value: "is_not", label: "is not" },
        { value: "contains", label: "contains" },
        { value: "not_contains", label: "does not contain" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "number":
    case "decimal":
      return [
        { value: "is", label: "is" },
        { value: "is_not", label: "is not" },
        { value: "greater_than", label: "greater than" },
        { value: "less_than", label: "less than" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "dropdown":
    case "multiselect":
      return [
        { value: "is", label: "is" },
        { value: "is_not", label: "is not" },
        { value: "contains", label: "contains" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "checkbox":
      return [
        { value: "is", label: "is" },
      ];
    case "date":
      return [
        { value: "is", label: "is" },
        { value: "is_before", label: "is before" },
        { value: "is_after", label: "is after" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    default:
      return [
        { value: "is", label: "is" },
        { value: "is_not", label: "is not" },
      ];
  }
}

const conditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

const actionSchema = z.object({
  type: z.string(),
  value: z.string(),
});

const ruleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  ruleType: z.enum(["ticket_creation", "ticket_update", "time_trigger"]),
  trigger: z.string(),
  conditionMatch: z.enum(["all", "any"]),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1, "At least one action is required"),
});

type RuleForm = z.infer<typeof ruleSchema>;

function RuleCard({ 
  rule, 
  onToggle, 
  onDelete,
  triggersByType,
}: { 
  rule: AutomationRule; 
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  triggersByType: Record<string, { value: string; label: string }[]>;
}) {
  const ruleInfo = ruleTypeLabels[rule.ruleType as string] || ruleTypeLabels.ticket_creation;
  const Icon = ruleInfo.icon;
  const triggers = triggersByType[rule.ruleType as string] || [];
  const triggerLabel = triggers.find(t => t.value === rule.trigger)?.label || rule.trigger;
  const conditions = (rule.conditions as any[]) || [];
  const actions = (rule.actions as any[]) || [];

  return (
    <Card className="hover-elevate" data-testid={`card-rule-${rule.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${rule.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
              <Icon className={`h-5 w-5 ${rule.isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base flex flex-wrap items-center gap-2">
                <span className="truncate">{rule.name}</span>
                <Badge variant={rule.isActive ? "default" : "secondary"} className="shrink-0">
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1 truncate">
                {rule.description || triggerLabel}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
              data-testid={`switch-rule-${rule.id}`}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Play className="mr-2 h-4 w-4" />
                  Test Run
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => onDelete(rule.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{triggerLabel}</Badge>
          {conditions.length > 0 && (
            <>
              <ArrowRight className="h-4 w-4" />
              <span>{conditions.length} condition(s)</span>
            </>
          )}
          <ArrowRight className="h-4 w-4" />
          <span>{actions.length} action(s)</span>
          {rule.executionCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              <RefreshCw className="mr-1 h-3 w-3" />
              {rule.executionCount} runs
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Automations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<string>("ticket_creation");

  const { data: rules, isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation-rules"],
  });
  
  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields", { entityType: "ticket" }],
  });
  
  const triggersByType = useMemo(() => {
    const dynamicTriggers = { ...baseTriggersByType };
    if (customFields?.length) {
      const customFieldTriggers = customFields.map(cf => ({
        value: `cf_${cf.id}_changed`,
        label: `${cf.label} is changed`,
      }));
      dynamicTriggers.ticket_update = [
        ...baseTriggersByType.ticket_update,
        ...customFieldTriggers,
      ];
    }
    return dynamicTriggers;
  }, [customFields]);
  
  const conditionFields = useMemo(() => {
    const dynamicFields = [...baseConditionFields];
    if (customFields?.length) {
      customFields.forEach(cf => {
        dynamicFields.push({
          value: `cf_${cf.id}`,
          label: cf.label,
        });
      });
    }
    return dynamicFields;
  }, [customFields]);
  
  const conditionOperators = useMemo(() => {
    const dynamicOperators = { ...baseConditionOperators };
    if (customFields?.length) {
      customFields.forEach(cf => {
        dynamicOperators[`cf_${cf.id}`] = getOperatorsForFieldType(cf.fieldType);
      });
    }
    return dynamicOperators;
  }, [customFields]);
  
  const actionTypes = useMemo(() => {
    const dynamicActions = [...baseActionTypes];
    if (customFields?.length) {
      customFields.forEach(cf => {
        dynamicActions.push({
          value: `set_cf_${cf.id}`,
          label: `Set ${cf.label}`,
        });
      });
    }
    return dynamicActions;
  }, [customFields]);
  
  const customFieldsMap = useMemo(() => {
    const map: Record<string, CustomFieldDefinition> = {};
    customFields?.forEach(cf => {
      map[`cf_${cf.id}`] = cf;
      map[`set_cf_${cf.id}`] = cf;
    });
    return map;
  }, [customFields]);
  
  const getFieldMetadata = (fieldOrAction: string) => {
    return customFieldsMap[fieldOrAction] || customFieldsMap[fieldOrAction.replace('set_', '')];
  };
  
  const renderValueInput = (
    fieldOrAction: string, 
    value: string, 
    onChange: (val: string) => void,
    testId: string,
    operator?: string
  ) => {
    if (operator === "is_empty" || operator === "is_not_empty" || operator === "is_set" || operator === "is_not_set") {
      return null;
    }
    
    const cfMeta = getFieldMetadata(fieldOrAction);
    
    if (cfMeta) {
      if (cfMeta.fieldType === "dropdown" || cfMeta.fieldType === "multiselect") {
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1" data-testid={testId}>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {(cfMeta.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      if (cfMeta.fieldType === "checkbox") {
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1" data-testid={testId}>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Checked</SelectItem>
              <SelectItem value="false">Unchecked</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      
      if (cfMeta.fieldType === "number" || cfMeta.fieldType === "decimal") {
        return (
          <Input
            type="number"
            step={cfMeta.fieldType === "decimal" ? "0.01" : "1"}
            placeholder={cfMeta.placeholder || "Enter number"}
            className="flex-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={testId}
          />
        );
      }
      
      if (cfMeta.fieldType === "date") {
        return (
          <Input
            type="date"
            className="flex-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={testId}
          />
        );
      }
    }
    
    if (fieldOrAction === "status" || fieldOrAction === "set_status") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1" data-testid={testId}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldOrAction === "priority" || fieldOrAction === "set_priority") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1" data-testid={testId}>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldOrAction === "channel") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1" data-testid={testId}>
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
            <SelectItem value="social">Social</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldOrAction === "category" || fieldOrAction === "set_category") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1" data-testid={testId}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="feature_request">Feature Request</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="account">Account</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldOrAction === "assign_to") {
      return (
        <Input
          placeholder="Agent email or ID"
          className="flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      );
    }
    
    if (fieldOrAction === "tags" || fieldOrAction === "add_tag" || fieldOrAction === "remove_tag") {
      return (
        <Input
          placeholder="Tag name"
          className="flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      );
    }
    
    if (fieldOrAction === "send_email") {
      return (
        <Input
          placeholder="Email template or recipient"
          className="flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      );
    }
    
    if (fieldOrAction === "add_note") {
      return (
        <Input
          placeholder="Note content"
          className="flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      );
    }
    
    return (
      <Input
        placeholder="Value"
        className="flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
    );
  };

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      description: "",
      ruleType: "ticket_creation",
      trigger: "on_create",
      conditionMatch: "all",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
    },
  });

  const { fields: conditionFields_, append: appendCondition, remove: removeCondition } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control: form.control,
    name: "actions",
  });

  const watchRuleType = form.watch("ruleType");

  const createMutation = useMutation({
    mutationFn: async (data: RuleForm) => {
      return apiRequest("POST", "/api/automation-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: "Rule created", description: "The automation rule has been created." });
      form.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/automation-rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/automation-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({ title: "Rule deleted", description: "The automation rule has been deleted." });
    },
  });

  const rulesByType = {
    ticket_creation: rules?.filter(r => r.ruleType === "ticket_creation" || !r.ruleType) || [],
    ticket_update: rules?.filter(r => r.ruleType === "ticket_update") || [],
    time_trigger: rules?.filter(r => r.ruleType === "time_trigger") || [],
  };

  const totalActive = rules?.filter(r => r.isActive).length || 0;
  const totalExecutions = rules?.reduce((sum, r) => sum + (r.executionCount || 0), 0) || 0;

  const openCreateDialog = (ruleType: string) => {
    const triggers = triggersByType[ruleType] || [];
    form.reset({
      name: "",
      description: "",
      ruleType: ruleType as any,
      trigger: triggers[0]?.value || "on_create",
      conditionMatch: "all",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Automations</h1>
          <p className="text-muted-foreground">Automate ticket workflows with rules and triggers</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{rules?.length || 0}</CardTitle>
            <CardDescription>Total Rules</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{totalActive}</CardTitle>
            <CardDescription>Active Rules</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{totalExecutions}</CardTitle>
            <CardDescription>Total Executions</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={selectedRuleType} onValueChange={setSelectedRuleType}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="ticket_creation" data-testid="tab-ticket-creation">
              <Zap className="mr-2 h-4 w-4" />
              Ticket Creation
            </TabsTrigger>
            <TabsTrigger value="ticket_update" data-testid="tab-ticket-update">
              <FileEdit className="mr-2 h-4 w-4" />
              Ticket Updates
            </TabsTrigger>
            <TabsTrigger value="time_trigger" data-testid="tab-time-trigger">
              <Clock className="mr-2 h-4 w-4" />
              Time Triggers
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => openCreateDialog(selectedRuleType)} data-testid="button-new-rule">
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : (
          Object.entries(rulesByType).map(([type, typeRules]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{ruleTypeLabels[type].label}</p>
                    <p className="text-sm text-muted-foreground">{ruleTypeLabels[type].description}</p>
                  </div>
                </div>
              </div>

              {typeRules.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <EmptyState
                      icon={ruleTypeLabels[type].icon}
                      title={`No ${ruleTypeLabels[type].label.toLowerCase()} rules`}
                      description={`Create rules that ${ruleTypeLabels[type].description.toLowerCase()}`}
                      action={{ label: "Create Rule", onClick: () => openCreateDialog(type) }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {typeRules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      triggersByType={triggersByType}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))
        )}
      </Tabs>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create {ruleTypeLabels[watchRuleType]?.label} Rule</SheetTitle>
            <SheetDescription>
              {ruleTypeLabels[watchRuleType]?.description}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="mt-4 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Auto-assign urgent tickets" {...field} data-testid="input-rule-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      1
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>
                  <div className="flex-1 pb-6">
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Event
                    </h3>
                    <div className="rounded-lg border bg-card p-4">
                      <FormField
                        control={form.control}
                        name="trigger"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="flex-1" data-testid="select-trigger">
                                    <SelectValue placeholder="Select trigger event" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(triggersByType[watchRuleType] || []).map((trigger) => (
                                    <SelectItem key={trigger.value} value={trigger.value}>
                                      {trigger.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white text-sm font-medium">
                      2
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>
                  <div className="flex-1 pb-6">
                    <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Condition
                    </h3>
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>On tickets with these properties:</span>
                        <FormField
                          control={form.control}
                          name="conditionMatch"
                          render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name="conditionMatch"
                                  value="any"
                                  checked={field.value === "any"}
                                  onChange={() => field.onChange("any")}
                                  className="h-4 w-4 text-primary"
                                  data-testid="radio-match-any"
                                />
                                <span className="font-medium">Match ANY</span>
                                <span>of the below</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer ml-4">
                                <input
                                  type="radio"
                                  name="conditionMatch"
                                  value="all"
                                  checked={field.value === "all"}
                                  onChange={() => field.onChange("all")}
                                  className="h-4 w-4 text-primary"
                                  data-testid="radio-match-all"
                                />
                                <span className="font-medium">Match ALL</span>
                                <span>of the below</span>
                              </label>
                            </div>
                          )}
                        />
                      </div>

                      {conditionFields_.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                          No conditions added yet. Rule will run for all tickets matching the trigger.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {conditionFields_.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 p-3 rounded-md bg-muted/30">
                              <span className="text-sm text-muted-foreground shrink-0">In Tickets</span>
                              <Select
                                value={form.watch(`conditions.${index}.field`)}
                                onValueChange={(value) => {
                                  form.setValue(`conditions.${index}.field`, value);
                                  form.setValue(`conditions.${index}.operator`, conditionOperators[value]?.[0]?.value || "is");
                                }}
                              >
                                <SelectTrigger className="w-36" data-testid={`select-condition-field-${index}`}>
                                  <SelectValue placeholder="Field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {conditionFields.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={form.watch(`conditions.${index}.operator`)}
                                onValueChange={(value) => form.setValue(`conditions.${index}.operator`, value)}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-condition-operator-${index}`}>
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(conditionOperators[form.watch(`conditions.${index}.field`)] || []).map((op) => (
                                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {renderValueInput(
                                form.watch(`conditions.${index}.field`),
                                form.watch(`conditions.${index}.value`),
                                (val) => form.setValue(`conditions.${index}.value`, val),
                                `input-condition-value-${index}`,
                                form.watch(`conditions.${index}.operator`)
                              )}
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeCondition(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => appendCondition({ field: "status", operator: "is", value: "" })}
                        data-testid="button-add-condition"
                        className="text-primary"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add new condition
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-white text-sm font-medium">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Action
                    </h3>
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                      {actionFields.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                          Add at least one action for this rule.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {actionFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 p-3 rounded-md bg-muted/30">
                              <Select
                                value={form.watch(`actions.${index}.type`)}
                                onValueChange={(value) => form.setValue(`actions.${index}.type`, value)}
                              >
                                <SelectTrigger className="w-44" data-testid={`select-action-type-${index}`}>
                                  <SelectValue placeholder="Action type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {actionTypes.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {renderValueInput(
                                form.watch(`actions.${index}.type`),
                                form.watch(`actions.${index}.value`),
                                (val) => form.setValue(`actions.${index}.value`, val),
                                `input-action-value-${index}`
                              )}
                              {actionFields.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeAction(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => appendAction({ type: "set_status", value: "" })}
                        data-testid="button-add-action"
                        className="text-primary"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add new action
                      </Button>

                      {form.formState.errors.actions && (
                        <p className="text-sm text-destructive">{form.formState.errors.actions.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What does this rule do?" {...field} data-testid="input-rule-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-rule">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Rule
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
