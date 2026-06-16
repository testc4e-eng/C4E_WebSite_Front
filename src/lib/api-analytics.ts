import api, { apiUrl } from './api';

// Interfaces for Referentiel
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
}

export interface TaskCategory {
  id: number;
  name: string;
  description?: string;
  is_billable: boolean;
  team_id?: number | null;
  team_name?: string | null;
  created_by?: number | null;
  is_active?: boolean;
}

export interface ProjectModule {
  id: number;
  project_id: number;
  name: string;
}

export interface Deliverable {
  id: number;
  project_id: number;
  project_module_id?: number;
  name: string;
  status: string;
}

// Interfaces for Timesheet Tasks
export interface TaskLog {
  id: number;
  user_id: number;
  assigned_to?: number | null;
  project_id: number;
  project_module_id?: number | null;
  mission_id?: number | null;
  deliverable_id?: number | null;
  category_id: number;
  task_date: string;
  task_title: string;
  task_description?: string;
  subtasks?: Array<{
    id?: string;
    title: string;
    description?: string;
    duration_hours?: number | null;
    status?: 'faite' | 'en_cours' | 'bloquee' | string;
  }>;
  duration_hours: number;
  estimated_hours?: number | null;
  difficulty_level: string;
  is_blocking: boolean;
  blocking_reason?: string;
  is_delay_risk: boolean;
  is_automation_candidate: boolean;
  has_delay_risk?: boolean;
  automation_candidate?: boolean;
  status: 'draft' | 'in_progress' | 'completed' | 'submitted' | 'validated' | 'manager_validated' | 'to_correct' | 'closed';
  validation_comment?: string;
  weekly_submission_id?: number;
  created_at: string;
  // Extra fields coming from joins sometimes
  user_name?: string;
  assignee_name?: string;
  project_name?: string;
  mission_name?: string;
  project_module_name?: string;
  category_name?: string;
  deliverable_name?: string;
}

export interface WeekSummary {
  year: number;
  week: number;
  report: {
    status: 'draft' | 'submitted' | 'approved' | 'to_correct' | 'manager_validated';
    submission_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'manager_validated' | null;
    submitted_at: string | null;
    approved_at: string | null;
  };
  totals: {
    weekHours: number;
    byDay: Array<{ date: string; hours: number }>;
  };
  counts: {
    draft: number;
    in_progress: number;
    completed: number;
    submitted: number;
    validated: number;
    to_correct: number;
    closed: number;
    manager_validated: number;
    [key: string]: number;
  };
  permissions: {
    can_edit: boolean;
    can_submit: boolean;
  };
}

// --- Dashboard Interfaces ---
export interface DGSummary {
  week: {
    start: string;
    end: string;
  };
  kpis: {
    totalHours: number;
    totalTasks: number;
    pendingValidation: number;
  };
  grouped_by_team: Record<string, Record<string, Array<{
    id: number;
    collaborateur: string;
    task: string;
    hours: number;
    date: string;
    status: string;
  }>>>;
}

export interface ProjectBudget {
  project_id: number;
  project_name: string;
  budget_hours: number | null;
  budget_amount: number | null;
  consumed_hours: number;
  consumed_amount: number | null;
  hours_consumption_percentage: number;
  budget_consumption_percentage: number | null;
}

export interface WeeklyProjectCost {
  project_id: number;
  project_name: string;
  year: number;
  week_number: number;
  total_hours: number;
  total_cost: number | null;
}

export interface TeamMember {
  user_id: number;
  user_name: string;
  active_projects_count: number;
  total_hours_logged: number;
  blocking_tasks_count: number;
}

export interface TeamMemberOption {
  id: number;
  nom: string;
  email?: string;
  role?: string;
  team_id?: number | null;
  team_name?: string | null;
  manager_id?: number | null;
}

export interface TopTask {
  id: number;
  task_title: string;
  project_name: string;
  user_name: string;
  duration_hours: number;
  task_date: string;
}

export interface BlockingTask {
  id: number;
  task_title: string;
  project_name: string;
  user_name: string;
  blocking_reason: string;
  task_date: string;
}

export interface ManagerTaskRow extends TaskLog {
  project_name?: string;
  mission_name?: string;
  sub_mission_id?: number | null;
  sub_mission_name?: string | null;
  assignee_name?: string | null;
  owner_name?: string | null;
  team_name?: string | null;
  manager_name?: string | null;
}

