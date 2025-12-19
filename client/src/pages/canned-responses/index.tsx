import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MessageSquare, Copy, Edit, Trash2, MoreHorizontal, Loader2, Keyboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CannedResponse } from "@shared/schema";

const responseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(5, "Content must be at least 5 characters"),
  shortcut: z.string().optional(),
  category: z.string().optional(),
});

type ResponseForm = z.infer<typeof responseSchema>;

export default function CannedResponses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: responses, isLoading } = useQuery<CannedResponse[]>({
    queryKey: ["/api/canned-responses"],
  });

  const form = useForm<ResponseForm>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      title: "",
      content: "",
      shortcut: "",
      category: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ResponseForm) => {
      return apiRequest("POST", "/api/canned-responses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canned-responses"] });
      toast({ title: "Response created", description: "The canned response has been created." });
      form.reset();
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Response copied to clipboard" });
  };

  const filteredResponses = responses?.filter(
    (response) =>
      response.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.shortcut?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(responses?.map((r) => r.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Canned Responses</h1>
          <p className="text-muted-foreground">Pre-written replies for quick ticket responses</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-response">
          <Plus className="mr-2 h-4 w-4" />
          New Response
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search responses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-responses"
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !filteredResponses?.length ? (
        <EmptyState
          icon={MessageSquare}
          title="No canned responses"
          description={searchQuery ? "Try adjusting your search" : "Create templates for common replies"}
          action={searchQuery ? undefined : { label: "Create Response", onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredResponses.map((response) => (
            <Card key={response.id} className="hover-elevate" data-testid={`card-response-${response.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{response.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {response.shortcut && (
                        <Badge variant="outline" className="font-mono text-xs">
                          <Keyboard className="mr-1 h-3 w-3" />
                          /{response.shortcut}
                        </Badge>
                      )}
                      {response.category && (
                        <Badge variant="secondary" className="text-xs">
                          {response.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => copyToClipboard(response.content)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {response.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="w-full sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Create Canned Response</SheetTitle>
            <SheetDescription>Create a template for quick ticket replies.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Password Reset Instructions" {...field} data-testid="input-response-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shortcut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shortcut (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., reset" {...field} data-testid="input-response-shortcut" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Technical" {...field} data-testid="input-response-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Response Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your template response..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="input-response-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-response">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Response
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
