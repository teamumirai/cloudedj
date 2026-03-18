/**
 * n8n workflow: Form to Google Sheets
 *
 * Flow:
 *   [Form Trigger: Name, Email, Message]
 *     → [Google Sheets: Append Row]
 *       → [Success: show confirmation page]
 *
 * Once deployed, n8n gives you a public form URL like:
 *   https://n8n.umirai.ai/form/<form-id>
 *
 * NOTE: You must connect your Google Sheets credential in n8n after deploying.
 */

export function buildFormToGoogleSheetsWorkflow() {
  return {
    name: "Form to Google Sheets",
    active: true,
    settings: {
      executionOrder: "v1",
    },
    nodes: [
      // ── 1. Form Trigger ───────────────────────────────────────────────────
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
              {
                fieldLabel: "Full Name",
                fieldType: "text",
                requiredField: true,
                placeholder: "John Doe",
              },
              {
                fieldLabel: "Email Address",
                fieldType: "email",
                requiredField: true,
                placeholder: "john@example.com",
              },
              {
                fieldLabel: "Message",
                fieldType: "textarea",
                requiredField: false,
                placeholder: "Your message here...",
              },
            ],
          },
          responseMode: "responseNode",
          options: {},
        },
      },

      // ── 2. Prepare data ───────────────────────────────────────────────────
      {
        id: "prepare-data",
        name: "Prepare Data",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [450, 300],
        parameters: {
          jsCode: `
const name = $input.first().json['Full Name']?.trim() || '';
const email = $input.first().json['Email Address']?.trim().toLowerCase() || '';
const message = $input.first().json['Message']?.trim() || '';
const submittedAt = new Date().toISOString();

return [{ json: { name, email, message, submittedAt } }];
          `.trim(),
        },
      },

      // ── 3. Append row to Google Sheets ────────────────────────────────────
      {
        id: "google-sheets",
        name: "Google Sheets",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4.5,
        position: [700, 300],
        parameters: {
          operation: "append",
          documentId: {
            __rl: true,
            mode: "id",
            value: "YOUR_SPREADSHEET_ID",
          },
          sheetName: {
            __rl: true,
            mode: "name",
            value: "Sheet1",
          },
          columns: {
            mappingMode: "defineBelow",
            value: {
              "Full Name": "={{ $json.name }}",
              "Email": "={{ $json.email }}",
              "Message": "={{ $json.message }}",
              "Submitted At": "={{ $json.submittedAt }}",
            },
          },
          options: {},
        },
        credentials: {
          googleSheetsOAuth2Api: {
            id: "1",
            name: "Google Sheets account",
          },
        },
      },

      // ── 4. Success page ───────────────────────────────────────────────────
      {
        id: "form-success",
        name: "Success",
        type: "n8n-nodes-base.form",
        typeVersion: 1,
        position: [950, 300],
        parameters: {
          operation: "completion",
          completionTitle: "✅ Submitted!",
          completionMessage: "={{ \"Thanks \" + $('Prepare Data').first().json.name + \"! Your response has been recorded.\" }}",
          options: {},
        },
      },
    ],

    connections: {
      "Form Trigger": {
        main: [[{ node: "Prepare Data", type: "main", index: 0 }]],
      },
      "Prepare Data": {
        main: [[{ node: "Google Sheets", type: "main", index: 0 }]],
      },
      "Google Sheets": {
        main: [[{ node: "Success", type: "main", index: 0 }]],
      },
    },
  };
}