export interface ManagerTasksResponse {
  success: boolean;
  tasks: ManagerTaskRow[];
  summary: {
    total: number;
    submitted: number;
    validated: number;
    to_correct: number;
    week_hours_validated: number;
  };
}

export interface ProjectHierarchyResponse {
  success: boolean;
  project: {
    id: number;
    name: string;
    code?: string | null;
    status?: string | null;
  };
  missions: Array<{
    id: number;
    name: string;
    status?: string | null;
    progress_percent?: number | null;
    sub_missions: Array<{
      id: number;
      name: string;
      description?: string | null;
      tasks: Array<ManagerTaskRow>;
    }>;
    tasks: Array<ManagerTaskRow>;
  }>;
}

export interface ManagerWeekStatusResponse {
  success: boolean;
  week: number;
  year: number;
  status: 'brouillon' | 'en_validation_manager' | 'validee_manager' | 'soumise_dg' | 'validee_dg' | 'refusee' | string;
  totals: {
    total_tasks: number;
    submitted_tasks: number;
    validated_tasks: number;
    manager_validated_tasks: number;
    dg_approved_tasks: number;
    rejected_tasks: number;
    total_hours: number;
  };
}

export interface DgWeeklyValidationRow {
  id: number;
  user_id: number;
  year: number;
  week_number: number;
  status: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  submitted_to_dg_at?: string | null;
  collaborateur_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  manager_id?: number | null;
  manager_name?: string | null;
  tasks_count: number;
  total_hours: number;
  projects?: string | null;
}

export interface DgMissionClosureRow {
  id: number;
  project_id: number;
  project_name?: string | null;
  mission_name?: string | null;
  status: string;
  progress_percent?: number | null;
  requested_at?: string | null;
  manager_id?: number | null;
  manager_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  total_tasks?: number;
  total_weeks?: number;
}

export interface DgWeeklyValidationDetailTask {
  id: number;
  task_title?: string | null;
  task_date?: string | null;
  duration_hours?: number;
  estimated_hours?: number | null;
  status?: string | null;
  task_description?: string | null;
  project_name?: string | null;
  mission_name?: string | null;
  sub_mission_name?: string | null;
  collaborateur_name?: string | null;
}

export interface DgWeeklyValidationDetailsResponse {
  success: boolean;
  submission: DgWeeklyValidationRow | null;
  tasks: DgWeeklyValidationDetailTask[];
}

export interface DgMissionClosureDetailsResponse {
  success: boolean;
  mission: DgMissionClosureRow | null;
  tasks: DgWeeklyValidationDetailTask[];
  totals: {
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    totalWeeks: number;
    progressFinal: number;
  };
}

export interface TaskAlert {
  id: number;
  task_id: number;
  alert_type: 'BLOCKING_TASK' | 'DELAY_RISK' | 'AUTOMATION_CANDIDATE' | string;
  recipient_user_id: number;
  recipient_role: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task_title?: string;
  project_name?: string;
  user_name?: string;
  task_date?: string;
  blocking_reason?: string;
  status?: string;
  category_name?: string;
  project_module_name?: string;
  deliverable_name?: string;
}

export interface AlertsResponse {
  task_alerts?: TaskAlert[];
  blocking_tasks: BlockingTask[];
}

export interface ManagerSummary {
  week: {
    start: string;
    end: string;
  };
  kpis: {
    projectsRealised: number;
    blockingTasks: number;
    delayRiskTasks: number;
    rhCandidaturesReceived: number;
  };
  team: {
    members: number;
    tasks: number;
    submitted: number;
  };
}

