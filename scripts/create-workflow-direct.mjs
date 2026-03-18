#!/usr/bin/env node
// Direct n8n API call to create the Form to Google Sheets workflow
import https from 'https';
import http from 'http';

const N8N_BASE_URL = "https://n8n.umirai.ai";
const N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYzYzZjY3Yi1jN2U1LTQ1MjgtOTFmOS1hZmRkZDZlMDliNzQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzczMzgyNDQ2fQ.Cx1_btcbVBRrRrdca3M7VoVbeL0LgLTyqYUSiAM4nVA";

const workflow = {
  name: "Form to Google Sheets",
  active: true,
  settings: { executionOrder: "v1" },
  nodes: [
    {
      id: "form-trigger",
      name: "Form Trigger",
      type: "n8n-nodes-base.formTrigger",
      typeVersion: 2.2,
      position: [200, 300],
      webhookId: "form-to-google-sheets",
      parameters: {
        formTitle: "Submit Your Info",
        formDescription: "Fill in the form below. Your data will be saved to Google Sheets.",
        formFields: {
          values: [
            { fieldLabel: "Full Name", fieldType: "text", requiredField: true, placeholder: "John Doe" },
            { fieldLabel: "Email Address", fieldType: "email", requiredField: true, placeholder: "john@example.com" },
            { fieldLabel: "Message", fieldType: "textarea", requiredField: false, placeholder: "Your message..." }
          ]
        },
        responseMode: "responseNode",
        options: {}
      }
    },
    {
      id: "prepare-data",
      name: "Prepare Data",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [450, 300],
      parameters: {
        jsCode: "const name = $input.first().json['Full Name']?.trim() || '';\nconst email = $input.first().json['Email Address']?.trim().toLowerCase() || '';\nconst message = $input.first().json['Message']?.trim() || '';\nconst submittedAt = new Date().toISOString();\nreturn [{ json: { name, email, message, submittedAt } }];"
      }
    },
    {
      id: "google-sheets",
      name: "Google Sheets",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [700, 300],
      parameters: {
        operation: "append",
        documentId: { __rl: true, mode: "id", value: "YOUR_SPREADSHEET_ID" },
        sheetName: { __rl: true, mode: "name", value: "Sheet1" },
        columns: {
          mappingMode: "defineBelow",
          value: {
            "Full Name": "={{ $json.name }}",
            "Email": "={{ $json.email }}",
            "Message": "={{ $json.message }}",
            "Submitted At": "={{ $json.submittedAt }}"
          }
        },
        options: {}
      },
      credentials: {
        googleSheetsOAuth2Api: { id: "1", name: "Google Sheets account" }
      }
    },
    {
      id: "form-success",
      name: "Success",
      type: "n8n-nodes-base.form",
      typeVersion: 1,
      position: [950, 300],
      parameters: {
        operation: "completion",
        completionTitle: "Submitted!",
        completionMessage: "={{ \"Thanks \" + $('Prepare Data').first().json.name + \"! Your response has been recorded.\" }}",
        options: {}
      }
    }
  ],
  connections: {
    "Form Trigger": { main: [[{ node: "Prepare Data", type: "main", index: 0 }]] },
    "Prepare Data": { main: [[{ node: "Google Sheets", type: "main", index: 0 }]] },
    "Google Sheets": { main: [[{ node: "Success", type: "main", index: 0 }]] }
  }
};

const body = JSON.stringify(workflow);
const url = new URL(`${N8N_BASE_URL}/api/v1/workflows`);
const isHttps = url.protocol === 'https:';
const lib = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Origin': N8N_BASE_URL,
    'Referer': N8N_BASE_URL + '/',
  }
};

console.log('POSTing to', url.toString());

const req = lib.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const created = JSON.parse(data);
      console.log('\n✅ Workflow deployed!');
      console.log('   Workflow ID :', created.id);
      console.log('   Name        :', created.name);
      console.log('\n🔗 Form URL   :', `${N8N_BASE_URL}/form/form-to-google-sheets`);
      console.log('\n⚠️  Open workflow to connect Google Sheets credential:', `${N8N_BASE_URL}/workflow/${created.id}`);
    } else {
      console.error(`❌ HTTP ${res.statusCode}:`, data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
  process.exit(1);
});

req.write(body);
req.end();
