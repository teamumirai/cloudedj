#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import { N8nClient } from "./n8n-client.js";
import { buildUserManagementWorkflow } from "./workflows/user-management.js";
import { buildUserInviteFormWorkflow } from "./workflows/user-invite-form.js";
import { buildFormToGoogleSheetsWorkflow } from "./workflows/form-to-google-sheets.js";

config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_BASE_URL || !N8N_API_KEY) {
  console.error("Error: N8N_BASE_URL and N8N_API_KEY must be set in .env");
  process.exit(1);
}

const client = new N8nClient(N8N_BASE_URL, N8N_API_KEY);

const server = new McpServer({
  name: "cloudedj-n8n",
  version: "1.0.0",
});

// ─── Workflow Tools ───────────────────────────────────────────────────────────

server.tool(
  "list_workflows",
  "List all workflows in n8n",
  { limit: z.number().optional().describe("Max number of workflows to return (default 100)") },
  async ({ limit }) => {
    const result = await client.listWorkflows(limit ?? 100);
    const summary = result.data.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
      tags: w.tags?.map((t) => t.name) ?? [],
    }));
    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  }
);

server.tool(
  "get_workflow",
  "Get full details of a specific workflow",
  { id: z.string().describe("Workflow ID") },
  async ({ id }) => {
    const workflow = await client.getWorkflow(id);
    return { content: [{ type: "text", text: JSON.stringify(workflow, null, 2) }] };
  }
);

server.tool(
  "activate_workflow",
  "Activate (enable) a workflow",
  { id: z.string().describe("Workflow ID") },
  async ({ id }) => {
    const workflow = await client.activateWorkflow(id);
    return { content: [{ type: "text", text: `✅ Workflow "${workflow.name}" (${id}) is now ACTIVE.` }] };
  }
);

server.tool(
  "deactivate_workflow",
  "Deactivate (disable) a workflow",
  { id: z.string().describe("Workflow ID") },
  async ({ id }) => {
    const workflow = await client.deactivateWorkflow(id);
    return { content: [{ type: "text", text: `⏸ Workflow "${workflow.name}" (${id}) is now INACTIVE.` }] };
  }
);

server.tool(
  "execute_workflow",
  "Manually trigger a workflow execution",
  {
    id: z.string().describe("Workflow ID"),
    data: z.record(z.unknown()).optional().describe("Optional input data to pass to the workflow"),
  },
  async ({ id, data }) => {
    const result = await client.executeWorkflow(id, data);
    return { content: [{ type: "text", text: `🚀 Workflow execution started. Execution ID: ${result.executionId}` }] };
  }
);

server.tool(
  "delete_workflow",
  "Delete a workflow permanently",
  { id: z.string().describe("Workflow ID") },
  async ({ id }) => {
    await client.deleteWorkflow(id);
    return { content: [{ type: "text", text: `🗑 Workflow ${id} deleted.` }] };
  }
);

// ─── Execution Tools ──────────────────────────────────────────────────────────

