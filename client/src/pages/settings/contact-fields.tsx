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
  User,
  Mail,
  Phone,
  Building,
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
  { value: "text", label: "Single-line Text", icon: Type, description: "Short text input" },
  { value: "textarea", label: "Multi-line Text", icon: AlignLeft, description: "Long text for descriptions" },
  { value: "number", label: "Number", icon: Hash, description: "Whole numbers" },
  { value: "decimal", label: "Decimal", icon: Hash, description: "Decimal numbers" },
  { value: "dropdown", label: "Dropdown", icon: List, description: "Single selection" },
  { value: "multiselect", label: "Multi-select", icon: ListChecks, description: "Multiple selections" },
  { value: "date", label: "Date", icon: Calendar, description: "Date picker" },
  { value: "checkbox", label: "Checkbox", icon: ToggleLeft, description: "Yes/No toggle" },
];

const defaultContactFields = [
  { name: "name", label: "Full Name", type: "text", required: true, description: "Primary name field for the contact" },
  { name: "email", label: "Email", type: "text", required: true, description: "Primary email address" },
  { name: "phone", label: "Mobile Phone", type: "text", required: false, description: "Primary phone number" },
  { name: "workPhone", label: "Work Phone", type: "text", required: false, description: "Work phone number" },
  { name: "title", label: "Title", type: "text", required: false, description: "Position or role" },
  { name: "companyId", label: "Company", type: "dropdown", required: false, description: "Associated company" },
  { name: "address", label: "Address", type: "textarea", required: false, description: "Primary address" },
  { name: "timezone", label: "Time Zone", type: "dropdown", required: false, description: "Contact time zone" },
  { name: "language", label: "Language", type: "dropdown", required: false, description: "Preferred language" },
  { name: "tags", label: "Tags", type: "multiselect", required: false, description: "Contact tags" },
  { name: "externalId", label: "External ID", type: "text", required: false, description: "ID from another system" },
  { name: "about", label: "About", type: "textarea", required: false, description: "Description of the contact" },
];

const fieldSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores only"),
  label: z.string().min(2, "Label must be at least 2 characters"),
  fieldType: z.enum(["text", "textarea", "number", "decimal", "dropdown", "multiselect", "date", "checkbox"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  displayToAgents: z.boolean().default(true),
  agentsCanEdit: z.boolean().default(true),
  displayToCustomers: z.boolean().default(true),
  customerCanEdit: z.boolean().default(true),
  showOnSignup: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  agentLabel: z.string().optional(),
  customerLabel: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
});

type FieldForm = z.infer<typeof fieldSchema>;

interface ContactFieldsProps {
  className?: string;
}

