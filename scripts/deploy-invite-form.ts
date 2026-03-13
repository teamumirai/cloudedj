#!/usr/bin/env npx tsx
/**
 * Deploy the User Invite Form workflow to your n8n instance.
 * Usage: npx tsx scripts/deploy-invite-form.ts
 */
import { config } from "dotenv";
import { N8nClient } from "../src/n8n-client.js";
import { buildUserInviteFormWorkflow } from "../src/workflows/user-invite-form.js";

config();

const N8N_BASE_URL = process.env.N8N_BASE_URL ?? "https://n8n.umirai.ai";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";

const client = new N8nClient(N8N_BASE_URL, N8N_API_KEY);

try {
  console.log("Deploying User Invite Form workflow...\n");
  const workflow = buildUserInviteFormWorkflow(N8N_BASE_URL, N8N_API_KEY);
  const created = await client.createWorkflow(workflow as Record<string, unknown>);

  const base = N8N_BASE_URL.replace(/\/$/, "");

  console.log(`✅ Workflow deployed!`);
  console.log(`   Workflow ID : ${created.id}`);
  console.log(`   Name        : ${created.name}`);
  console.log(`   Active      : ${created.active}`);
  console.log(`\n🔗 Your public form URL:`);
  console.log(`   ${base}/form/user-invite-form`);
  console.log(`\n   Share this link with anyone who needs to add users.`);
  console.log(`   They fill in: Name, Email, Role → user gets invite email automatically.\n`);
} catch (err: unknown) {
  const error = err as { response?: { status: number; data: unknown }; message: string };
  if (error.response) {
    console.error(`❌ API error ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
  } else {
    console.error("❌ Error:", error.message);
  }
  process.exit(1);
}