server.tool(
  "list_executions",
  "List workflow executions",
  {
    workflowId: z.string().optional().describe("Filter by workflow ID"),
    status: z.enum(["success", "error", "waiting", "running"]).optional().describe("Filter by status"),
    limit: z.number().optional().describe("Max results (default 50)"),
  },
  async ({ workflowId, status, limit }) => {
    const result = await client.listExecutions(workflowId, status, limit ?? 50);
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool(
  "get_execution",
  "Get details of a specific execution",
  { id: z.string().describe("Execution ID") },
  async ({ id }) => {
    const execution = await client.getExecution(id);
    return { content: [{ type: "text", text: JSON.stringify(execution, null, 2) }] };
  }
);

server.tool(
  "delete_execution",
  "Delete a specific execution record",
  { id: z.string().describe("Execution ID") },
  async ({ id }) => {
    await client.deleteExecution(id);
    return { content: [{ type: "text", text: `🗑 Execution ${id} deleted.` }] };
  }
);

// ─── Info Tools ───────────────────────────────────────────────────────────────

server.tool(
  "list_credentials",
  "List all credential names (no secrets exposed)",
  {},
  async () => {
    const result = await client.getCredentials();
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool(
  "list_tags",
  "List all workflow tags",
  {},
  async () => {
    const result = await client.getTags();
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool(
  "list_variables",
  "List all n8n environment variables",
  {},
  async () => {
    const result = await client.getVariables();
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  }
);

// ─── User Tools ───────────────────────────────────────────────────────────────

server.tool(
  "list_users",
  "List all users in n8n",
  {},
  async () => {
    const result = await client.listUsers();
    return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool(
  "invite_user",
  "Invite a new user to n8n by email",
  {
    email: z.string().email().describe("Email address of the new user"),
    role: z.enum(["global:member", "global:admin"]).default("global:member").describe("Role to assign"),
  },
  async ({ email, role }) => {
    const result = await client.inviteUsers([{ email, role }]);
    return { content: [{ type: "text", text: `✅ Invitation sent to ${email} as ${role}.\n\n${JSON.stringify(result, null, 2)}` }] };
  }
);

server.tool(
  "delete_user",
  "Remove a user from n8n",
  { id: z.string().describe("User ID") },
  async ({ id }) => {
    await client.deleteUser(id);
    return { content: [{ type: "text", text: `🗑 User ${id} removed.` }] };
  }
);

server.tool(
  "change_user_role",
  "Change the role of an existing user",
  {
    id: z.string().describe("User ID"),
    role: z.enum(["global:member", "global:admin"]).describe("New role"),
  },
  async ({ id, role }) => {
    const result = await client.changeUserRole(id, role);
    return { content: [{ type: "text", text: `✅ User ${id} role updated to ${role}.\n\n${JSON.stringify(result, null, 2)}` }] };
  }
);

// ─── Automation Deployment ────────────────────────────────────────────────────

server.tool(
  "deploy_user_automation",
  "Deploy the User Management Automation workflow to n8n. Creates webhook endpoints for adding, deleting and listing users.",
  {},
  async () => {
    const workflow = buildUserManagementWorkflow(N8N_BASE_URL!, N8N_API_KEY!);
    const created = await client.createWorkflow(workflow as Record<string, unknown>);
    const base = N8N_BASE_URL!.replace(/\/$/, "");
    return {
      content: [
        {
          type: "text",
          text: [
            `✅ Workflow deployed! ID: ${created.id}`,
            ``,
            `Webhook Endpoints:`,
            ``,
            `  ➕ Add user:`,
            `     POST ${base}/webhook/user-management/add`,
            `     Body: { "email": "user@example.com", "role": "global:member" }`,
            ``,
            `  🗑 Delete user:`,
            `     POST ${base}/webhook/user-management/delete`,
            `     Body: { "id": "<user-id>" }`,
            ``,
            `  📋 List users:`,
            `     GET ${base}/webhook/user-management/list`,
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "deploy_invite_form",
  "Deploy a public web form to n8n. Users fill in Name + Email + Role and get an invite link sent to them automatically.",
  {},
  async () => {
    const workflow = buildUserInviteFormWorkflow(N8N_BASE_URL!, N8N_API_KEY!);
    const created = await client.createWorkflow(workflow as Record<string, unknown>);
    const base = N8N_BASE_URL!.replace(/\/$/, "");
    return {
      content: [
        {
          type: "text",
          text: [
            `✅ Invite Form deployed! Workflow ID: ${created.id}`,
            ``,
            `🔗 Public Form URL:`,
            `   ${base}/form/user-invite-form`,
            ``,
            `Share this link with anyone who needs to add users.`,
            `They fill in Name, Email, Role → invite email is sent automatically.`,
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "deploy_form_to_sheets",
  "Deploy a public web form to n8n that saves submissions to Google Sheets. Fields: Full Name, Email Address, Message.",
  {},
  async () => {
    const workflow = buildFormToGoogleSheetsWorkflow();
    const created = await client.createWorkflow(workflow as Record<string, unknown>);
    const base = N8N_BASE_URL!.replace(/\/$/, "");
    return {
      content: [
        {
          type: "text",
          text: [
            `✅ Form to Google Sheets workflow deployed! Workflow ID: ${created.id}`,
            ``,
            `🔗 Public Form URL:`,
            `   ${base}/form/form-to-google-sheets`,
            ``,
            `⚠️  Next steps to connect Google Sheets:`,
            `   1. Open workflow: ${base}/workflow/${created.id}`,
            `   2. Click the Google Sheets node`,
            `   3. Connect your Google Sheets credential`,
            `   4. Set your Spreadsheet ID`,
            `   5. Save & activate the workflow`,
          ].join("\n"),
        },
      ],
    };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("cloudedj-n8n MCP server running on stdio");
