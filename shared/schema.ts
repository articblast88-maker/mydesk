import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - supports both agents and customers
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"), // admin, agent, customer
  ticketScope: text("ticket_scope").default("global"), // global, group, restricted - Freshdesk-style ticket visibility
  avatarUrl: text("avatar_url"),
  companyId: varchar("company_id"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  customFields: jsonb("custom_fields").default(sql`'{}'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets, { relationName: "assignedTickets" }),
  createdTickets: many(tickets, { relationName: "createdTickets" }),
  ticketReplies: many(ticketReplies),
}));

// Tickets table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: integer("ticket_number").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, pending, resolved, closed
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  category: text("category"),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  assigneeId: varchar("assignee_id").references(() => users.id),
  groupId: varchar("group_id"),
  parentTicketId: varchar("parent_ticket_id"),
  linkedTicketIds: text("linked_ticket_ids").array().default(sql`'{}'::text[]`),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  customFields: jsonb("custom_fields").default(sql`'{}'::jsonb`),
  source: text("source").default("portal"), // portal, email, api
  slaDeadline: timestamp("sla_deadline"),
  firstResponseAt: timestamp("first_response_at"),
  resolvedAt: timestamp("resolved_at"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  customer: one(users, {
    fields: [tickets.customerId],
    references: [users.id],
    relationName: "createdTickets",
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: "assignedTickets",
  }),
  replies: many(ticketReplies),
  attachments: many(attachments),
  activities: many(ticketActivities),
}));

// Ticket replies
export const ticketReplies = pgTable("ticket_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketRepliesRelations = relations(ticketReplies, ({ one, many }) => ({
  ticket: one(tickets, {
    fields: [ticketReplies.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketReplies.userId],
    references: [users.id],
  }),
  attachments: many(attachments),
}));

// File attachments
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
  replyId: varchar("reply_id").references(() => ticketReplies.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [attachments.ticketId],
    references: [tickets.id],
  }),
  reply: one(ticketReplies, {
    fields: [attachments.replyId],
    references: [ticketReplies.id],
  }),
}));

// Ticket activity log
export const ticketActivities = pgTable("ticket_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // created, status_changed, priority_changed, assigned, replied, etc.
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketActivitiesRelations = relations(ticketActivities, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketActivities.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketActivities.userId],
    references: [users.id],
  }),
}));

// Knowledge base categories
export const kbCategories = pgTable("kb_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kbCategoriesRelations = relations(kbCategories, ({ many }) => ({
  articles: many(kbArticles),
}));

// Knowledge base articles
export const kbArticles = pgTable("kb_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => kbCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  status: text("status").notNull().default("draft"), // draft, pending_approval, approved, published
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  notHelpfulCount: integer("not_helpful_count").notNull().default(0),
  authorId: varchar("author_id").references(() => users.id),
  approverId: varchar("approver_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const kbArticlesRelations = relations(kbArticles, ({ one }) => ({
  category: one(kbCategories, {
    fields: [kbArticles.categoryId],
    references: [kbCategories.id],
  }),
  author: one(users, {
    fields: [kbArticles.authorId],
    references: [users.id],
  }),
}));

// Canned responses
export const cannedResponses = pgTable("canned_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  shortcut: text("shortcut"),
  category: text("category"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cannedResponsesRelations = relations(cannedResponses, ({ one }) => ({
  creator: one(users, {
    fields: [cannedResponses.createdBy],
    references: [users.id],
  }),
}));

// Custom apps
export const customApps = pgTable("custom_apps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  appUrl: text("app_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  placement: text("placement").notNull().default("ticket_sidebar"), // ticket_sidebar, dashboard, etc.
  settings: jsonb("settings").default(sql`'{}'::jsonb`),
  scriptContent: text("script_content"), // Store custom app script/code
  scriptFileName: text("script_file_name"), // Original file name for downloads
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customAppsRelations = relations(customApps, ({ one }) => ({
  creator: one(users, {
    fields: [customApps.createdBy],
    references: [users.id],
  }),
}));

// Automation rules - Freshdesk-style with 3 rule types
export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ruleType: text("rule_type").notNull().default("ticket_creation"), // ticket_creation, ticket_update, time_trigger
  trigger: text("trigger").notNull(), // For ticket_update: status_changed, priority_changed, assigned, replied, etc. For time_trigger: hourly
  conditionMatch: text("condition_match").notNull().default("all"), // all, any
  conditions: jsonb("conditions").default(sql`'[]'::jsonb`), // [{field, operator, value}]
  actions: jsonb("actions").default(sql`'[]'::jsonb`), // [{type, value}]
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// SLA Policies
export const slaPolicies = pgTable("sla_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  priority: text("priority").notNull(), // low, medium, high, urgent
  firstResponseTime: integer("first_response_time").notNull(), // in minutes
  resolutionTime: integer("resolution_time").notNull(), // in minutes
  businessHoursId: varchar("business_hours_id").references(() => businessHours.id),
  escalationEmail: text("escalation_email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agent Groups/Teams
export const agentGroups = pgTable("agent_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  autoAssign: boolean("auto_assign").notNull().default(false),
  assignmentMethod: text("assignment_method").default("round_robin"), // round_robin, load_balanced
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agent Roles - Freshdesk-style role-based access control
export const agentRoles = pgTable("agent_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false), // Default roles cannot be edited/deleted
  agentType: text("agent_type").default("support_agent"), // support_agent, field_agent, collaborator
  permissions: jsonb("permissions").default(sql`'{}'::jsonb`), // Granular permissions by module
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Role Assignments (many-to-many)
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => agentRoles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Group Members
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => agentGroups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isLeader: boolean("is_leader").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Business Hours
export const businessHours = pgTable("business_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  schedule: jsonb("schedule").default(sql`'[]'::jsonb`), // [{day: 0-6, startTime: "09:00", endTime: "17:00"}]
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Holidays
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessHoursId: varchar("business_hours_id").notNull().references(() => businessHours.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ticket Templates (Scenarios)
export const ticketTemplates = pgTable("ticket_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject"),
  content: text("content"),
  status: text("status"),
  priority: text("priority"),
  category: text("category"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  groupId: varchar("group_id").references(() => agentGroups.id),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Time Entries for ticket time tracking
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  timeSpent: integer("time_spent").notNull(), // in minutes
  note: text("note"),
  billable: boolean("billable").notNull().default(true),
  timerRunning: boolean("timer_running").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// CSAT Surveys
export const csatSurveys = pgTable("csat_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  agentId: varchar("agent_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  feedback: text("feedback"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Gamification - Agent Points
export const agentPoints = pgTable("agent_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  ticketsResolved: integer("tickets_resolved").notNull().default(0),
  firstResponses: integer("first_responses").notNull().default(0),
  csatPositive: integer("csat_positive").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Gamification - Badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  criteria: text("criteria").notNull(), // tickets_resolved_10, first_response_fast, etc.
  pointsRequired: integer("points_required").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agent Badges (earned)
export const agentBadges = pgTable("agent_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// Community Forums
export const forumCategories = pgTable("forum_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  order: integer("order").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumTopics = pgTable("forum_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => forumCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  lastReplyAt: timestamp("last_reply_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const forumReplies = pgTable("forum_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").notNull().references(() => forumTopics.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isAcceptedAnswer: boolean("is_accepted_answer").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Article Feedback for KB
export const articleFeedback = pgTable("article_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => kbArticles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  isHelpful: boolean("is_helpful").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Companies (Customer Organizations)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  domains: text("domains").array().default(sql`'{}'::text[]`),
  industry: text("industry"),
  healthScore: text("health_score"), // happy, at_risk, neutral
  accountTier: text("account_tier"), // free, basic, premium, enterprise
  renewalDate: timestamp("renewal_date"),
  notes: text("notes"),
  customFields: jsonb("custom_fields").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// KB Folders (between categories and articles)
export const kbFolders = pgTable("kb_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => kbCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  visibility: text("visibility").notNull().default("all"), // all, logged_in, agents
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ticket Notes (internal notes separate from public replies)
export const ticketNotes = pgTable("ticket_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").notNull().default(true),
  notifyAgents: text("notify_agents").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Forum Subscriptions (monitoring)
export const forumSubscriptions = pgTable("forum_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => forumCategories.id, { onDelete: "cascade" }),
  topicId: varchar("topic_id").references(() => forumTopics.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// DC Sequences (for unique Delivery Challan numbers)
export const dcSequences = pgTable("dc_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionCode: text("region_code").notNull().unique(),
  lastSequence: integer("last_sequence").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contact/Ticket Custom Fields Metadata
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // contact, ticket, company
  name: text("name").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(), // text, number, dropdown, multiselect, textarea, date, checkbox, decimal, dependent
  options: text("options").array().default(sql`'{}'::text[]`),
  isRequired: boolean("is_required").notNull().default(false),
  requiredOnClose: boolean("required_on_close").notNull().default(false),
  customerCanView: boolean("customer_can_view").notNull().default(true),
  customerCanEdit: boolean("customer_can_edit").notNull().default(true),
  agentLabel: text("agent_label"),
  customerLabel: text("customer_label"),
  placeholder: text("placeholder"),
  helpText: text("help_text"),
  defaultValue: text("default_value"),
  dependentConfig: jsonb("dependent_config").default(sql`'{}'::jsonb`), // For dependent fields: levels, level labels, choices hierarchy
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
// Password is optional for admin-created customers (they self-register via portal)
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  password: z.string().optional(),
});

// Update schema for users - only allowed fields (role changes require separate admin endpoint)
// Using .strict() to reject any extra fields not defined in the schema
export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().nullable().optional(),
  ticketScope: z.enum(["global", "group", "restricted"]).optional(),
}).strict();

// Admin-only schema for role changes
export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "agent", "customer"]),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
  firstResponseAt: true,
  resolvedAt: true,
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({
  id: true,
  createdAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

export const insertTicketActivitySchema = createInsertSchema(ticketActivities).omit({
  id: true,
  createdAt: true,
});

export const insertKbCategorySchema = createInsertSchema(kbCategories).omit({
  id: true,
  createdAt: true,
});

export const insertKbArticleSchema = createInsertSchema(kbArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

export const insertCannedResponseSchema = createInsertSchema(cannedResponses).omit({
  id: true,
  createdAt: true,
});

export const insertCustomAppSchema = createInsertSchema(customApps).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
  executionCount: true,
  lastExecutedAt: true,
});

export const updateAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
  executionCount: true,
  lastExecutedAt: true,
}).partial();

export const insertSlaPolicySchema = createInsertSchema(slaPolicies).omit({
  id: true,
  createdAt: true,
});

export const insertAgentGroupSchema = createInsertSchema(agentGroups).omit({
  id: true,
  createdAt: true,
});

export const insertAgentRoleSchema = createInsertSchema(agentRoles).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessHoursSchema = createInsertSchema(businessHours).omit({
  id: true,
  createdAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export const insertTicketTemplateSchema = createInsertSchema(ticketTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertCsatSurveySchema = createInsertSchema(csatSurveys).omit({
  id: true,
  sentAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertForumCategorySchema = createInsertSchema(forumCategories).omit({
  id: true,
  createdAt: true,
});

export const insertForumTopicSchema = createInsertSchema(forumTopics).omit({
  id: true,
  createdAt: true,
  viewCount: true,
  replyCount: true,
  lastReplyAt: true,
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({
  id: true,
  createdAt: true,
  upvotes: true,
});

export const insertArticleFeedbackSchema = createInsertSchema(articleFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKbFolderSchema = createInsertSchema(kbFolders).omit({
  id: true,
  createdAt: true,
});

export const insertTicketNoteSchema = createInsertSchema(ticketNotes).omit({
  id: true,
  createdAt: true,
});

export const insertForumSubscriptionSchema = createInsertSchema(forumSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitions).omit({
  id: true,
  createdAt: true,
});

// Data exports for import/export history
export const dataExports = pgTable("data_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // contacts, companies
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  selectedFields: text("selected_fields").array().default(sql`'{}'::text[]`),
  totalRecords: integer("total_records"),
  exportedBy: varchar("exported_by").references(() => users.id),
  errorMessage: text("error_message"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDataExportSchema = createInsertSchema(dataExports).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// API Keys for external API access
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(), // First 8 chars of the key for identification
  keyHash: text("key_hash").notNull(), // SHA-256 hash of the full key
  userId: varchar("user_id").notNull().references(() => users.id),
  scopes: text("scopes").array().default(sql`'{}'::text[]`), // tickets:read, tickets:write, users:read, etc.
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

export type InsertTicketActivity = z.infer<typeof insertTicketActivitySchema>;
export type TicketActivity = typeof ticketActivities.$inferSelect;

export type InsertKbCategory = z.infer<typeof insertKbCategorySchema>;
export type KbCategory = typeof kbCategories.$inferSelect;

export type InsertKbArticle = z.infer<typeof insertKbArticleSchema>;
export type KbArticle = typeof kbArticles.$inferSelect;

export type InsertCannedResponse = z.infer<typeof insertCannedResponseSchema>;
export type CannedResponse = typeof cannedResponses.$inferSelect;

export type InsertCustomApp = z.infer<typeof insertCustomAppSchema>;
export type CustomApp = typeof customApps.$inferSelect;

export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;

export type InsertSlaPolicy = z.infer<typeof insertSlaPolicySchema>;
export type SlaPolicy = typeof slaPolicies.$inferSelect;

export type InsertAgentGroup = z.infer<typeof insertAgentGroupSchema>;
export type AgentGroup = typeof agentGroups.$inferSelect;

export type InsertAgentRole = z.infer<typeof insertAgentRoleSchema>;
export type AgentRole = typeof agentRoles.$inferSelect;

export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export type InsertBusinessHours = z.infer<typeof insertBusinessHoursSchema>;
export type BusinessHours = typeof businessHours.$inferSelect;

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

export type InsertTicketTemplate = z.infer<typeof insertTicketTemplateSchema>;
export type TicketTemplate = typeof ticketTemplates.$inferSelect;

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export type InsertCsatSurvey = z.infer<typeof insertCsatSurveySchema>;
export type CsatSurvey = typeof csatSurveys.$inferSelect;

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

export type AgentPoints = typeof agentPoints.$inferSelect;
export type AgentBadge = typeof agentBadges.$inferSelect;

export type InsertForumCategory = z.infer<typeof insertForumCategorySchema>;
export type ForumCategory = typeof forumCategories.$inferSelect;

export type InsertForumTopic = z.infer<typeof insertForumTopicSchema>;
export type ForumTopic = typeof forumTopics.$inferSelect;

export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type ForumReply = typeof forumReplies.$inferSelect;

export type InsertArticleFeedback = z.infer<typeof insertArticleFeedbackSchema>;
export type ArticleFeedback = typeof articleFeedback.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertKbFolder = z.infer<typeof insertKbFolderSchema>;
export type KbFolder = typeof kbFolders.$inferSelect;

export type InsertTicketNote = z.infer<typeof insertTicketNoteSchema>;
export type TicketNote = typeof ticketNotes.$inferSelect;

export type InsertForumSubscription = z.infer<typeof insertForumSubscriptionSchema>;
export type ForumSubscription = typeof forumSubscriptions.$inferSelect;

export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

export type InsertDataExport = z.infer<typeof insertDataExportSchema>;
export type DataExport = typeof dataExports.$inferSelect;

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Extended types with relations
export type TicketWithRelations = Ticket & {
  customer: User;
  assignee: User | null;
  replies: TicketReply[];
  attachments: Attachment[];
  activities: TicketActivity[];
};

export type TicketReplyWithUser = TicketReply & {
  user: User;
  attachments: Attachment[];
};

export type KbArticleWithCategory = KbArticle & {
  category: KbCategory;
  author: User | null;
};
