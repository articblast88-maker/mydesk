import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { SlaIndicator } from "@/components/sla-indicator";
import { EmptyState } from "@/components/empty-state";
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Link } from "wouter";
import type { Ticket as TicketType, User } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  openTickets: number;
  pendingTickets: number;
  resolvedToday: number;
  avgResponseTime: string;
  slaCompliance: number;
  ticketTrend: number;
}

interface TicketWithCustomer extends TicketType {
  customer: User;
  assignee: User | null;
}

const CHART_COLORS = ["hsl(217, 91%, 60%)", "hsl(173, 80%, 40%)", "hsl(43, 74%, 49%)", "hsl(0, 84%, 60%)"];

const ticketTrendData = [
  { name: "Mon", tickets: 12 },
  { name: "Tue", tickets: 19 },
  { name: "Wed", tickets: 15 },
  { name: "Thu", tickets: 22 },
  { name: "Fri", tickets: 18 },
  { name: "Sat", tickets: 8 },
  { name: "Sun", tickets: 5 },
];

const statusDistribution = [
  { name: "Open", value: 45, color: "hsl(217, 91%, 60%)" },
  { name: "Pending", value: 28, color: "hsl(43, 74%, 49%)" },
  { name: "Resolved", value: 62, color: "hsl(142, 71%, 45%)" },
  { name: "Closed", value: 15, color: "hsl(220, 9%, 46%)" },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentTickets, isLoading: ticketsLoading } = useQuery<TicketWithCustomer[]>({
    queryKey: ["/api/tickets", { limit: 5 }],
  });

  const { data: agents } = useQuery<User[]>({
    queryKey: ["/api/users", { role: "agent" }],
  });

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  const displayStats = stats || {
    openTickets: 0,
    pendingTickets: 0,
    resolvedToday: 0,
    avgResponseTime: "0m",
    slaCompliance: 0,
    ticketTrend: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your support operations</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-open-tickets">{displayStats.openTickets}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+{displayStats.ticketTrend}%</span>
              <span>from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-tickets">{displayStats.pendingTickets}</div>
            <p className="text-xs text-muted-foreground">Awaiting agent reply</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-resolved-today">{displayStats.resolvedToday}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">12%</span>
              <span>above average</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Response Time</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-response">{displayStats.avgResponseTime}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDownRight className="h-3 w-3 text-green-500" />
              <span className="text-green-500">-8%</span>
              <span>improvement</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-medium">Ticket Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={ticketTrendData}>
                <defs>
                  <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tickets" 
                  stroke="hsl(217, 91%, 60%)" 
                  fillOpacity={1} 
                  fill="url(#ticketGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-medium">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div 
                    className="h-2.5 w-2.5 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Recent Tickets</CardTitle>
            <Link href="/tickets">
              <Badge variant="secondary" className="cursor-pointer">
                View all
              </Badge>
            </Link>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : !recentTickets?.length ? (
              <EmptyState
                icon={Ticket}
                title="No tickets yet"
                description="When customers submit tickets, they'll appear here."
              />
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                    <div className="flex items-center gap-4 rounded-md border p-3 hover-elevate cursor-pointer" data-testid={`ticket-card-${ticket.id}`}>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={ticket.customer?.avatarUrl || ""} />
                        <AvatarFallback className="bg-muted text-xs">
                          {ticket.customer?.name?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{ticket.ticketNumber}</span>
                          <span className="truncate text-sm font-medium">{ticket.subject}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {ticket.customer?.name || "Unknown"} • {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} showIcon={false} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Agent Workload</CardTitle>
            <Link href="/settings">
              <Badge variant="secondary" className="cursor-pointer">
                Manage
              </Badge>
            </Link>
          </CardHeader>
          <CardContent>
            {!agents?.length ? (
              <EmptyState
                icon={Users}
                title="No agents configured"
                description="Add agents to start distributing workload."
              />
            ) : (
              <div className="space-y-4">
                {(agents || []).slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center gap-4" data-testid={`agent-workload-${agent.id}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={agent.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {agent.name?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">12</p>
                      <p className="text-xs text-muted-foreground">tickets</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
