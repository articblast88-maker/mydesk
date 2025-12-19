# HelpDesk API Documentation

## Introduction

Welcome to the HelpDesk API documentation. This API allows you to integrate HelpDesk's ticketing system with your own applications, automate workflows, and build custom integrations.

The HelpDesk API is a RESTful API that accepts JSON-encoded request bodies and returns JSON-encoded responses. It uses standard HTTP response codes and authentication via API keys.

### Base URL

All API requests should be made to:

```
https://your-domain.replit.app/api
```

For development:
```
https://your-domain.replit.dev/api
```

### Content Type

All requests must include the following header:

```
Content-Type: application/json
```

---

## Authentication

HelpDesk uses API key authentication to secure API requests. API keys are generated through the Admin Settings and should be kept secure.

### Authentication Methods

You can authenticate API requests using one of the following methods:

**Method 1: Authorization Header (Recommended)**
```
Authorization: ApiKey YOUR_API_KEY
```

**Method 2: Bearer Token Format**
```
Authorization: Bearer YOUR_API_KEY
```

**Method 3: Custom Header**
```
X-Api-Key: YOUR_API_KEY
```

### Example Request

```bash
curl -X GET "https://your-domain.replit.app/api/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey hd_1234567890abcdef..."
```

### API Key Scopes

API keys can be configured with the following scopes:

| Scope | Description |
|-------|-------------|
| `tickets:read` | Read access to tickets |
| `tickets:write` | Create, update, and delete tickets |
| `users:read` | Read access to users and contacts |
| `users:write` | Create and update users |
| `kb:read` | Read knowledge base articles |
| `kb:write` | Create and update knowledge base content |

### Obtaining an API Key

1. Navigate to **Settings > API Keys** in the admin panel
2. Click **Create New Key**
3. Enter a name for the key and select scopes
4. Copy the generated key immediately - it will only be shown once
5. Store the key securely

---

## Response Codes

The API uses standard HTTP response codes:

| Code | Description |
|------|-------------|
| `200` | Success - Request completed successfully |
| `201` | Created - Resource was successfully created |
| `204` | No Content - Resource was successfully deleted |
| `400` | Bad Request - Invalid request parameters |
| `401` | Unauthorized - Invalid or missing API key |
| `404` | Not Found - Resource does not exist |
| `500` | Internal Server Error - Something went wrong |

### Error Response Format

```json
{
  "error": "Description of the error"
}
```

---

## Customer Portal Authentication

The Customer Portal provides self-service authentication for customers. These endpoints do not require API key authentication.

### Portal Signup

Create a new customer account with password.

```
POST /api/portal/signup
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Customer's display name |
| `email` | string | Yes | Email address (must be unique) |
| `password` | string | Yes | Password (minimum 6 characters) |

**Example Request:**

```bash
curl -X POST "https://your-domain.replit.app/api/portal/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Example Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "customer",
  "isActive": true,
  "createdAt": "2025-12-18T06:00:00.000Z"
}
```

**Error Responses:**

| Code | Description |
|------|-------------|
| `400` | Invalid request body or validation error |
| `409` | Email already exists |

---

### Portal Login

Authenticate a customer and retrieve their profile.

```
POST /api/portal/login
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Customer's email address |
| `password` | string | Yes | Customer's password |

**Example Request:**

```bash
curl -X POST "https://your-domain.replit.app/api/portal/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Example Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "customer",
  "isActive": true,
  "createdAt": "2025-12-18T06:00:00.000Z"
}
```

**Error Responses:**

| Code | Description |
|------|-------------|
| `400` | Invalid request body |
| `401` | Invalid email or password |

> **Note:** Customers created by admins without a password must complete portal signup before they can log in.

---

## Tickets

Tickets are the core of the HelpDesk system. They represent customer support requests.

