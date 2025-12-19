import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { SlaIndicator } from "@/components/sla-indicator";
import { TicketListSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Ticket,
  RefreshCw,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Ticket as TicketType, User } from "@shared/schema";
import CreateTicketDialog from "./create-ticket-dialog";

interface TicketWithRelations extends TicketType {
  customer: User;
  assignee: User | null;
}

export default function TicketsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tickets, isLoading, refetch } = useQuery<TicketWithRelations[]>({
    queryKey: ["/api/tickets", { status: statusFilter, priority: priorityFilter, search: searchQuery }],
  });
  
  const { data: agents } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "agent" }],
  });
  
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ ticketIds, assigneeId }: { ticketIds: string[], assigneeId: string | null }) => {
      await Promise.all(ticketIds.map(id => 
        apiRequest("PATCH", `/api/tickets/${id}`, { assigneeId })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Success", description: `${selectedTickets.length} tickets assigned successfully` });
      setSelectedTickets([]);
      setAssignDialogOpen(false);
      setBulkAssignee("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign tickets", variant: "destructive" });
    },
  });
  
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ticketIds, status }: { ticketIds: string[], status: string }) => {
      await Promise.all(ticketIds.map(id => 
        apiRequest("PATCH", `/api/tickets/${id}`, { status })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Success", description: `${selectedTickets.length} tickets updated successfully` });
      setSelectedTickets([]);
      setStatusDialogOpen(false);
      setBulkStatus("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update ticket status", variant: "destructive" });
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toString().includes(searchQuery) ||
      ticket.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(filteredTickets?.map((t) => t.id) || []);
    } else {
      setSelectedTickets([]);
    }
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets([...selectedTickets, ticketId]);
    } else {
      setSelectedTickets(selectedTickets.filter((id) => id !== ticketId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tickets</h1>
          <p className="text-muted-foreground">Manage and respond to customer support tickets</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-ticket">
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tickets"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedTickets.length > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-muted p-2">
              <span className="text-sm text-muted-foreground">
                {selectedTickets.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)} data-testid="button-bulk-assign">
                Assign
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)} data-testid="button-bulk-status">
                Change Status
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedTickets([])} data-testid="button-clear-selection">
                Clear Selection
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TicketListSkeleton />
            </div>
          ) : !filteredTickets?.length ? (
            <div className="p-6">
              <EmptyState
                icon={Ticket}
                title="No tickets found"
                description={searchQuery ? "Try adjusting your search or filters" : "Create your first ticket to get started"}
                action={searchQuery ? undefined : {
                  label: "Create Ticket",
                  onClick: () => setCreateDialogOpen(true),
                }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTickets.length === filteredTickets.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="w-24">
                    <div className="flex items-center gap-1">
                      ID
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="hover-elevate" data-testid={`row-ticket-${ticket.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTickets.includes(ticket.id)}
                        onCheckedChange={(checked) => handleSelectTicket(ticket.id, !!checked)}
                        data-testid={`checkbox-ticket-${ticket.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`}>
                        <span className="font-mono text-xs text-primary cursor-pointer hover:underline">
                          #{ticket.ticketNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`}>
                        <div className="cursor-pointer">
                          <p className="font-medium truncate max-w-[200px] hover:underline">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ticket.description?.slice(0, 60)}...
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={ticket.customer?.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px]">
                            {ticket.customer?.name?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.customer?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={ticket.assignee.avatarUrl || ""} />
                            <AvatarFallback className="text-[10px]">
                              {ticket.assignee.name?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{ticket.assignee.name}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <SlaIndicator deadline={ticket.slaDeadline ? new Date(ticket.slaDeadline) : null} compact />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-ticket-menu-${ticket.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tickets/${ticket.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Assign</DropdownMenuItem>
                          <DropdownMenuItem>Change Status</DropdownMenuItem>
                          <DropdownMenuItem>Add Tags</DropdownMenuItem>
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

      <CreateTicketDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Bulk Assign Sheet */}
      <Sheet open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <SheetContent className="w-full sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Assign Tickets</SheetTitle>
            <SheetDescription>
              Assign {selectedTickets.length} selected ticket(s) to an agent.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger data-testid="select-bulk-assignee">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents?.filter(a => a.role !== "customer").map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => bulkAssignMutation.mutate({ 
                ticketIds: selectedTickets, 
                assigneeId: bulkAssignee === "unassigned" ? null : bulkAssignee 
              })}
              disabled={!bulkAssignee || bulkAssignMutation.isPending}
              data-testid="button-confirm-bulk-assign"
            >
              {bulkAssignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk Status Change Sheet */}
      <Sheet open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <SheetContent className="w-full sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Change Status</SheetTitle>
            <SheetDescription>
              Update status for {selectedTickets.length} selected ticket(s).
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger data-testid="select-bulk-status">
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
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => bulkStatusMutation.mutate({ ticketIds: selectedTickets, status: bulkStatus })}
              disabled={!bulkStatus || bulkStatusMutation.isPending}
              data-testid="button-confirm-bulk-status"
            >
              {bulkStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
