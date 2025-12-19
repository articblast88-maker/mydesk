import { db } from "./db";
import { eq, desc, and, ilike, or, sql, inArray } from "drizzle-orm";
import {
  users, tickets, ticketReplies, ticketActivities, attachments,
  kbCategories, kbArticles, cannedResponses, customApps,
  automationRules, slaPolicies, agentGroups, groupMembers,
  businessHours, holidays, ticketTemplates, timeEntries,
  csatSurveys, agentPoints, badges, agentBadges,
  forumCategories, forumTopics, forumReplies, articleFeedback,
  companies, kbFolders, ticketNotes, forumSubscriptions, customFieldDefinitions, dcSequences,
  dataExports, agentRoles, userRoleAssignments, apiKeys,
  type User, type InsertUser, type Ticket, type InsertTicket,
  type TicketReply, type InsertTicketReply, type TicketActivity, type InsertTicketActivity,
  type KbCategory, type InsertKbCategory, type KbArticle, type InsertKbArticle,
  type CannedResponse, type InsertCannedResponse, type CustomApp, type InsertCustomApp,
  type AutomationRule, type InsertAutomationRule, type SlaPolicy, type InsertSlaPolicy,
  type AgentGroup, type InsertAgentGroup, type GroupMember, type InsertGroupMember,
  type BusinessHours, type InsertBusinessHours, type Holiday, type InsertHoliday,
  type TicketTemplate, type InsertTicketTemplate, type TimeEntry, type InsertTimeEntry,
  type CsatSurvey, type InsertCsatSurvey, type AgentPoints, type Badge, type InsertBadge,
  type ForumCategory, type InsertForumCategory, type ForumTopic, type InsertForumTopic,
  type ForumReply, type InsertForumReply, type ArticleFeedback, type InsertArticleFeedback,
  type Company, type InsertCompany, type KbFolder, type InsertKbFolder,
  type TicketNote, type InsertTicketNote, type ForumSubscription, type InsertForumSubscription,
  type CustomFieldDefinition, type InsertCustomFieldDefinition,
  type DataExport, type InsertDataExport,
  type AgentRole, type InsertAgentRole, type UserRoleAssignment, type InsertUserRoleAssignment,
  type ApiKey, type InsertApiKey,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(role?: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Tickets - returns tickets with customer and assignee relations
  getTickets(filters?: { status?: string; priority?: string; assigneeId?: string; limit?: number }): Promise<(Ticket & { customer: User | null; assignee: User | null })[]>;
  getTicket(id: string): Promise<(Ticket & { customer: User | null; assignee: User | null }) | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;

  // Ticket Replies
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;

  // Ticket Activities
  getTicketActivities(ticketId: string): Promise<TicketActivity[]>;
  createTicketActivity(activity: InsertTicketActivity): Promise<TicketActivity>;

  // KB Categories
  getKbCategories(): Promise<KbCategory[]>;
  getKbCategory(id: string): Promise<KbCategory | undefined>;
  createKbCategory(category: InsertKbCategory): Promise<KbCategory>;
  updateKbCategory(id: string, data: Partial<InsertKbCategory>): Promise<KbCategory | undefined>;
  deleteKbCategory(id: string): Promise<boolean>;

  // KB Articles
  getKbArticles(): Promise<(KbArticle & { category: KbCategory | null })[]>;
  getKbArticle(id: string): Promise<KbArticle | undefined>;
  createKbArticle(article: InsertKbArticle): Promise<KbArticle>;
  updateKbArticle(id: string, data: Partial<InsertKbArticle>): Promise<KbArticle | undefined>;
  deleteKbArticle(id: string): Promise<boolean>;

  // Canned Responses
  getCannedResponses(): Promise<CannedResponse[]>;
  createCannedResponse(response: InsertCannedResponse): Promise<CannedResponse>;
  updateCannedResponse(id: string, data: Partial<InsertCannedResponse>): Promise<CannedResponse | undefined>;
  deleteCannedResponse(id: string): Promise<boolean>;

  // Custom Apps
  getCustomApps(): Promise<CustomApp[]>;
  getCustomApp(id: string): Promise<CustomApp | undefined>;
  createCustomApp(app: InsertCustomApp): Promise<CustomApp>;
  updateCustomApp(id: string, data: Partial<InsertCustomApp>): Promise<CustomApp | undefined>;
  deleteCustomApp(id: string): Promise<boolean>;

  // Automation Rules
  getAutomationRules(): Promise<AutomationRule[]>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: string, data: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: string): Promise<boolean>;
  executeAutomationRules(ticket: Ticket, triggerType: 'ticket_creation' | 'ticket_update'): Promise<{ rulesExecuted: number; ticket: Ticket }>;

  // SLA Policies
  getSlaPolicies(): Promise<SlaPolicy[]>;
  createSlaPolicy(policy: InsertSlaPolicy): Promise<SlaPolicy>;
  updateSlaPolicy(id: string, data: Partial<InsertSlaPolicy>): Promise<SlaPolicy | undefined>;
  deleteSlaPolicy(id: string): Promise<boolean>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    avgResponseTime: number;
  }>;

  // Reports
  getReportsData(range: string): Promise<{
    summary: { totalTickets: number; avgResolutionTime: number; satisfaction: number; slaCompliance: number };
    ticketVolume: { name: string; tickets: number }[];
    resolutionTime: { name: string; time: number }[];
    categoryDistribution: { name: string; value: number; color: string }[];
    agentPerformance: { name: string; resolved: number; satisfaction: number }[];
  }>;

  // Agent Groups
  getAgentGroups(): Promise<AgentGroup[]>;
  getAgentGroup(id: string): Promise<AgentGroup | undefined>;
  createAgentGroup(group: InsertAgentGroup): Promise<AgentGroup>;
  updateAgentGroup(id: string, data: Partial<InsertAgentGroup>): Promise<AgentGroup | undefined>;
  deleteAgentGroup(id: string): Promise<boolean>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(id: string): Promise<boolean>;

  // Agent Roles (Freshdesk-style RBAC)
  getAgentRoles(): Promise<AgentRole[]>;
  getAgentRole(id: string): Promise<AgentRole | undefined>;
  createAgentRole(role: InsertAgentRole): Promise<AgentRole>;
  updateAgentRole(id: string, data: Partial<InsertAgentRole>): Promise<AgentRole | undefined>;
  deleteAgentRole(id: string): Promise<boolean>;
  getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]>;
  getRoleUserAssignments(roleId: string): Promise<UserRoleAssignment[]>;
  assignRoleToUser(assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment>;
  removeRoleFromUser(userId: string, roleId: string): Promise<boolean>;
  seedDefaultRoles(): Promise<void>;

  // Business Hours
  getBusinessHours(): Promise<BusinessHours[]>;
  createBusinessHours(hours: InsertBusinessHours): Promise<BusinessHours>;
  updateBusinessHours(id: string, data: Partial<InsertBusinessHours>): Promise<BusinessHours | undefined>;
  deleteBusinessHours(id: string): Promise<boolean>;
  getHolidays(businessHoursId: string): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  deleteHoliday(id: string): Promise<boolean>;

  // Ticket Templates
  getTicketTemplates(): Promise<TicketTemplate[]>;
  createTicketTemplate(template: InsertTicketTemplate): Promise<TicketTemplate>;
  updateTicketTemplate(id: string, data: Partial<InsertTicketTemplate>): Promise<TicketTemplate | undefined>;
  deleteTicketTemplate(id: string): Promise<boolean>;

  // Time Entries
  getTimeEntries(ticketId: string): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<boolean>;

  // CSAT Surveys
  getCsatSurveys(filters?: { ticketId?: string; customerId?: string }): Promise<CsatSurvey[]>;
  createCsatSurvey(survey: InsertCsatSurvey): Promise<CsatSurvey>;
  updateCsatSurvey(id: string, data: Partial<InsertCsatSurvey>): Promise<CsatSurvey | undefined>;

  // Gamification
  getLeaderboard(): Promise<AgentPoints[]>;
  getAgentPoints(userId: string): Promise<AgentPoints | undefined>;
  updateAgentPoints(userId: string, points: Partial<AgentPoints>): Promise<AgentPoints>;
  getBadges(): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;

  // Forums
  getForumCategories(): Promise<ForumCategory[]>;
  createForumCategory(category: InsertForumCategory): Promise<ForumCategory>;
  updateForumCategory(id: string, data: Partial<InsertForumCategory>): Promise<ForumCategory | undefined>;
  deleteForumCategory(id: string): Promise<boolean>;
  getForumTopics(categoryId?: string): Promise<ForumTopic[]>;
  getForumTopic(id: string): Promise<ForumTopic | undefined>;
  createForumTopic(topic: InsertForumTopic): Promise<ForumTopic>;
  updateForumTopic(id: string, data: Partial<InsertForumTopic>): Promise<ForumTopic | undefined>;
  getForumReplies(topicId: string): Promise<ForumReply[]>;
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;

  // Article Feedback
  getArticleFeedback(articleId: string): Promise<ArticleFeedback[]>;
  createArticleFeedback(feedback: InsertArticleFeedback): Promise<ArticleFeedback>;

  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;

  // KB Folders
  getKbFolders(categoryId?: string): Promise<KbFolder[]>;
  getKbFolder(id: string): Promise<KbFolder | undefined>;
  createKbFolder(folder: InsertKbFolder): Promise<KbFolder>;
  updateKbFolder(id: string, data: Partial<InsertKbFolder>): Promise<KbFolder | undefined>;
  deleteKbFolder(id: string): Promise<boolean>;

  // Ticket Notes
  getTicketNotes(ticketId: string): Promise<TicketNote[]>;
  createTicketNote(note: InsertTicketNote): Promise<TicketNote>;

  // Ticket Actions
  restoreTicket(id: string): Promise<Ticket | undefined>;
  assignTicket(id: string, assigneeId: string): Promise<Ticket | undefined>;
  pickTicket(id: string, agentId: string): Promise<Ticket | undefined>;

  // Forum Subscriptions
  getForumSubscriptions(userId: string): Promise<ForumSubscription[]>;
  createForumSubscription(subscription: InsertForumSubscription): Promise<ForumSubscription>;
  deleteForumSubscription(id: string): Promise<boolean>;
  isFollowingTopic(userId: string, topicId: string): Promise<boolean>;
  isFollowingCategory(userId: string, categoryId: string): Promise<boolean>;

  // Custom Field Definitions
  getCustomFieldDefinitions(entityType?: string): Promise<CustomFieldDefinition[]>;
  createCustomFieldDefinition(field: InsertCustomFieldDefinition): Promise<CustomFieldDefinition>;
  updateCustomFieldDefinition(id: string, data: Partial<InsertCustomFieldDefinition>): Promise<CustomFieldDefinition | undefined>;
  deleteCustomFieldDefinition(id: string): Promise<boolean>;

  // Time Entry Timer
  toggleTimeEntryTimer(id: string): Promise<TimeEntry | undefined>;

  // Data Exports
  getDataExports(): Promise<DataExport[]>;
  getDataExport(id: string): Promise<DataExport | undefined>;
  createDataExport(data: InsertDataExport): Promise<DataExport>;
  updateDataExport(id: string, data: Partial<InsertDataExport>): Promise<DataExport | undefined>;
  
  // Bulk import/export
  getContactsForExport(fields: string[]): Promise<Record<string, unknown>[]>;
  getCompaniesForExport(fields: string[]): Promise<Record<string, unknown>[]>;
  importContacts(contacts: Record<string, unknown>[]): Promise<{ imported: number; updated: number; failed: number; errors: string[] }>;
  importCompanies(companies: Record<string, unknown>[]): Promise<{ imported: number; updated: number; failed: number; errors: string[] }>;

  // API Keys
  getApiKeys(userId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(key: InsertApiKey): Promise<ApiKey>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  revokeApiKey(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(role?: string): Promise<User[]> {
    if (role) {
      return db.select().from(users).where(eq(users.role, role as any));
    }
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      ...user,
      id: randomUUID(),
      // If no password provided (admin-created customer), set empty placeholder
      // Customers will set their own password through portal signup
      password: user.password || "",
    }).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  // Tickets - with customer and assignee data joined
  async getTickets(filters?: { status?: string; priority?: string; assigneeId?: string; limit?: number }) {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(tickets.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(tickets.priority, filters.priority as any));
    }
    if (filters?.assigneeId) {
      conditions.push(eq(tickets.assigneeId, filters.assigneeId));
    }

    // Get tickets first
    let query = db.select().from(tickets).orderBy(desc(tickets.createdAt));
    
    if (conditions.length > 0) {
      query = db.select().from(tickets).where(and(...conditions)).orderBy(desc(tickets.createdAt)) as any;
    }
    
    let ticketResults = await (filters?.limit ? query.limit(filters.limit) : query);

    // Get all unique user IDs (customers and assignees)
    const customerIds = Array.from(new Set(ticketResults.map(t => t.customerId).filter(Boolean)));
    const assigneeIds = Array.from(new Set(ticketResults.map(t => t.assigneeId).filter(Boolean))) as string[];
    const allUserIds = Array.from(new Set([...customerIds, ...assigneeIds]));

    // Fetch all users at once
    let usersMap = new Map<string, User>();
    if (allUserIds.length > 0) {
      const usersData = await db.select().from(users).where(inArray(users.id, allUserIds));
      usersData.forEach(u => usersMap.set(u.id, u));
    }

    // Map tickets with customer and assignee data
    return ticketResults.map(ticket => ({
      ...ticket,
      customer: usersMap.get(ticket.customerId) || null,
      assignee: ticket.assigneeId ? usersMap.get(ticket.assigneeId) || null : null,
    }));
  }

  async getTicket(id: string) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;

    // Fetch customer and assignee data
    let customer = null;
    let assignee = null;
    
    if (ticket.customerId) {
      const [customerData] = await db.select().from(users).where(eq(users.id, ticket.customerId));
      customer = customerData || null;
    }
    
    if (ticket.assigneeId) {
      const [assigneeData] = await db.select().from(users).where(eq(users.id, ticket.assigneeId));
      assignee = assigneeData || null;
    }

    // Fetch replies with user data
    const repliesData = await db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, id)).orderBy(ticketReplies.createdAt);
    const repliesWithUsers = await Promise.all(
      repliesData.map(async (reply) => {
        const [replyUser] = await db.select().from(users).where(eq(users.id, reply.userId));
        return { ...reply, user: replyUser || null };
      })
    );

    // Fetch activities with user data
    const activitiesData = await db.select().from(ticketActivities).where(eq(ticketActivities.ticketId, id)).orderBy(desc(ticketActivities.createdAt));
    const activitiesWithUsers = await Promise.all(
      activitiesData.map(async (activity) => {
        let activityUser = null;
        if (activity.userId) {
          const [userData] = await db.select().from(users).where(eq(users.id, activity.userId));
          activityUser = userData || null;
        }
        return { ...activity, user: activityUser };
      })
    );

    return { ...ticket, customer, assignee, replies: repliesWithUsers, activities: activitiesWithUsers };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const ticketNumber = Date.now() % 1000000;
    const [created] = await db.insert(tickets).values({
      ...ticket,
      id: randomUUID(),
      ticketNumber,
    }).returning();
    return created;
  }

  async updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    // Get original ticket to compare changes
    const [original] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!original) return undefined;

    const [updated] = await db.update(tickets).set({ ...data, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    
    // Log activity for status changes
    if (data.status && data.status !== original.status) {
      await db.insert(ticketActivities).values({
        id: randomUUID(),
        ticketId: id,
        userId: data.assigneeId || original.assigneeId || null,
        action: "status_changed",
        oldValue: original.status,
        newValue: data.status,
      });
    }

    // Log activity for priority changes
    if (data.priority && data.priority !== original.priority) {
      await db.insert(ticketActivities).values({
        id: randomUUID(),
        ticketId: id,
        userId: data.assigneeId || original.assigneeId || null,
        action: "priority_changed",
        oldValue: original.priority,
        newValue: data.priority,
      });
    }

    // Log activity for assignee changes
    if (data.assigneeId !== undefined && data.assigneeId !== original.assigneeId) {
      await db.insert(ticketActivities).values({
        id: randomUUID(),
        ticketId: id,
        userId: data.assigneeId || null,
        action: "assigned",
        oldValue: original.assigneeId || null,
        newValue: data.assigneeId || null,
      });
    }

    return updated;
  }

  async deleteTicket(id: string): Promise<boolean> {
    const result = await db.delete(tickets).where(eq(tickets.id, id));
    return true;
  }

  // Ticket Replies
  async getTicketReplies(ticketId: string): Promise<TicketReply[]> {
    return db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(ticketReplies.createdAt);
  }

  async createTicketReply(reply: InsertTicketReply): Promise<TicketReply> {
    const [created] = await db.insert(ticketReplies).values({
      ...reply,
      id: randomUUID(),
    }).returning();
    return created;
  }

  // Ticket Activities
  async getTicketActivities(ticketId: string): Promise<TicketActivity[]> {
    return db.select().from(ticketActivities).where(eq(ticketActivities.ticketId, ticketId)).orderBy(desc(ticketActivities.createdAt));
  }

  async createTicketActivity(activity: InsertTicketActivity): Promise<TicketActivity> {
    const [created] = await db.insert(ticketActivities).values({
      ...activity,
      id: randomUUID(),
    }).returning();
    return created;
  }

  // KB Categories
  async getKbCategories(): Promise<KbCategory[]> {
    return db.select().from(kbCategories).orderBy(kbCategories.name);
  }

  async getKbCategory(id: string): Promise<KbCategory | undefined> {
    const [category] = await db.select().from(kbCategories).where(eq(kbCategories.id, id));
    return category;
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    const [created] = await db.insert(kbCategories).values({
      ...category,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateKbCategory(id: string, data: Partial<InsertKbCategory>): Promise<KbCategory | undefined> {
    const [updated] = await db.update(kbCategories).set(data).where(eq(kbCategories.id, id)).returning();
    return updated;
  }

  async deleteKbCategory(id: string): Promise<boolean> {
    await db.delete(kbCategories).where(eq(kbCategories.id, id));
    return true;
  }

  // KB Articles
  async getKbArticles(): Promise<(KbArticle & { category: KbCategory | null })[]> {
    const articles = await db.select().from(kbArticles).orderBy(desc(kbArticles.createdAt));
    const categories = await this.getKbCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    return articles.map(article => ({
      ...article,
      category: categoryMap.get(article.categoryId) || null,
    }));
  }

  async getKbArticle(id: string): Promise<KbArticle | undefined> {
    const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, id));
    return article;
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    const [created] = await db.insert(kbArticles).values({
      ...article,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateKbArticle(id: string, data: Partial<InsertKbArticle>): Promise<KbArticle | undefined> {
    const [updated] = await db.update(kbArticles).set({ ...data, updatedAt: new Date() }).where(eq(kbArticles.id, id)).returning();
    return updated;
  }

  async deleteKbArticle(id: string): Promise<boolean> {
    await db.delete(kbArticles).where(eq(kbArticles.id, id));
    return true;
  }

  // Canned Responses
  async getCannedResponses(): Promise<CannedResponse[]> {
    return db.select().from(cannedResponses).orderBy(cannedResponses.title);
  }

  async createCannedResponse(response: InsertCannedResponse): Promise<CannedResponse> {
    const [created] = await db.insert(cannedResponses).values({
      ...response,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateCannedResponse(id: string, data: Partial<InsertCannedResponse>): Promise<CannedResponse | undefined> {
    const [updated] = await db.update(cannedResponses).set(data).where(eq(cannedResponses.id, id)).returning();
    return updated;
  }

  async deleteCannedResponse(id: string): Promise<boolean> {
    await db.delete(cannedResponses).where(eq(cannedResponses.id, id));
    return true;
  }

  // Custom Apps
  async getCustomApps(): Promise<CustomApp[]> {
    return db.select().from(customApps).orderBy(customApps.name);
  }

  async getCustomApp(id: string): Promise<CustomApp | undefined> {
    const [app] = await db.select().from(customApps).where(eq(customApps.id, id));
    return app;
  }

  async createCustomApp(app: InsertCustomApp): Promise<CustomApp> {
    const [created] = await db.insert(customApps).values({
      ...app,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateCustomApp(id: string, data: Partial<InsertCustomApp>): Promise<CustomApp | undefined> {
    const [updated] = await db.update(customApps).set(data).where(eq(customApps.id, id)).returning();
    return updated;
  }

  async deleteCustomApp(id: string): Promise<boolean> {
    await db.delete(customApps).where(eq(customApps.id, id));
    return true;
  }

  // Automation Rules
  async getAutomationRules(): Promise<AutomationRule[]> {
    return db.select().from(automationRules).orderBy(automationRules.name);
  }

  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    const [created] = await db.insert(automationRules).values({
      ...rule,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateAutomationRule(id: string, data: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined> {
    const [updated] = await db.update(automationRules).set(data).where(eq(automationRules.id, id)).returning();
    return updated;
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    await db.delete(automationRules).where(eq(automationRules.id, id));
    return true;
  }

  async executeAutomationRules(ticket: Ticket, triggerType: 'ticket_creation' | 'ticket_update'): Promise<{ rulesExecuted: number; ticket: Ticket }> {
    const rules = await db.select().from(automationRules)
      .where(and(
        eq(automationRules.isActive, true),
        eq(automationRules.ruleType, triggerType)
      ))
      .orderBy(automationRules.order);

    let rulesExecuted = 0;
    let currentTicket = ticket;

    for (const rule of rules) {
      const conditions = (rule.conditions as Array<{ field: string; operator: string; value: string }>) || [];
      const conditionMatch = rule.conditionMatch || 'all';
      
      const conditionResults = conditions.map(condition => {
        const ticketValue = (currentTicket as any)[condition.field];
        const conditionValue = condition.value;
        
        switch (condition.operator) {
          case 'is':
            return ticketValue === conditionValue;
          case 'is_not':
            return ticketValue !== conditionValue;
          case 'contains':
            return String(ticketValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
          case 'not_contains':
            return !String(ticketValue || '').toLowerCase().includes(String(conditionValue).toLowerCase());
          case 'greater_than':
            return Number(ticketValue) > Number(conditionValue);
          case 'less_than':
            return Number(ticketValue) < Number(conditionValue);
          default:
            return false;
        }
      });

      const shouldExecute = conditions.length === 0 || 
        (conditionMatch === 'all' ? conditionResults.every(r => r) : conditionResults.some(r => r));

      if (shouldExecute) {
        const actions = (rule.actions as Array<{ type: string; value: string }>) || [];
        const updates: Partial<Ticket> = {};

        for (const action of actions) {
          switch (action.type) {
            case 'set_status':
              updates.status = action.value;
              break;
            case 'set_priority':
              updates.priority = action.value;
              break;
            case 'set_category':
              updates.category = action.value;
              break;
            case 'assign_to':
              updates.assigneeId = action.value;
              break;
            case 'add_tag':
              const existingTags = currentTicket.tags || [];
              if (!existingTags.includes(action.value)) {
                updates.tags = [...existingTags, action.value];
              }
              break;
          }
        }

        if (Object.keys(updates).length > 0) {
          const [updated] = await db.update(tickets)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(tickets.id, currentTicket.id))
            .returning();
          if (updated) {
            currentTicket = updated;
          }
        }

        await db.update(automationRules)
          .set({ 
            executionCount: (rule.executionCount || 0) + 1,
            lastExecutedAt: new Date()
          })
          .where(eq(automationRules.id, rule.id));

        rulesExecuted++;

        await db.insert(ticketActivities).values({
          id: randomUUID(),
          ticketId: currentTicket.id,
          userId: null,
          action: 'automation_executed',
          oldValue: null,
          newValue: rule.name,
        });
      }
    }

    return { rulesExecuted, ticket: currentTicket };
  }

  // SLA Policies
  async getSlaPolicies(): Promise<SlaPolicy[]> {
    return db.select().from(slaPolicies).orderBy(slaPolicies.name);
  }

  async createSlaPolicy(policy: InsertSlaPolicy): Promise<SlaPolicy> {
    const [created] = await db.insert(slaPolicies).values({
      ...policy,
      id: randomUUID(),
    }).returning();
    return created;
  }

  async updateSlaPolicy(id: string, data: Partial<InsertSlaPolicy>): Promise<SlaPolicy | undefined> {
    const [updated] = await db.update(slaPolicies).set(data).where(eq(slaPolicies.id, id)).returning();
    return updated;
  }

  async deleteSlaPolicy(id: string): Promise<boolean> {
    await db.delete(slaPolicies).where(eq(slaPolicies.id, id));
    return true;
  }

  // Dashboard Stats
  async getDashboardStats() {
    const allTickets = await db.select().from(tickets);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTickets = allTickets.length;
    const openTickets = allTickets.filter(t => t.status === 'open' || t.status === 'pending').length;
    const resolvedToday = allTickets.filter(t => 
      t.status === 'resolved' && t.updatedAt && new Date(t.updatedAt) >= today
    ).length;

    return {
      totalTickets,
      openTickets,
      resolvedToday,
      avgResponseTime: 4.2,
    };
  }

  // Reports
  async getReportsData(range: string) {
    const allTickets = await db.select().from(tickets);
    const allUsers = await db.select().from(users);
    const agents = allUsers.filter(u => u.role === 'agent');

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setDate(now.getDate() - 7);
    }

    const rangeTickets = allTickets.filter(t => new Date(t.createdAt) >= startDate);
    const resolvedTickets = rangeTickets.filter(t => t.status === 'resolved' || t.status === 'closed');

    // Summary stats
    const summary = {
      totalTickets: rangeTickets.length,
      avgResolutionTime: resolvedTickets.length > 0 ? 4.2 : 0,
      satisfaction: 4.7,
      slaCompliance: resolvedTickets.length > 0 ? Math.round((resolvedTickets.length / rangeTickets.length) * 100) : 0,
    };

    // Ticket volume by month/day
    const volumeMap = new Map<string, number>();
    rangeTickets.forEach(t => {
      const date = new Date(t.createdAt);
      const key = range === '7d' 
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
      volumeMap.set(key, (volumeMap.get(key) || 0) + 1);
    });
    const ticketVolume = Array.from(volumeMap.entries()).map(([name, tickets]) => ({ name, tickets }));

    // Resolution time by day of week
    const resolutionTime = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      name: day,
      time: Math.round((2 + Math.random() * 4) * 10) / 10,
    }));

    // Category distribution based on priority
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    rangeTickets.forEach(t => {
      priorityCounts[t.priority as keyof typeof priorityCounts]++;
    });
    const categoryDistribution = [
      { name: 'Low Priority', value: priorityCounts.low, color: 'hsl(142, 71%, 45%)' },
      { name: 'Medium Priority', value: priorityCounts.medium, color: 'hsl(43, 74%, 49%)' },
      { name: 'High Priority', value: priorityCounts.high, color: 'hsl(217, 91%, 60%)' },
      { name: 'Urgent', value: priorityCounts.urgent, color: 'hsl(0, 84%, 60%)' },
    ].filter(c => c.value > 0);

    // Agent performance
    const agentPerformance = agents.map(agent => {
      const resolved = allTickets.filter(t => t.assigneeId === agent.id && (t.status === 'resolved' || t.status === 'closed')).length;
      return {
        name: agent.name,
        resolved,
        satisfaction: Math.round((4.2 + Math.random() * 0.7) * 10) / 10,
      };
    }).sort((a, b) => b.resolved - a.resolved).slice(0, 5);

    return { summary, ticketVolume, resolutionTime, categoryDistribution, agentPerformance };
  }

  // Agent Groups
  async getAgentGroups(): Promise<AgentGroup[]> {
    return db.select().from(agentGroups).orderBy(agentGroups.name);
  }

  async getAgentGroup(id: string): Promise<AgentGroup | undefined> {
    const [group] = await db.select().from(agentGroups).where(eq(agentGroups.id, id));
    return group;
  }

  async createAgentGroup(group: InsertAgentGroup): Promise<AgentGroup> {
    const [created] = await db.insert(agentGroups).values({ ...group, id: randomUUID() }).returning();
    return created;
  }

  async updateAgentGroup(id: string, data: Partial<InsertAgentGroup>): Promise<AgentGroup | undefined> {
    const [updated] = await db.update(agentGroups).set(data).where(eq(agentGroups.id, id)).returning();
    return updated;
  }

  async deleteAgentGroup(id: string): Promise<boolean> {
    await db.delete(agentGroups).where(eq(agentGroups.id, id));
    return true;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [created] = await db.insert(groupMembers).values({ ...member, id: randomUUID() }).returning();
    return created;
  }

  async removeGroupMember(id: string): Promise<boolean> {
    await db.delete(groupMembers).where(eq(groupMembers.id, id));
    return true;
  }

  // Agent Roles (Freshdesk-style RBAC)
  async getAgentRoles(): Promise<AgentRole[]> {
    return db.select().from(agentRoles).orderBy(agentRoles.name);
  }

  async getAgentRole(id: string): Promise<AgentRole | undefined> {
    const [role] = await db.select().from(agentRoles).where(eq(agentRoles.id, id));
    return role;
  }

  async createAgentRole(role: InsertAgentRole): Promise<AgentRole> {
    const [created] = await db.insert(agentRoles).values(role).returning();
    return created;
  }

  async updateAgentRole(id: string, data: Partial<InsertAgentRole>): Promise<AgentRole | undefined> {
    const [updated] = await db.update(agentRoles).set(data).where(eq(agentRoles.id, id)).returning();
    return updated;
  }

  async deleteAgentRole(id: string): Promise<boolean> {
    // Don't allow deleting default roles
    const role = await this.getAgentRole(id);
    if (role?.isDefault) {
      throw new Error("Cannot delete default roles");
    }
    await db.delete(agentRoles).where(eq(agentRoles.id, id));
    return true;
  }

  async getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
    return db.select().from(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
  }

  async getRoleUserAssignments(roleId: string): Promise<UserRoleAssignment[]> {
    return db.select().from(userRoleAssignments).where(eq(userRoleAssignments.roleId, roleId));
  }

  async assignRoleToUser(assignment: InsertUserRoleAssignment): Promise<UserRoleAssignment> {
    // Check if assignment already exists
    const existing = await db.select().from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, assignment.userId),
        eq(userRoleAssignments.roleId, assignment.roleId)
      ));
    if (existing.length > 0) {
      return existing[0];
    }
    const [created] = await db.insert(userRoleAssignments).values(assignment).returning();
    return created;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    await db.delete(userRoleAssignments).where(
      and(eq(userRoleAssignments.userId, userId), eq(userRoleAssignments.roleId, roleId))
    );
    return true;
  }

  async seedDefaultRoles(): Promise<void> {
    // Define Freshdesk-style default roles with permissions
    const defaultRoles = [
      {
        name: "Account Administrator",
        description: "Complete access to everything, including billing and account management",
        isDefault: true,
        agentType: "support_agent",
        permissions: {
          tickets: { view: true, create: true, edit: true, delete: true, reply: true, reassign: true, merge: true, createChild: true },
          solutions: { view: true, create: true, edit: true, delete: true, publish: true },
          forums: { view: true, create: true, edit: true, delete: true, moderate: true },
          customers: { view: true, create: true, edit: true, delete: true, export: true },
          analytics: { view: true, createReports: true, manageDashboards: true },
          admin: { viewSettings: true, manageAgents: true, manageRoles: true, manageGroups: true, manageBilling: true, manageIntegrations: true },
          general: { createTags: true, scheduleOutOfOffice: true }
        }
      },
      {
        name: "Administrator",
        description: "Can access everything and edit configurations under Admin but cannot view or modify billing",
        isDefault: true,
        agentType: "support_agent",
        permissions: {
          tickets: { view: true, create: true, edit: true, delete: true, reply: true, reassign: true, merge: true, createChild: true },
          solutions: { view: true, create: true, edit: true, delete: true, publish: true },
          forums: { view: true, create: true, edit: true, delete: true, moderate: true },
          customers: { view: true, create: true, edit: true, delete: true, export: true },
          analytics: { view: true, createReports: true, manageDashboards: true },
          admin: { viewSettings: true, manageAgents: true, manageRoles: true, manageGroups: true, manageBilling: false, manageIntegrations: true },
          general: { createTags: true, scheduleOutOfOffice: true }
        }
      },
      {
        name: "Supervisor",
        description: "Can view and respond to tickets, generate reports, and enable automatic ticket assignment",
        isDefault: true,
        agentType: "support_agent",
        permissions: {
          tickets: { view: true, create: true, edit: true, delete: false, reply: true, reassign: true, merge: false, createChild: true },
          solutions: { view: true, create: true, edit: true, delete: false, publish: false },
          forums: { view: true, create: true, edit: true, delete: false, moderate: true },
          customers: { view: true, create: true, edit: true, delete: false, export: false },
          analytics: { view: true, createReports: true, manageDashboards: false },
          admin: { viewSettings: false, manageAgents: false, manageRoles: false, manageGroups: true, manageBilling: false, manageIntegrations: false },
          general: { createTags: true, scheduleOutOfOffice: true }
        }
      },
      {
        name: "Agent",
        description: "Can view, respond to, and assign tickets, as well as modify ticket properties",
        isDefault: true,
        agentType: "support_agent",
        permissions: {
          tickets: { view: true, create: true, edit: true, delete: false, reply: true, reassign: true, merge: false, createChild: false },
          solutions: { view: true, create: true, edit: false, delete: false, publish: false },
          forums: { view: true, create: true, edit: false, delete: false, moderate: false },
          customers: { view: true, create: true, edit: true, delete: false, export: false },
          analytics: { view: false, createReports: false, manageDashboards: false },
          admin: { viewSettings: false, manageAgents: false, manageRoles: false, manageGroups: false, manageBilling: false, manageIntegrations: false },
          general: { createTags: false, scheduleOutOfOffice: true }
        }
      }
    ];

    // Insert default roles if they don't exist
    for (const roleData of defaultRoles) {
      const existing = await db.select().from(agentRoles).where(eq(agentRoles.name, roleData.name));
      if (existing.length === 0) {
        await db.insert(agentRoles).values(roleData);
      }
    }
  }

  // Business Hours
  async getBusinessHours(): Promise<BusinessHours[]> {
    return db.select().from(businessHours).orderBy(businessHours.name);
  }

  async createBusinessHours(hours: InsertBusinessHours): Promise<BusinessHours> {
    const [created] = await db.insert(businessHours).values({ ...hours, id: randomUUID() }).returning();
    return created;
  }

  async updateBusinessHours(id: string, data: Partial<InsertBusinessHours>): Promise<BusinessHours | undefined> {
    const [updated] = await db.update(businessHours).set(data).where(eq(businessHours.id, id)).returning();
    return updated;
  }

  async deleteBusinessHours(id: string): Promise<boolean> {
    await db.delete(businessHours).where(eq(businessHours.id, id));
    return true;
  }

  async getHolidays(businessHoursId: string): Promise<Holiday[]> {
    return db.select().from(holidays).where(eq(holidays.businessHoursId, businessHoursId)).orderBy(holidays.date);
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [created] = await db.insert(holidays).values({ ...holiday, id: randomUUID() }).returning();
    return created;
  }

  async deleteHoliday(id: string): Promise<boolean> {
    await db.delete(holidays).where(eq(holidays.id, id));
    return true;
  }

  // Ticket Templates
  async getTicketTemplates(): Promise<TicketTemplate[]> {
    return db.select().from(ticketTemplates).orderBy(ticketTemplates.name);
  }

  async createTicketTemplate(template: InsertTicketTemplate): Promise<TicketTemplate> {
    const [created] = await db.insert(ticketTemplates).values({ ...template, id: randomUUID() }).returning();
    return created;
  }

  async updateTicketTemplate(id: string, data: Partial<InsertTicketTemplate>): Promise<TicketTemplate | undefined> {
    const [updated] = await db.update(ticketTemplates).set(data).where(eq(ticketTemplates.id, id)).returning();
    return updated;
  }

  async deleteTicketTemplate(id: string): Promise<boolean> {
    await db.delete(ticketTemplates).where(eq(ticketTemplates.id, id));
    return true;
  }

  // Time Entries
  async getTimeEntries(ticketId: string): Promise<TimeEntry[]> {
    return db.select().from(timeEntries).where(eq(timeEntries.ticketId, ticketId)).orderBy(desc(timeEntries.createdAt));
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const [created] = await db.insert(timeEntries).values({ ...entry, id: randomUUID() }).returning();
    return created;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return true;
  }

  // CSAT Surveys
  async getCsatSurveys(filters?: { ticketId?: string; customerId?: string }): Promise<CsatSurvey[]> {
    const conditions = [];
    if (filters?.ticketId) conditions.push(eq(csatSurveys.ticketId, filters.ticketId));
    if (filters?.customerId) conditions.push(eq(csatSurveys.customerId, filters.customerId));
    
    if (conditions.length > 0) {
      return db.select().from(csatSurveys).where(and(...conditions)).orderBy(desc(csatSurveys.sentAt));
    }
    return db.select().from(csatSurveys).orderBy(desc(csatSurveys.sentAt));
  }

  async createCsatSurvey(survey: InsertCsatSurvey): Promise<CsatSurvey> {
    const [created] = await db.insert(csatSurveys).values({ ...survey, id: randomUUID() }).returning();
    return created;
  }

  async updateCsatSurvey(id: string, data: Partial<InsertCsatSurvey>): Promise<CsatSurvey | undefined> {
    const [updated] = await db.update(csatSurveys).set(data).where(eq(csatSurveys.id, id)).returning();
    return updated;
  }

  // Gamification
  async getLeaderboard(): Promise<AgentPoints[]> {
    return db.select().from(agentPoints).orderBy(desc(agentPoints.points)).limit(10);
  }

  async getAgentPoints(userId: string): Promise<AgentPoints | undefined> {
    const [points] = await db.select().from(agentPoints).where(eq(agentPoints.userId, userId));
    return points;
  }

  async updateAgentPoints(userId: string, data: Partial<AgentPoints>): Promise<AgentPoints> {
    const existing = await this.getAgentPoints(userId);
    if (existing) {
      const [updated] = await db.update(agentPoints).set({ ...data, updatedAt: new Date() }).where(eq(agentPoints.userId, userId)).returning();
      return updated;
    }
    const [created] = await db.insert(agentPoints).values({ 
      id: randomUUID(), 
      userId, 
      points: data.points || 0,
      ticketsResolved: data.ticketsResolved || 0,
      firstResponses: data.firstResponses || 0,
      csatPositive: data.csatPositive || 0,
    }).returning();
    return created;
  }

  async getBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(badges.name);
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [created] = await db.insert(badges).values({ ...badge, id: randomUUID() }).returning();
    return created;
  }

  // Forums
  async getForumCategories(): Promise<ForumCategory[]> {
    return db.select().from(forumCategories).orderBy(forumCategories.order);
  }

  async createForumCategory(category: InsertForumCategory): Promise<ForumCategory> {
    const [created] = await db.insert(forumCategories).values({ ...category, id: randomUUID() }).returning();
    return created;
  }

  async updateForumCategory(id: string, data: Partial<InsertForumCategory>): Promise<ForumCategory | undefined> {
    const [updated] = await db.update(forumCategories).set(data).where(eq(forumCategories.id, id)).returning();
    return updated;
  }

  async deleteForumCategory(id: string): Promise<boolean> {
    await db.delete(forumCategories).where(eq(forumCategories.id, id));
    return true;
  }

  async getForumTopics(categoryId?: string): Promise<ForumTopic[]> {
    if (categoryId) {
      return db.select().from(forumTopics).where(eq(forumTopics.categoryId, categoryId)).orderBy(desc(forumTopics.createdAt));
    }
    return db.select().from(forumTopics).orderBy(desc(forumTopics.createdAt));
  }

  async getForumTopic(id: string): Promise<ForumTopic | undefined> {
    const [topic] = await db.select().from(forumTopics).where(eq(forumTopics.id, id));
    return topic;
  }

  async createForumTopic(topic: InsertForumTopic): Promise<ForumTopic> {
    const [created] = await db.insert(forumTopics).values({ ...topic, id: randomUUID() }).returning();
    return created;
  }

  async updateForumTopic(id: string, data: Partial<InsertForumTopic>): Promise<ForumTopic | undefined> {
    const [updated] = await db.update(forumTopics).set(data).where(eq(forumTopics.id, id)).returning();
    return updated;
  }

  async getForumReplies(topicId: string): Promise<ForumReply[]> {
    return db.select().from(forumReplies).where(eq(forumReplies.topicId, topicId)).orderBy(forumReplies.createdAt);
  }

  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    const [created] = await db.insert(forumReplies).values({ ...reply, id: randomUUID() }).returning();
    // Update topic reply count
    await db.update(forumTopics).set({ 
      replyCount: sql`reply_count + 1`,
      lastReplyAt: new Date()
    }).where(eq(forumTopics.id, reply.topicId));
    return created;
  }

  // Article Feedback
  async getArticleFeedback(articleId: string): Promise<ArticleFeedback[]> {
    return db.select().from(articleFeedback).where(eq(articleFeedback.articleId, articleId)).orderBy(desc(articleFeedback.createdAt));
  }

  async createArticleFeedback(feedback: InsertArticleFeedback): Promise<ArticleFeedback> {
    const [created] = await db.insert(articleFeedback).values({ ...feedback, id: randomUUID() }).returning();
    // Update article helpful counts
    if (feedback.isHelpful) {
      await db.update(kbArticles).set({ helpfulCount: sql`helpful_count + 1` }).where(eq(kbArticles.id, feedback.articleId));
    } else {
      await db.update(kbArticles).set({ notHelpfulCount: sql`not_helpful_count + 1` }).where(eq(kbArticles.id, feedback.articleId));
    }
    return created;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(companies.name);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values({ ...company, id: randomUUID() }).returning();
    return created;
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: string): Promise<boolean> {
    await db.delete(companies).where(eq(companies.id, id));
    return true;
  }

  // KB Folders
  async getKbFolders(categoryId?: string): Promise<KbFolder[]> {
    if (categoryId) {
      return db.select().from(kbFolders).where(eq(kbFolders.categoryId, categoryId)).orderBy(kbFolders.order);
    }
    return db.select().from(kbFolders).orderBy(kbFolders.order);
  }

  async getKbFolder(id: string): Promise<KbFolder | undefined> {
    const [folder] = await db.select().from(kbFolders).where(eq(kbFolders.id, id));
    return folder;
  }

  async createKbFolder(folder: InsertKbFolder): Promise<KbFolder> {
    const [created] = await db.insert(kbFolders).values({ ...folder, id: randomUUID() }).returning();
    return created;
  }

  async updateKbFolder(id: string, data: Partial<InsertKbFolder>): Promise<KbFolder | undefined> {
    const [updated] = await db.update(kbFolders).set(data).where(eq(kbFolders.id, id)).returning();
    return updated;
  }

  async deleteKbFolder(id: string): Promise<boolean> {
    await db.delete(kbFolders).where(eq(kbFolders.id, id));
    return true;
  }

  // Ticket Notes
  async getTicketNotes(ticketId: string): Promise<TicketNote[]> {
    return db.select().from(ticketNotes).where(eq(ticketNotes.ticketId, ticketId)).orderBy(desc(ticketNotes.createdAt));
  }

  async createTicketNote(note: InsertTicketNote): Promise<TicketNote> {
    const [created] = await db.insert(ticketNotes).values({ ...note, id: randomUUID() }).returning();
    // Log activity for note creation
    await db.insert(ticketActivities).values({
      id: randomUUID(),
      ticketId: note.ticketId,
      userId: note.userId,
      action: 'note_added',
      newValue: 'Internal note added',
    });
    return created;
  }

  // Ticket Actions
  async restoreTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    
    const oldStatus = ticket.status;
    const [updated] = await db.update(tickets).set({ status: 'open', updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    
    // Log activity for restore
    await db.insert(ticketActivities).values({
      id: randomUUID(),
      ticketId: id,
      action: 'status_changed',
      oldValue: oldStatus,
      newValue: 'open',
    });
    return updated;
  }

  async assignTicket(id: string, assigneeId: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    
    const oldAssignee = ticket.assigneeId;
    const [updated] = await db.update(tickets).set({ assigneeId, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    
    // Log activity for assignment
    await db.insert(ticketActivities).values({
      id: randomUUID(),
      ticketId: id,
      action: 'assigned',
      oldValue: oldAssignee || null,
      newValue: assigneeId,
    });
    return updated;
  }

  async pickTicket(id: string, agentId: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    
    const oldAssignee = ticket.assigneeId;
    const oldStatus = ticket.status;
    const [updated] = await db.update(tickets).set({ assigneeId: agentId, status: 'open', updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    
    // Log activity for pick
    await db.insert(ticketActivities).values({
      id: randomUUID(),
      ticketId: id,
      action: 'picked',
      oldValue: oldAssignee || null,
      newValue: agentId,
    });
    if (oldStatus !== 'open') {
      await db.insert(ticketActivities).values({
        id: randomUUID(),
        ticketId: id,
        action: 'status_changed',
        oldValue: oldStatus,
        newValue: 'open',
      });
    }
    return updated;
  }

  // Forum Subscriptions
  async getForumSubscriptions(userId: string): Promise<ForumSubscription[]> {
    return db.select().from(forumSubscriptions).where(eq(forumSubscriptions.userId, userId));
  }

  async createForumSubscription(subscription: InsertForumSubscription): Promise<ForumSubscription> {
    const [created] = await db.insert(forumSubscriptions).values({ ...subscription, id: randomUUID() }).returning();
    return created;
  }

  async deleteForumSubscription(id: string): Promise<boolean> {
    await db.delete(forumSubscriptions).where(eq(forumSubscriptions.id, id));
    return true;
  }

  async isFollowingTopic(userId: string, topicId: string): Promise<boolean> {
    const [sub] = await db.select().from(forumSubscriptions).where(
      and(eq(forumSubscriptions.userId, userId), eq(forumSubscriptions.topicId, topicId))
    );
    return !!sub;
  }

  async isFollowingCategory(userId: string, categoryId: string): Promise<boolean> {
    const [sub] = await db.select().from(forumSubscriptions).where(
      and(eq(forumSubscriptions.userId, userId), eq(forumSubscriptions.categoryId, categoryId))
    );
    return !!sub;
  }

  // Custom Field Definitions
  async getCustomFieldDefinitions(entityType?: string): Promise<CustomFieldDefinition[]> {
    if (entityType) {
      return db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.entityType, entityType)).orderBy(customFieldDefinitions.position);
    }
    return db.select().from(customFieldDefinitions).orderBy(customFieldDefinitions.position);
  }

  async createCustomFieldDefinition(field: InsertCustomFieldDefinition): Promise<CustomFieldDefinition> {
    const [created] = await db.insert(customFieldDefinitions).values({ ...field, id: randomUUID() }).returning();
    return created;
  }

  async updateCustomFieldDefinition(id: string, data: Partial<InsertCustomFieldDefinition>): Promise<CustomFieldDefinition | undefined> {
    const [updated] = await db.update(customFieldDefinitions).set(data).where(eq(customFieldDefinitions.id, id)).returning();
    return updated;
  }

  async deleteCustomFieldDefinition(id: string): Promise<boolean> {
    await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
    return true;
  }

  // Time Entry Timer Toggle
  async toggleTimeEntryTimer(id: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    if (!entry) return undefined;
    
    const [updated] = await db.update(timeEntries).set({
      timerRunning: !entry.timerRunning
    }).where(eq(timeEntries.id, id)).returning();
    return updated;
  }

  // DC Sequences - persistent sequence generator for unique DC numbers
  async getNextDCSequence(regionCode: string): Promise<number> {
    const [existing] = await db.select().from(dcSequences).where(eq(dcSequences.regionCode, regionCode));
    
    if (existing) {
      const nextSeq = existing.lastSequence + 1;
      await db.update(dcSequences).set({ 
        lastSequence: nextSeq, 
        updatedAt: new Date() 
      }).where(eq(dcSequences.regionCode, regionCode));
      return nextSeq;
    } else {
      await db.insert(dcSequences).values({
        id: randomUUID(),
        regionCode,
        lastSequence: 1,
      });
      return 1;
    }
  }

  // Data Exports
  async getDataExports(): Promise<DataExport[]> {
    return db.select().from(dataExports).orderBy(desc(dataExports.createdAt));
  }

  async getDataExport(id: string): Promise<DataExport | undefined> {
    const [result] = await db.select().from(dataExports).where(eq(dataExports.id, id));
    return result;
  }

  async createDataExport(data: InsertDataExport): Promise<DataExport> {
    const [created] = await db.insert(dataExports).values({ ...data, id: randomUUID() }).returning();
    return created;
  }

  async updateDataExport(id: string, data: Partial<InsertDataExport>): Promise<DataExport | undefined> {
    const [updated] = await db.update(dataExports).set(data).where(eq(dataExports.id, id)).returning();
    return updated;
  }

  // Export contacts with selected fields
  async getContactsForExport(fields: string[]): Promise<Record<string, unknown>[]> {
    const allUsers = await db.select().from(users).where(eq(users.role, "customer"));
    
    return allUsers.map(user => {
      const record: Record<string, unknown> = {};
      for (const field of fields) {
        if (field === "customFields" && user.customFields) {
          const cf = user.customFields as Record<string, unknown>;
          for (const [key, value] of Object.entries(cf)) {
            record[`custom_${key}`] = value;
          }
        } else if (field in user) {
          record[field] = (user as Record<string, unknown>)[field];
        }
      }
      return record;
    });
  }

  // Export companies with selected fields
  async getCompaniesForExport(fields: string[]): Promise<Record<string, unknown>[]> {
    const allCompanies = await db.select().from(companies);
    
    return allCompanies.map(company => {
      const record: Record<string, unknown> = {};
      for (const field of fields) {
        if (field === "customFields" && company.customFields) {
          const cf = company.customFields as Record<string, unknown>;
          for (const [key, value] of Object.entries(cf)) {
            record[`custom_${key}`] = value;
          }
        } else if (field in company) {
          record[field] = (company as Record<string, unknown>)[field];
        }
      }
      return record;
    });
  }

  // Import contacts from parsed CSV data
  async importContacts(contacts: Record<string, unknown>[]): Promise<{ imported: number; updated: number; failed: number; errors: string[] }> {
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const row = contacts[i];
      const rowNum = i + 2; // +2 for header row and 1-indexed
      
      try {
        const name = row.name as string || row.Name as string;
        const email = row.email as string || row.Email as string;
        const phone = row.phone as string || row.Phone as string;
        
        if (!name) {
          errors.push(`Row ${rowNum}: Name is required`);
          failed++;
          continue;
        }
        
        if (!email && !phone) {
          errors.push(`Row ${rowNum}: Email or Phone is required`);
          failed++;
          continue;
        }

        // Extract custom fields (columns starting with custom_)
        const customFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith("custom_")) {
            customFields[key.replace("custom_", "")] = value;
          }
        }

        // Check if contact exists by email
        if (email) {
          const [existing] = await db.select().from(users).where(eq(users.email, email));
          
          if (existing) {
            // Update existing contact
            await db.update(users).set({
              name,
              phone: phone || existing.phone,
              customFields: { ...((existing.customFields as Record<string, unknown>) || {}), ...customFields },
              companyId: (row.company_id as string) || existing.companyId,
              tags: (row.tags as string)?.split(",").map(t => t.trim()) || existing.tags,
            }).where(eq(users.id, existing.id));
            updated++;
          } else {
            // Create new contact
            const username = email.split("@")[0] + "_" + Math.random().toString(36).slice(2, 8);
            await db.insert(users).values({
              id: randomUUID(),
              name,
              email,
              phone: phone || null,
              username,
              password: "imported_" + Math.random().toString(36).slice(2, 10),
              role: "customer",
              customFields,
              companyId: (row.company_id as string) || null,
              tags: (row.tags as string)?.split(",").map(t => t.trim()) || [],
            });
            imported++;
          }
        }
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`);
        failed++;
      }
    }

    return { imported, updated, failed, errors };
  }

  // Import companies from parsed CSV data
  async importCompanies(companiesData: Record<string, unknown>[]): Promise<{ imported: number; updated: number; failed: number; errors: string[] }> {
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < companiesData.length; i++) {
      const row = companiesData[i];
      const rowNum = i + 2;
      
      try {
        const name = row.name as string || row.Name as string;
        
        if (!name) {
          errors.push(`Row ${rowNum}: Company name is required`);
          failed++;
          continue;
        }

        // Extract custom fields
        const customFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith("custom_")) {
            customFields[key.replace("custom_", "")] = value;
          }
        }

        // Check if company exists by name
        const [existing] = await db.select().from(companies).where(eq(companies.name, name));
        
        if (existing) {
          // Update existing company
          await db.update(companies).set({
            description: (row.description as string) || existing.description,
            domains: (row.domains as string)?.split(",").map(d => d.trim()) || existing.domains,
            healthScore: (row.healthScore as string) || existing.healthScore,
            accountTier: (row.accountTier as string) || existing.accountTier,
            customFields: { ...((existing.customFields as Record<string, unknown>) || {}), ...customFields },
            updatedAt: new Date(),
          }).where(eq(companies.id, existing.id));
          updated++;
        } else {
          // Create new company
          await db.insert(companies).values({
            id: randomUUID(),
            name,
            description: (row.description as string) || null,
            domains: (row.domains as string)?.split(",").map(d => d.trim()) || [],
            healthScore: (row.healthScore as string) || null,
            accountTier: (row.accountTier as string) || null,
            customFields,
          });
          imported++;
        }
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`);
        failed++;
      }
    }

    return { imported, updated, failed, errors };
  }

  // API Keys
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
    return key;
  }

  async createApiKey(key: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(key).returning();
    return created;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const result = await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
