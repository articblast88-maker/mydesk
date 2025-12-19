import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Key, 
  Ticket, 
  Users, 
  Building2, 
  FileText, 
  MessageSquare, 
  Settings, 
  Clock,
  ChevronRight,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = "bash" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 dark:bg-muted/20 rounded-md p-4 overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        data-testid="button-copy-code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

interface EndpointProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
}

function Endpoint({ method, path, description }: EndpointProps) {
  const methodColors = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    PATCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Badge variant="secondary" className={`${methodColors[method]} font-mono text-xs min-w-[60px] justify-center`}>
        {method}
      </Badge>
      <code className="text-sm font-mono flex-1">{path}</code>
      <span className="text-sm text-muted-foreground hidden md:block">{description}</span>
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Section({ id, title, icon, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const sections = [
  { id: "introduction", title: "Introduction", icon: <FileText className="h-5 w-5" /> },
  { id: "authentication", title: "Authentication", icon: <Key className="h-5 w-5" /> },
  { id: "tickets", title: "Tickets", icon: <Ticket className="h-5 w-5" /> },
  { id: "users", title: "Users & Contacts", icon: <Users className="h-5 w-5" /> },
  { id: "companies", title: "Companies", icon: <Building2 className="h-5 w-5" /> },
  { id: "knowledge-base", title: "Knowledge Base", icon: <FileText className="h-5 w-5" /> },
  { id: "automation", title: "Automation Rules", icon: <Settings className="h-5 w-5" /> },
  { id: "canned-responses", title: "Canned Responses", icon: <MessageSquare className="h-5 w-5" /> },
  { id: "time-tracking", title: "Time Tracking", icon: <Clock className="h-5 w-5" /> },
];

export default function DevelopersPage() {
  const [activeSection, setActiveSection] = useState("introduction");

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r hidden lg:block">
        <ScrollArea className="h-full py-4">
          <div className="px-4 mb-4">
            <h3 className="font-semibold text-lg">API Reference</h3>
            <p className="text-sm text-muted-foreground">v1.0</p>
          </div>
          <nav className="space-y-1 px-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover-elevate ${
                  activeSection === section.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground"
                }`}
                data-testid={`link-section-${section.id}`}
              >
                {section.icon}
                {section.title}
              </a>
            ))}
          </nav>
          <Separator className="my-4" />
          <div className="px-4">
            <Link href="/settings/api-keys">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-manage-api-keys">
                <Key className="h-4 w-4" />
                Manage API Keys
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6 space-y-12">
          <Section id="introduction" title="Introduction" icon={<FileText className="h-5 w-5" />}>
            <Card>
              <CardHeader>
                <CardTitle>HelpDesk API</CardTitle>
                <CardDescription>
                  Build powerful integrations with the HelpDesk ticketing system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The HelpDesk API is a RESTful API that allows you to integrate our ticketing system 
                  with your own applications, automate workflows, and build custom integrations.
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Base URL</h4>
                  <CodeBlock code={`${API_BASE_URL}/api`} />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Content Type</h4>
                  <p className="text-sm text-muted-foreground">All requests must include:</p>
                  <CodeBlock code="Content-Type: application/json" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="text-center p-4 rounded-md bg-muted/30">
                    <div className="text-2xl font-bold text-primary">50+</div>
                    <div className="text-sm text-muted-foreground">Endpoints</div>
                  </div>
                  <div className="text-center p-4 rounded-md bg-muted/30">
                    <div className="text-2xl font-bold text-primary">REST</div>
                    <div className="text-sm text-muted-foreground">Architecture</div>
                  </div>
                  <div className="text-center p-4 rounded-md bg-muted/30">
                    <div className="text-2xl font-bold text-primary">JSON</div>
                    <div className="text-sm text-muted-foreground">Format</div>
                  </div>
                  <div className="text-center p-4 rounded-md bg-muted/30">
                    <div className="text-2xl font-bold text-primary">API Key</div>
                    <div className="text-sm text-muted-foreground">Auth</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="authentication" title="Authentication" icon={<Key className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  HelpDesk uses API key authentication. Generate keys from{" "}
                  <Link href="/settings/api-keys" className="text-primary hover:underline" data-testid="link-settings-api-keys">
                    Settings &gt; API Keys
                  </Link>.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Authorization Header (Recommended)</h4>
                  <CodeBlock code="Authorization: ApiKey YOUR_API_KEY" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Alternative: X-Api-Key Header</h4>
                  <CodeBlock code="X-Api-Key: YOUR_API_KEY" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Example Request</h4>
                  <CodeBlock code={`curl -X GET "${API_BASE_URL}/api/tickets" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: ApiKey hd_1234567890abcdef..."`} />
                </div>

                <div className="rounded-md border p-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Security Note</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Keep your API keys secure. Never expose them in client-side code or public repositories.
                    API keys are only shown once when created - store them securely.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Available Scopes</h4>
                  <div className="grid gap-2">
                    {[
                      { scope: "tickets:read", desc: "Read access to tickets" },
                      { scope: "tickets:write", desc: "Create, update, delete tickets" },
                      { scope: "users:read", desc: "Read access to users and contacts" },
                      { scope: "users:write", desc: "Create and update users" },
                      { scope: "kb:read", desc: "Read knowledge base articles" },
                      { scope: "kb:write", desc: "Create and update KB content" },
                    ].map((item) => (
                      <div key={item.scope} className="flex items-center gap-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{item.scope}</code>
                        <span className="text-sm text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="tickets" title="Tickets" icon={<Ticket className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Tickets are the core of HelpDesk. They represent customer support requests.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Endpoints</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/tickets" description="List all tickets" />
                    <Endpoint method="GET" path="/api/tickets/:id" description="Get a ticket" />
                    <Endpoint method="POST" path="/api/tickets" description="Create a ticket" />
                    <Endpoint method="PATCH" path="/api/tickets/:id" description="Update a ticket" />
                    <Endpoint method="DELETE" path="/api/tickets/:id" description="Delete a ticket" />
                    <Endpoint method="POST" path="/api/tickets/:id/restore" description="Restore ticket" />
                    <Endpoint method="POST" path="/api/tickets/:id/assign" description="Assign ticket" />
                    <Endpoint method="POST" path="/api/tickets/:id/pick" description="Pick ticket" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Ticket Replies</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/tickets/:id/replies" description="List replies" />
                    <Endpoint method="POST" path="/api/tickets/:id/replies" description="Add reply" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Ticket Notes (Internal)</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/tickets/:id/notes" description="List notes" />
                    <Endpoint method="POST" path="/api/tickets/:id/notes" description="Add note" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Ticket Activities</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/tickets/:id/activities" description="View activity log" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Create Ticket Example</h4>
                  <CodeBlock code={`curl -X POST "${API_BASE_URL}/api/tickets" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: ApiKey YOUR_API_KEY" \\
  -d '{
    "subject": "Cannot access my account",
    "description": "I am unable to log in...",
    "customerId": "customer-uuid-here",
    "priority": "high",
    "category": "technical"
  }'`} />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Response Example</h4>
                  <CodeBlock code={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ticketNumber": 267213,
  "subject": "Cannot access my account",
  "description": "I am unable to log in...",
  "status": "open",
  "priority": "high",
  "category": "technical",
  "customerId": "customer-uuid-here",
  "assigneeId": null,
  "tags": [],
  "customFields": {},
  "source": "api",
  "createdAt": "2025-12-18T06:00:00.000Z",
  "updatedAt": "2025-12-18T06:00:00.000Z"
}`} />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Query Parameters for List</h4>
                  <div className="grid gap-2">
                    {[
                      { param: "status", desc: "Filter by status (open, pending, in_progress, resolved, closed)" },
                      { param: "priority", desc: "Filter by priority (low, medium, high, urgent)" },
                      { param: "assigneeId", desc: "Filter by assigned agent ID" },
                      { param: "limit", desc: "Maximum number of results" },
                    ].map((item) => (
                      <div key={item.param} className="flex items-start gap-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded min-w-[100px]">{item.param}</code>
                        <span className="text-sm text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="users" title="Users & Contacts" icon={<Users className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Manage users including admins, agents, and customers (contacts).
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Endpoints</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/users" description="List all users" />
                    <Endpoint method="GET" path="/api/users/:id" description="Get a user" />
                    <Endpoint method="POST" path="/api/users" description="Create a user" />
                    <Endpoint method="PATCH" path="/api/users/:id" description="Update a user" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Filter by Role</h4>
                  <CodeBlock code={`GET ${API_BASE_URL}/api/users?role=customer`} />
                  <p className="text-sm text-muted-foreground">
                    Available roles: <code className="bg-muted px-1 rounded">admin</code>,{" "}
                    <code className="bg-muted px-1 rounded">agent</code>,{" "}
                    <code className="bg-muted px-1 rounded">customer</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Import/Export</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="POST" path="/api/contacts/export" description="Export contacts" />
                    <Endpoint method="POST" path="/api/contacts/import" description="Import contacts" />
                    <Endpoint method="GET" path="/api/contacts/import/template" description="Get import template" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="companies" title="Companies" icon={<Building2 className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Companies represent customer organizations with domains, health scores, and account tiers.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Endpoints</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/companies" description="List all companies" />
                    <Endpoint method="GET" path="/api/companies/:id" description="Get a company" />
                    <Endpoint method="POST" path="/api/companies" description="Create a company" />
                    <Endpoint method="PATCH" path="/api/companies/:id" description="Update a company" />
                    <Endpoint method="DELETE" path="/api/companies/:id" description="Delete a company" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Import/Export</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="POST" path="/api/companies/export" description="Export companies" />
                    <Endpoint method="POST" path="/api/companies/import" description="Import companies" />
                    <Endpoint method="GET" path="/api/companies/import/template" description="Get import template" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="knowledge-base" title="Knowledge Base" icon={<FileText className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Manage knowledge base categories, folders, and articles.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Categories</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/kb/categories" description="List categories" />
                    <Endpoint method="POST" path="/api/kb/categories" description="Create category" />
                    <Endpoint method="PATCH" path="/api/kb/categories/:id" description="Update category" />
                    <Endpoint method="DELETE" path="/api/kb/categories/:id" description="Delete category" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Folders</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/kb/folders" description="List folders" />
                    <Endpoint method="GET" path="/api/kb/folders/:id" description="Get folder" />
                    <Endpoint method="POST" path="/api/kb/folders" description="Create folder" />
                    <Endpoint method="PATCH" path="/api/kb/folders/:id" description="Update folder" />
                    <Endpoint method="DELETE" path="/api/kb/folders/:id" description="Delete folder" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Articles</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/kb/articles" description="List articles" />
                    <Endpoint method="GET" path="/api/kb/articles/:id" description="Get article" />
                    <Endpoint method="POST" path="/api/kb/articles" description="Create article" />
                    <Endpoint method="PATCH" path="/api/kb/articles/:id" description="Update article" />
                    <Endpoint method="DELETE" path="/api/kb/articles/:id" description="Delete article" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Article Feedback</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/kb/articles/:id/feedback" description="Get feedback" />
                    <Endpoint method="POST" path="/api/kb/articles/:id/feedback" description="Submit feedback" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="automation" title="Automation Rules" icon={<Settings className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Automation rules automatically perform actions based on ticket events.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Endpoints</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/automation-rules" description="List all rules" />
                    <Endpoint method="POST" path="/api/automation-rules" description="Create a rule" />
                    <Endpoint method="PATCH" path="/api/automation-rules/:id" description="Update a rule" />
                    <Endpoint method="DELETE" path="/api/automation-rules/:id" description="Delete a rule" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Rule Types</h4>
                  <div className="grid gap-2">
                    {[
                      { type: "ticket_creation", desc: "Triggered when a ticket is created" },
                      { type: "ticket_update", desc: "Triggered when a ticket is updated" },
                      { type: "time_trigger", desc: "Triggered based on time conditions" },
                    ].map((item) => (
                      <div key={item.type} className="flex items-start gap-3">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{item.type}</code>
                        <span className="text-sm text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="canned-responses" title="Canned Responses" icon={<MessageSquare className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Pre-written response templates for quick agent replies.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Endpoints</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/canned-responses" description="List responses" />
                    <Endpoint method="POST" path="/api/canned-responses" description="Create response" />
                    <Endpoint method="PATCH" path="/api/canned-responses/:id" description="Update response" />
                    <Endpoint method="DELETE" path="/api/canned-responses/:id" description="Delete response" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section id="time-tracking" title="Time Tracking" icon={<Clock className="h-5 w-5" />}>
            <Card>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  Track time spent on tickets for reporting and billing.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Endpoints</h4>
                  <div className="border rounded-md divide-y">
                    <Endpoint method="GET" path="/api/tickets/:id/time-entries" description="List time entries" />
                    <Endpoint method="POST" path="/api/tickets/:id/time-entries" description="Add time entry" />
                    <Endpoint method="POST" path="/api/time-entries/:id/toggle" description="Start/stop timer" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <div className="border-t pt-8 mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Need the full documentation?</h3>
                <p className="text-sm text-muted-foreground">
                  Download the complete API reference with all endpoints and examples.
                </p>
              </div>
              <a href="/API_DOCUMENTATION.md" download>
                <Button variant="outline" className="gap-2" data-testid="button-download-docs">
                  <ExternalLink className="h-4 w-4" />
                  Download Full Docs
                </Button>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
