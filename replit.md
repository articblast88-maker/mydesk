# HelpDesk - Customer Support Ticketing System

## Overview

HelpDesk is a Freshdesk-like customer support ticketing system built as a full-stack TypeScript application. It provides ticket management, knowledge base, customer management, automation rules, canned responses, custom apps, and reporting capabilities for support teams.

The application follows an enterprise productivity design pattern inspired by Linear and Zendesk, emphasizing information clarity, efficient workflows, and clean visual hierarchy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Charts**: Recharts for dashboard visualizations
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Style**: RESTful JSON API endpoints under `/api/*`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration

### Data Layer
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema push (`npm run db:push`)
- **Core Tables**: users, tickets, ticketReplies, ticketActivities, kbCategories, kbArticles, cannedResponses, customApps, automationRules, slaPolicies
- **Extended Tables**: agentGroups, groupMembers, businessHours, holidays, ticketTemplates, timeEntries, csatSurveys, agentPoints, badges, agentBadges, forumCategories, forumTopics, forumReplies, articleFeedback
- **Freshdesk API Parity Tables**: companies, kbFolders, ticketNotes, forumSubscriptions, customFieldDefinitions

### Recent Changes
- **Custom Fields Admin (Dec 2025)**: Full Freshdesk-style custom field management for all entities:
  - Admin Settings > Ticket Fields, Contact Fields, Company Fields pages
  - Each page has Default Fields and Custom Fields tabs
  - Create/edit custom fields with 8 field types: text, textarea, number, decimal, dropdown, multiselect, date, checkbox
  - Field properties: required on submit/close, customer visibility/editing, agent/customer labels, placeholder, help text
  - Custom fields dynamically rendered in ticket creation dialog and customer creation dialog
  - Custom fields displayed and editable in ticket detail sidebar
  - Values stored in JSONB columns (tickets.customFields, users.customFields)
- **End-to-End Ticket Workflow (Dec 2025)**: Complete ticket lifecycle verified:
  - Create tickets via API and UI
  - Update status (open -> pending -> in_progress -> resolved -> closed)
  - Update priority (low, medium, high, urgent)
  - Add replies and internal notes
  - Activity logging for all ticket changes (status, priority, assignee)
- **Customer Portal (Dec 2025)**: Added /portal route with separate layout for customers to view and create tickets
- **Portal Self-Service Authentication (Dec 2025)**: Customers can now self-register and login:
  - Admin-created customers have no password; they must sign up via portal
  - POST /api/portal/signup - Customer self-registration with bcrypt password hashing
  - POST /api/portal/login - Customer authentication with bcrypt verification
  - Unique username generation with collision handling
  - Password field removed from admin customer creation UI
- **Activity Logging Enhancement**: updateTicket now logs activities for status_changed, priority_changed, and assigned actions
- **Freshdesk API Parity (Dec 2025)**: Added 5 new tables for full Freshdesk API coverage:
  - `companies` - Customer organization management with domains, health scores, account tiers
  - `kbFolders` - 3-level KB hierarchy (categories → folders → articles) matching Freshdesk Solution structure
  - `ticketNotes` - Internal notes separate from public replies for agent collaboration
  - `forumSubscriptions` - Forum monitoring for following topics/categories
  - `customFieldDefinitions` - Dynamic custom field definitions for tickets, contacts, companies
