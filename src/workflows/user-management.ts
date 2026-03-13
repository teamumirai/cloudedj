/**
 * n8n workflow: User Management Automation
 *
 * Webhook endpoints:
 *   POST /webhook/user-management/add
 *     Body: { "email": "user@example.com", "role": "global:member" }
 *     → Invites user & sends them an invite link
 *
 *   POST /webhook/user-management/delete
 *     Body: { "id": "<user-id>" }
 *     → Removes user from n8n
 *
 *   GET  /webhook/user-management/list
 *     → Returns list of all users
 */

export function buildUserManagementWorkflow(n8nBaseUrl: string, n8nApiKey: string) {
  return {
    name: "User Management Automation",
    active: true,
    settings: {
      executionOrder: "v1",
    },
    nodes: [
      // ── ADD USER ──────────────────────────────────────────────────────────
      {
        id: "webhook-add",
        name: "Webhook: Add User",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [200, 200],
        parameters: {
          httpMethod: "POST",
          path: "user-management/add",
          responseMode: "responseNode",
          options: {},
        },
        webhookId: "user-mgmt-add",
      },
      {
        id: "validate-add",
        name: "Validate Add Input",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [450, 200],
        parameters: {
          jsCode: `
const email = $input.first().json.body?.email;
const role = $input.first().json.body?.role || 'global:member';

if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
  throw new Error('Invalid or missing email address');
}

const validRoles = ['global:member', 'global:admin'];
if (!validRoles.includes(role)) {
  throw new Error('Invalid role. Use: global:member or global:admin');
}

return [{ json: { email, role } }];
          `.trim(),
        },
      },
      {
        id: "http-add-user",
        name: "n8n API: Invite User",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [700, 200],
        parameters: {
          method: "POST",
          url: `${n8nBaseUrl.replace(/\/$/, "")}/api/v1/users`,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: n8nApiKey },
              { name: "Content-Type", value: "application/json" },
            ],
          },
          sendBody: true,
          contentType: "json",
          body: `=[{{ JSON.stringify([{ "email": $json.email, "role": $json.role }]) }}]`,
          options: {},
        },
      },
      {
        id: "respond-add",
        name: "Respond: User Added",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [950, 200],
        parameters: {
          respondWith: "json",
          responseBody: `={{ JSON.stringify({ success: true, message: "Invitation sent to " + $('Validate Add Input').first().json.email, data: $json }) }}`,
          options: {
            responseCode: 200,
          },
        },
      },
      {
        id: "respond-add-error",
        name: "Respond: Add Error",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [700, 400],
        parameters: {
          respondWith: "json",
          responseBody: `={{ JSON.stringify({ success: false, error: $json.message }) }}`,
          options: {
            responseCode: 400,
          },
        },
      },

      // ── DELETE USER ───────────────────────────────────────────────────────
      {
        id: "webhook-delete",
        name: "Webhook: Delete User",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [200, 600],
        parameters: {
          httpMethod: "POST",
          path: "user-management/delete",
          responseMode: "responseNode",
          options: {},
        },
        webhookId: "user-mgmt-delete",
      },
      {
        id: "http-delete-user",
        name: "n8n API: Delete User",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [450, 600],
        parameters: {
          method: "DELETE",
          url: `=${n8nBaseUrl.replace(/\/$/, "")}/api/v1/users/{{ $json.body.id }}`,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: n8nApiKey },
            ],
          },
          options: { response: { response: { neverError: true } } },
        },
      },
      {
        id: "respond-delete",
        name: "Respond: User Deleted",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [700, 600],
        parameters: {
          respondWith: "json",
          responseBody: `={{ JSON.stringify({ success: true, message: "User " + $('Webhook: Delete User').first().json.body.id + " deleted" }) }}`,
          options: { responseCode: 200 },
        },
      },

      // ── LIST USERS ────────────────────────────────────────────────────────
      {
        id: "webhook-list",
        name: "Webhook: List Users",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [200, 1000],
        parameters: {
          httpMethod: "GET",
          path: "user-management/list",
          responseMode: "responseNode",
          options: {},
        },
        webhookId: "user-mgmt-list",
      },
      {
        id: "http-list-users",
        name: "n8n API: List Users",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [450, 1000],
        parameters: {
          method: "GET",
          url: `${n8nBaseUrl.replace(/\/$/, "")}/api/v1/users`,
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "X-N8N-API-KEY", value: n8nApiKey },
            ],
          },
          options: {},
        },
      },
      {
        id: "respond-list",
        name: "Respond: Users List",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [700, 1000],
        parameters: {
          respondWith: "json",
          responseBody: `={{ JSON.stringify({ success: true, users: $json.data }) }}`,
          options: { responseCode: 200 },
        },
      },
    ],

    connections: {
      "Webhook: Add User": {
        main: [[{ node: "Validate Add Input", type: "main", index: 0 }]],
      },
      "Validate Add Input": {
        main: [[{ node: "n8n API: Invite User", type: "main", index: 0 }]],
        error: [[{ node: "Respond: Add Error", type: "main", index: 0 }]],
      },
      "n8n API: Invite User": {
        main: [[{ node: "Respond: User Added", type: "main", index: 0 }]],
      },
      "Webhook: Delete User": {
        main: [[{ node: "n8n API: Delete User", type: "main", index: 0 }]],
      },
      "n8n API: Delete User": {
        main: [[{ node: "Respond: User Deleted", type: "main", index: 0 }]],
      },
      "Webhook: List Users": {
        main: [[{ node: "n8n API: List Users", type: "main", index: 0 }]],
      },
      "n8n API: List Users": {
        main: [[{ node: "Respond: Users List", type: "main", index: 0 }]],
      },
    },
  };
}
