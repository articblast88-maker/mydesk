import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";

// Helper to generate a secure random API key
function generateApiKey(): string {
  return `hd_${randomBytes(32).toString("hex")}`;
}

// Helper to hash an API key for secure storage
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// Helper to get the prefix of an API key for display
function getKeyPrefix(key: string): string {
  return key.slice(0, 12); // "hd_" + first 8 chars
}
import {
  insertTicketSchema, insertUserSchema, insertTicketReplySchema,
  insertKbCategorySchema, insertKbArticleSchema, insertCannedResponseSchema,
  insertCustomAppSchema, insertAutomationRuleSchema, insertSlaPolicySchema,
  insertAgentGroupSchema, insertGroupMemberSchema, insertBusinessHoursSchema,
  insertHolidaySchema, insertTicketTemplateSchema, insertTimeEntrySchema,
  insertCsatSurveySchema, insertBadgeSchema, insertForumCategorySchema,
  insertForumTopicSchema, insertForumReplySchema, insertArticleFeedbackSchema,
  insertCompanySchema, insertKbFolderSchema, insertTicketNoteSchema,
  insertForumSubscriptionSchema, insertCustomFieldDefinitionSchema,
  updateUserSchema, updateAutomationRuleSchema,
} from "@shared/schema";

const updateCompanySchema = insertCompanySchema.partial();
const updateKbFolderSchema = insertKbFolderSchema.partial();
const updateCustomFieldDefinitionSchema = insertCustomFieldDefinitionSchema.partial();

