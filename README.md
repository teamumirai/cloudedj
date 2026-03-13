# cloudedj-n8n — MCP Server for n8n Control

Control your n8n instance via Claude using the Model Context Protocol (MCP).

## Setup

```bash
npm install
```

## Usage

### With Claude Code (recommended)

This project includes `.mcp.json` — Claude Code will automatically load the MCP server when you open this folder. Then you can ask Claude things like:

- "List all my workflows"
- "Activate workflow 42"
- "Show me the last 10 failed executions"
- "Trigger workflow XYZ with this data: {...}"

### Run manually

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflows |
| `get_workflow` | Get full workflow details |
| `activate_workflow` | Enable a workflow |
| `deactivate_workflow` | Disable a workflow |
| `execute_workflow` | Manually trigger a workflow |
| `delete_workflow` | Delete a workflow |
| `list_executions` | List executions (filter by workflow/status) |
| `get_execution` | Get execution details |
| `delete_execution` | Delete an execution record |
| `list_credentials` | List credential names |
| `list_tags` | List workflow tags |
| `list_variables` | List n8n variables |

## Configuration

Credentials are stored in `.env`:

```
N8N_BASE_URL=https://n8n.umirai.ai
N8N_API_KEY=your-api-key
```
