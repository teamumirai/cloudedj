#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import { N8nClient } from "./n8n-client.js";

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

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("cloudedj-n8n MCP server running on stdio");
