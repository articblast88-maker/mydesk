import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { SlaIndicator } from "@/components/sla-indicator";
import { TicketDetailSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Send,
  Paperclip,
  MessageSquare,
  Lock,
  Clock,
  User,
  Tag,
  Calendar,
  Loader2,
  ChevronRight,
  Puzzle,
  Settings,
  X,
} from "lucide-react";
import type { Ticket, User as UserType, TicketReply, TicketActivity, CustomApp, CustomFieldDefinition } from "@shared/schema";
import CustomAppsSidebar from "./custom-apps-sidebar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface TicketWithRelations extends Ticket {
  customer: UserType;
  assignee: UserType | null;
  replies: (TicketReply & { user: UserType })[];
  activities: (TicketActivity & { user: UserType | null })[];
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [showApps, setShowApps] = useState(false);

  const { data: ticket, isLoading } = useQuery<TicketWithRelations>({
    queryKey: ["/api/tickets", id],
  });

  const { data: agents } = useQuery<UserType[]>({
    queryKey: ["/api/users", { role: "agent" }],
  });

  const { data: customApps } = useQuery<CustomApp[]>({
    queryKey: ["/api/custom-apps"],
  });

  const { data: customFieldDefs } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/custom-fields", "ticket"],
    queryFn: async () => {
      const res = await fetch("/api/custom-fields?entityType=ticket");
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  const activeCustomFields = customFieldDefs?.filter(f => f.isActive && !f.isArchived) || [];

  const replyMutation = useMutation({
    mutationFn: async (data: { content: string; isInternal: boolean; userId: string }) => {
      return apiRequest("POST", `/api/tickets/${id}/replies`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      setReplyContent("");
      toast({
        title: isInternal ? "Internal note added" : "Reply sent",
        description: isInternal ? "Your internal note has been added." : "Your reply has been sent to the customer.",
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

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Ticket>) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    const currentUserId = agents?.[0]?.id;
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "No agent available to send reply",
        variant: "destructive",
      });
      return;
    }
    replyMutation.mutate({ content: replyContent, isInternal, userId: currentUserId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </Link>
        <TicketDetailSkeleton />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </Link>
        <EmptyState
          icon={MessageSquare}
          title="Ticket not found"
          description="The ticket you're looking for doesn't exist or has been deleted."
          action={{
            label: "View All Tickets",
            onClick: () => window.location.href = "/tickets",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className={`flex-1 space-y-6 transition-all ${showApps ? "mr-96" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/tickets">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">#{ticket.ticketNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApps(!showApps)}
              data-testid="button-toggle-apps"
            >
              <Puzzle className="mr-2 h-4 w-4" />
              Apps
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-xl" data-testid="text-ticket-subject">{ticket.subject}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      {ticket.category && (
                        <Badge variant="outline">{ticket.category}</Badge>
                      )}
                      {ticket.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <SlaIndicator deadline={ticket.slaDeadline ? new Date(ticket.slaDeadline) : null} />
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <Tabs defaultValue="conversation">
                  <TabsList>
                    <TabsTrigger value="conversation" data-testid="tab-conversation">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Conversation
                    </TabsTrigger>
                    <TabsTrigger value="activity" data-testid="tab-activity">
                      <Clock className="mr-2 h-4 w-4" />
                      Activity
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="conversation" className="mt-6 space-y-6">
                    <div className="flex gap-4 rounded-lg border bg-muted/30 p-4" data-testid="ticket-description">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ticket.customer?.avatarUrl || ""} />
                        <AvatarFallback>
                          {ticket.customer?.name?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{ticket.customer?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                    </div>

                    {ticket.replies?.map((reply) => (
                      <div
                        key={reply.id}
                        className={`flex gap-4 rounded-lg border p-4 ${
                          reply.isInternal ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30" : ""
                        }`}
                        data-testid={`reply-${reply.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={reply.user?.avatarUrl || ""} />
                          <AvatarFallback className={reply.user?.role === "agent" ? "bg-primary/10 text-primary" : ""}>
                            {reply.user?.name?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{reply.user?.name}</span>
                            {reply.user?.role === "agent" && (
                              <Badge variant="secondary" className="text-[10px]">Agent</Badge>
                            )}
                            {reply.isInternal && (
                              <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                                <Lock className="mr-1 h-2.5 w-2.5" />
                                Internal Note
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="flex gap-2">
                        <Button
                          variant={isInternal ? "outline" : "default"}
                          size="sm"
                          onClick={() => setIsInternal(false)}
                          data-testid="button-reply-public"
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Reply
                        </Button>
                        <Button
                          variant={isInternal ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsInternal(true)}
                          className={isInternal ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                          data-testid="button-reply-internal"
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Internal Note
                        </Button>
                      </div>
                      <Textarea
                        placeholder={isInternal ? "Add an internal note (not visible to customer)..." : "Type your reply..."}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="input-reply"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm">
                          <Paperclip className="mr-2 h-4 w-4" />
                          Attach
                        </Button>
                        <Button
                          onClick={handleSubmitReply}
                          disabled={!replyContent.trim() || replyMutation.isPending}
                          data-testid="button-send-reply"
                        >
                          {replyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          <Send className="mr-2 h-4 w-4" />
                          {isInternal ? "Add Note" : "Send Reply"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-6">
                    {!ticket.activities?.length ? (
                      <EmptyState
                        icon={Clock}
                        title="No activity yet"
                        description="Activity will be logged as changes are made to this ticket."
                      />
                    ) : (
                      <div className="space-y-4">
                        {ticket.activities.map((activity) => (
                          <div key={activity.id} className="flex gap-4" data-testid={`activity-${activity.id}`}>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">{activity.user?.name || "System"}</span>{" "}
                                {activity.action}
                                {activity.oldValue && activity.newValue && (
                                  <span className="text-muted-foreground">
                                    : {activity.oldValue} → {activity.newValue}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-80 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateMutation.mutate({ status: value })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) => updateMutation.mutate({ priority: value })}
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select
                    value={ticket.assigneeId || "unassigned"}
                    onValueChange={(value) => updateMutation.mutate({ assigneeId: value === "unassigned" ? null : value })}
                  >
                    <SelectTrigger data-testid="select-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {ticket.firstResponseAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">First Response</span>
                      <span>{new Date(ticket.firstResponseAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={ticket.customer?.avatarUrl || ""} />
                    <AvatarFallback>
                      {ticket.customer?.name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium" data-testid="text-customer-name">{ticket.customer?.name}</p>
                    <p className="text-sm text-muted-foreground">{ticket.customer?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {activeCustomFields.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Custom Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeCustomFields.map((field) => {
                    const customFieldsData = (ticket.customFields || {}) as Record<string, any>;
                    const value = customFieldsData[field.name];
                    
                    const handleFieldChange = (newValue: any) => {
                      const currentCustomFields = (ticket.customFields || {}) as Record<string, any>;
                      updateMutation.mutate({
                        customFields: {
                          ...currentCustomFields,
                          [field.name]: newValue,
                        },
                      });
                    };

                    return (
                      <div key={field.id} className="space-y-1" data-testid={`custom-field-${field.name}`}>
                        <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                        {field.fieldType === "text" && (
                          <Input
                            value={value || ""}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            onChange={(e) => handleFieldChange(e.target.value)}
                            className="h-8 text-sm"
                            data-testid={`input-custom-${field.name}`}
                          />
                        )}
                        {field.fieldType === "number" && (
                          <Input
                            type="number"
                            value={value || ""}
                            placeholder={field.placeholder || "0"}
                            onChange={(e) => handleFieldChange(e.target.value ? Number(e.target.value) : "")}
                            className="h-8 text-sm"
                            data-testid={`input-custom-${field.name}`}
                          />
                        )}
                        {field.fieldType === "dropdown" && (
                          <Select
                            value={value || ""}
                            onValueChange={handleFieldChange}
                          >
                            <SelectTrigger className="h-8" data-testid={`select-custom-${field.name}`}>
                              <SelectValue placeholder={field.placeholder || "Select..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.fieldType === "multiselect" && (
                          <div className="flex flex-wrap gap-1">
                            {field.options?.map((option) => {
                              const isSelected = (value || []).includes(option);
                              return (
                                <Badge
                                  key={option}
                                  variant={isSelected ? "default" : "outline"}
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    const current = value || [];
                                    if (isSelected) {
                                      handleFieldChange(current.filter((o: string) => o !== option));
                                    } else {
                                      handleFieldChange([...current, option]);
                                    }
                                  }}
                                  data-testid={`badge-custom-${field.name}-${option}`}
                                >
                                  {option}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        {field.fieldType === "checkbox" && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={value || false}
                              onCheckedChange={handleFieldChange}
                              data-testid={`checkbox-custom-${field.name}`}
                            />
                            <span className="text-sm">{value ? "Yes" : "No"}</span>
                          </div>
                        )}
                        {field.fieldType === "date" && (
                          <Input
                            type="date"
                            value={value || ""}
                            onChange={(e) => handleFieldChange(e.target.value)}
                            className="h-8 text-sm"
                            data-testid={`input-custom-${field.name}`}
                          />
                        )}
                        {field.fieldType === "textarea" && (
                          <Textarea
                            value={value || ""}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            onChange={(e) => handleFieldChange(e.target.value)}
                            className="min-h-[60px] text-sm resize-none"
                            data-testid={`textarea-custom-${field.name}`}
                          />
                        )}
                        {field.fieldType === "dependent" && (() => {
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
                            handleFieldChange(newValue);
                          };

                          const getLevelLabel = (level: number): string => {
                            const key = `level${level}AgentLabel`;
                            return depConfig[key] || `Level ${level}`;
                          };

                          return (
                            <div className="space-y-2">
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
                                      <SelectTrigger className="h-8 text-sm" data-testid={`select-custom-${field.name}-level${level}`}>
                                        <SelectValue placeholder={`Select...`} />
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
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showApps && (
        <CustomAppsSidebar
          ticket={ticket}
          apps={customApps || []}
          onClose={() => setShowApps(false)}
        />
      )}
    </div>
  );
}
