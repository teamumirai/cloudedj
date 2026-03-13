#!/usr/bin/env npx tsx
/**
 * Invite a user to n8n
 * Usage: npx tsx scripts/invite-user.ts <email> [role]
 * Role: global:member (default) | global:admin
 */
import { config } from "dotenv";
import { N8nClient } from "../src/n8n-client.js";

config();

const [email, role = "global:member"] = process.argv.slice(2);

if (!email) {
  console.error("Usage: npx tsx scripts/invite-user.ts <email> [global:member|global:admin]");
  process.exit(1);
}

const client = new N8nClient(
  process.env.N8N_BASE_URL ?? "https://n8n.umirai.ai",
  process.env.N8N_API_KEY ?? ""
);

try {
  const result = await client.inviteUsers([{ email, role }]);
  console.log(`✅ Invitation sent to ${email} as ${role}`);
  console.log(JSON.stringify(result, null, 2));
} catch (err: unknown) {
  const error = err as { response?: { status: number; data: unknown }; message: string };
  if (error.response) {
    console.error(`❌ API error ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
  } else {
    console.error("❌ Error:", error.message);
  }
  process.exit(1);
}