const updateAgentGroupSchema = insertAgentGroupSchema.partial();
const updateBusinessHoursSchema = insertBusinessHoursSchema.partial();
const updateTicketTemplateSchema = insertTicketTemplateSchema.partial();
const updateForumCategorySchema = insertForumCategorySchema.partial();
const updateForumTopicSchema = insertForumTopicSchema.partial();
const updateTicketSchema = insertTicketSchema.partial();
const updateKbCategorySchema = insertKbCategorySchema.partial();
const updateKbArticleSchema = insertKbArticleSchema.partial();
const updateCannedResponseSchema = insertCannedResponseSchema.partial();
const updateCustomAppSchema = insertCustomAppSchema.partial();
const updateSlaPolicySchema = insertSlaPolicySchema.partial();
const updateCsatSurveySchema = insertCsatSurveySchema.partial();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Helper to strip password from user objects
  const sanitizeUser = (user: any) => {
    if (!user) return user;
    const { password, ...safeUser } = user;
    return safeUser;
  };

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.getUsers(role);
      res.json(users.map(sanitizeUser));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const validatedData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(req.params.id, validatedData);
      res.json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Portal Authentication - Customer self-signup and login
  const portalSignupSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  });

  const portalLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post("/api/portal/signup", async (req, res) => {
    try {
      const data = portalSignupSchema.parse(req.body);
      
      // Check if email already exists
      const existingUsers = await storage.getUsers();
      const emailExists = existingUsers.some(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (emailExists) {
        return res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
      }
      
      // Generate unique username with retry logic
      const baseUsername = data.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      let username = baseUsername;
      let attempts = 0;
      while (existingUsers.some(u => u.username === username) && attempts < 10) {
        username = baseUsername + Math.floor(Math.random() * 10000);
        attempts++;
      }
      if (existingUsers.some(u => u.username === username)) {
        username = baseUsername + Date.now();
      }
      
      // Hash password with bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);
      
      // Create customer with hashed password
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        username,
        password: hashedPassword,
        role: "customer",
      });
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/portal/login", async (req, res) => {
    try {
      const data = portalLoginSchema.parse(req.body);
      
      // Find user by email
      const users = await storage.getUsers("customer");
      const user = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      
      // Empty password means admin-created customer who hasn't registered yet
      if (!user || !user.password || user.password === "") {
        return res.status(401).json({ error: "Invalid email or password. If you're a new customer, please sign up first." });
      }
      
      // Compare password with bcrypt (only works for hashed passwords, not empty ones)
      try {
        const isValidPassword = await bcrypt.compare(data.password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
      } catch {
        // If bcrypt fails (e.g., invalid hash format), treat as invalid password
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Tickets
  app.get("/api/tickets", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const filters = {
        status: status && status !== "all" ? status : undefined,
        priority: priority && priority !== "all" ? priority : undefined,
        assigneeId: req.query.assigneeId as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const tickets = await storage.getTickets(filters);
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      const data = insertTicketSchema.parse(req.body);
      let ticket = await storage.createTicket(data);
      
      // Execute automation rules for ticket creation
      try {
        const { ticket: updatedTicket, rulesExecuted } = await storage.executeAutomationRules(ticket, 'ticket_creation');
        ticket = updatedTicket;
        if (rulesExecuted > 0) {
          console.log(`Executed ${rulesExecuted} automation rule(s) for ticket ${ticket.id}`);
        }
      } catch (automationError) {
        console.error("Automation execution failed:", automationError);
        // Continue without failing the ticket creation
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.patch("/api/tickets/:id", async (req, res) => {
    try {
      const data = updateTicketSchema.parse(req.body);
      
      // Validate groupId if provided
      if (data.groupId) {
        const group = await storage.getAgentGroup(data.groupId);
        if (!group) {
          return res.status(400).json({ error: "Invalid group ID - group does not exist" });
        }
      }
      
      let ticket = await storage.updateTicket(req.params.id, data);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      // Execute automation rules for ticket update
      try {
        const { ticket: updatedTicket, rulesExecuted } = await storage.executeAutomationRules(ticket, 'ticket_update');
        ticket = updatedTicket;
        if (rulesExecuted > 0) {
          console.log(`Executed ${rulesExecuted} automation rule(s) for ticket update ${ticket.id}`);
        }
      } catch (automationError) {
        console.error("Automation execution failed:", automationError);
        // Continue without failing the ticket update
      }
      
      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.delete("/api/tickets/:id", async (req, res) => {
    try {
      await storage.deleteTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  // Ticket Replies
  app.get("/api/tickets/:id/replies", async (req, res) => {
    try {
      const replies = await storage.getTicketReplies(req.params.id);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch replies" });
    }
  });

  app.post("/api/tickets/:id/replies", async (req, res) => {
    try {
      const data = insertTicketReplySchema.parse({
        ...req.body,
        ticketId: req.params.id,
      });
      const reply = await storage.createTicketReply(data);
      res.status(201).json(reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  // Ticket Activities
  app.get("/api/tickets/:id/activities", async (req, res) => {
    try {
      const activities = await storage.getTicketActivities(req.params.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // KB Categories
  app.get("/api/kb/categories", async (req, res) => {
    try {
      const categories = await storage.getKbCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/kb/categories", async (req, res) => {
    try {
      const data = insertKbCategorySchema.parse(req.body);
      const category = await storage.createKbCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/kb/categories/:id", async (req, res) => {
    try {
      const data = updateKbCategorySchema.parse(req.body);
      const category = await storage.updateKbCategory(req.params.id, data);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/kb/categories/:id", async (req, res) => {
    try {
      await storage.deleteKbCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // KB Articles
  app.get("/api/kb/articles", async (req, res) => {
    try {
      const articles = await storage.getKbArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/kb/articles/:id", async (req, res) => {
    try {
      const article = await storage.getKbArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.post("/api/kb/articles", async (req, res) => {
    try {
      const data = insertKbArticleSchema.parse(req.body);
      const article = await storage.createKbArticle(data);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  app.patch("/api/kb/articles/:id", async (req, res) => {
    try {
      const data = updateKbArticleSchema.parse(req.body);
      const article = await storage.updateKbArticle(req.params.id, data);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  app.delete("/api/kb/articles/:id", async (req, res) => {
    try {
      await storage.deleteKbArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  // Canned Responses
  app.get("/api/canned-responses", async (req, res) => {
    try {
      const responses = await storage.getCannedResponses();
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch canned responses" });
    }
  });

  app.post("/api/canned-responses", async (req, res) => {
    try {
      const data = insertCannedResponseSchema.parse(req.body);
      const response = await storage.createCannedResponse(data);
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create canned response" });
    }
  });

  app.patch("/api/canned-responses/:id", async (req, res) => {
    try {
      const data = updateCannedResponseSchema.parse(req.body);
      const response = await storage.updateCannedResponse(req.params.id, data);
      if (!response) {
        return res.status(404).json({ error: "Canned response not found" });
      }
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update canned response" });
    }
  });

  app.delete("/api/canned-responses/:id", async (req, res) => {
    try {
      await storage.deleteCannedResponse(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete canned response" });
    }
  });

  // Custom Apps
  app.get("/api/custom-apps", async (req, res) => {
    try {
      const apps = await storage.getCustomApps();
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom apps" });
    }
  });

  app.get("/api/custom-apps/:id", async (req, res) => {
    try {
      const app = await storage.getCustomApp(req.params.id);
      if (!app) {
        return res.status(404).json({ error: "Custom app not found" });
      }
      res.json(app);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom app" });
    }
  });

  app.post("/api/custom-apps", async (req, res) => {
    try {
      const data = insertCustomAppSchema.parse(req.body);
      const app = await storage.createCustomApp(data);
      res.status(201).json(app);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create custom app" });
    }
  });

  app.patch("/api/custom-apps/:id", async (req, res) => {
    try {
      const data = updateCustomAppSchema.parse(req.body);
      const customApp = await storage.updateCustomApp(req.params.id, data);
      if (!customApp) {
        return res.status(404).json({ error: "Custom app not found" });
      }
      res.json(customApp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update custom app" });
    }
  });

  app.delete("/api/custom-apps/:id", async (req, res) => {
    try {
      await storage.deleteCustomApp(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom app" });
    }
  });

  // Download custom app script
  app.get("/api/custom-apps/:id/script", async (req, res) => {
    try {
      const app = await storage.getCustomApp(req.params.id);
      if (!app) {
        return res.status(404).json({ error: "Custom app not found" });
      }
      if (!app.scriptContent) {
        return res.status(404).json({ error: "No script content available for this app" });
      }
      
      const fileName = app.scriptFileName || `${app.name.toLowerCase().replace(/\s+/g, '-')}-script.js`;
      res.setHeader("Content-Type", "text/javascript");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(app.scriptContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to download script" });
    }
  });

  // DC Generation (Delivery Challan) - Custom App Integration
  const dcSequenceSchema = z.object({
    regionCode: z.string().optional().default("DC"),
  });

  const dcGenerateSchema = z.object({
    ticketId: z.string().min(1, "Ticket ID is required"),
    dcNumber: z.string().min(1, "DC Number is required"),
    dtCode: z.string().optional().default(""),
    dtName: z.string().optional().default(""),
    assets: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(""),
  });
  
  app.post("/api/dc/generate-sequence", async (req, res) => {
    try {
      const { regionCode } = dcSequenceSchema.parse(req.body);
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const sequence = await storage.getNextDCSequence(regionCode);
      const sequenceNumber = `${regionCode}-${timestamp}-${String(sequence).padStart(6, "0")}`;
      res.json({ sequenceNumber });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to generate sequence number" });
    }
  });

  app.post("/api/dc/generate", async (req, res) => {
    try {
      const validatedData = dcGenerateSchema.parse(req.body);
      const { ticketId, dcNumber, dtCode, dtName, assets, notes } = validatedData;
      
      // Get the ticket
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Update ticket with DC info in customFields
      const existingCustomFields = (ticket.customFields as Record<string, unknown>) || {};
      const updatedCustomFields = {
        ...existingCustomFields,
        dc_status: "Generated",
        dc_number: dcNumber,
        dc_submitted_date: new Date().toISOString(),
        dt_code: dtCode,
        dt_name: dtName,
        dc_assets: assets,
        dc_notes: notes,
      };

      const updatedTicket = await storage.updateTicket(ticketId, {
        customFields: updatedCustomFields,
      });

      // Create activity log
      await storage.createTicketActivity({
        ticketId,
        userId: ticket.assigneeId || ticket.customerId,
        action: "dc_generated",
        newValue: dcNumber,
      });

      res.json({ 
        success: true, 
        dcNumber,
        ticket: updatedTicket 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("DC generation error:", error);
      res.status(500).json({ error: "Failed to generate DC" });
    }
  });

  app.get("/api/dc/status/:ticketId", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const customFields = (ticket.customFields as Record<string, unknown>) || {};
      res.json({
        dcStatus: customFields.dc_status || "Not Generated",
        dcNumber: customFields.dc_number || null,
        dcSubmittedDate: customFields.dc_submitted_date || null,
        dtCode: customFields.dt_code || null,
        dtName: customFields.dt_name || null,
        dcAssets: customFields.dc_assets || [],
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get DC status" });
    }
  });

  // Automation Rules
  app.get("/api/automation-rules", async (req, res) => {
    try {
      const rules = await storage.getAutomationRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation rules" });
    }
  });

  app.post("/api/automation-rules", async (req, res) => {
    try {
      const data = insertAutomationRuleSchema.parse(req.body);
      const rule = await storage.createAutomationRule(data);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create automation rule" });
    }
  });

  app.patch("/api/automation-rules/:id", async (req, res) => {
    try {
      const data = updateAutomationRuleSchema.parse(req.body);
      const rule = await storage.updateAutomationRule(req.params.id, data);
      if (!rule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update automation rule" });
    }
  });

  app.delete("/api/automation-rules/:id", async (req, res) => {
    try {
      await storage.deleteAutomationRule(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete automation rule" });
    }
  });

  // SLA Policies
  app.get("/api/sla-policies", async (req, res) => {
    try {
      const policies = await storage.getSlaPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SLA policies" });
    }
  });

  app.post("/api/sla-policies", async (req, res) => {
    try {
      const data = insertSlaPolicySchema.parse(req.body);
      const policy = await storage.createSlaPolicy(data);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create SLA policy" });
    }
  });

  app.patch("/api/sla-policies/:id", async (req, res) => {
    try {
      const data = updateSlaPolicySchema.parse(req.body);
      const policy = await storage.updateSlaPolicy(req.params.id, data);
      if (!policy) {
        return res.status(404).json({ error: "SLA policy not found" });
      }
      res.json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update SLA policy" });
    }
  });

  app.delete("/api/sla-policies/:id", async (req, res) => {
    try {
      await storage.deleteSlaPolicy(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete SLA policy" });
    }
  });

  // Reports
  app.get("/api/reports", async (req, res) => {
    try {
      const range = (req.query.range as string) || "7d";
      const data = await storage.getReportsData(range);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports data" });
    }
  });

  // Agent Groups
  app.get("/api/agent-groups", async (req, res) => {
    try {
      const groups = await storage.getAgentGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent groups" });
    }
  });

  app.get("/api/agent-groups/:id", async (req, res) => {
    try {
      const group = await storage.getAgentGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Agent group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent group" });
    }
  });

  app.post("/api/agent-groups", async (req, res) => {
    try {
      const data = insertAgentGroupSchema.parse(req.body);
      const group = await storage.createAgentGroup(data);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create agent group" });
    }
  });

  app.patch("/api/agent-groups/:id", async (req, res) => {
    try {
      const existing = await storage.getAgentGroup(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Agent group not found" });
      }
      const data = updateAgentGroupSchema.parse(req.body);
      const group = await storage.updateAgentGroup(req.params.id, data);
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update agent group" });
    }
  });

  app.delete("/api/agent-groups/:id", async (req, res) => {
    try {
      await storage.deleteAgentGroup(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete agent group" });
    }
  });

  app.get("/api/agent-groups/:id/members", async (req, res) => {
    try {
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  app.post("/api/agent-groups/:id/members", async (req, res) => {
    try {
      const data = insertGroupMemberSchema.parse({ ...req.body, groupId: req.params.id });
      const member = await storage.addGroupMember(data);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add group member" });
    }
  });

  app.delete("/api/agent-groups/:groupId/members/:id", async (req, res) => {
    try {
      await storage.removeGroupMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove group member" });
    }
  });

  // Agent Roles (Freshdesk-style RBAC)
  app.get("/api/agent-roles", async (req, res) => {
    try {
      const roles = await storage.getAgentRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent roles" });
    }
  });

  app.get("/api/agent-roles/:id", async (req, res) => {
    try {
      const role = await storage.getAgentRole(req.params.id);
      if (!role) {
        return res.status(404).json({ error: "Agent role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent role" });
    }
  });

  app.post("/api/agent-roles", async (req, res) => {
    try {
      const role = await storage.createAgentRole(req.body);
      res.status(201).json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to create agent role" });
    }
  });

  app.patch("/api/agent-roles/:id", async (req, res) => {
    try {
      const role = await storage.updateAgentRole(req.params.id, req.body);
      if (!role) {
        return res.status(404).json({ error: "Agent role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: "Failed to update agent role" });
    }
  });

  app.delete("/api/agent-roles/:id", async (req, res) => {
    try {
      await storage.deleteAgentRole(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Cannot delete default roles") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete agent role" });
    }
  });

  // Role assignments - get agents assigned to a role
  app.get("/api/agent-roles/:id/agents", async (req, res) => {
    try {
      const assignments = await storage.getRoleUserAssignments(req.params.id);
      // Fetch agent details for each assignment
      const agents = await Promise.all(
        assignments.map(async (a) => {
          const user = await storage.getUser(a.userId);
          return { ...a, user };
        })
      );
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role agents" });
    }
  });

  // User role assignments - get roles for a user
  app.get("/api/users/:id/roles", async (req, res) => {
    try {
      const assignments = await storage.getUserRoleAssignments(req.params.id);
      // Fetch role details for each assignment
      const roles = await Promise.all(
        assignments.map(async (a) => {
          const role = await storage.getAgentRole(a.roleId);
          return { ...a, role };
        })
      );
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  app.post("/api/users/:id/roles", async (req, res) => {
    try {
      const assignment = await storage.assignRoleToUser({
        userId: req.params.id,
        roleId: req.body.roleId,
      });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign role to user" });
    }
  });

  app.delete("/api/users/:userId/roles/:roleId", async (req, res) => {
    try {
      await storage.removeRoleFromUser(req.params.userId, req.params.roleId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove role from user" });
    }
  });

  // Seed default roles
  app.post("/api/agent-roles/seed", async (req, res) => {
    try {
      await storage.seedDefaultRoles();
      const roles = await storage.getAgentRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to seed default roles" });
    }
  });

  // Business Hours
  app.get("/api/business-hours", async (req, res) => {
    try {
      const hours = await storage.getBusinessHours();
      res.json(hours);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business hours" });
    }
  });

  app.post("/api/business-hours", async (req, res) => {
    try {
      const data = insertBusinessHoursSchema.parse(req.body);
      const hours = await storage.createBusinessHours(data);
      res.status(201).json(hours);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create business hours" });
    }
  });

  app.patch("/api/business-hours/:id", async (req, res) => {
    try {
      const data = updateBusinessHoursSchema.parse(req.body);
      const hours = await storage.updateBusinessHours(req.params.id, data);
      if (!hours) {
        return res.status(404).json({ error: "Business hours not found" });
      }
      res.json(hours);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update business hours" });
    }
  });

  app.delete("/api/business-hours/:id", async (req, res) => {
    try {
      await storage.deleteBusinessHours(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete business hours" });
    }
  });

  app.get("/api/business-hours/:id/holidays", async (req, res) => {
    try {
      const holidays = await storage.getHolidays(req.params.id);
      res.json(holidays);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holidays" });
    }
  });

  app.post("/api/business-hours/:id/holidays", async (req, res) => {
    try {
      const data = insertHolidaySchema.parse({ ...req.body, businessHoursId: req.params.id });
      const holiday = await storage.createHoliday(data);
      res.status(201).json(holiday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create holiday" });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      await storage.deleteHoliday(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete holiday" });
    }
  });

  // Ticket Templates
  app.get("/api/ticket-templates", async (req, res) => {
    try {
      const templates = await storage.getTicketTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ticket templates" });
    }
  });

  app.post("/api/ticket-templates", async (req, res) => {
    try {
      const data = insertTicketTemplateSchema.parse(req.body);
      const template = await storage.createTicketTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create ticket template" });
    }
  });

  app.patch("/api/ticket-templates/:id", async (req, res) => {
    try {
      const data = updateTicketTemplateSchema.parse(req.body);
      const template = await storage.updateTicketTemplate(req.params.id, data);
      if (!template) {
        return res.status(404).json({ error: "Ticket template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update ticket template" });
    }
  });

  app.delete("/api/ticket-templates/:id", async (req, res) => {
    try {
      await storage.deleteTicketTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete ticket template" });
    }
  });

  // Time Entries
  app.get("/api/tickets/:id/time-entries", async (req, res) => {
    try {
      const entries = await storage.getTimeEntries(req.params.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  app.post("/api/tickets/:id/time-entries", async (req, res) => {
    try {
      const data = insertTimeEntrySchema.parse({ ...req.body, ticketId: req.params.id });
      const entry = await storage.createTimeEntry(data);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      await storage.deleteTimeEntry(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete time entry" });
    }
  });

  // CSAT Surveys
  app.get("/api/csat-surveys", async (req, res) => {
    try {
      const ticketId = req.query.ticketId as string | undefined;
      const customerId = req.query.customerId as string | undefined;
      const surveys = await storage.getCsatSurveys({ ticketId, customerId });
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CSAT surveys" });
    }
  });

  app.post("/api/csat-surveys", async (req, res) => {
    try {
      const data = insertCsatSurveySchema.parse(req.body);
      const survey = await storage.createCsatSurvey(data);
      res.status(201).json(survey);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create CSAT survey" });
    }
  });

  app.patch("/api/csat-surveys/:id", async (req, res) => {
    try {
      const data = updateCsatSurveySchema.parse(req.body);
      const survey = await storage.updateCsatSurvey(req.params.id, data);
      if (!survey) {
        return res.status(404).json({ error: "CSAT survey not found" });
      }
      res.json(survey);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update CSAT survey" });
    }
  });

  // Gamification
  app.get("/api/gamification/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/gamification/points/:userId", async (req, res) => {
    try {
      const points = await storage.getAgentPoints(req.params.userId);
      res.json(points || { points: 0, ticketsResolved: 0, firstResponses: 0, csatPositive: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agent points" });
    }
  });

  app.get("/api/gamification/badges", async (req, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  app.post("/api/gamification/badges", async (req, res) => {
    try {
      const data = insertBadgeSchema.parse(req.body);
      const badge = await storage.createBadge(data);
      res.status(201).json(badge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  // Forums
  app.get("/api/forums/categories", async (req, res) => {
    try {
      const categories = await storage.getForumCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forum categories" });
    }
  });

  app.post("/api/forums/categories", async (req, res) => {
    try {
      const data = insertForumCategorySchema.parse(req.body);
      const category = await storage.createForumCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create forum category" });
    }
  });

  app.patch("/api/forums/categories/:id", async (req, res) => {
    try {
      const data = updateForumCategorySchema.parse(req.body);
      const category = await storage.updateForumCategory(req.params.id, data);
      if (!category) {
        return res.status(404).json({ error: "Forum category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update forum category" });
    }
  });

  app.delete("/api/forums/categories/:id", async (req, res) => {
    try {
      await storage.deleteForumCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete forum category" });
    }
  });

  app.get("/api/forums/topics", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const topics = await storage.getForumTopics(categoryId);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forum topics" });
    }
  });

  app.get("/api/forums/topics/:id", async (req, res) => {
    try {
      const topic = await storage.getForumTopic(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Forum topic not found" });
      }
      res.json(topic);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forum topic" });
    }
  });

  app.post("/api/forums/topics", async (req, res) => {
    try {
      const data = insertForumTopicSchema.parse(req.body);
      const topic = await storage.createForumTopic(data);
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create forum topic" });
    }
  });

  app.patch("/api/forums/topics/:id", async (req, res) => {
    try {
      const data = updateForumTopicSchema.parse(req.body);
      const topic = await storage.updateForumTopic(req.params.id, data);
      if (!topic) {
        return res.status(404).json({ error: "Forum topic not found" });
      }
      res.json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update forum topic" });
    }
  });

  app.get("/api/forums/topics/:id/replies", async (req, res) => {
    try {
      const replies = await storage.getForumReplies(req.params.id);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forum replies" });
    }
  });

  app.post("/api/forums/topics/:id/replies", async (req, res) => {
    try {
      const data = insertForumReplySchema.parse({ ...req.body, topicId: req.params.id });
      const reply = await storage.createForumReply(data);
      res.status(201).json(reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create forum reply" });
    }
  });

  // Article Feedback
  app.get("/api/kb/articles/:id/feedback", async (req, res) => {
    try {
      const feedback = await storage.getArticleFeedback(req.params.id);
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article feedback" });
    }
  });

  app.post("/api/kb/articles/:id/feedback", async (req, res) => {
    try {
      const data = insertArticleFeedbackSchema.parse({ ...req.body, articleId: req.params.id });
      const feedback = await storage.createArticleFeedback(data);
      res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create article feedback" });
    }
  });

  // Companies
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(data);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    try {
      const data = updateCompanySchema.parse(req.body);
      const company = await storage.updateCompany(req.params.id, data);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // KB Folders
  app.get("/api/kb/folders", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const folders = await storage.getKbFolders(categoryId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KB folders" });
    }
  });

  app.get("/api/kb/folders/:id", async (req, res) => {
    try {
      const folder = await storage.getKbFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "KB folder not found" });
      }
      res.json(folder);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KB folder" });
    }
  });

  app.post("/api/kb/folders", async (req, res) => {
    try {
      const data = insertKbFolderSchema.parse(req.body);
      const folder = await storage.createKbFolder(data);
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create KB folder" });
    }
  });

  app.patch("/api/kb/folders/:id", async (req, res) => {
    try {
      const data = updateKbFolderSchema.parse(req.body);
      const folder = await storage.updateKbFolder(req.params.id, data);
      if (!folder) {
        return res.status(404).json({ error: "KB folder not found" });
      }
      res.json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update KB folder" });
    }
  });

  app.delete("/api/kb/folders/:id", async (req, res) => {
    try {
      await storage.deleteKbFolder(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete KB folder" });
    }
  });

  // Ticket Notes
  app.get("/api/tickets/:id/notes", async (req, res) => {
    try {
      const notes = await storage.getTicketNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ticket notes" });
    }
  });

  app.post("/api/tickets/:id/notes", async (req, res) => {
    try {
      const data = insertTicketNoteSchema.parse({ ...req.body, ticketId: req.params.id });
      const note = await storage.createTicketNote(data);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create ticket note" });
    }
  });

  // Ticket Actions
  app.post("/api/tickets/:id/restore", async (req, res) => {
    try {
      const ticket = await storage.restoreTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to restore ticket" });
    }
  });

  app.post("/api/tickets/:id/assign", async (req, res) => {
    try {
      const { assigneeId } = req.body;
      if (!assigneeId) {
        return res.status(400).json({ error: "assigneeId is required" });
      }
      const ticket = await storage.assignTicket(req.params.id, assigneeId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign ticket" });
    }
  });

  app.post("/api/tickets/:id/pick", async (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: "agentId is required" });
      }
      const ticket = await storage.pickTicket(req.params.id, agentId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Failed to pick ticket" });
    }
  });

  // Forum Subscriptions
  app.get("/api/forums/subscriptions", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const subscriptions = await storage.getForumSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch forum subscriptions" });
    }
  });

  app.post("/api/forums/subscriptions", async (req, res) => {
    try {
      const data = insertForumSubscriptionSchema.parse(req.body);
      const subscription = await storage.createForumSubscription(data);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create forum subscription" });
    }
  });

  app.delete("/api/forums/subscriptions/:id", async (req, res) => {
    try {
      await storage.deleteForumSubscription(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete forum subscription" });
    }
  });

  app.get("/api/forums/topics/:id/following", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const isFollowing = await storage.isFollowingTopic(userId, req.params.id);
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ error: "Failed to check topic subscription" });
    }
  });

  app.get("/api/forums/categories/:id/following", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const isFollowing = await storage.isFollowingCategory(userId, req.params.id);
      res.json({ isFollowing });
    } catch (error) {
      res.status(500).json({ error: "Failed to check category subscription" });
    }
  });

  // Custom Field Definitions
  app.get("/api/custom-fields", async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const fields = await storage.getCustomFieldDefinitions(entityType);
      res.json(fields);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch custom field definitions" });
    }
  });

  app.post("/api/custom-fields", async (req, res) => {
    try {
      const data = insertCustomFieldDefinitionSchema.parse(req.body);
      const field = await storage.createCustomFieldDefinition(data);
      res.status(201).json(field);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create custom field definition" });
    }
  });

  app.patch("/api/custom-fields/:id", async (req, res) => {
    try {
      const data = updateCustomFieldDefinitionSchema.parse(req.body);
      const field = await storage.updateCustomFieldDefinition(req.params.id, data);
      if (!field) {
        return res.status(404).json({ error: "Custom field definition not found" });
      }
      res.json(field);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update custom field definition" });
    }
  });

  app.delete("/api/custom-fields/:id", async (req, res) => {
    try {
      await storage.deleteCustomFieldDefinition(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete custom field definition" });
    }
  });

  // Time Entry Timer Toggle
  app.post("/api/time-entries/:id/toggle", async (req, res) => {
    try {
      const entry = await storage.toggleTimeEntryTimer(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle time entry timer" });
    }
  });

  // Data Exports - list exports history
  app.get("/api/exports", async (req, res) => {
    try {
      const exports = await storage.getDataExports();
      res.json(exports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exports" });
    }
  });

  // Export contacts
  app.post("/api/contacts/export", async (req, res) => {
    try {
      const { fields } = req.body as { fields: string[] };
      if (!fields || fields.length === 0) {
        return res.status(400).json({ error: "Fields are required" });
      }

      // Create export record
      const exportRecord = await storage.createDataExport({
        entityType: "contacts",
        status: "processing",
        selectedFields: fields,
        exportedBy: null,
      });

      // Get contacts data
      const data = await storage.getContactsForExport(fields);
      
      // Generate CSV
      const csvRows: string[] = [];
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        csvRows.push(headers.join(","));
        for (const row of data) {
          const values = headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          csvRows.push(values.join(","));
        }
      }

      const csvContent = csvRows.join("\n");
      const fileName = `contacts_export_${new Date().toISOString().split("T")[0]}.csv`;

      // Update export record
      await storage.updateDataExport(exportRecord.id, {
        status: "completed",
        fileName,
        fileUrl: `/api/exports/${exportRecord.id}/download`,
        totalRecords: data.length,
      });

      // Return CSV directly
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to export contacts" });
    }
  });

  // Export companies
  app.post("/api/companies/export", async (req, res) => {
    try {
      const { fields } = req.body as { fields: string[] };
      if (!fields || fields.length === 0) {
        return res.status(400).json({ error: "Fields are required" });
      }

      // Create export record
      const exportRecord = await storage.createDataExport({
        entityType: "companies",
        status: "processing",
        selectedFields: fields,
        exportedBy: null,
      });

      // Get companies data
      const data = await storage.getCompaniesForExport(fields);
      
      // Generate CSV
      const csvRows: string[] = [];
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        csvRows.push(headers.join(","));
        for (const row of data) {
          const values = headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          });
          csvRows.push(values.join(","));
        }
      }

      const csvContent = csvRows.join("\n");
      const fileName = `companies_export_${new Date().toISOString().split("T")[0]}.csv`;

      // Update export record
      await storage.updateDataExport(exportRecord.id, {
        status: "completed",
        fileName,
        fileUrl: `/api/exports/${exportRecord.id}/download`,
        totalRecords: data.length,
      });

      // Return CSV directly
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to export companies" });
    }
  });

  // Import contacts from CSV
  app.post("/api/contacts/import", async (req, res) => {
    try {
      const { data } = req.body as { data: Record<string, unknown>[] };
      if (!data || data.length === 0) {
        return res.status(400).json({ error: "Data is required" });
      }

      const result = await storage.importContacts(data);
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to import contacts" });
    }
  });

  // Import companies from CSV
  app.post("/api/companies/import", async (req, res) => {
    try {
      const { data } = req.body as { data: Record<string, unknown>[] };
      if (!data || data.length === 0) {
        return res.status(400).json({ error: "Data is required" });
      }

      const result = await storage.importCompanies(data);
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to import companies" });
    }
  });

  // Get sample import template
  app.get("/api/contacts/import/template", async (req, res) => {
    try {
      // Get custom fields for contacts
      const customFields = await storage.getCustomFieldDefinitions("contact");
      
      // Default fields
      const headers = ["name", "email", "phone", "company_id", "tags"];
      
      // Add custom fields
      for (const field of customFields) {
        headers.push(`custom_${field.name}`);
      }

      const csvContent = headers.join(",") + "\n";
      const fileName = "contacts_import_template.csv";

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Get sample company import template
  app.get("/api/companies/import/template", async (req, res) => {
    try {
      // Get custom fields for companies
      const customFields = await storage.getCustomFieldDefinitions("company");
      
      // Default fields
      const headers = ["name", "description", "domains", "healthScore", "accountTier"];
      
      // Add custom fields
      for (const field of customFields) {
        headers.push(`custom_${field.name}`);
      }

      const csvContent = headers.join(",") + "\n";
      const fileName = "companies_import_template.csv";

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // ============ API Keys Management ============
  
  // Get API keys for a user (currently using first admin user as default)
  app.get("/api/api-keys", async (req, res) => {
    try {
      // Get the first admin user as the current user
      const admins = await storage.getUsers("admin");
      if (admins.length === 0) {
        return res.status(401).json({ error: "No admin user found" });
      }
      const currentUserId = admins[0].id;
      
      const keys = await storage.getApiKeys(currentUserId);
      // Don't return the hash, just metadata
      const safeKeys = keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        isActive: k.isActive,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }));
      res.json(safeKeys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  // Create a new API key
  app.post("/api/api-keys", async (req, res) => {
    try {
      // Get the first admin user as the current user
      const admins = await storage.getUsers("admin");
      if (admins.length === 0) {
        return res.status(401).json({ error: "No admin user found" });
      }
      const currentUserId = admins[0].id;
      
      const { name, scopes, expiresAt } = req.body as { 
        name: string; 
        scopes?: string[];
        expiresAt?: string;
      };
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      // Generate the actual key - only shown once!
      const plainKey = generateApiKey();
      const keyHash = hashApiKey(plainKey);
      const keyPrefix = getKeyPrefix(plainKey);
      
      const apiKey = await storage.createApiKey({
        name,
        keyPrefix,
        keyHash,
        userId: currentUserId,
        scopes: scopes || ["tickets:read", "tickets:write", "users:read"],
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });
      
      // Return the key ONLY on creation - it cannot be retrieved later
      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: plainKey, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        message: "Store this key securely - it will not be shown again!",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // Revoke an API key
  app.delete("/api/api-keys/:id", async (req, res) => {
    try {
      const revoked = await storage.revokeApiKey(req.params.id);
      if (!revoked) {
        return res.status(404).json({ error: "API key not found" });
      }
      res.json({ success: true, message: "API key revoked" });
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });

  // Verify API key endpoint (for testing)
  app.post("/api/api-keys/verify", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || req.headers["x-api-key"];
      
      if (!authHeader) {
        return res.status(401).json({ error: "No API key provided", valid: false });
      }
      
      let apiKeyValue: string;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        apiKeyValue = authHeader.slice(7);
      } else if (typeof authHeader === "string" && authHeader.startsWith("ApiKey ")) {
        apiKeyValue = authHeader.slice(7);
      } else {
        apiKeyValue = authHeader as string;
      }
      
      const keyHash = hashApiKey(apiKeyValue);
      const apiKey = await storage.getApiKeyByHash(keyHash);
      
      if (!apiKey) {
        return res.status(401).json({ error: "Invalid API key", valid: false });
      }
      
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        return res.status(401).json({ error: "API key expired", valid: false });
      }
      
      // Update last used timestamp
      await storage.updateApiKeyLastUsed(apiKey.id);
      
      // Get the user associated with the key
      const user = await storage.getUser(apiKey.userId);
      
      res.json({
        valid: true,
        keyId: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes,
        user: user ? { id: user.id, name: user.name, role: user.role } : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify API key", valid: false });
    }
  });

  return httpServer;
}
