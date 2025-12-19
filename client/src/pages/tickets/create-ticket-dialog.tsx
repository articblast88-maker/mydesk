import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, CustomFieldDefinition } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import { useState, useEffect } from "react";

const createTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.string().optional(),
  customerId: z.string().min(1, "Please select a customer"),
  assigneeId: z.string().optional(),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerEmail, setQuickCustomerEmail] = useState("");
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);

  const { data: customers } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "customer" }],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await apiRequest("POST", "/api/users", {
        ...data,
        role: "customer",
        username: data.email.split("@")[0] + "_" + Date.now(),
      });
      return response.json();
    },
    onSuccess: (newCustomer: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", { role: "customer" }] });
      toast({
        title: "Customer created",
        description: "The customer has been created successfully.",
      });
      form.setValue("customerId", newCustomer.id);
      setShowQuickCustomer(false);
      setQuickCustomerName("");
      setQuickCustomerEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const handleQuickCreateCustomer = () => {
    if (!quickCustomerName.trim() || !quickCustomerEmail.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter both name and email",
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate({ name: quickCustomerName.trim(), email: quickCustomerEmail.trim() });
  };

  const { data: agents } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "agent" }],
  });

  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields", "ticket"],
    queryFn: async () => {
      const res = await fetch("/api/custom-fields?entityType=ticket");
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  const activeCustomFields = customFields?.filter(f => f.isActive && !f.isArchived) || [];

  useEffect(() => {
    if (open) {
      const defaults: Record<string, any> = {};
      activeCustomFields.forEach(field => {
        if (field.defaultValue) {
          defaults[field.name] = field.defaultValue;
        } else if (field.fieldType === "multiselect") {
          defaults[field.name] = [];
        } else if (field.fieldType === "checkbox") {
          defaults[field.name] = false;
        } else if (field.fieldType === "dependent") {
          defaults[field.name] = {};
        } else {
          defaults[field.name] = "";
        }
      });
      setCustomFieldValues(defaults);
    }
  }, [open, customFields]);

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      category: "",
      customerId: "",
      assigneeId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTicketForm) => {
      const customFields: Record<string, any> = {};
      Object.entries(customFieldValues).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          customFields[key] = value;
        }
      });
      
      const response = await apiRequest("POST", "/api/tickets", {
        ...data,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Ticket created",
        description: "The ticket has been created successfully.",
      });
      form.reset();
      setCustomFieldValues({});
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTicketForm) => {
    const requiredFields = activeCustomFields.filter(f => f.isRequired);
    const missingFields = requiredFields.filter(f => {
      const value = customFieldValues[f.name];
      if (f.fieldType === "multiselect") {
        return !value || value.length === 0;
      }
      if (f.fieldType === "checkbox") {
        return false;
      }
      if (f.fieldType === "dependent") {
        const depConfig = (f as any).dependentConfig || {};
        const levels = depConfig.levels || 3;
        if (!value || typeof value !== "object") return true;
        for (let i = 1; i <= levels; i++) {
          if (!value[`level${i}`]) return true;
        }
        return false;
      }
      if (f.fieldType === "number" || f.fieldType === "decimal") {
        return value === undefined || value === null || value === "";
      }
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.map(f => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const cleanedData = {
      ...data,
      assigneeId: data.assigneeId && data.assigneeId !== "unassigned" ? data.assigneeId : undefined,
      category: data.category || undefined,
    };
    createMutation.mutate(cleanedData as CreateTicketForm);
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleMultiselectToggle = (fieldName: string, option: string) => {
    setCustomFieldValues(prev => {
      const current = prev[fieldName] || [];
      if (current.includes(option)) {
        return { ...prev, [fieldName]: current.filter((o: string) => o !== option) };
      } else {
        return { ...prev, [fieldName]: [...current, option] };
      }
    });
  };

  const renderCustomField = (field: CustomFieldDefinition) => {
    const value = customFieldValues[field.name];

    switch (field.fieldType) {
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <Input
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              value={value || ""}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
              data-testid={`input-custom-${field.name}`}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <Textarea
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              value={value || ""}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid={`textarea-custom-${field.name}`}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <Input
              type="number"
              placeholder={field.placeholder || "0"}
              value={value || ""}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value ? Number(e.target.value) : "")}
              data-testid={`input-custom-${field.name}`}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );

      case "dropdown":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <Select
              value={value || ""}
              onValueChange={(val) => handleCustomFieldChange(field.name, val)}
            >
              <SelectTrigger data-testid={`select-custom-${field.name}`}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
              {field.options?.map((option) => {
                const isSelected = (value || []).includes(option);
                return (
                  <Badge
                    key={option}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleMultiselectToggle(field.name, option)}
                    data-testid={`badge-custom-${field.name}-${option}`}
                  >
                    {option}
                  </Badge>
                );
              })}
            </div>
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="flex items-center gap-3 rounded-md border p-3">
            <Checkbox
              checked={value || false}
              onCheckedChange={(checked) => handleCustomFieldChange(field.name, checked)}
              data-testid={`checkbox-custom-${field.name}`}
            />
            <div>
              <label className="text-sm font-medium">{field.label}</label>
              {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            </div>
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <Input
              type="date"
              value={value || ""}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
              data-testid={`input-custom-${field.name}`}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );

      case "dependent": {
        const depConfig = (field as any).dependentConfig || {};
        const levels = depConfig.levels || 3;
        const choices = depConfig.choices || {};
        const currentValue = value || {};
        
        const getOptionsForLevel = (level: number): string[] => {
          if (level === 1) {
            return Object.keys(choices);
          } else if (level === 2) {
            const l1 = currentValue.level1;
            if (!l1 || !choices[l1]) return [];
            return Object.keys(choices[l1]);
          } else if (level === 3) {
            const l1 = currentValue.level1;
            const l2 = currentValue.level2;
            if (!l1 || !l2 || !choices[l1] || !choices[l1][l2]) return [];
            return Object.keys(choices[l1][l2]);
          } else if (level === 4) {
            const l1 = currentValue.level1;
            const l2 = currentValue.level2;
            const l3 = currentValue.level3;
            if (!l1 || !l2 || !l3 || !choices[l1] || !choices[l1][l2] || !choices[l1][l2][l3]) return [];
            return choices[l1][l2][l3] || [];
          }
          return [];
        };

        const handleLevelChange = (level: number, val: string) => {
          const newValue = { ...currentValue };
          newValue[`level${level}`] = val;
          for (let i = level + 1; i <= 4; i++) {
            delete newValue[`level${i}`];
          }
          handleCustomFieldChange(field.name, newValue);
        };

        const getLevelLabel = (level: number): string => {
          const key = `level${level}AgentLabel`;
          return depConfig[key] || `Level ${level}`;
        };

        return (
          <div key={field.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            {[1, 2, 3, 4].slice(0, levels).map((level) => {
              const levelOptions = getOptionsForLevel(level);
              const isDisabled = level > 1 && !currentValue[`level${level - 1}`];
              
              return (
                <div key={level} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{getLevelLabel(level)}</label>
                  <Select
                    value={currentValue[`level${level}`] || ""}
                    onValueChange={(val) => handleLevelChange(level, val)}
                    disabled={isDisabled}
                  >
                    <SelectTrigger data-testid={`select-custom-${field.name}-level${level}`}>
                      <SelectValue placeholder={`Select ${getLevelLabel(level).toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[540px] flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Create New Ticket</SheetTitle>
          <SheetDescription>
            Create a new support ticket for a customer.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0" hideScrollbar>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-2 pb-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => {
                  const selectedCustomer = customers?.find(c => c.id === field.value);
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Customer</FormLabel>
                      <Popover open={customerSelectOpen} onOpenChange={setCustomerSelectOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={customerSelectOpen}
                              className="w-full justify-between font-normal"
                              data-testid="select-customer"
                            >
                              {selectedCustomer 
                                ? `${selectedCustomer.name} (${selectedCustomer.email})`
                                : "Select a customer"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search customers..." data-testid="input-search-customer" />
                            <CommandList>
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setShowQuickCustomer(true);
                                    setCustomerSelectOpen(false);
                                  }}
                                  className="text-primary font-medium"
                                  data-testid="button-create-new-customer"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create New Customer
                                </CommandItem>
                              </CommandGroup>
                              <CommandSeparator />
                              <CommandGroup>
                                {customers?.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={`${customer.name} ${customer.email}`}
                                    onSelect={() => {
                                      field.onChange(customer.id);
                                      setCustomerSelectOpen(false);
                                    }}
                                    data-testid={`option-customer-${customer.id}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === customer.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {customer.name} ({customer.email})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {showQuickCustomer && (
                <div className="border rounded-md p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Quick Create Customer</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowQuickCustomer(false);
                        setQuickCustomerName("");
                        setQuickCustomerEmail("");
                      }}
                      data-testid="button-cancel-quick-customer"
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Name</label>
                      <Input
                        placeholder="Customer name"
                        value={quickCustomerName}
                        onChange={(e) => setQuickCustomerName(e.target.value)}
                        data-testid="input-quick-customer-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input
                        type="email"
                        placeholder="customer@email.com"
                        value={quickCustomerEmail}
                        onChange={(e) => setQuickCustomerEmail(e.target.value)}
                        data-testid="input-quick-customer-email"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickCreateCustomer}
                    disabled={createCustomerMutation.isPending}
                    data-testid="button-save-quick-customer"
                  >
                    {createCustomerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Customer
                  </Button>
                </div>
              )}

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the issue" {...field} data-testid="input-subject" />
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
                        placeholder="Detailed description of the issue"
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
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

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="technical">Technical Support</SelectItem>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="bug">Bug Report</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "unassigned" ? undefined : val)} defaultValue={field.value || "unassigned"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignee">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {agents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {activeCustomFields.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Additional Information</h4>
                    {activeCustomFields.map(renderCustomField)}
                  </div>
                </>
              )}

              <SheetFooter className="pt-4 flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Ticket
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
