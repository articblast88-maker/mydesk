import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Users, Mail, Ticket, Loader2, MoreHorizontal, Eye, Upload, Download, FileDown, AlertCircle, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, Ticket as TicketType, CustomFieldDefinition } from "@shared/schema";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

type CustomerForm = z.infer<typeof customerSchema>;

interface CustomerWithTickets extends User {
  ticketCount?: number;
  lastTicket?: TicketType;
}

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithTickets | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<Record<string, unknown>[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; failed: number; errors: string[] } | null>(null);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(["name", "email", "phone", "createdAt"]);

  const { data: customers, isLoading } = useQuery<CustomerWithTickets[]>({
    queryKey: ["/api/users", { role: "customer" }],
  });

  const { data: customFieldDefs } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields", "contact"],
    queryFn: async () => {
      const res = await fetch("/api/custom-fields?entityType=contact");
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  const activeCustomFields = customFieldDefs?.filter(f => f.isActive && !f.isArchived) || [];
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const customFields: Record<string, any> = {};
      Object.entries(customFieldValues).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          customFields[key] = value;
        }
      });
      return apiRequest("POST", "/api/users", { 
        ...data, 
        role: "customer",
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Customer created", description: "The customer has been created successfully." });
      form.reset();
      setCustomFieldValues({});
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>[]) => {
      const res = await apiRequest("POST", "/api/contacts/import", { data });
      return res.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (result.failed === 0) {
        toast({ title: "Import complete", description: `Imported ${result.imported} and updated ${result.updated} contacts.` });
      } else {
        toast({ title: "Import completed with errors", description: `${result.failed} rows failed. Check the results for details.`, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      if (lines.length < 2) {
        toast({ title: "Invalid file", description: "CSV must have a header row and at least one data row.", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const data: Record<string, unknown>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });
        data.push(row);
      }

      setImportData(data);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/contacts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: selectedExportFields }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export complete", description: "Your contacts have been exported successfully." });
      setExportDialogOpen(false);
    } catch (error) {
      toast({ title: "Export failed", description: "Failed to export contacts.", variant: "destructive" });
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/contacts/import/template");
      if (!res.ok) throw new Error("Failed to download template");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contacts_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Download failed", description: "Failed to download template.", variant: "destructive" });
    }
  };

  const availableExportFields = [
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "username", label: "Username" },
    { value: "companyId", label: "Company ID" },
    { value: "tags", label: "Tags" },
    { value: "createdAt", label: "Created At" },
    { value: "customFields", label: "Custom Fields" },
  ];

  const toggleExportField = (field: string) => {
    setSelectedExportFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
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
      case "decimal":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{field.label}</label>
              {field.isRequired && <span className="text-destructive text-xs">*</span>}
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder={field.placeholder || "0.00"}
              value={value || ""}
              onChange={(e) => handleCustomFieldChange(field.name, e.target.value ? parseFloat(e.target.value) : "")}
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
            <Select value={value || ""} onValueChange={(val) => handleCustomFieldChange(field.name, val)}>
              <SelectTrigger data-testid={`select-custom-${field.name}`}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
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
      default:
        return null;
    }
  };

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-customers">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)} data-testid="button-export-customers">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-customer">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-customers"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : !filteredCustomers?.length ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No customers found"
                description={searchQuery ? "Try adjusting your search" : "Add your first customer"}
                action={searchQuery ? undefined : { label: "Add Customer", onClick: () => setDialogOpen(true) }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover-elevate" data-testid={`row-customer-${customer.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={customer.avatarUrl || ""} />
                          <AvatarFallback>{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">@{customer.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? "default" : "secondary"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        {customer.ticketCount || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/tickets?customer=${customer.id}`}>
                              <Ticket className="mr-2 h-4 w-4" />
                              View Tickets
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col overflow-hidden">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Add New Customer</SheetTitle>
            <SheetDescription>Create a new customer account.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0" hideScrollbar>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 pr-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username@email.com" {...field} data-testid="input-customer-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  Portal login credentials will be created when the customer signs up through the portal.
                </p>

                {activeCustomFields.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Additional Information</h4>
                      {activeCustomFields.map(renderCustomField)}
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-customer">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Customer
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Customer Detail Sheet */}
      <Sheet open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <SheetContent className="w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Customer Details</SheetTitle>
            <SheetDescription>View customer information</SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCustomer.avatarUrl || ""} />
                  <AvatarFallback className="text-lg">
                    {selectedCustomer.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                  <p className="text-sm text-muted-foreground">@{selectedCustomer.username}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCustomer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCustomer.ticketCount || 0} tickets</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={selectedCustomer.isActive ? "default" : "secondary"}>
                    {selectedCustomer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Member since</span>
                  <span className="text-sm">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/tickets?customer=${selectedCustomer.id}`}>
                    View Tickets
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Import Sheet */}
      <Sheet open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setImportData([]);
          setImportResult(null);
        }
      }}>
        <SheetContent className="w-full sm:max-w-[500px] flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>Import Contacts</SheetTitle>
            <SheetDescription>
              Upload a CSV file to import contacts. Existing contacts will be updated if the email matches.
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1 min-h-0" hideScrollbar>
            <div className="space-y-4 pr-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} data-testid="button-download-template">
                  <FileDown className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop a CSV file
                  </p>
                </label>
              </div>

              {importData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preview ({importData.length} rows)</p>
                  <div className="max-h-40 overflow-auto border rounded-md p-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(importData[0]).slice(0, 4).map(key => (
                            <TableHead key={key} className="text-xs">{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importData.slice(0, 3).map((row, idx) => (
                          <TableRow key={idx}>
                            {Object.values(row).slice(0, 4).map((val, i) => (
                              <TableCell key={i} className="text-xs py-1">{String(val || "")}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{importResult.imported} imported</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{importResult.updated} updated</span>
                    </div>
                    {importResult.failed > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{importResult.failed} failed</span>
                      </div>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="max-h-24 overflow-auto text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                      {importResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => importMutation.mutate(importData)}
                  disabled={importData.length === 0 || importMutation.isPending}
                  data-testid="button-start-import"
                >
                  {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import {importData.length} Contacts
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Export Sheet */}
      <Sheet open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <SheetContent className="w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Export Contacts</SheetTitle>
            <SheetDescription>
              Select the fields you want to include in the export.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Select Fields</p>
              <div className="grid grid-cols-2 gap-2">
                {availableExportFields.map(field => (
                  <label key={field.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedExportFields.includes(field.value)}
                      onCheckedChange={() => toggleExportField(field.value)}
                      data-testid={`checkbox-export-${field.value}`}
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={selectedExportFields.length === 0}
                data-testid="button-start-export"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Contacts
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
