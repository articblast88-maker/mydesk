import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Ticket, Clock, CheckCircle, AlertCircle, Search, MessageSquare, ArrowLeft, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ticket as TicketType, User, TicketReply } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const ticketFormSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  resolved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const statusIcons: Record<string, typeof Clock> = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

type TicketWithReplies = TicketType & { replies: (TicketReply & { user: User })[] };

interface CustomerPortalProps {
  customerId: string;
  customerName: string;
  onLogout?: () => void;
}

export default function CustomerPortal({ customerId, customerName, onLogout }: CustomerPortalProps) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyContent, setReplyContent] = useState("");

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
    },
  });

  const { data: tickets, isLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets", { customerId }],
  });

  const { data: ticketDetail, isLoading: isLoadingDetail } = useQuery<TicketWithReplies>({
    queryKey: ["/api/tickets", selectedTicket],
    enabled: !!selectedTicket,
  });

  const createMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return apiRequest("POST", "/api/tickets", {
        ...data,
        customerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Ticket created",
        description: "Your support ticket has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      return apiRequest("POST", `/api/tickets/${selectedTicket}/replies`, {
        ...data,
        userId: customerId,
        isInternal: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", selectedTicket] });
      setReplyContent("");
      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the support team.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const customerTickets = tickets?.filter(t => t.customerId === customerId) || [];
  const filteredTickets = customerTickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticketNumber.toString().includes(searchQuery)
  );

  const onSubmit = (data: TicketFormData) => {
    createMutation.mutate(data);
  };

  const handleSendReply = () => {
    if (!replyContent.trim()) return;
    replyMutation.mutate({ content: replyContent });
  };

  if (selectedTicket && ticketDetail) {
    const StatusIcon = statusIcons[ticketDetail.status] || Clock;
    const publicReplies = ticketDetail.replies?.filter(r => !r.isInternal) || [];

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedTicket(null)}
            data-testid="button-back-to-tickets"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Tickets
          </Button>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl" data-testid="text-ticket-subject">
                  {ticketDetail.subject}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ticket #{ticketDetail.ticketNumber} - Created {formatDistanceToNow(new Date(ticketDetail.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[ticketDetail.status]} data-testid="badge-ticket-status">
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {ticketDetail.status.charAt(0).toUpperCase() + ticketDetail.status.slice(1)}
                </Badge>
                <Badge className={priorityColors[ticketDetail.priority]} data-testid="badge-ticket-priority">
                  {ticketDetail.priority.charAt(0).toUpperCase() + ticketDetail.priority.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Original Request</p>
                <p className="whitespace-pre-wrap" data-testid="text-ticket-description">{ticketDetail.description}</p>
              </div>

              {publicReplies.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversation
                  </h3>
                  <div className="space-y-4">
                    {publicReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-lg ${
                          reply.userId === customerId
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                        data-testid={`reply-${reply.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {reply.userId === customerId ? "You" : reply.user?.name || "Support Agent"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ticketDetail.status !== "closed" && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Add a Reply</h3>
                  <Textarea
                    placeholder="Type your message here..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="input-reply-content"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    {replyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-portal-title">My Support Tickets</h1>
            <p className="text-muted-foreground">Welcome back, {customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            {onLogout && (
              <Button variant="outline" size="sm" onClick={onLogout} data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            )}
            <Sheet open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <SheetTrigger asChild>
              <Button data-testid="button-create-ticket">
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-[500px]">
              <SheetHeader>
                <SheetTitle>Create New Support Ticket</SheetTitle>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief description of your issue" 
                            {...field} 
                            data-testid="input-ticket-subject"
                          />
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
                            placeholder="Please describe your issue in detail..."
                            className="min-h-[120px]"
                            {...field}
                            data-testid="input-ticket-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ticket-priority">
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
                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-ticket">
                      {createMutation.isPending ? "Creating..." : "Create Ticket"}
                    </Button>
                  </div>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-tickets"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tickets found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery
                  ? "No tickets match your search criteria"
                  : "You haven't created any support tickets yet"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-ticket">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const StatusIcon = statusIcons[ticket.status] || Clock;
              return (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover-elevate transition-colors"
                  onClick={() => setSelectedTicket(ticket.id)}
                  data-testid={`card-ticket-${ticket.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">#{ticket.ticketNumber}</span>
                          <Badge className={statusColors[ticket.status]} variant="secondary">
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </Badge>
                          <Badge className={priorityColors[ticket.priority]} variant="secondary">
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </Badge>
                        </div>
                        <h3 className="font-medium truncate" data-testid={`text-ticket-subject-${ticket.id}`}>
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