### Ticket Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `ticketNumber` | integer | Human-readable ticket number |
| `subject` | string | Ticket subject line |
| `description` | string | Detailed description of the issue |
| `status` | string | Current status: `open`, `pending`, `in_progress`, `resolved`, `closed` |
| `priority` | string | Priority level: `low`, `medium`, `high`, `urgent` |
| `category` | string | Category of the ticket |
| `customerId` | string | ID of the customer who created the ticket |
| `assigneeId` | string | ID of the assigned agent (nullable) |
| `groupId` | string | ID of the assigned agent group (nullable) |
| `parentTicketId` | string | ID of parent ticket for child tickets (nullable) |
| `linkedTicketIds` | array | Array of linked ticket IDs |
| `tags` | array | Array of tag strings |
| `customFields` | object | Key-value pairs for custom field values |
| `source` | string | Ticket source: `portal`, `email`, `api` |
| `slaDeadline` | string | SLA deadline timestamp (nullable) |
| `firstResponseAt` | string | First response timestamp (nullable) |
| `resolvedAt` | string | Resolution timestamp (nullable) |
| `dueDate` | string | Due date (nullable) |
| `createdAt` | string | Creation timestamp |
| `updatedAt` | string | Last update timestamp |

---

### List All Tickets

Retrieve a list of all tickets with optional filtering.

```
GET /api/tickets
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`open`, `pending`, `in_progress`, `resolved`, `closed`) |
| `priority` | string | Filter by priority (`low`, `medium`, `high`, `urgent`) |
| `assigneeId` | string | Filter by assigned agent ID |
| `limit` | integer | Maximum number of tickets to return |

**Example Request:**

```bash
curl -X GET "https://your-domain.replit.app/api/tickets?status=open&priority=high" \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Example Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ticketNumber": 267213,
    "subject": "Cannot access my account",
    "description": "I'm unable to log into my account...",
    "status": "open",
    "priority": "high",
    "category": "technical",
    "customerId": "f9eee371-33d1-4d71-8e58-f57a59198725",
    "assigneeId": null,
    "tags": ["login", "urgent"],
    "customFields": {},
    "source": "portal",
    "createdAt": "2025-12-18T05:21:07.214Z",
    "updatedAt": "2025-12-18T05:21:07.277Z"
  }
]
```

---

### Get a Ticket

Retrieve a single ticket by ID.

```
GET /api/tickets/:id
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Example Request:**

```bash
curl -X GET "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Example Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ticketNumber": 267213,
  "subject": "Cannot access my account",
  "description": "I'm unable to log into my account...",
  "status": "open",
  "priority": "high",
  "category": "technical",
  "customerId": "f9eee371-33d1-4d71-8e58-f57a59198725",
  "assigneeId": null,
  "tags": [],
  "customFields": {},
  "source": "portal",
  "createdAt": "2025-12-18T05:21:07.214Z",
  "updatedAt": "2025-12-18T05:21:07.277Z"
}
```

---

### Create a Ticket

Create a new support ticket.

```
POST /api/tickets
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | Ticket subject line |
| `description` | string | Yes | Detailed description |
| `customerId` | string | Yes | Customer ID (UUID) |
| `status` | string | No | Initial status (default: `open`) |
| `priority` | string | No | Priority level (default: `medium`) |
| `category` | string | No | Ticket category |
| `assigneeId` | string | No | Assigned agent ID |
| `groupId` | string | No | Agent group ID |
| `tags` | array | No | Array of tag strings |
| `customFields` | object | No | Custom field values |
| `source` | string | No | Ticket source (default: `api`) |

**Example Request:**

```bash
curl -X POST "https://your-domain.replit.app/api/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -d '{
    "subject": "Payment processing issue",
    "description": "My payment failed but I was charged",
    "customerId": "f9eee371-33d1-4d71-8e58-f57a59198725",
    "priority": "high",
    "category": "billing",
    "tags": ["payment", "urgent"]
  }'
```

**Example Response:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "ticketNumber": 267214,
  "subject": "Payment processing issue",
  "description": "My payment failed but I was charged",
  "status": "open",
  "priority": "high",
  "category": "billing",
  "customerId": "f9eee371-33d1-4d71-8e58-f57a59198725",
  "assigneeId": null,
  "tags": ["payment", "urgent"],
  "customFields": {},
  "source": "api",
  "createdAt": "2025-12-18T06:00:00.000Z",
  "updatedAt": "2025-12-18T06:00:00.000Z"
}
```

**Note:** Automation rules are automatically executed when a ticket is created. This may modify the ticket's status, priority, category, or assignee based on configured rules.

---

### Update a Ticket

Update an existing ticket.

