#!/usr/bin/env npx tsx
/**
 * Deploy the Form to Google Sheets workflow to your n8n instance.
 * Usage: npx tsx scripts/deploy-form-to-sheets.ts
 */
import { config } from "dotenv";
import { N8nClient } from "../src/n8n-client.js";
import { buildFormToGoogleSheetsWorkflow } from "../src/workflows/form-to-google-sheets.js";

config();

const N8N_BASE_URL = process.env.N8N_BASE_URL ?? "https://n8n.umirai.ai";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";

const client = new N8nClient(N8N_BASE_URL, N8N_API_KEY);

try {
  console.log("Deploying Form to Google Sheets workflow...\n");
  const workflow = buildFormToGoogleSheetsWorkflow();
  const created = await client.createWorkflow(workflow as Record<string, unknown>);

  const base = N8N_BASE_URL.replace(/\/$/, "");

  console.log(`✅ Workflow deployed!`);
  console.log(`   Workflow ID : ${created.id}`);
  console.log(`   Name        : ${created.name}`);
  console.log(`   Active      : ${created.active}`);
  console.log(`\n🔗 Your public form URL:`);
  console.log(`   ${base}/form/form-to-google-sheets`);
  console.log(`\n⚠️  Next steps:`);
  console.log(`   1. Open the workflow in n8n: ${base}/workflow/${created.id}`);
  console.log(`   2. Click the Google Sheets node`);
  console.log(`   3. Connect your Google Sheets credential`);
  console.log(`   4. Set your Spreadsheet ID`);
  console.log(`   5. Save & activate the workflow\n`);
} catch (err: unknown) {
  const error = err as { response?: { status: number; data: unknown }; message: string };
  if (error.response) {
    console.error(`❌ API error ${error.response.status}:`, JSON.stringify(error.response.data, null, 2));
  } else {
    console.error("❌ Error:", error.message);
  }
  process.exit(1);
}