export default function ContactFields({ className }: ContactFieldsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [newOption, setNewOption] = useState("");
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);

  const { data: customFields, isLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields", "contact"],
    queryFn: async () => {
      const res = await fetch("/api/custom-fields?entityType=contact");
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
      displayToAgents: true,
      agentsCanEdit: true,
      displayToCustomers: true,
      customerCanEdit: true,
      showOnSignup: false,
      isUnique: false,
      agentLabel: "",
      customerLabel: "",
      placeholder: "",
      helpText: "",
    },
  });

  const watchFieldType = form.watch("fieldType");
  const watchLabel = form.watch("label");

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
      form.reset({
        name: field.name,
        label: field.label,
        fieldType: field.fieldType as any,
        options: field.options || [],
        isRequired: field.isRequired,
        displayToAgents: field.customerCanView !== false,
        agentsCanEdit: field.customerCanEdit !== false,
        displayToCustomers: field.customerCanView,
        customerCanEdit: field.customerCanEdit,
        showOnSignup: false,
        isUnique: false,
        agentLabel: field.agentLabel || "",
        customerLabel: field.customerLabel || "",
        placeholder: field.placeholder || "",
        helpText: field.helpText || "",
      });
    } else {
      setEditingField(null);
      setFieldOptions([]);
      form.reset({
        name: "",
        label: "",
        fieldType: "text",
        options: [],
        isRequired: false,
        displayToAgents: true,
        agentsCanEdit: true,
        displayToCustomers: true,
        customerCanEdit: true,
        showOnSignup: false,
        isUnique: false,
        agentLabel: "",
        customerLabel: "",
        placeholder: "",
        helpText: "",
      });
    }
    setDialogOpen(true);
  };

  const createFieldMutation = useMutation({
    mutationFn: async (data: FieldForm) => {
      return apiRequest("POST", "/api/custom-fields", {
        ...data,
        entityType: "contact",
        options: fieldOptions,
        position: (activeFields?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "contact"] });
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
      return apiRequest("PATCH", `/api/custom-fields/${id}`, {
        ...data,
        options: fieldOptions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "contact"] });
      toast({ title: "Field updated", description: "The custom field has been updated." });
      setDialogOpen(false);
      setEditingField(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const archiveFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/custom-fields/${id}`, { isArchived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "contact"] });
      toast({ title: "Field archived", description: "The field has been archived." });
    },
  });

  const restoreFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/custom-fields/${id}`, { isArchived: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "contact"] });
      toast({ title: "Field restored", description: "The field has been restored." });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields", "contact"] });
      toast({ title: "Field deleted", description: "The field has been permanently deleted." });
    },
  });

  const onSubmit = (data: FieldForm) => {
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

  const getFieldTypeIcon = (type: string) => {
    const fieldType = fieldTypes.find(f => f.value === type);
    return fieldType?.icon || Type;
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">Contact Fields</h2>
          <p className="text-sm text-muted-foreground">
            Manage default and custom fields for contacts
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-contact-field">
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Field
        </Button>
      </div>

      <Tabs defaultValue="default" className="space-y-4">
        <TabsList>
          <TabsTrigger value="default" data-testid="tab-default-fields">Default Fields</TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-custom-fields">
            Custom Fields
            {activeFields.length > 0 && (
              <Badge variant="secondary" className="ml-2">{activeFields.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="default" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Default Contact Fields</CardTitle>
              <CardDescription>
                These fields are built-in and cannot be deleted. You can modify their display settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {defaultContactFields.map((field) => {
                  const Icon = getFieldTypeIcon(field.type);
                  return (
                    <div
                      key={field.name}
                      className="flex items-center gap-3 p-3 rounded-md border bg-card"
                      data-testid={`default-field-${field.name}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          {field.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{field.type}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {isLoading ? (
            <TableSkeleton />
          ) : activeFields.length === 0 ? (
            <EmptyState
              icon={User}
              title="No custom fields"
              description="Create custom fields to capture additional contact information."
              action={{
                label: "Add Custom Field",
                onClick: () => handleOpenDialog(),
              }}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Custom Contact Fields</CardTitle>
                <CardDescription>
                  Drag to reorder fields. Fields appear in this order on forms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeFields.map((field) => {
                    const Icon = getFieldTypeIcon(field.fieldType);
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate"
                        data-testid={`custom-field-${field.name}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.label}</span>
                            {field.isRequired && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                            {!field.isActive && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{field.name}</p>
                        </div>
                        <Badge variant="secondary" className="capitalize">{field.fieldType}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-field-menu-${field.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(field)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Field
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => archiveFieldMutation.mutate(field.id)}
                              className="text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive Field
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {archivedFields.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Archived Fields</CardTitle>
                <CardDescription>
                  These fields are hidden but data is preserved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {archivedFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 p-3 rounded-md border bg-muted/50"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-muted-foreground">{field.label}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreFieldMutation.mutate(field.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteFieldMutation.mutate(field.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>{editingField ? "Edit Field" : "Add Custom Field"}</SheetTitle>
            <SheetDescription>
              {editingField
                ? "Update the field properties below."
                : "Create a new custom field for contacts."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 pr-4 mt-4" hideScrollbar>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="field_name"
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
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Field Label" {...field} data-testid="input-field-label" />
                        </FormControl>
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
                        defaultValue={field.value}
                        disabled={!!editingField}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-field-type">
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                <span>{type.label}</span>
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
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Add option"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                        data-testid="input-new-option"
                      />
                      <Button type="button" onClick={addOption} variant="outline">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {fieldOptions.map((option) => (
                        <Badge key={option} variant="secondary" className="gap-1">
                          {option}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeOption(option)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Behavior for Agents</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="displayToAgents"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Display to agents</FormLabel>
                            <FormDescription className="text-xs">
                              Show this field in agent interface
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agentsCanEdit"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Agents can edit</FormLabel>
                            <FormDescription className="text-xs">
                              Allow agents to modify this field
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Behavior for Customers</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="displayToCustomers"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Display to customers</FormLabel>
                            <FormDescription className="text-xs">
                              Show in customer portal
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerCanEdit"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Customer can edit</FormLabel>
                            <FormDescription className="text-xs">
                              Allow customers to modify
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="showOnSignup"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Show on signup</FormLabel>
                          <FormDescription className="text-xs">
                            Display this field during customer registration
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Required field</FormLabel>
                          <FormDescription className="text-xs">
                            Must be filled when submitting
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isUnique"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Unique value</FormLabel>
                          <FormDescription className="text-xs">
                            No duplicate values allowed
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="agentLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label for agents</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional agent label" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label for customers</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional customer label" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="placeholder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placeholder Text</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter placeholder text" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="helpText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Help Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional guidance for users"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
