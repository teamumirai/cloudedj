import axios, { AxiosInstance } from "axios";

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: unknown[];
  connections?: unknown;
  settings?: unknown;
  tags?: { id: string; name: string }[];
}

export interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: string;
}

export interface WorkflowList {
  data: Workflow[];
  nextCursor?: string;
}

export interface ExecutionList {
  data: Execution[];
  nextCursor?: string;
}

export class N8nClient {
  private http: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this.http = axios.create({
      baseURL: `${baseUrl.replace(/\/$/, "")}/api/v1`,
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async listWorkflows(limit = 100, cursor?: string): Promise<WorkflowList> {
    const params: Record<string, unknown> = { limit };
    if (cursor) params.cursor = cursor;
    const res = await this.http.get("/workflows", { params });
    return res.data;
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const res = await this.http.get(`/workflows/${id}`);
    return res.data;
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    const res = await this.http.patch(`/workflows/${id}`, { active: true });
    return res.data;
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    const res = await this.http.patch(`/workflows/${id}`, { active: false });
    return res.data;
  }

  async executeWorkflow(id: string, data?: Record<string, unknown>): Promise<{ executionId: number }> {
    const res = await this.http.post(`/workflows/${id}/run`, data ?? {});
    return res.data;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.http.delete(`/workflows/${id}`);
  }

  async listExecutions(workflowId?: string, status?: string, limit = 50): Promise<ExecutionList> {
    const params: Record<string, unknown> = { limit };
    if (workflowId) params.workflowId = workflowId;
    if (status) params.status = status;
    const res = await this.http.get("/executions", { params });
    return res.data;
  }

  async getExecution(id: string): Promise<Execution> {
    const res = await this.http.get(`/executions/${id}`);
    return res.data;
  }

  async deleteExecution(id: string): Promise<void> {
    await this.http.delete(`/executions/${id}`);
  }

  async getCredentials(): Promise<{ data: { id: string; name: string; type: string }[] }> {
    const res = await this.http.get("/credentials");
    return res.data;
  }

  async getTags(): Promise<{ data: { id: string; name: string }[] }> {
    const res = await this.http.get("/tags");
    return res.data;
  }

  async getVariables(): Promise<{ data: { id: string; key: string; value: string }[] }> {
    const res = await this.http.get("/variables");
    return res.data;
  }
}
