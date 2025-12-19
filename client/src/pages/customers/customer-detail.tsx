import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Mail,
  Calendar,
  Clock,
  Ticket,
  MessageSquare,
  FileText,
  Globe,
  Tag,
} from "lucide-react";
import type { User, Ticket as TicketType } from "@shared/schema";

interface CustomerWithDetails extends User {
  ticketCount?: number;
}

interface TicketWithDetails extends TicketType {
  assignee?: User | null;
}

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const customerId = params?.id;

  const { data: customer, isLoading: customerLoading } = useQuery<CustomerWithDetails>({
    queryKey: ["/api/users", customerId],
    enabled: !!customerId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets", { customerId }],
    enabled: !!customerId,
  });

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Customer not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  const customerTickets = tickets?.filter(t => t.customerId === customerId) || [];
  const openTickets = customerTickets.filter(t => t.status === "open" || t.status === "pending" || t.status === "in_progress");
  const resolvedTickets = customerTickets.filter(t => t.status === "resolved" || t.status === "closed");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-muted-foreground">Back</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={customer.avatarUrl || ""} />
              <AvatarFallback className="text-2xl bg-primary/10">
                {customer.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <Badge variant={customer.isActive ? "default" : "secondary"}>
                  {customer.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-muted-foreground">@{customer.username}</p>
            </div>
            <Button data-testid="button-new-ticket">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </div>

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList>
              <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
              <TabsTrigger value="tickets" data-testid="tab-tickets">Tickets</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <div className="space-y-4">
                {customerTickets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activity yet</p>
                ) : (
                  <>
                    <h3 className="font-semibold text-muted-foreground">Recent Activity</h3>
                    {customerTickets.slice(0, 10).map((ticket) => (
                      <div key={ticket.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.createdAt).toLocaleString()}
                          </div>
                          <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                            <p className="font-medium">#{ticket.ticketNumber}</p>
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {ticket.priority}
                            </Badge>
                            <Badge variant={ticket.status === "open" ? "default" : "secondary"} className="text-xs">
                              {ticket.status}
                            </Badge>
                            {ticket.assignee && (
                              <span className="text-xs text-muted-foreground">
                                Agent: {ticket.assignee.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="mt-6">
              <div className="space-y-4">
                {openTickets.length > 0 && (
                  <>
                    <h3 className="font-semibold">Open Tickets ({openTickets.length})</h3>
                    {openTickets.map((ticket) => (
                      <Card key={ticket.id} className="hover-elevate cursor-pointer">
                        <Link href={`/tickets/${ticket.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">#{ticket.ticketNumber} - {ticket.subject}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(ticket.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{ticket.priority}</Badge>
                                <Badge>{ticket.status}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    ))}
                  </>
                )}

                {resolvedTickets.length > 0 && (
                  <>
                    <h3 className="font-semibold mt-6">Resolved/Closed Tickets ({resolvedTickets.length})</h3>
                    {resolvedTickets.map((ticket) => (
                      <Card key={ticket.id} className="hover-elevate cursor-pointer opacity-75">
                        <Link href={`/tickets/${ticket.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">#{ticket.ticketNumber} - {ticket.subject}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(ticket.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{ticket.priority}</Badge>
                                <Badge variant="secondary">{ticket.status}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    ))}
                  </>
                )}

                {customerTickets.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No tickets yet</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <p className="text-muted-foreground text-center py-8">No notes yet</p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-80 border-l bg-muted/30 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Details</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tags</p>
              <button className="text-sm text-primary flex items-center hover:underline">
                <Tag className="h-3 w-3 mr-1" />
                Add tags
              </button>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Member Since</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tickets</p>
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customerTickets.length}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Open Tickets</p>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{openTickets.length}</span>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-1">Language</p>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">English</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
