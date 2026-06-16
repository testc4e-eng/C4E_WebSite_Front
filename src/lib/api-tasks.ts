import api from './api';

export type WorkflowTaskStatus = 'pending' | 'approved' | 'rejected';

export interface WorkflowTask {
  id: number;
  title: string;
  description?: string | null;
  projet: string;
  heures: number;
  task_date: string;
  created_by: number;
  manager_name: string;
  equipe?: string | null;
  departement?: string | null;
  status: WorkflowTaskStatus;
  validated_by?: number | null;
  validated_at?: string | null;
  created_at: string;
  updated_at: string;
  manager_full_name?: string;
  validated_by_name?: string;
}

export interface TaskFilters {
  equipe?: string;
  manager?: string;
  status?: WorkflowTaskStatus | '';
  year?: number;
  week?: number;
}

function toQuery(filters: TaskFilters = {}) {
  const params = new URLSearchParams();
  if (filters.equipe) params.set('equipe', filters.equipe);
  if (filters.manager) params.set('manager', filters.manager);
  if (filters.status) params.set('status', filters.status);
  if (filters.year) params.set('year', String(filters.year));
  if (filters.week) params.set('week', String(filters.week));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const tasksApi = {
  createTask: (payload: {
    title: string;
    description?: string;
    projet: string;
    heures: number;
    date: string;
    departement?: string;
  }) => api.post<WorkflowTask>('/api/tasks', null, payload),

  getMyTasks: () => api.get<WorkflowTask[]>('/api/tasks/mine'),

  getAllTasks: (filters?: TaskFilters) =>
    api.get<WorkflowTask[]>(`/api/tasks${toQuery(filters)}`),

  getPendingTasks: (filters?: Omit<TaskFilters, 'status'>) =>
    api.get<WorkflowTask[]>(`/api/tasks/pending${toQuery(filters || {})}`),

  approveTask: (id: number) =>
    api.put<WorkflowTask>(`/api/tasks/${id}/approve`, null, {}),

  rejectTask: (id: number) =>
    api.put<WorkflowTask>(`/api/tasks/${id}/reject`, null, {}),
};

