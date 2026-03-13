#!/usr/bin/env npx tsx
/**
 * Deploy the User Management Automation workflow to your n8n instance.
 * Usage: npx tsx scripts/deploy-user-automation.ts
 */
import { config } from "dotenv";
import { N8nClient } from "../src/n8n-client.js";
import { buildUserManagementWorkflow } from "../src/workflows/user-management.js";

config();

const N8N_BASE_URL = process.env.N8N_BASE_URL ?? "https://n8n.umirai.ai";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";

const client = new N8nClient(N8N_BASE_URL, N8N_API_KEY);

try {
  console.log("Deploying User Management Automation workflow...");
  const workflow = buildUserManagementWorkflow(N8N_BASE_URL, N8N_API_KEY);
  const created = await client.createWorkflow(workflow as Record<string, unknown>);

  const base = N8N_BASE_URL.replace(/\/$/, "");

  console.log(`\n✅ Workflow deployed successfully!`);
  console.log(`   Workflow ID : ${created.id}`);
  console.log(`   Name        : ${created.name}`);
  console.log(`   Active      : ${created.active}`);
  console.log(`\n📡 Webhook Endpoints:\n`);
  console.log(`  ➕ Add user (POST):`);
  console.log(`     ${base}/webhook/user-management/add`);
  console.log(`     Body: { "email": "user@example.com", "role": "global:member" }\n`);
  console.log(`  🗑  Delete user (POST):`);
  console.log(`     ${base}/webhook/user-management/delete`);
  console.log(`     Body: { "id": "<user-id>" }\n`);
  console.log(`  📋 List users (GET):`);
  console.log(`     ${base}/webhook/user-management/list\n`);
  console.log(`Example - add a user:`);
  console.log(`  curl -X POST ${base}/webhook/user-management/add \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"email":"someone@example.com","role":"global:member"}'`);
} catch (err: unknown) {
  const error = err as { response?: { status: number; data: unknown }; message: string };
  if (error.response) {
    console.error(`❌ API error ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
  } else {
    console.error("❌ Error:", error.message);
  }
  process.exit(1);
}
