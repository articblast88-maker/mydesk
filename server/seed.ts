import { db } from "./db";
import { users, tickets, kbCategories, kbArticles, cannedResponses, customApps, automationRules, slaPolicies } from "@shared/schema";
import { randomUUID } from "crypto";

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Create users (using simple hash for demo purposes)
  const demoPassword = "password123";

  const adminUser = await db.insert(users).values({
    id: randomUUID(),
    email: "admin@helpdesk.com",
    name: "Admin User",
    username: "admin",
    password: demoPassword,
    role: "admin",
    avatarUrl: null,
    isActive: true,
  }).returning();

  const agent1 = await db.insert(users).values({
    id: randomUUID(),
    email: "sarah@helpdesk.com",
    name: "Sarah Wilson",
    username: "sarah",
    password: demoPassword,
    role: "agent",
    avatarUrl: null,
    isActive: true,
  }).returning();

  const agent2 = await db.insert(users).values({
    id: randomUUID(),
    email: "mike@helpdesk.com",
    name: "Mike Chen",
    username: "mike",
    password: demoPassword,
    role: "agent",
    avatarUrl: null,
    isActive: true,
  }).returning();

  const customer1 = await db.insert(users).values({
    id: randomUUID(),
    email: "john@example.com",
    name: "John Smith",
    username: "johnsmith",
    password: demoPassword,
    role: "customer",
    avatarUrl: null,
    isActive: true,
  }).returning();

  const customer2 = await db.insert(users).values({
    id: randomUUID(),
    email: "jane@example.com",
    name: "Jane Doe",
    username: "janedoe",
    password: demoPassword,
    role: "customer",
    avatarUrl: null,
    isActive: true,
  }).returning();

  const customer3 = await db.insert(users).values({
    id: randomUUID(),
    email: "alex@company.com",
    name: "Alex Johnson",
    username: "alexj",
    password: demoPassword,
    role: "customer",
    avatarUrl: null,
    isActive: true,
  }).returning();

  // Create tickets
  const ticketData = [
    {
      id: randomUUID(),
      ticketNumber: 1001,
      subject: "Unable to reset password",
      description: "I've tried to reset my password multiple times but I'm not receiving the reset email. Please help!",
      status: "open" as const,
      priority: "high" as const,
      channel: "email" as const,
      customerId: customer1[0].id,
      assigneeId: agent1[0].id,
    },
    {
      id: randomUUID(),
      ticketNumber: 1002,
      subject: "Billing discrepancy on last invoice",
      description: "My last invoice shows charges that I don't recognize. Can you please review?",
      status: "pending" as const,
      priority: "medium" as const,
      channel: "portal" as const,
      customerId: customer2[0].id,
      assigneeId: agent2[0].id,
    },
    {
      id: randomUUID(),
      ticketNumber: 1003,
      subject: "Feature request: Dark mode",
      description: "Would love to have a dark mode option in the application. It would be easier on the eyes.",
      status: "open" as const,
      priority: "low" as const,
      channel: "email" as const,
      customerId: customer3[0].id,
      assigneeId: null,
    },
    {
      id: randomUUID(),
      ticketNumber: 1004,
      subject: "App crashes on iOS 17",
      description: "Since updating to iOS 17, the app crashes immediately on launch. This is urgent as I cannot access my account.",
      status: "open" as const,
      priority: "urgent" as const,
      channel: "chat" as const,
      customerId: customer1[0].id,
      assigneeId: agent1[0].id,
    },
    {
      id: randomUUID(),
      ticketNumber: 1005,
      subject: "How to export my data?",
      description: "I need to export all my data for backup purposes. Can you provide instructions?",
      status: "resolved" as const,
      priority: "low" as const,
      channel: "portal" as const,
      customerId: customer2[0].id,
      assigneeId: agent2[0].id,
      resolvedAt: new Date(),
    },
  ];

  await db.insert(tickets).values(ticketData);

  // Create KB Categories
  const gettingStarted = await db.insert(kbCategories).values({
    id: randomUUID(),
    name: "Getting Started",
    description: "Learn the basics of using our platform",
    icon: "rocket",
  }).returning();

  const accountBilling = await db.insert(kbCategories).values({
    id: randomUUID(),
    name: "Account & Billing",
    description: "Manage your account and billing information",
    icon: "credit-card",
  }).returning();

  const troubleshooting = await db.insert(kbCategories).values({
    id: randomUUID(),
    name: "Troubleshooting",
    description: "Common issues and how to resolve them",
    icon: "wrench",
  }).returning();

  // Create KB Articles
  await db.insert(kbArticles).values([
    {
      id: randomUUID(),
      title: "How to create your first ticket",
      slug: "create-first-ticket",
      content: "Creating a ticket is easy. Simply click the 'New Ticket' button and fill in the required details...",
      categoryId: gettingStarted[0].id,
      authorId: adminUser[0].id,
      status: "published" as const,
      views: 156,
    },
    {
      id: randomUUID(),
      title: "Understanding ticket priorities",
      slug: "ticket-priorities",
      content: "Tickets can have four priority levels: Low, Medium, High, and Urgent. Each priority level affects response times...",
      categoryId: gettingStarted[0].id,
      authorId: adminUser[0].id,
      status: "published" as const,
      views: 89,
    },
    {
      id: randomUUID(),
      title: "How to update your billing information",
      slug: "update-billing-info",
      content: "To update your billing information, go to Settings > Billing > Payment Methods...",
      categoryId: accountBilling[0].id,
      authorId: adminUser[0].id,
      status: "published" as const,
      views: 234,
    },
    {
      id: randomUUID(),
      title: "Fixing common login issues",
      slug: "login-issues",
      content: "If you're having trouble logging in, try these steps: 1. Clear your browser cache...",
      categoryId: troubleshooting[0].id,
      authorId: adminUser[0].id,
      status: "published" as const,
      views: 412,
    },
  ]);

  // Create Canned Responses
  await db.insert(cannedResponses).values([
    {
      id: randomUUID(),
      title: "Greeting",
      shortcut: "/greet",
      content: "Hello! Thank you for reaching out to our support team. I'll be happy to assist you today.",
      category: "general",
      createdBy: agent1[0].id,
    },
    {
      id: randomUUID(),
      title: "Password Reset Instructions",
      shortcut: "/pwreset",
      content: "To reset your password, please visit our login page and click 'Forgot Password'. You'll receive an email with a reset link within 5 minutes.",
      category: "account",
      createdBy: agent1[0].id,
    },
    {
      id: randomUUID(),
      title: "Closing - Resolved",
      shortcut: "/close",
      content: "I'm glad I could help resolve your issue. If you have any other questions, don't hesitate to reach out. Have a great day!",
      category: "closing",
      createdBy: agent2[0].id,
    },
    {
      id: randomUUID(),
      title: "Escalation Notice",
      shortcut: "/escalate",
      content: "I'm escalating this ticket to our specialized team who can better assist with your request. They will reach out to you within 24 hours.",
      category: "escalation",
      createdBy: agent1[0].id,
    },
  ]);

  // Create Custom Apps
  await db.insert(customApps).values([
    {
      id: randomUUID(),
      name: "Customer 360",
      description: "View complete customer history, orders, and interactions in one place",
      appUrl: "https://example.com/apps/customer360",
      icon: "users",
      isActive: true,
      placement: "ticket_sidebar",
      createdBy: adminUser[0].id,
    },
    {
      id: randomUUID(),
      name: "Order Lookup",
      description: "Quickly search and view order details directly from the ticket",
      appUrl: "https://example.com/apps/orders",
      icon: "package",
      isActive: true,
      placement: "ticket_sidebar",
      createdBy: adminUser[0].id,
    },
    {
      id: randomUUID(),
      name: "Shipping Tracker",
      description: "Track shipment status and delivery updates",
      appUrl: "https://example.com/apps/shipping",
      icon: "truck",
      isActive: false,
      placement: "ticket_sidebar",
      createdBy: adminUser[0].id,
    },
  ]);

  // Create Automation Rules
  await db.insert(automationRules).values([
    {
      id: randomUUID(),
      name: "Auto-assign urgent tickets",
      description: "Automatically assign urgent tickets to senior agents",
      trigger: "ticket_created",
      conditions: [{ field: "priority", operator: "equals", value: "urgent" }],
      actions: [{ type: "assign", target: "senior_agent_pool" }],
      isActive: true,
      order: 1,
    },
    {
      id: randomUUID(),
      name: "Send reminder for pending tickets",
      description: "Send a reminder when a ticket has been pending for more than 24 hours",
      trigger: "time_based",
      conditions: [{ field: "status", operator: "equals", value: "pending" }, { field: "hoursInStatus", operator: "gte", value: 24 }],
      actions: [{ type: "notify", target: "agent" }],
      isActive: true,
      order: 2,
    },
    {
      id: randomUUID(),
      name: "Auto-close resolved tickets",
      description: "Automatically close tickets that have been resolved for 7 days with no response",
      trigger: "time_based",
      conditions: [{ field: "status", operator: "equals", value: "resolved" }, { field: "daysInStatus", operator: "gte", value: 7 }],
      actions: [{ type: "update_status", value: "closed" }],
      isActive: true,
      order: 3,
    },
  ]);

  // Create SLA Policies
  await db.insert(slaPolicies).values([
    {
      id: randomUUID(),
      name: "Premium Support",
      description: "SLA for premium customers with faster response times",
      firstResponseTime: 60,
      resolutionTime: 480,
      priority: "high",
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Standard Support",
      description: "Default SLA for standard customers",
      firstResponseTime: 240,
      resolutionTime: 1440,
      priority: "medium",
      isActive: true,
    },
    {
      id: randomUUID(),
      name: "Basic Support",
      description: "SLA for free tier customers",
      firstResponseTime: 480,
      resolutionTime: 2880,
      priority: "low",
      isActive: true,
    },
  ]);

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