- **Time Entry Timer**: Added timerRunning field for start/stop timer functionality
- **Ticket Actions**: Added restore, assign, and pick ticket operations
- **Backend Expansion (Dec 2025)**: Added 14 new tables with full CRUD operations for agent groups, business hours, ticket templates, time tracking, CSAT surveys, gamification, community forums, and article feedback
- **Enhanced Tickets**: Parent-child relationships via parentTicketId, group assignment via groupId, time tracking via timeSpent
- **KB Approval Workflow**: Articles have status (draft/pending_approval/published) with approver tracking
- **App Marketplace**: Pre-built apps marketplace with 8 apps across categories (Customer Intelligence, AI & Automation, Productivity, Integrations). Features search, category filtering, install/uninstall with soft-delete
- **Automation Rules (Freshdesk-style)**: Three rule types - ticket_creation, ticket_update, time_trigger with structured conditions (field/operator/value) and actions builder
- **Automation Execution Engine (Dec 2025)**: Rules automatically execute on ticket creation:
  - Evaluates conditions (field/operator/value) with support for: is, is_not, contains, greater_than, less_than operators
  - Applies actions: set_status, set_priority, set_category, assign_to, add_tag
  - Logs "automation_executed" activity for audit trail
  - Increments rule execution count and updates lastExecutedAt timestamp
  - Wrapped in try-catch to preserve ticket creation integrity if rules fail
- **Dynamic Custom Field Integration in Automations (Dec 2025)**: Custom fields defined in Ticket Fields automatically populate in:
  - Trigger Events: "X is changed" triggers for each custom field
  - Conditions: Custom fields selectable with type-specific operators (text, number, dropdown, checkbox, date)
  - Actions: "Set X" actions for each custom field with type-aware value inputs
  - Uses stable field IDs for persistence, type-aware value inputs (dropdowns, checkboxes, date pickers)
- **Reports Dashboard**: Real database queries for ticket volume, resolution times, category distribution, agent performance
- **Ticket Relationships**: Batch-fetch pattern using inArray for customer and assignee data in ticket lists

### New API Endpoints
- `/api/portal/signup` - Customer self-registration with password hashing
- `/api/portal/login` - Customer portal authentication
- `/api/companies` - Company/organization CRUD with domains, health scores, tiers
- `/api/kb/folders` - KB folder management with category hierarchy
- `/api/tickets/:id/notes` - Internal ticket notes (separate from public replies)
- `/api/tickets/:id/restore` - Restore closed/archived tickets
- `/api/tickets/:id/assign` - Assign ticket to specific agent
- `/api/tickets/:id/pick` - Agent picks unassigned ticket
- `/api/forums/subscriptions` - Forum topic/category subscriptions
- `/api/forums/topics/:id/following` - Check if user follows topic
- `/api/forums/categories/:id/following` - Check if user follows category
- `/api/custom-fields` - Custom field definitions for dynamic metadata
- `/api/time-entries/:id/toggle` - Start/stop time entry timer
- `/api/agent-groups` - Agent group management with member assignment
- `/api/business-hours` - Business hours schedules with holidays
- `/api/ticket-templates` - Reusable ticket templates
- `/api/tickets/:id/time-entries` - Time tracking for tickets
- `/api/csat-surveys` - Customer satisfaction surveys
- `/api/gamification/leaderboard` - Agent gamification and points
- `/api/forums/categories` and `/api/forums/topics` - Community forums
- `/api/kb/articles/:id/feedback` - Article helpful/not helpful feedback

### Project Structure
```
client/           # React frontend application
  src/
    components/   # UI components (shadcn/ui + custom)
    pages/        # Route page components
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared code between client/server
  schema.ts       # Drizzle database schema
```

### Key Design Patterns
- **Separation of Concerns**: Storage layer abstracts database operations from routes
- **Type Safety**: Shared schema types used across frontend and backend
- **Component Library**: Consistent UI through shadcn/ui with custom theming
- **Dark/Light Mode**: Theme provider with system preference detection

### API Documentation
- **Full API Reference**: See `API_DOCUMENTATION.md` for complete Freshdesk-style API documentation
- **Authentication**: API key-based with `Authorization: ApiKey <token>` or `X-Api-Key` header
- **Base URL**: `https://your-domain.replit.app/api` (production) or `https://your-domain.replit.dev/api` (development)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Connection**: pg Pool with Drizzle ORM wrapper

### UI Framework Dependencies
- **Radix UI**: Headless component primitives (dialogs, dropdowns, forms, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management

### Data & Forms
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management
- **Zod**: Schema validation

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development