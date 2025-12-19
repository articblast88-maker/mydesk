import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  FormDescription,
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  MoreHorizontal,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Archive,
  Type,
  Hash,
  List,
  ListChecks,
  AlignLeft,
  Calendar,
  ToggleLeft,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CustomFieldDefinition } from "@shared/schema";

const fieldTypes = [
  { value: "text", label: "Single-line Text", icon: Type, description: "Short text input for names, IDs, etc." },
  { value: "textarea", label: "Multi-line Text", icon: AlignLeft, description: "Long text for descriptions, notes" },
  { value: "number", label: "Number", icon: Hash, description: "Numeric values like quantity, age" },
  { value: "dropdown", label: "Dropdown", icon: List, description: "Single selection from a list" },
  { value: "multiselect", label: "Multi-select", icon: ListChecks, description: "Multiple selections from a list" },
  { value: "dependent", label: "Dependent Field", icon: Layers, description: "3-4 level cascading dropdowns" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker for dates" },
  { value: "checkbox", label: "Checkbox", icon: ToggleLeft, description: "Yes/No toggle" },
];

const defaultFields = [
  { name: "requester", label: "Requester", type: "text", required: true, editable: false },
  { name: "subject", label: "Subject", type: "text", required: true, editable: false },
  { name: "description", label: "Description", type: "textarea", required: true, editable: false },
  { name: "status", label: "Status", type: "dropdown", required: true, editable: false },
  { name: "priority", label: "Priority", type: "dropdown", required: true, editable: false },
  { name: "category", label: "Category", type: "dropdown", required: false, editable: false },
  { name: "assignee", label: "Agent", type: "dropdown", required: false, editable: false },
  { name: "group", label: "Group", type: "dropdown", required: false, editable: false },
  { name: "source", label: "Source", type: "dropdown", required: false, editable: false },
  { name: "tags", label: "Tags", type: "multiselect", required: false, editable: false },
];

const fieldSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores only"),
  label: z.string().min(2, "Label must be at least 2 characters"),
  fieldType: z.enum(["text", "textarea", "number", "dropdown", "multiselect", "dependent", "date", "checkbox"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  requiredOnClose: z.boolean().default(false),
  customerCanView: z.boolean().default(true),
  customerCanEdit: z.boolean().default(true),
  agentLabel: z.string().optional(),
  customerLabel: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  defaultValue: z.string().optional(),
  dependentLevels: z.number().min(3).max(4).optional(),
  level2AgentLabel: z.string().optional(),
  level3AgentLabel: z.string().optional(),
  level4AgentLabel: z.string().optional(),
  level2CustomerLabel: z.string().optional(),
  level3CustomerLabel: z.string().optional(),
  level4CustomerLabel: z.string().optional(),
  dependentChoices: z.any().optional(),
});

type FieldForm = z.infer<typeof fieldSchema>;

interface TicketFieldsProps {
  className?: string;
}

interface DependentChoicesEditorProps {
  levels: 3 | 4;
  choices: Record<string, Record<string, Record<string, string[]>>>;
  onChange: (choices: Record<string, Record<string, Record<string, string[]>>>) => void;
}

function DependentChoicesEditor({ levels, choices, onChange }: DependentChoicesEditorProps) {
  const [newLevel1, setNewLevel1] = useState("");
  const [selectedLevel1, setSelectedLevel1] = useState<string | null>(null);
  const [newLevel2, setNewLevel2] = useState("");
  const [selectedLevel2, setSelectedLevel2] = useState<string | null>(null);
  const [newLevel3, setNewLevel3] = useState("");
  const [selectedLevel3, setSelectedLevel3] = useState<string | null>(null);
  const [newLevel4, setNewLevel4] = useState("");

  const level1Items = Object.keys(choices);
  const level2Items = selectedLevel1 ? Object.keys(choices[selectedLevel1] || {}) : [];
  const level3Items = selectedLevel1 && selectedLevel2 
    ? Object.keys(choices[selectedLevel1]?.[selectedLevel2] || {}) 
    : [];
  const level4Items = selectedLevel1 && selectedLevel2 && selectedLevel3
    ? (choices[selectedLevel1]?.[selectedLevel2]?.[selectedLevel3] || [])
    : [];

  const addLevel1 = () => {
    if (newLevel1.trim() && !choices[newLevel1.trim()]) {
      onChange({ ...choices, [newLevel1.trim()]: {} });
      setNewLevel1("");
    }
  };

  const addLevel2 = () => {
    if (selectedLevel1 && newLevel2.trim() && !choices[selectedLevel1]?.[newLevel2.trim()]) {
      const updated = { ...choices };
      updated[selectedLevel1] = { ...updated[selectedLevel1], [newLevel2.trim()]: {} };
      onChange(updated);
      setNewLevel2("");
    }
  };

  const addLevel3 = () => {
    if (selectedLevel1 && selectedLevel2 && newLevel3.trim()) {
      const updated = { ...choices };
      if (!updated[selectedLevel1]) updated[selectedLevel1] = {};
      if (!updated[selectedLevel1][selectedLevel2]) updated[selectedLevel1][selectedLevel2] = {};
      if (!updated[selectedLevel1][selectedLevel2][newLevel3.trim()]) {
        updated[selectedLevel1][selectedLevel2][newLevel3.trim()] = [];
        onChange(updated);
        setNewLevel3("");
      }
    }
  };

  const addLevel4 = () => {
    if (selectedLevel1 && selectedLevel2 && selectedLevel3 && newLevel4.trim()) {
      const updated = { ...choices };
      if (!updated[selectedLevel1]) updated[selectedLevel1] = {};
      if (!updated[selectedLevel1][selectedLevel2]) updated[selectedLevel1][selectedLevel2] = {};
      if (!updated[selectedLevel1][selectedLevel2][selectedLevel3]) {
        updated[selectedLevel1][selectedLevel2][selectedLevel3] = [];
      }
      if (!updated[selectedLevel1][selectedLevel2][selectedLevel3].includes(newLevel4.trim())) {
        updated[selectedLevel1][selectedLevel2][selectedLevel3] = [
          ...updated[selectedLevel1][selectedLevel2][selectedLevel3],
          newLevel4.trim()
        ];
        onChange(updated);
        setNewLevel4("");
      }
    }
  };

  const removeLevel1 = (item: string) => {
    const updated = { ...choices };
    delete updated[item];
    onChange(updated);
    if (selectedLevel1 === item) {
      setSelectedLevel1(null);
      setSelectedLevel2(null);
      setSelectedLevel3(null);
    }
  };

  const removeLevel2 = (item: string) => {
    if (!selectedLevel1) return;
    const updated = { ...choices };
    delete updated[selectedLevel1][item];
    onChange(updated);
    if (selectedLevel2 === item) {
      setSelectedLevel2(null);
      setSelectedLevel3(null);
    }
  };

  const removeLevel3 = (item: string) => {
    if (!selectedLevel1 || !selectedLevel2) return;
    const updated = { ...choices };
    delete updated[selectedLevel1][selectedLevel2][item];
    onChange(updated);
    if (selectedLevel3 === item) {
      setSelectedLevel3(null);
    }
  };

  const removeLevel4 = (item: string) => {
    if (!selectedLevel1 || !selectedLevel2 || !selectedLevel3) return;
    const updated = { ...choices };
    updated[selectedLevel1][selectedLevel2][selectedLevel3] = 
      updated[selectedLevel1][selectedLevel2][selectedLevel3].filter(i => i !== item);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Dropdown Choices</h4>
      <p className="text-xs text-muted-foreground">Build your hierarchy by adding items to each level. Click an item to see/add its children.</p>
      
      <div className="grid gap-4" style={{ gridTemplateColumns: levels === 4 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }}>
        <div className="space-y-2">
          <Label className="text-xs">Level 1</Label>
          <div className="flex gap-1">
            <Input 
              placeholder="Add..." 
              value={newLevel1}
              onChange={(e) => setNewLevel1(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLevel1())}
              className="text-xs"
              data-testid="input-level1-choice"
            />
            <Button type="button" size="icon" variant="ghost" onClick={addLevel1}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="border rounded-md max-h-32 overflow-auto">
            {level1Items.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No items</p>
            ) : (
              level1Items.map(item => (
                <div 
                  key={item}
                  className={`flex items-center justify-between p-1.5 text-xs cursor-pointer hover-elevate ${selectedLevel1 === item ? 'bg-accent' : ''}`}
                  onClick={() => {
                    setSelectedLevel1(item);
                    setSelectedLevel2(null);
                    setSelectedLevel3(null);
                  }}
                >
                  <span className="flex items-center gap-1">
                    {item}
                    {selectedLevel1 === item && <ChevronRight className="h-3 w-3" />}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeLevel1(item); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Level 2</Label>
          <div className="flex gap-1">
            <Input 
              placeholder="Add..." 
              value={newLevel2}
              onChange={(e) => setNewLevel2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLevel2())}
              disabled={!selectedLevel1}
              className="text-xs"
              data-testid="input-level2-choice"
            />
            <Button type="button" size="icon" variant="ghost" onClick={addLevel2} disabled={!selectedLevel1}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="border rounded-md max-h-32 overflow-auto">
            {!selectedLevel1 ? (
              <p className="text-xs text-muted-foreground p-2">Select Level 1</p>
            ) : level2Items.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No items</p>
            ) : (
              level2Items.map(item => (
                <div 
                  key={item}
                  className={`flex items-center justify-between p-1.5 text-xs cursor-pointer hover-elevate ${selectedLevel2 === item ? 'bg-accent' : ''}`}
                  onClick={() => {
                    setSelectedLevel2(item);
                    setSelectedLevel3(null);
                  }}
                >
                  <span className="flex items-center gap-1">
                    {item}
                    {selectedLevel2 === item && <ChevronRight className="h-3 w-3" />}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeLevel2(item); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Level 3</Label>
          <div className="flex gap-1">
            <Input 
              placeholder="Add..." 
              value={newLevel3}
              onChange={(e) => setNewLevel3(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLevel3())}
              disabled={!selectedLevel2}
              className="text-xs"
              data-testid="input-level3-choice"
            />
            <Button type="button" size="icon" variant="ghost" onClick={addLevel3} disabled={!selectedLevel2}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="border rounded-md max-h-32 overflow-auto">
            {!selectedLevel2 ? (
              <p className="text-xs text-muted-foreground p-2">Select Level 2</p>
            ) : level3Items.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No items</p>
            ) : (
              level3Items.map(item => (
                <div 
                  key={item}
                  className={`flex items-center justify-between p-1.5 text-xs cursor-pointer hover-elevate ${selectedLevel3 === item ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedLevel3(item)}
                >
                  <span className="flex items-center gap-1">
                    {item}
                    {levels === 4 && selectedLevel3 === item && <ChevronRight className="h-3 w-3" />}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeLevel3(item); }} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {levels === 4 && (
          <div className="space-y-2">
            <Label className="text-xs">Level 4</Label>
            <div className="flex gap-1">
              <Input 
                placeholder="Add..." 
                value={newLevel4}
                onChange={(e) => setNewLevel4(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLevel4())}
                disabled={!selectedLevel3}
                className="text-xs"
                data-testid="input-level4-choice"
              />
              <Button type="button" size="icon" variant="ghost" onClick={addLevel4} disabled={!selectedLevel3}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="border rounded-md max-h-32 overflow-auto">
              {!selectedLevel3 ? (
                <p className="text-xs text-muted-foreground p-2">Select Level 3</p>
              ) : level4Items.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No items</p>
              ) : (
                level4Items.map(item => (
                  <div 
                    key={item}
                    className="flex items-center justify-between p-1.5 text-xs hover-elevate"
                  >
                    <span>{item}</span>
                    <button type="button" onClick={() => removeLevel4(item)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TicketFields({ className }: TicketFieldsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [newOption, setNewOption] = useState("");
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [dependentLevels, setDependentLevels] = useState<3 | 4>(3);
  const [dependentChoices, setDependentChoices] = useState<Record<string, Record<string, Record<string, string[]>>>>({});

  const { data: customFields, isLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields", "ticket"],
    queryFn: async () => {
      const res = await fetch("/api/custom-fields?entityType=ticket");
      if (!res.ok) throw new Error("Failed to fetch fields");
      return res.json();
    },
  });

  const activeFields = customFields?.filter(f => !f.isArchived) || [];
  const archivedFields = customFields?.filter(f => f.isArchived) || [];

  const form = useForm<FieldForm>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      name: "",
      label: "",
      fieldType: "text",
      options: [],
      isRequired: false,
      requiredOnClose: false,
      customerCanView: true,
      customerCanEdit: true,
      agentLabel: "",
      customerLabel: "",
      placeholder: "",
      helpText: "",
      defaultValue: "",
      dependentLevels: 3,
      level2AgentLabel: "",
      level3AgentLabel: "",
      level4AgentLabel: "",
      level2CustomerLabel: "",
      level3CustomerLabel: "",
      level4CustomerLabel: "",
      dependentChoices: {},
    },
  });

  const watchFieldType = form.watch("fieldType");
  const watchLabel = form.watch("label");
  const watchDependentLevels = form.watch("dependentLevels");

  // Auto-generate field name from label (only when creating new field)
  useEffect(() => {
    if (!editingField && watchLabel) {
      const autoName = "cf_" + watchLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/_+/g, "_");
      form.setValue("name", autoName);
    }
  }, [watchLabel, editingField, form]);

  const handleOpenDialog = (field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field);
      setFieldOptions(field.options || []);
      const depConfig = (field as any).dependentConfig || {};
      setDependentLevels(depConfig.levels || 3);
      setDependentChoices(depConfig.choices || {});
      form.reset({
        name: field.name,
        label: field.label,
        fieldType: field.fieldType as any,
        options: field.options || [],
        isRequired: field.isRequired,
        requiredOnClose: field.requiredOnClose,
        customerCanView: field.customerCanView,
        customerCanEdit: field.customerCanEdit,
        agentLabel: field.agentLabel || "",
        customerLabel: field.customerLabel || "",
        placeholder: field.placeholder || "",
        helpText: field.helpText || "",
        defaultValue: field.defaultValue || "",
        dependentLevels: depConfig.levels || 3,
        level2AgentLabel: depConfig.level2AgentLabel || "",
        level3AgentLabel: depConfig.level3AgentLabel || "",
        level4AgentLabel: depConfig.level4AgentLabel || "",
        level2CustomerLabel: depConfig.level2CustomerLabel || "",
        level3CustomerLabel: depConfig.level3CustomerLabel || "",
        level4CustomerLabel: depConfig.level4CustomerLabel || "",
        dependentChoices: depConfig.choices || {},
      });
    } else {
      setEditingField(null);
      setFieldOptions([]);
      setDependentLevels(3);
      setDependentChoices({});
      form.reset({
        name: "",
        label: "",
        fieldType: "text",
        options: [],
        isRequired: false,
        requiredOnClose: false,
        customerCanView: true,
        customerCanEdit: true,
        agentLabel: "",
        customerLabel: "",
        placeholder: "",
        helpText: "",
        defaultValue: "",
        dependentLevels: 3,
        level2AgentLabel: "",
        level3AgentLabel: "",
        level4AgentLabel: "",
        level2CustomerLabel: "",
        level3CustomerLabel: "",
        level4CustomerLabel: "",
        dependentChoices: {},
      });
    }
    setDialogOpen(true);
  };

  const createFieldMutation = useMutation({
    mutationFn: async (data: FieldForm) => {
      const payload: any = {
        ...data,
        entityType: "ticket",
        options: data.fieldType === "dependent" ? Object.keys(dependentChoices) : fieldOptions,
        position: (activeFields?.length || 0) + 1,
      };
      if (data.fieldType === "dependent") {
        payload.dependentConfig = {
          levels: dependentLevels,
          level2AgentLabel: data.level2AgentLabel,
          level3AgentLabel: data.level3AgentLabel,
          level4AgentLabel: data.level4AgentLabel,
          level2CustomerLabel: data.level2CustomerLabel,
          level3CustomerLabel: data.level3CustomerLabel,
          level4CustomerLabel: data.level4CustomerLabel,
          choices: dependentChoices,
        };
      }
      return apiRequest("POST", "/api/custom-fields", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "ticket"] });
      toast({ title: "Field created", description: "The custom field has been created." });
      form.reset();
      setFieldOptions([]);
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FieldForm> }) => {
      const payload: any = {
        ...data,
        options: data.fieldType === "dependent" ? Object.keys(dependentChoices) : fieldOptions,
      };
      if (data.fieldType === "dependent") {
        payload.dependentConfig = {
          levels: dependentLevels,
          level2AgentLabel: data.level2AgentLabel,
          level3AgentLabel: data.level3AgentLabel,
          level4AgentLabel: data.level4AgentLabel,
          level2CustomerLabel: data.level2CustomerLabel,
          level3CustomerLabel: data.level3CustomerLabel,
          level4CustomerLabel: data.level4CustomerLabel,
          choices: dependentChoices,
        };
      }
      return apiRequest("PATCH", `/api/custom-fields/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "ticket"] });
      toast({ title: "Field updated", description: "The custom field has been updated." });
      setDialogOpen(false);
      setEditingField(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const archiveFieldMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      return apiRequest("PATCH", `/api/custom-fields/${id}`, { isArchived });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "ticket"] });
      toast({ 
        title: variables.isArchived ? "Field archived" : "Field restored", 
        description: variables.isArchived ? "The field has been archived." : "The field has been restored."
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "ticket"] });
      toast({ title: "Field deleted", description: "The custom field has been permanently deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: FieldForm) => {
    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data });
    } else {
      createFieldMutation.mutate(data);
    }
  };

  const addOption = () => {
    if (newOption.trim() && !fieldOptions.includes(newOption.trim())) {
      setFieldOptions([...fieldOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (option: string) => {
    setFieldOptions(fieldOptions.filter(o => o !== option));
  };

  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find(f => f.value === type);
    return fieldType?.icon || Type;
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-medium">Ticket Fields</h2>
          <p className="text-sm text-muted-foreground">Customize the fields that appear on tickets</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-field">
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Field
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Default Fields
            </CardTitle>
            <CardDescription>System fields that cannot be deleted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {defaultFields.map((field) => {
                const Icon = getFieldIcon(field.type);
                return (
                  <div 
                    key={field.name} 
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                    data-testid={`default-field-${field.name}`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{field.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{field.type}</Badge>
                    {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custom Fields</CardTitle>
            <CardDescription>Fields you've created for your tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : activeFields.length === 0 ? (
              <EmptyState
                icon={Type}
                title="No custom fields"
                description="Create custom fields to capture additional ticket information"
                action={{ label: "Add Custom Field", onClick: () => handleOpenDialog() }}
              />
            ) : (
              <div className="space-y-2">
                {activeFields.map((field) => {
                  const Icon = getFieldIcon(field.fieldType);
                  return (
                    <div 
                      key={field.id} 
                      className="flex items-center gap-3 p-3 rounded-md border hover-elevate"
                      data-testid={`custom-field-${field.id}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{field.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{field.name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{field.fieldType}</Badge>
                      {field.isRequired && <Badge variant="secondary" className="text-xs flex-shrink-0">Required</Badge>}
                      {!field.customerCanView && (
                        <span title="Hidden from customers">
                          <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" data-testid={`button-field-menu-${field.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(field)} data-testid={`button-edit-field-${field.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => archiveFieldMutation.mutate({ id: field.id, isArchived: true })}
                            data-testid={`button-archive-field-${field.id}`}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {archivedFields.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Archived Fields</CardTitle>
              <CardDescription>Fields that are no longer in use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {archivedFields.map((field) => {
                  const Icon = getFieldIcon(field.fieldType);
                  return (
                    <div 
                      key={field.id} 
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                      data-testid={`archived-field-${field.id}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-muted-foreground">{field.label}</p>
                        <p className="text-xs text-muted-foreground">{field.name}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => archiveFieldMutation.mutate({ id: field.id, isArchived: false })}
                        data-testid={`button-restore-field-${field.id}`}
                      >
                        Restore
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteFieldMutation.mutate(field.id)}
                        data-testid={`button-delete-field-${field.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>{editingField ? "Edit Custom Field" : "Create Custom Field"}</SheetTitle>
            <SheetDescription>
              {editingField ? "Modify the field properties" : "Add a new custom field to your tickets"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0 pr-4 mt-4" hideScrollbar>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label for Agents</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Product Type" {...field} data-testid="input-field-label" />
                        </FormControl>
                        <FormDescription>Display name in the agent view</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Name (API)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. product_type" 
                            {...field} 
                            disabled={!!editingField}
                            data-testid="input-field-name" 
                          />
                        </FormControl>
                        <FormDescription>Lowercase with underscores</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="fieldType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!!editingField}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-field-type">
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} data-testid={`option-field-type-${type.value}`}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                <div>
                                  <p>{type.label}</p>
                                  <p className="text-xs text-muted-foreground">{type.description}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchFieldType === "dropdown" || watchFieldType === "multiselect") && (
                  <div className="space-y-3">
                    <Label>Choices</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add an option" 
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                        data-testid="input-new-option"
                      />
                      <Button type="button" variant="secondary" onClick={addOption} data-testid="button-add-option">
                        Add
                      </Button>
                    </div>
                    {fieldOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {fieldOptions.map((option, index) => (
                          <Badge key={index} variant="secondary" className="gap-1 pl-2">
                            {option}
                            <button 
                              type="button"
                              onClick={() => removeOption(option)}
                              className="ml-1 hover:text-destructive"
                              data-testid={`button-remove-option-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {watchFieldType === "dependent" && (
                  <div className="space-y-6 border rounded-md p-4">
                    <div className="space-y-3">
                      <Label>Number of Levels</Label>
                      <Select
                        value={String(dependentLevels)}
                        onValueChange={(v) => {
                          const levels = Number(v) as 3 | 4;
                          setDependentLevels(levels);
                          form.setValue("dependentLevels", levels);
                        }}
                      >
                        <SelectTrigger data-testid="select-dependent-levels">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Levels</SelectItem>
                          <SelectItem value="4">4 Levels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Level Labels</h4>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="label"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level 1 Label for Agents</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Product" {...field} data-testid="input-level1-agent-label" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerLabel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level 1 Label for Customers</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Product" {...field} data-testid="input-level1-customer-label" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="level2AgentLabel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level 2 Label for Agents</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Issue Type" {...field} data-testid="input-level2-agent-label" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="level2CustomerLabel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level 2 Label for Customers</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Issue Type" {...field} data-testid="input-level2-customer-label" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="level3AgentLabel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level 3 Label for Agents</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Additional Details" {...field} data-testid="input-level3-agent-label" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="level3CustomerLabel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Level 3 Label for Customers</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Additional Details" {...field} data-testid="input-level3-customer-label" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {dependentLevels === 4 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="level4AgentLabel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Level 4 Label for Agents</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Sub Item" {...field} data-testid="input-level4-agent-label" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="level4CustomerLabel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Level 4 Label for Customers</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Sub Item" {...field} data-testid="input-level4-customer-label" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <Separator />

                    <DependentChoicesEditor
                      levels={dependentLevels}
                      choices={dependentChoices}
                      onChange={setDependentChoices}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="customerLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label for Customers (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave blank to use agent label" {...field} data-testid="input-customer-label" />
                      </FormControl>
                      <FormDescription>Different label shown to customers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="placeholder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placeholder Text</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Enter value..." {...field} data-testid="input-placeholder" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Value</FormLabel>
                        <FormControl>
                          <Input placeholder="Default value" {...field} data-testid="input-default-value" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="helpText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Help Text</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Instructions for filling out this field" 
                          className="resize-none"
                          {...field} 
                          data-testid="input-help-text" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Field Requirements</h4>
                  
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm font-normal">Required when submitting</FormLabel>
                          <FormDescription className="text-xs">
                            Field must be filled before ticket can be created
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-required" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredOnClose"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm font-normal">Required when closing</FormLabel>
                          <FormDescription className="text-xs">
                            Field must be filled before ticket can be closed
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-required-close" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Customer Portal Settings</h4>
                  
                  <FormField
                    control={form.control}
                    name="customerCanView"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm font-normal">Visible to customers</FormLabel>
                          <FormDescription className="text-xs">
                            Customers can see this field on their tickets
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-customer-view" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerCanEdit"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-sm font-normal">Editable by customers</FormLabel>
                          <FormDescription className="text-xs">
                            Customers can provide a value when creating tickets
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-customer-edit" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-field"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
                    data-testid="button-save-field"
                  >
                    {(createFieldMutation.isPending || updateFieldMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingField ? "Update Field" : "Create Field"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
