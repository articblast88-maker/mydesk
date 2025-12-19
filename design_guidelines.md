# Design Guidelines: Freshdesk-like Ticketing System

## Design Approach

**Selected Approach:** Design System + Enterprise Productivity Reference

**Rationale:** This is a utility-focused, information-dense application requiring consistent patterns, data clarity, and efficient workflows. Drawing inspiration from Linear's clean productivity aesthetic combined with enterprise design system principles.

**Key References:** Linear (clean ticket management), Zendesk/Intercom (support interfaces), Notion (organizational hierarchy)

**Core Principles:**
- Information clarity over visual flourish
- Efficient workflows with minimal friction
- Scalable component system for complex data views
- Clear visual hierarchy for status and priority indicators

## Typography System

**Font Stack:**
- Primary: Inter or System UI stack
- Monospace: JetBrains Mono for ticket IDs, timestamps

**Hierarchy:**
- Page Titles: text-2xl, font-semibold
- Section Headers: text-lg, font-medium  
- Body Text: text-sm, font-normal
- Labels/Meta: text-xs, font-medium, uppercase tracking
- Ticket IDs/Codes: text-xs, font-mono

## Layout System

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8, 12
- Tight spacing: p-2, gap-2 (within components)
- Standard spacing: p-4, gap-4 (between elements)
- Section spacing: p-6, py-8, gap-6 (panel sections)
- Large spacing: p-12 (page margins)

**Grid Structure:**
- Main dashboard: Three-column layout (Sidebar 64px | Ticket List 320px | Detail View flex-1)
- Responsive: Collapse to single column on mobile with slide-out panels
- Custom Apps: Right sidebar panel 360px wide when active

## Component Library

### Navigation
**Top Navigation Bar:** Fixed header, h-14, backdrop-blur, contains logo, global search, notifications, user menu
**Main Sidebar:** w-64, vertical navigation with icon + label sections (Dashboard, Tickets, Customers, Reports, Knowledge Base, Settings)
**Ticket List Sidebar:** w-80, scrollable list with filters at top, ticket cards with compact info

### Ticket Components
**Ticket Card (List View):** 
- Compact height (h-20), shows: ticket ID (mono), subject (truncate), status badge, priority indicator, assignee avatar, last updated
- Hover state reveals quick actions

**Ticket Detail Panel:**
- Header: Ticket ID, subject (text-xl), status/priority badges, assignee dropdown
- Three-tab layout: Conversation | Properties | Apps
- Conversation: Timeline-style thread with alternating customer/agent messages
- Properties: Two-column form layout for metadata (type, priority, tags, custom fields, SLA countdown)
- Apps: Right sidebar overlay (360px) showing active custom app iframe

**Message Composer:**
- Rich text editor with toolbar (bold, italic, lists, attachments)
- Toggle between "Reply" and "Internal Note"
- Canned responses dropdown
- File upload zone with drag-drop

### Dashboard Components
**Stat Cards:** Grid of 4 cards showing metrics (Open Tickets, Avg Response Time, CSAT Score, SLA Compliance)
- Each card: h-24, large number display, trend indicator, sparkline graph

**Data Tables:**
- Sticky header row with sortable columns
- Row height: h-12
- Zebra striping for readability
- Inline action buttons on hover
- Pagination at bottom

**Filter Panel:**
- Collapsible sidebar or dropdown
- Stack of filter groups (Status, Priority, Assignee, Date Range, Tags)
- Clear all filters action

### Knowledge Base
**Article List:** Card grid (3 columns desktop, 1 mobile)
- Article card: Thumbnail area (if image), title, excerpt, view count, last updated
- Category breadcrumb navigation

**Article Reader:**
- Max-width prose container (max-w-3xl)
- Table of contents sidebar on desktop
- Related articles footer

### Custom Apps Framework
**App Marketplace:**
- Grid layout of app cards (2-3 columns)
- Each card: Icon, name, description, install button, rating

**Apps Sidebar (in Ticket View):**
- Slide-in panel from right (w-96)
- Tab bar if multiple apps active
- Iframe container for app content
- Apps receive ticket context via postMessage API

**App Builder Interface:**
- Form for app metadata (name, description, icon)
- Code editor for HTML/JS (using Monaco editor component)
- Sandbox preview panel
- Template selector for common app patterns

### Forms & Inputs
**Consistent Form Pattern:**
- Label above input (text-sm, font-medium, mb-1)
- Input height: h-10 for text inputs, h-24 for textareas
- Border focus states
- Helper text below inputs (text-xs)
- Inline validation messages

**Dropdowns/Selects:**
- Custom styled selects with chevron icon
- Multi-select with tag display
- Agent/customer autocomplete with avatar previews

### Status Indicators
**Status Badges:**
- Pill shape with dot indicator
- Open: Neutral styling
- Pending: Warning tone
- Resolved: Success tone  
- Closed: Muted tone

**Priority Indicators:**
- Urgent: Prominent flag icon or colored border
- High/Medium/Low: Icon only or subtle badge

**SLA Indicators:**
- Progress bar showing time remaining
- Color transitions: green → yellow → red as deadline approaches
- Countdown timer display

### Customer Portal
**Public-Facing Design:**
- Simplified header with logo and sign-in
- Hero section: Search bar prominent (h-16, large text)
- Two-column layout: Submit ticket form | Recent tickets list
- Cleaner, less dense than admin interface

## Animations
**Minimal, Purposeful Motion:**
- Panel slide transitions (300ms ease)
- Dropdown/modal fade-ins (200ms)
- Loading spinners for async actions
- NO decorative scroll effects or page transitions

## Accessibility Standards
- Keyboard navigation for all interactive elements
- Focus indicators on all focusable components
- ARIA labels for icon-only buttons
- Color-blind safe status indicators (use icons + color)
- Screen reader announcements for status changes

## Images
**Not Required:** This is a data-driven application. Any imagery would be:
- User avatars (circular, 32px or 40px)
- Knowledge base article thumbnails (16:9 ratio)
- Custom app icons (48px square)
- Empty state illustrations (simple, centered, max 240px height)

No hero images needed—this is an enterprise tool focused on functionality.