export interface ProjectTrackingStats {
  projects: {
    total: number;
    planned: number;
    active: number;
    completed: number;
    delayed: number;
    onHold: number;
    changeVsLastMonth: number;
    currentMonth: number;
    previousMonth: number;
  };
  tasks: {
    total: number;
    inProgress: number;
    completed: number;
    delayAlerts: number;
    blocking: number;
  };
  rh: {
    candidatures: number;
    recruits: number;
    important: number;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  management?: {
    total: number;
    planned: number;
    active: number;
    completed: number;
    suspended: number;
    delayed: number;
    nearDeadline: number;
    finishedOnTime: number;
    finishedLate: number;
    averageProgress: number;
  };
}

export interface ProjectTrackingRow {
  project_id: number;
  project_name: string;
  description?: string | null;
  client_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  budget_hours: number;
  budget_amount: number;
  missions_count: number;
  deliverables_count: number;
  team_members_count: number;
  manager_name: string;
  manager_id?: number | null;
  team_names: string[];
  tasks_count: number;
  tasks_in_progress_count: number;
  tasks_completed_count: number;
  delay_count: number;
  blocking_count: number;
  total_hours: number;
  progress_percent: number;
  overdue_deliverables_count: number;
  upcoming_deliverables_count: number;
}

export interface ProjectDocumentDetail {
  id: number;
  project_id: number;
  doc_type: string;
  doc_label: string;
  file_path: string;
  original_name?: string | null;
  uploaded_by?: number | null;
  uploaded_by_name?: string | null;
  uploaded_at?: string | null;
  is_required?: boolean;
}

export interface ProjectManagementRow {
  id: number;
  name: string;
  code: string | null;
  description?: string | null;
  client_name?: string | null;
  start_date?: string | null;
  duration_months?: number | null;
  end_date?: string | null;
  expected_end_date?: string | null;
  actual_end_date?: string | null;
  project_manager_id?: number | null;
  project_manager_name?: string | null;
  manager_name?: string | null;
  chefProjet?: string | null;
  project_manager_ids?: number[];
  project_manager_names?: string[];
  team_id?: number | null;
  team_name?: string | null;
  team_ids?: number[];
  team_names?: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'planned' | 'active' | 'completed' | 'on_hold' | 'cancelled' | string;
  status_label?: string;
  progress: number;
  progress_percent?: number;
  avancement?: number;
  budget_amount?: number;
  financial_status?: string;
  cps_type?: string;
  is_invoiced?: boolean;
  is_paid?: boolean;
  risk_level?: string;
  cps_file_path?: string | null;
  real_end_date?: string | null;
  stop_order_date?: string | null;
  stop_order_file?: string | null;
  resume_order_date?: string | null;
  resume_order_file?: string | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  documents_count?: number;
  required_documents_count?: number;
  missing_documents_count?: number;
  tasks_count: number;
  tasks_completed_count: number;
  tasks_in_progress_count: number;
  delay_count: number;
  missions_count?: number;
  missions_completed_count?: number;
  days_remaining?: number | null;
  time_consumed_percent?: number;
  effective_duration_days?: number | null;
  stopped_days?: number | null;
  delay_status?: string;
  delay_label?: string;
  is_delayed?: boolean;
  is_near_deadline?: boolean;
}

export interface ProjectTrackingDashboard {
  stats: ProjectTrackingStats;
  projects: ProjectTrackingRow[];
  charts: {
    progressByProject: Array<{
      name: string;
      progress: number;
      tasks_completed: number;
      tasks_total: number;
    }>;
    tasksStatus: Array<{
      name: string;
      completed: number;
      in_progress: number;
    }>;
    monthlyEvolution: Array<{
      month: string;
      completed_tasks: number;
      in_progress_tasks: number;
      delay_tasks: number;
    }>;
  };
  filters: {
    statuses: string[];
    managers: string[];
    teams: string[];
  };
}

export interface ProjectModuleDetail {
  id: number;
  project_id?: number;
  name: string;
  description?: string | null;
  created_at?: string;
  deliverables_count: number;
  tasks_count: number;
}

export interface ProjectMissionDetail {
  id: number;
  project_id: number;
  name: string;
  description?: string | null;
  start_date?: string | null;
  duration_days?: number | null;
  end_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | string | null;
  estimated_cost: number;
  budget_percentage: number;
  manager_id?: number | null;
  manager_name?: string | null;
  manager_ids?: number[];
  manager_names?: string[];
  status: string;
  status_label?: string;
  stop_order_file?: string | null;
  stop_reason?: string | null;
  stopped_at?: string | null;
  created_by?: number | null;
  validated_by_manager_at?: string | null;
  validated_by_dg_at?: string | null;
  closed_at?: string | null;
  tasks_count: number;
  tasks_completed_count: number;
  tasks_in_progress_count: number;
  tasks_delayed_count: number;
  consumed_cost: number;
  progress_percent: number;
}

export interface ProjectDeliverableDetail {
  id: number;
  name: string;
  due_date?: string | null;
  status: string;
  created_at?: string;
  module_name?: string | null;
}

export interface ProjectTeamMember {
  user_id: number;
  user_name: string;
  email?: string | null;
  role: string;
  team_name: string;
  assigned_at?: string;
}

export interface ProjectTaskDetail {
  id: number;
  task_title: string;
  task_description?: string | null;
  task_date: string;
  duration_hours: number;
  estimated_hours?: number | null;
  status: string;
  is_blocking: boolean;
  is_delay_risk: boolean;
  blocking_reason?: string | null;
  validation_comment?: string | null;
  mission_id?: number | null;
  created_at?: string;
  user_name: string;
  mission_name?: string | null;
  module_name?: string | null;
  deliverable_name?: string | null;
  category_name?: string | null;
}

export interface ProjectTimelineItem {
  event_date: string;
  event_type: 'task' | 'deliverable' | string;
  title: string;
  status: string;
  owner_name?: string | null;
  details?: string | null;
}

export interface ProjectDetailsResponse {
  project: {
    project_id: number;
    project_name: string;
    code?: string | null;
    description?: string | null;
    client_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    expected_end_date?: string | null;
    actual_end_date?: string | null;
    duration_months?: number | null;
    project_manager_id?: number | null;
    project_manager_name?: string | null;
    project_manager_ids?: number[];
    project_manager_names?: string[];
    team_id?: number | null;
    team_name?: string | null;
    team_ids?: number[];
    team_names?: string[];
    priority?: string | null;
    status: string;
    created_at?: string;
    updated_at?: string;
    budget_hours: number;
    budget_amount: number;
    financial_status?: string;
    cps_type?: string;
    is_invoiced?: boolean;
    is_paid?: boolean;
    risk_level?: string;
    cps_file_path?: string | null;
    real_end_date?: string | null;
    stop_order_date?: string | null;
    stop_order_file?: string | null;
    resume_order_date?: string | null;
    resume_order_file?: string | null;
    progress_percent: number;
    tasks_count: number;
  tasks_completed_count: number;
  tasks_in_progress_count: number;
  delay_count: number;
  missions_count?: number;
  missions_completed_count?: number;
  missionsTotal?: number;
  missionsTerminees?: number;
  days_remaining?: number | null;
  time_consumed_percent?: number;
  effective_duration_days?: number | null;
  stopped_days?: number | null;
  delay_status?: string;
  delay_label?: string;
  retard?: string;
    documents_count?: number;
    required_documents_count?: number;
    missing_documents_count?: number;
    is_delayed?: boolean;
    is_near_deadline?: boolean;
  };
  documents?: ProjectDocumentDetail[];
  modules: ProjectModuleDetail[];
  missions?: ProjectMissionDetail[];
  deliverables: ProjectDeliverableDetail[];
  managers?: Array<{
    user_id: number;
    user_name: string;
    email?: string | null;
    assigned_at?: string;
  }>;
  teams?: Array<{
    team_id: number;
    team_name: string;
    members: Array<{
      user_id: number;
      user_name: string;
      email?: string | null;
      role: string;
    }>;
  }>;
  team: ProjectTeamMember[];
  tasks: {
    all: ProjectTaskDetail[];
    inProgress: ProjectTaskDetail[];
    completed: ProjectTaskDetail[];
    delayed: ProjectTaskDetail[];
  };
  timeline: ProjectTimelineItem[];
}

export interface ManagedProjectPayload {
  name: string;
  code: string;
  description?: string | null;
  client_name?: string | null;
  start_date: string;
  duration_months: number;
  expected_end_date?: string | null;
  project_manager_ids: number[];
  team_ids: number[];
  priority: 'low' | 'medium' | 'high';
  status: 'planned' | 'active' | 'completed' | 'on_hold';
  progress?: number;
  actual_end_date?: string | null;
  real_end_date?: string | null;
  budget_amount?: number;
  financial_status?: string;
  delay_status?: string | null;
  risk_level?: string;
  cps_file_path?: string | null;
  cps_type?: 'provisional' | 'definitive';
  is_invoiced?: boolean;
  is_paid?: boolean;
  stop_order_date?: string | null;
  stop_order_file?: string | null;
  resume_order_date?: string | null;
  resume_order_file?: string | null;
}

export interface ProjectFinancialEntry {
  id: number;
  project_id: number;
  manager_id: number;
  mission_id?: number | null;
  manager_name?: string;
  mission_name?: string | null;
  project_name?: string;
  project_code?: string | null;
  estimated_cost: number;
  resource_cost: number;
  operational_cost: number;
  miscellaneous_cost: number;
  consumed_hours_cost: number;
  comment?: string | null;
  created_at: string;
}

export interface ProjectFinancialSummary {
  project_id: number;
  project_name: string;
  budget_initial: number;
  consumed_cost: number;
  remaining_budget: number;
  variance: number;
  consumption_percent: number;
  totals: {
    estimated_cost: number;
    resource_cost: number;
    operational_cost: number;
    miscellaneous_cost: number;
    consumed_hours_cost: number;
  };
}

export interface ProjectAlert {
  id: number;
  project_id: number | null;
  type: string;
  severity: 'critical' | 'risk' | 'attention' | 'resolved' | string;
  title: string;
  message: string;
  status: 'open' | 'treated' | 'ignored' | 'critical' | 'resolved' | string;
  created_at: string;
  resolved_at?: string | null;
  validated_by?: number | null;
  threshold_value?: string | null;
  project_name?: string | null;
  project_code?: string | null;
  project_status?: string | null;
  project_progress?: number | null;
  budget_amount?: number | null;
}

export interface AlertSettings {
  budget_threshold: number[];
  delay_threshold_days: number[];
  cost_threshold: {
    project: number;
    daily: number;
    weekly: number;
  };
  notification_frequency: 'instant' | 'daily' | 'weekly' | string;
}

export interface UserNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_task_id?: number | null;
  related_project_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: UserNotification[];
  unread_count: number;
  counts: {
    saisie_taches: number;
    saisie_moi: number;
    saisie_equipe: number;
    validation_temps: number;
    gestion_taches: number;
  };
}