```
PATCH /api/tickets/:id
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Request Body:**

All fields are optional. Only include fields you want to update.

| Field | Type | Description |
|-------|------|-------------|
| `subject` | string | Updated subject line |
| `description` | string | Updated description |
| `status` | string | New status |
| `priority` | string | New priority |
| `category` | string | New category |
| `assigneeId` | string | New assignee ID (or `null` to unassign) |
| `groupId` | string | New group ID |
| `tags` | array | Updated tags array |
| `customFields` | object | Updated custom fields |

**Example Request:**

```bash
curl -X PATCH "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -d '{
    "status": "in_progress",
    "assigneeId": "397f8871-6bd4-4df4-ad6f-0fef197e8547",
    "priority": "urgent"
  }'
```

**Example Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ticketNumber": 267213,
  "subject": "Cannot access my account",
  "status": "in_progress",
  "priority": "urgent",
  "assigneeId": "397f8871-6bd4-4df4-ad6f-0fef197e8547",
  "updatedAt": "2025-12-18T06:30:00.000Z"
}
```

---

### Delete a Ticket

Permanently delete a ticket.

```
DELETE /api/tickets/:id
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Example Request:**

```bash
curl -X DELETE "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Response:** `204 No Content`

---

### Restore a Ticket

Restore a closed or archived ticket to open status.

```
POST /api/tickets/:id/restore
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Example Request:**

```bash
curl -X POST "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000/restore" \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

---

### Assign a Ticket

Assign a ticket to a specific agent.

```
POST /api/tickets/:id/assign
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assigneeId` | string | Yes | Agent ID to assign the ticket to |

**Example Request:**

```bash
curl -X POST "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -d '{
    "assigneeId": "397f8871-6bd4-4df4-ad6f-0fef197e8547"
  }'
```

---

### Pick a Ticket

Agent picks an unassigned ticket (assigns to themselves).

```
POST /api/tickets/:id/pick
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string | Yes | ID of the agent picking the ticket |

---

## Ticket Replies

Replies are messages added to tickets by agents or customers.

### Reply Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `ticketId` | string | Parent ticket ID |
| `userId` | string | ID of the user who created the reply |
| `content` | string | Reply content |
| `isInternal` | boolean | Whether this is an internal note (not visible to customer) |
| `createdAt` | string | Creation timestamp |

---

### List Ticket Replies

Get all replies for a ticket.

```
GET /api/tickets/:id/replies
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Example Request:**

```bash
curl -X GET "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000/replies" \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

**Example Response:**

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "ticketId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "397f8871-6bd4-4df4-ad6f-0fef197e8547",
    "content": "Thank you for contacting support. I'm looking into this issue.",
    "isInternal": false,
    "createdAt": "2025-12-18T06:15:00.000Z"
  }
]
```

---

### Create a Reply

Add a reply to a ticket.

```
POST /api/tickets/:id/replies
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | The ticket ID (UUID) |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | ID of the user creating the reply |
| `content` | string | Yes | Reply content |
| `isInternal` | boolean | No | Set to `true` for internal notes (default: `false`) |

**Example Request:**

```bash
curl -X POST "https://your-domain.replit.app/api/tickets/550e8400-e29b-41d4-a716-446655440000/replies" \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -d '{
    "userId": "397f8871-6bd4-4df4-ad6f-0fef197e8547",
    "content": "I have reset your password. Please try logging in again.",
    "isInternal": false
  }'
```

---

## Ticket Notes

Internal notes are private comments visible only to agents.

### List Ticket Notes

```
GET /api/tickets/:id/notes
```

### Create a Ticket Note

```
POST /api/tickets/:id/notes
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Agent creating the note |
| `content` | string | Yes | Note content |
| `isPrivate` | boolean | No | Whether note is private (default: `true`) |

---

## Ticket Activities

Activities track all changes made to a ticket.

### Activity Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `ticketId` | string | Parent ticket ID |
| `userId` | string | User who performed the action |
| `action` | string | Type of action performed |
| `oldValue` | string | Previous value (if applicable) |
| `newValue` | string | New value (if applicable) |
| `createdAt` | string | Timestamp of the action |

### Action Types

| Action | Description |
|--------|-------------|
| `created` | Ticket was created |
| `status_changed` | Status was updated |
| `priority_changed` | Priority was updated |
| `assigned` | Ticket was assigned to an agent |
| `replied` | A reply was added |
| `automation_executed` | An automation rule was triggered |

