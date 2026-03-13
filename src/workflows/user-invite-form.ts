/**
 * n8n workflow: User Invite Form
 *
 * Flow:
 *   [Form Trigger: name + email]
 *     → [Invite User via n8n API]
 *       → [Success: show confirmation page]
 *       → [Error: show error page]
 *
 * Once deployed, n8n gives you a public form URL like:
 *   https://n8n.umirai.ai/form/<form-id>
 */

export function buildUserInviteFormWorkflow(n8nBaseUrl: string, n8nApiKey: string) {
  const base = n8nBaseUrl.replace(/\/$/, "");

  return {
    name: "User Invite Form",
    active: true,
    settings: {
      executionOrder: "v1",
    },
    nodes: [
      // ── 1. Form Trigger ───────────────────────────────────────────────────
      {
        id: "form-trigger",
        name: "User Invite Form",
        type: "n8n-nodes-base.formTrigger",
        typeVersion: 2.2,
        position: [200, 300],
        webhookId: "user-invite-form",
        parameters: {
          formTitle: "Add New n8n User",
          formDescription: "Fill in the details below. The user will receive an email with their invite link.",
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
                fieldLabel: "Role",
                fieldType: "dropdown",
                requiredField: true,
                fieldOptions: {
                  values: [
                    { option: "Member" },
                    { option: "Admin" },
                  ],
                },
              },
            ],
          },
          responseMode: "responseNode",
          options: {},
        },
      },

      // ── 2. Map role to n8n role string ────────────────────────────────────
      {
        id: "map-role",
        name: "Prepare Data",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [450, 300],
        parameters: {
          jsCode: `
const name = $input.first().json['Full Name']?.trim();
const email = $input.first().json['Email Address']?.trim().toLowerCase();
const roleInput = $input.first().json['Role'] || 'Member';

if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
  throw new Error('Invalid email address: ' + email);
}

const role = roleInput === 'Admin' ? 'global:admin' : 'global:member';

return [{ json: { name, email, role } }];
          `.trim(),
        },
      },

      // ── 3. Call n8n API to invite user ────────────────────────────────────
      {
        id: "invite-user",
        name: "Invite User",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [700, 300],
        parameters: {
          method: "POST",
          url: `${base}/api/v1/users`,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: n8nApiKey },
              { name: "Content-Type", value: "application/json" },
            ],
          },
          sendBody: true,
          contentType: "json",
          jsonBody: `={{ JSON.stringify([{ "email": $json.email, "role": $json.role }]) }}`,
          options: {
            response: {
              response: {
                neverError: true,
                responseFormat: "json",
              },
            },
          },
        },
      },

      // ── 4a. Success page ──────────────────────────────────────────────────
      {
        id: "form-success",
        name: "Success",
        type: "n8n-nodes-base.form",
        typeVersion: 1,
        position: [950, 200],
        parameters: {
          operation: "completion",
          completionTitle: "✅ Invitation Sent!",
          completionMessage: `={{ "An invite link has been sent to " + $('Prepare Data').first().json.email + ". They can use it to set their password and log in." }}`,
          options: {},
        },
      },

      // ── 4b. Error page ────────────────────────────────────────────────────
      {
        id: "form-error",
        name: "Error",
        type: "n8n-nodes-base.form",
        typeVersion: 1,
        position: [950, 450],
        parameters: {
          operation: "completion",
          completionTitle: "❌ Something went wrong",
          completionMessage: `={{ "Could not invite user: " + ($json.message || JSON.stringify($json)) }}`,
          options: {},
        },
      },
    ],

    connections: {
      "User Invite Form": {
        main: [[{ node: "Prepare Data", type: "main", index: 0 }]],
      },
      "Prepare Data": {
        main: [[{ node: "Invite User", type: "main", index: 0 }]],
        error: [[{ node: "Error", type: "main", index: 0 }]],
      },
      "Invite User": {
        main: [[{ node: "Success", type: "main", index: 0 }]],
        error: [[{ node: "Error", type: "main", index: 0 }]],
      },
    },
  };
}