export interface ProjectAlertsResponse {
  alerts: ProjectAlert[];
  counts: {
    critical: number;
    risk: number;
    unresolved: number;
    total: number;
  };
  settings?: AlertSettings;
}

const EMPTY_PROJECT_ALERTS_RESPONSE: ProjectAlertsResponse = {
  alerts: [],
  counts: {
    critical: 0,
    risk: 0,
    unresolved: 0,
    total: 0,
  },
};

const DEFAULT_PROJECT_ALERT_SETTINGS: AlertSettings = {
  budget_threshold: [70, 85, 90],
  delay_threshold_days: [30, 15, 7],
  cost_threshold: {
    project: 0,
    daily: 0,
    weekly: 0,
  },
  notification_frequency: 'instant',
};

function toQueryString(params?: Record<string, unknown>) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

// API methods
export const analyticsApi = {
  // --- REFERENTIEL ---
  getProjects: () => api.get<Project[]>('/api/referentiel/projects'),
  createProject: (data: Partial<Project> & { name: string }) =>
    api.post<Project>('/api/referentiel/projects', null, data),
  getTaskCategories: () => api.get<TaskCategory[]>('/api/categories'),
  getProjectModules: () => api.get<ProjectModule[]>('/api/referentiel/project-modules'),
  getDeliverables: () => api.get<Deliverable[]>('/api/referentiel/deliverables'),

  // --- TIMESHEET SAISIE ---
  getMyWeek: (year: number, week: number) => 
    api.get<TaskLog[]>(`/api/timesheet/my-week?year=${year}&week=${week}`),

  getWeekSummary: (year: number, week: number) =>
    api.get<WeekSummary>(`/api/timesheet/week-summary?year=${year}&week=${week}`),
  
  createTask: (data: Partial<TaskLog>) => 
    api.post<TaskLog>('/api/timesheet/tasks', null, data),
    
  updateTask: (id: number, data: Partial<TaskLog>) => 
    api.put<TaskLog>(`/api/timesheet/tasks/${id}`, null, data),
    
  deleteTask: (id: number) => 
    api.delete<{ message: string }>(`/api/timesheet/tasks/${id}`),
    
  submitWeek: (year: number, week_number: number) => 
    api.post<{ message: string }>('/api/timesheet/submit-week', null, { year, week_number }),

  // --- TIMESHEET VALIDATION ---
  getTasksToValidate: () => 
    api.get<TaskLog[]>('/api/validation/tasks'),
    
  approveTask: (id: number, validation_comment?: string) => 
    api.post<TaskLog>(`/api/validation/tasks/${id}/approve`, null, { validation_comment }),
    
  requestCorrection: (id: number, validation_comment: string) => 
    api.post<TaskLog>(`/api/validation/tasks/${id}/request-correction`, null, { validation_comment }),
    
  closeWeek: (id: number) => 
    api.post<{ message: string }>(`/api/validation/week/${id}/close`),

  // --- DASHBOARDS ---
  getDGDashboard: () =>
    api.get<DGSummary>('/api/analytics/dashboard'),

  getProjectsDashboard: () =>
    api.get<ProjectBudget[]>('/api/dashboard/projects'),

  getProjectDetail: (id: number) =>
    api.get<WeeklyProjectCost[]>(`/api/dashboard/projects/${id}`),

  getTeamDashboard: () =>
    api.get<TeamMember[]>('/api/dashboard/team'),

  getManagerDashboard: () =>
    api.get<ManagerSummary>('/api/dashboard/manager'),

  getTasksDashboard: () =>
    api.get<TopTask[]>('/api/dashboard/tasks'),

  getAlerts: () =>
    api.get<AlertsResponse>('/api/dashboard/alerts'),

  getProjectsTrackingStats: () =>
    api.get<ProjectTrackingStats>('/api/projects/stats'),

  getProjectsTrackingDashboard: () =>
    api.get<ProjectTrackingDashboard>('/api/projects/dashboard'),

  getManagerTasks: (params?: { week?: string | number; year?: number; projectId?: number; userId?: number; status?: string }) =>
    api.get<ManagerTasksResponse>(`/api/manager/tasks${toQueryString(params as Record<string, unknown>)}`),

  validateManagerTask: (id: number, payload?: { validation_comment?: string }) =>
    api.put<{ success: boolean; task: ManagerTaskRow; message: string }>(`/api/manager/tasks/${id}/validate`, null, payload || {}),

  rejectManagerTask: (id: number, payload: { reason: string }) =>
    api.put<{ success: boolean; task: ManagerTaskRow; message: string }>(`/api/manager/tasks/${id}/reject`, null, payload),

  validateManagerWeek: (weekId: string, payload?: { year?: number }) =>
    api.post<{ success: boolean; message: string; week: number; year: number; totals: { validatedHours: number; validatedTasks: number; validatedSubmissions: number } }>(`/api/manager/weeks/${weekId}/validate`, null, payload || {}),

  getManagerWeekStatus: (weekId: string, params?: { year?: number }) =>
    api.get<ManagerWeekStatusResponse>(`/api/manager/weeks/${weekId}/status${toQueryString(params as Record<string, unknown>)}`),

  submitManagerWeekToDg: (weekId: string, payload?: { year?: number }) =>
    api.post<{ success: boolean; message: string; week: number; year: number; submissions: number }>(`/api/manager/weeks/${weekId}/submit-dg`, null, payload || {}),

  getDgWeeklyValidations: () =>
    api.get<{ success: boolean; submissions: DgWeeklyValidationRow[] }>('/api/dg/weekly-validations'),

  approveDgWeeklyValidation: (submissionId: number) =>
    api.post<{ success: boolean; message: string }>(`/api/dg/weekly-validations/${submissionId}/approve`, null, {}),

  rejectDgWeeklyValidation: (submissionId: number) =>
    api.post<{ success: boolean; message: string }>(`/api/dg/weekly-validations/${submissionId}/reject`, null, {}),

  getDgMissionClosures: () =>
    api.get<{ success: boolean; requests: DgMissionClosureRow[] }>('/api/dg/mission-closures'),

  getDgWeeklyValidationDetails: (submissionId: number) =>
    api.get<DgWeeklyValidationDetailsResponse>(`/api/dg/weekly-validations/${submissionId}/details`),

  getDgMissionClosureDetails: (missionId: number) =>
    api.get<DgMissionClosureDetailsResponse>(`/api/dg/mission-closures/${missionId}/details`),

  getProjectHierarchy: (projectId: number) =>
    api.get<ProjectHierarchyResponse>(`/api/projects/${projectId}/hierarchy`),

  createSubMission: (missionId: number, payload: { name: string; description?: string }) =>
    api.post<{ success: boolean; subMission: { id: number; name: string } }>(`/api/missions/${missionId}/submissions`, null, payload),

  createTaskUnderSubMission: (subMissionId: number, payload: Record<string, unknown>) =>
    api.post<{ success: boolean; task: ManagerTaskRow }>(`/api/submissions/${subMissionId}/tasks`, null, payload),

  getProjectTrackingDetails: (id: number) =>
    api.get<ProjectDetailsResponse>(`/api/projects/${id}/details`),

  getProjectGlobalView: (id: number) =>
    api.get<ProjectDetailsResponse>(`/api/projects/${id}/global-view`),

  getProjectMissions: (projectId: number) =>
    api.get<ProjectMissionDetail[]>(`/api/projects/${projectId}/missions`),

  getProjectDocuments: (projectId: number) =>
    api.get<ProjectDocumentDetail[]>(`/api/projects/${projectId}/documents`),

  uploadProjectDocument: async (projectId: number, file: File, docType: string, originalName?: string) => {
    const formData = new FormData();
    formData.append('document_file', file);
    formData.append('doc_type', docType);
    if (originalName) {
      formData.append('original_name', originalName);
    }
    const token = localStorage.getItem('token');
    const res = await fetch(apiUrl(`/api/projects/${projectId}/documents`), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Upload document impossible');
    }
    return res.json() as Promise<{ success: boolean; document: ProjectDocumentDetail }>;
  },

  createProjectMission: (projectId: number, data: Partial<ProjectMissionDetail> & Record<string, unknown>) =>
    api.post<{ success: boolean; mission: ProjectMissionDetail }>(`/api/projects/${projectId}/missions`, null, data),

  updateProjectMission: (projectId: number, missionId: number, data: Partial<ProjectMissionDetail> & Record<string, unknown>) =>
    api.put<{ success: boolean; mission: ProjectMissionDetail }>(`/api/projects/${projectId}/missions/${missionId}`, null, data),

  completeProjectMissionByManager: (projectId: number, missionId: number) =>
    api.post<{ success: boolean; mission: ProjectMissionDetail }>(`/api/projects/${projectId}/missions/${missionId}/manager-complete`, null, {}),

  validateProjectMissionByDg: (projectId: number, missionId: number) =>
    api.post<{ success: boolean; mission: ProjectMissionDetail }>(`/api/projects/${projectId}/missions/${missionId}/validate-dg`, null, {}),

  closeProjectMission: (projectId: number, missionId: number) =>
    api.post<{ success: boolean; mission: ProjectMissionDetail }>(`/api/projects/${projectId}/missions/${missionId}/close`, null, {}),

  stopProjectMission: (projectId: number, missionId: number, data: { status: 'arretee' | 'suspendue'; stop_order_file?: string | null; stop_reason?: string | null }) =>
    api.post<{ success: boolean; mission: ProjectMissionDetail }>(`/api/projects/${projectId}/missions/${missionId}/stop`, null, data),

  getManagedProjects: () =>
    api.get<ProjectManagementRow[]>('/api/projects'),

  getManagedProjectById: (id: number) =>
    api.get<ProjectManagementRow>(`/api/projects/${id}`),

  getManagedProjectStats: () =>
    api.get<ProjectTrackingStats>('/api/projects/stats'),

  createManagedProject: (data: ManagedProjectPayload) =>
    api.post<ProjectManagementRow>('/api/projects', null, data),

  updateManagedProject: (id: number, data: ManagedProjectPayload) =>
    api.put<ProjectManagementRow>(`/api/projects/${id}`, null, data),

  deleteManagedProject: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/api/projects/${id}`),

  getMyTeamMembers: () =>
    api.get<TeamMemberOption[]>('/api/teams/my-members'),

  getNotifications: () =>
    api.get<NotificationsResponse>('/api/notifications'),

  markNotificationRead: (id: number) =>
    api.put<{ success: boolean }>(`/api/notifications/${id}/read`, null, {}),

  markNotificationsReadAll: (scope?: string) =>
    api.put<{ success: boolean; updated?: number }>('/api/notifications/read-all', null, scope ? { scope } : {}),

  getNotificationsUnreadCount: () =>
    api.get<{ unread_count: number }>('/api/notifications/unread-count'),

  getProjectAlerts: async (params?: { severity?: string; type?: string; status?: string; projectId?: number; validated?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.projectId) searchParams.set('project_id', String(params.projectId));
    if (typeof params?.validated === 'boolean') searchParams.set('validated', String(params.validated));
    const query = searchParams.toString();
    try {
      return await api.get<ProjectAlertsResponse>(`/api/alerts${query ? `?${query}` : ''}`);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return EMPTY_PROJECT_ALERTS_RESPONSE;
      }
      throw error;
    }
  },

  getCriticalProjectAlerts: async () => {
    try {
      return await api.get<{ alerts: ProjectAlert[]; count: number }>('/api/alerts/critical');
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return { alerts: [], count: 0 };
      }
      throw error;
    }
  },

  getProjectAlertSettings: async () => {
    try {
      return await api.get<{ settings: AlertSettings }>('/api/alerts/settings');
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return { settings: DEFAULT_PROJECT_ALERT_SETTINGS };
      }
      throw error;
    }
  },

  saveProjectAlertSettings: (data: Partial<AlertSettings> & Record<string, unknown>) =>
    api.post<{ success: boolean; settings: AlertSettings }>('/api/alerts/settings', null, data),

  validateProjectAlert: (id: number, data: { status?: string; severity?: string } = {}) =>
    api.post<{ success: boolean; alert: ProjectAlert }>(`/api/alerts/${id}/validate`, null, data),

  resolveProjectAlert: (id: number) =>
    api.post<{ success: boolean; alert: ProjectAlert }>(`/api/alerts/${id}/resolve`, null, {}),

  ignoreProjectAlert: (id: number) =>
    api.post<{ success: boolean; alert: ProjectAlert }>(`/api/alerts/${id}/ignore`, null, {}),

  uploadProjectCps: async (file: File) => {
    const formData = new FormData();
    formData.append('cps_file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(apiUrl('/api/projects/upload-cps'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || 'Upload CPS impossible');
    }
    return res.json() as Promise<{ success: boolean; file_path: string; original_name: string }>;
  },

  getProjectFinancialEntries: (projectId: number) =>
    api.get<ProjectFinancialEntry[]>(`/api/projects/${projectId}/financial-entries`),

  createProjectFinancialEntry: (projectId: number, data: Partial<ProjectFinancialEntry>) =>
    api.post<{ success: boolean; entry: ProjectFinancialEntry }>(`/api/projects/${projectId}/financial-entries`, null, data),

  getProjectFinancialSummary: (projectId: number) =>
    api.get<ProjectFinancialSummary>(`/api/projects/${projectId}/financial-summary`),

  getGlobalFinancialEntries: (params?: { projectId?: number; missionId?: number; managerId?: number; dateFrom?: string; dateTo?: string; minCost?: number; maxCost?: number; sort?: 'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc' }) => {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('project_id', String(params.projectId));
    if (params?.missionId) searchParams.set('mission_id', String(params.missionId));
    if (params?.managerId) searchParams.set('manager_id', String(params.managerId));
    if (params?.dateFrom) searchParams.set('date_from', params.dateFrom);
    if (params?.dateTo) searchParams.set('date_to', params.dateTo);
    if (params?.minCost !== undefined) searchParams.set('min_cost', String(params.minCost));
    if (params?.maxCost !== undefined) searchParams.set('max_cost', String(params.maxCost));
    if (params?.sort) searchParams.set('sort', params.sort);
    const query = searchParams.toString();
    return api.get<ProjectFinancialEntry[]>(`/api/projects/financial/entries${query ? `?${query}` : ''}`);
  },

  getMyManagedProjects: () =>
    api.get<ProjectManagementRow[]>('/api/projects/my-managed/list'),

  exportCSV: (startDate?: string, endDate?: string) => {
    let url = '/api/reports/export/csv';
    const params: string[] = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get<Blob>(url);
  }
};