---

### List Ticket Activities

```
GET /api/tickets/:id/activities
```

**Example Response:**

```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "ticketId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": null,
    "action": "automation_executed",
    "oldValue": null,
    "newValue": "Technical tickets are urgent",
    "createdAt": "2025-12-18T05:21:07.286Z"
  },
  {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "ticketId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "397f8871-6bd4-4df4-ad6f-0fef197e8547",
    "action": "status_changed",
    "oldValue": "open",
    "newValue": "in_progress",
    "createdAt": "2025-12-18T06:30:00.000Z"
  }
]
```

---

## Users (Contacts & Agents)

### User Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `username` | string | Login username |
| `email` | string | Email address |
| `name` | string | Display name |
| `phone` | string | Phone number (nullable) |
| `role` | string | User role: `admin`, `agent`, `customer` |
| `ticketScope` | string | Ticket visibility scope |
| `avatarUrl` | string | Profile picture URL (nullable) |
| `companyId` | string | Associated company ID (nullable) |
| `tags` | array | User tags |
| `customFields` | object | Custom field values |
| `isActive` | boolean | Whether user is active |
| `createdAt` | string | Creation timestamp |

---

### List Users

```
GET /api/users
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role (`admin`, `agent`, `customer`) |

**Example Request:**

```bash
curl -X GET "https://your-domain.replit.app/api/users?role=customer" \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

---

### Get a User

```
GET /api/users/:id
```

---

### Create a User

