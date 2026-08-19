import { User, Project, ProjectSummary, StepKey } from '../../shared/types.js';

const API_BASE = '/api';

export function getStoredUserEmail(): string {
  return localStorage.getItem('gradion_user_email') || '';
}

export function setStoredUser(user: User): void {
  localStorage.setItem('gradion_user_email', user.email);
  localStorage.setItem('gradion_user_name', user.name);
  localStorage.setItem('gradion_user_id', user.id);
}

export function clearStoredUser(): void {
  localStorage.removeItem('gradion_user_email');
  localStorage.removeItem('gradion_user_name');
  localStorage.removeItem('gradion_user_id');
}

export function getStoredUser(): User | null {
  const email = localStorage.getItem('gradion_user_email');
  const name = localStorage.getItem('gradion_user_name');
  const id = localStorage.getItem('gradion_user_id');

  if (!email || !id) return null;
  return { id, name: name || email.split('@')[0], email, createdAt: 0 };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const email = getStoredUserEmail();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (email) {
    headers['x-user-email'] = email;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = response.status;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code = data.code;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  async login(name: string, email: string): Promise<{ user: User }> {
    const res = await request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
    setStoredUser(res.user);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  // Projects
  async listProjects(): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/projects');
  },

  async getProject(id: string): Promise<Project> {
    return request<Project>(`/projects/${id}`);
  },

  async createProject(title: string, bookText: string): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ title, bookText }),
    });
  },

  // Pipeline
  async executeStep(id: string, stepKey: StepKey, customStyle?: string): Promise<Project> {
    return request<Project>(`/projects/${id}/step/${stepKey}`, {
      method: 'POST',
      body: JSON.stringify({ customStyle }),
    });
  },

  async recoverProject(id: string): Promise<Project> {
    return request<Project>(`/projects/${id}/recover`, {
      method: 'POST',
    });
  },
};