```
POST /api/users
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Unique username |
| `email` | string | Yes | Email address |
| `password` | string | No | Password (optional for admin-created customers - they can set their own via portal signup) |
| `name` | string | Yes | Display name |
| `role` | string | No | User role (default: `customer`) |
| `phone` | string | No | Phone number |
| `companyId` | string | No | Associated company |
| `tags` | array | No | User tags |
| `customFields` | object | No | Custom field values |

> **Note:** When creating customers without a password, they must use the Customer Portal signup to set their credentials before they can log in.

---

### Update a User

```
PATCH /api/users/:id
```

---

## Companies

Companies represent customer organizations.

### Company Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Company name |
| `description` | string | Company description |
| `domains` | array | Associated email domains |
| `industry` | string | Industry category |
| `healthScore` | string | Customer health: `happy`, `neutral`, `at_risk` |
| `accountTier` | string | Account tier: `free`, `basic`, `premium`, `enterprise` |
| `renewalDate` | string | Subscription renewal date |
| `customFields` | object | Custom field values |

---

### List Companies

```
GET /api/companies
```

### Get a Company

```
GET /api/companies/:id
```

### Create a Company

```
POST /api/companies
```

### Update a Company

```
PATCH /api/companies/:id
```

### Delete a Company

```
DELETE /api/companies/:id
```

---

## Custom Fields

Custom fields allow you to add additional data to tickets, contacts, and companies.

### Custom Field Definition Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `entityType` | string | Entity type: `ticket`, `contact`, `company` |
| `name` | string | Field internal name |
| `label` | string | Display label |
| `fieldType` | string | Field type (see below) |
| `options` | array | Options for dropdown/multiselect fields |
| `isRequired` | boolean | Whether field is required |
| `requiredOnClose` | boolean | Required when closing tickets |
| `customerCanView` | boolean | Visible to customers |
| `customerCanEdit` | boolean | Editable by customers |
| `placeholder` | string | Input placeholder text |
| `helpText` | string | Help text for users |
| `position` | integer | Display order |
| `isActive` | boolean | Whether field is active |

### Field Types

| Type | Description |
|------|-------------|
| `text` | Single-line text |
| `textarea` | Multi-line text |
| `number` | Integer number |
| `decimal` | Decimal number |
| `dropdown` | Single select dropdown |
| `multiselect` | Multi-select dropdown |
| `date` | Date picker |
| `checkbox` | Boolean checkbox |

---

### List Custom Fields

```
GET /api/custom-fields
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityType` | string | Filter by entity type |

### Create a Custom Field

```
POST /api/custom-fields
```

### Update a Custom Field

```
PATCH /api/custom-fields/:id
```

### Delete a Custom Field

```
DELETE /api/custom-fields/:id
```

---

## Automation Rules

Automation rules automatically perform actions based on ticket events.

### Automation Rule Object

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Rule name |
| `description` | string | Rule description |
| `ruleType` | string | Type: `ticket_creation`, `ticket_update`, `time_trigger` |
| `trigger` | string | Specific trigger event |
| `conditionMatch` | string | Match mode: `all` or `any` |
| `conditions` | array | Array of condition objects |
| `actions` | array | Array of action objects |
| `isActive` | boolean | Whether rule is active |
| `executionCount` | integer | Number of times rule has executed |
| `lastExecutedAt` | string | Last execution timestamp |

### Condition Object

```json
{
  "field": "category",
  "operator": "is",
  "value": "technical"
}
```

**Operators:** `is`, `is_not`, `contains`, `greater_than`, `less_than`

### Action Object

```json
{
  "type": "set_priority",
  "value": "urgent"
}
```

**Action Types:** `set_status`, `set_priority`, `set_category`, `assign_to`, `add_tag`

---

### List Automation Rules

```
GET /api/automation-rules
```

### Create an Automation Rule

```
POST /api/automation-rules
```

### Update an Automation Rule

```
PATCH /api/automation-rules/:id
```

### Delete an Automation Rule

```
DELETE /api/automation-rules/:id
```

---

## Knowledge Base

### Categories

```
GET /api/kb/categories
POST /api/kb/categories
PATCH /api/kb/categories/:id
DELETE /api/kb/categories/:id
```

### Folders

```
GET /api/kb/folders
GET /api/kb/folders/:id
POST /api/kb/folders
PATCH /api/kb/folders/:id
DELETE /api/kb/folders/:id
```

### Articles

```
GET /api/kb/articles
GET /api/kb/articles/:id
POST /api/kb/articles
PATCH /api/kb/articles/:id
DELETE /api/kb/articles/:id
```

### Article Feedback

```
GET /api/kb/articles/:id/feedback
POST /api/kb/articles/:id/feedback
```

---

## Canned Responses

Pre-written response templates for agents.

```
GET /api/canned-responses
POST /api/canned-responses
PATCH /api/canned-responses/:id
DELETE /api/canned-responses/:id
```

---

## Agent Groups

Groups for organizing agents by team or department.

```
GET /api/agent-groups
GET /api/agent-groups/:id
POST /api/agent-groups
PATCH /api/agent-groups/:id
DELETE /api/agent-groups/:id
GET /api/agent-groups/:id/members
POST /api/agent-groups/:id/members
DELETE /api/agent-groups/:groupId/members/:id
```

---

## SLA Policies

Service Level Agreement policies for response and resolution times.

```
GET /api/sla-policies
POST /api/sla-policies
PATCH /api/sla-policies/:id
DELETE /api/sla-policies/:id
```

---

## Time Tracking

Track time spent on tickets.

```
GET /api/tickets/:id/time-entries
POST /api/tickets/:id/time-entries
POST /api/time-entries/:id/toggle
```

---

## Reports

Dashboard statistics and reports.

```
GET /api/dashboard/stats
GET /api/reports
```

---

## API Keys Management

### List API Keys

```
GET /api/api-keys
```

### Create an API Key

```
POST /api/api-keys
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Descriptive name for the key |
| `scopes` | array | No | Permission scopes |
| `expiresAt` | string | No | Expiration date (ISO 8601) |

**Important:** The API key is only returned once upon creation. Store it securely.

### Revoke an API Key

```
DELETE /api/api-keys/:id
```

### Verify an API Key

```
POST /api/api-keys/verify
```

Include the API key in the `Authorization` header to verify its validity.

---

## Data Import/Export

### Export Contacts

```
POST /api/contacts/export
```

### Export Companies

```
POST /api/companies/export
```

### Import Contacts

```
POST /api/contacts/import
```

### Import Companies

```
POST /api/companies/import
```

### Download Templates

```
GET /api/contacts/import/template
GET /api/companies/import/template
```

---

## Rate Limiting

The API does not currently implement rate limiting, but please be respectful of server resources. Excessive requests may be throttled.

---

## Webhooks (Coming Soon)

Webhook support for real-time event notifications is planned for a future release.

---

## Support

For API support or questions, please contact your HelpDesk administrator or create a support ticket through the customer portal.

---

**API Version:** 1.0  
**Last Updated:** December 2025
