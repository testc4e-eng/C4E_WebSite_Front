import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  Download,
  FileCheck2,
  Gauge,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { analyticsApi } from '../../lib/api-analytics';
import type {
  DgMissionClosureRow,
  DgWeeklyValidationRow,
  ManagerTaskRow,
  ProjectAlert,
  ProjectAlertsResponse,
  ProjectFinancialEntry,
  ProjectManagementRow,
  ProjectTrackingDashboard,
} from '../../lib/api-analytics';
import { formatDateForDisplay } from '../../lib/date';

type PeriodFilter = 'all' | '30d' | '90d' | '1y';
type PriorityLevel = 'critical' | 'risk' | 'attention' | 'good';

interface AnalyticsDGProps {
  initialVision?: 'metier' | 'ressource';
  initialFocus?: 'projet' | 'mission' | 'tache' | 'equipe' | 'collaborateur';
  pageTitle?: string;
  pageDescription?: string;
  scopeBadge?: string;
  exportPrefix?: string;
}

interface SectionCardProps {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

interface AttentionItem {
  id: string;
  title: string;
  project: string;
  mission: string;
  manager: string;
  deadline: string;
  impact: string;
  level: PriorityLevel;
  target: string;
}

const DONUT_COLORS = ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const BAR_COLORS = ['#4f46e5', '#7c3aed', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#14b8a6'];

const EMPTY_ALERTS: ProjectAlertsResponse = {
  alerts: [],
  counts: { critical: 0, risk: 0, unresolved: 0, total: 0 },
};

const SECTION_IDS = {
  pilotage: 'dg-pilotage',
  attention: 'dg-attention',
  projects: 'dg-projects',
  missions: 'dg-missions',
  finance: 'dg-finance',
  alerts: 'dg-alertes',
  validations: 'dg-validations',
  risks: 'dg-risks',
  notifications: 'dg-notifications',
};

const moneyFormatter = new Intl.NumberFormat('fr-MA', {
  maximumFractionDigits: 0,
});

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const formatMoney = (value: number) => `${moneyFormatter.format(Math.round(toNumber(value)))} MAD`;
const formatPct = (value: number) => `${toNumber(value).toFixed(1)}%`;
const formatHours = (value: number) => `${toNumber(value).toFixed(1)} h`;
const formatDate = (value?: string | null) => (value ? formatDateForDisplay(value) : '-');
const formatDayDelta = (value: number) => {
  if (value === 0) return '0 j';
  return value > 0 ? `${value} j` : `-${Math.abs(value)} j`;
};

const normalizeStatus = (status?: string | null) => String(status || '').toLowerCase();

const inPeriod = (dateValue: string | null | undefined, period: PeriodFilter) => {
  if (period === 'all') return true;
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const min = new Date(now);
  min.setDate(now.getDate() - days);
  return date >= min && date <= now;
};

const readProjectProgress = (project: ProjectManagementRow) =>
  toNumber(project.avancement ?? project.progress_percent ?? project.progress ?? 0);

const readProjectBudget = (project: ProjectManagementRow) => toNumber(project.budget_amount ?? 0);

const readProjectManager = (project: ProjectManagementRow | undefined) =>
  project?.project_manager_name || project?.manager_name || project?.chefProjet || 'Non assigne';

const isProjectDelayed = (project: ProjectManagementRow) => {
  if (project.is_delayed) return true;
  if (toNumber(project.delay_count) > 0) return true;
  if (toNumber(project.days_remaining) < 0) return true;
  return normalizeStatus(project.delay_status).includes('retard');
};

const sumEntryCost = (entry: ProjectFinancialEntry) =>
  toNumber(entry.resource_cost) +
  toNumber(entry.operational_cost) +
  toNumber(entry.miscellaneous_cost) +
  toNumber(entry.consumed_hours_cost);

const alertTypeLabel = (type?: string) => {
  const normalized = String(type || '').toUpperCase();
  const labels: Record<string, string> = {
    DELAY_OVERDUE: 'Projet en retard',
    DELAY_WARNING: 'Risque de retard',
    BUDGET_OVERRUN: 'Dépassement budget',
    BUDGET_WARNING: 'Budget sous surveillance',
    PROJECT_DOCUMENTS_MISSING: 'Document obligatoire manquant',
    PROJECT_STOPPED: 'Projet arrêté',
    PROJECT_INVOICED_UNPAID: 'Facture non payée',
    PROGRESS_RISK: 'Risque planning',
    RISK_LEVEL: 'Risque élevé',
    MANAGER_BLOCKERS: 'Manager bloqué',
    TEAM_OVERLOAD: 'Équipe en surcharge',
    DG_VALIDATION_PENDING: 'Validation DG',
    MISSION_CLOSURE_PENDING: 'Mission à clôturer',
  };
  return labels[normalized] || type || 'Alerte';
};

const alertToneClass = (severity?: string) => {
  const tone = String(severity || '').toLowerCase();
  if (tone === 'critical') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'risk') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (tone === 'attention') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (tone === 'resolved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const alertToneDot = (severity?: string) => {
  const tone = String(severity || '').toLowerCase();
  if (tone === 'critical') return 'bg-red-500';
  if (tone === 'risk') return 'bg-amber-500';
  if (tone === 'attention') return 'bg-blue-500';
  if (tone === 'resolved') return 'bg-emerald-500';
  return 'bg-slate-400';
};

const getPayload = (value: unknown) => {
  if (value && typeof value === 'object' && 'data' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).data;
  }
  return value;
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const SectionCard: React.FC<SectionCardProps> = ({ id, eyebrow, title, description, action, className = '', children }) => (
  <section id={id} className={`rounded-[28px] border border-white/70 bg-white/85 shadow-sm shadow-slate-200/70 ${className}`}>
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.34em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">{title}</h2>
        {description && <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const AnalyticsDG: React.FC<AnalyticsDGProps> = ({
  pageTitle = 'Pilotage exécutif DG',
  pageDescription = 'Centre de commande stratégique pour les projets, missions, risques, finances et validations du Directeur Général.',
  scopeBadge = 'Direction Générale',
  exportPrefix = 'pilotage-executif-dg',
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const [trackingDashboard, setTrackingDashboard] = useState<ProjectTrackingDashboard | null>(null);
  const [managedProjects, setManagedProjects] = useState<ProjectManagementRow[]>([]);
  const [projectAlerts, setProjectAlerts] = useState<ProjectAlertsResponse>(EMPTY_ALERTS);
  const [weeklyValidations, setWeeklyValidations] = useState<DgWeeklyValidationRow[]>([]);
  const [missionClosures, setMissionClosures] = useState<DgMissionClosureRow[]>([]);
  const [globalTasks, setGlobalTasks] = useState<ManagerTaskRow[]>([]);
  const [financialEntries, setFinancialEntries] = useState<ProjectFinancialEntry[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodFilter>('90d');
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedManager, setSelectedManager] = useState('all');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const localWarnings: string[] = [];

    const [
      trackingResult,
      projectsResult,
      alertsResult,
      weeklyResult,
      missionsResult,
      tasksResult,
      financialResult,
      notificationsResult,
    ] = await Promise.allSettled([
      analyticsApi.getProjectsTrackingDashboard(),
      analyticsApi.getManagedProjects(),
      analyticsApi.getProjectAlerts(),
      analyticsApi.getDgWeeklyValidations(),
      analyticsApi.getDgMissionClosures(),
      analyticsApi.getManagerTasks(),
      analyticsApi.getGlobalFinancialEntries({ sort: 'date_desc' }),
      analyticsApi.getNotificationsUnreadCount(),
    ]);

    let coreSuccessCount = 0;

    if (trackingResult.status === 'fulfilled') {
      setTrackingDashboard(getPayload(trackingResult.value) as ProjectTrackingDashboard);
      coreSuccessCount += 1;
    } else {
      localWarnings.push('Données de pilotage global indisponibles.');
    }

    if (projectsResult.status === 'fulfilled') {
      const payload = getPayload(projectsResult.value);
      setManagedProjects(Array.isArray(payload) ? payload : []);
      coreSuccessCount += 1;
    } else {
      localWarnings.push('Liste des projets indisponible.');
    }

    if (alertsResult.status === 'fulfilled') {
      const payload = getPayload(alertsResult.value);
      setProjectAlerts((payload as ProjectAlertsResponse) || EMPTY_ALERTS);
      coreSuccessCount += 1;
    } else {
      localWarnings.push('Alertes DG indisponibles.');
    }

    if (weeklyResult.status === 'fulfilled') {
      const payload = getPayload(weeklyResult.value);
      setWeeklyValidations(Array.isArray(payload?.submissions) ? payload.submissions : []);
      coreSuccessCount += 1;
    } else {
      localWarnings.push('Soumissions hebdomadaires indisponibles.');
    }

    if (missionsResult.status === 'fulfilled') {
      const payload = getPayload(missionsResult.value);
      setMissionClosures(Array.isArray(payload?.requests) ? payload.requests : []);
      coreSuccessCount += 1;
    } else {
      localWarnings.push('Clôtures de missions indisponibles.');
    }

    if (tasksResult.status === 'fulfilled') {
      const payload = getPayload(tasksResult.value);
      setGlobalTasks(Array.isArray(payload?.tasks) ? payload.tasks : []);
      coreSuccessCount += 1;
    } else {
      localWarnings.push('Tâches globales indisponibles.');
    }

    if (financialResult.status === 'fulfilled') {
      const payload = getPayload(financialResult.value);
      setFinancialEntries(Array.isArray(payload) ? payload : []);
    } else {
      localWarnings.push('Historique financier indisponible.');
    }

    if (notificationsResult.status === 'fulfilled') {
      const payload = getPayload(notificationsResult.value);
      setNotificationCount(toNumber(payload?.unread_count ?? payload?.unreadCount ?? 0));
    } else {
      localWarnings.push('Notifications indisponibles.');
    }

    if (coreSuccessCount === 0) {
      setError('Impossible de charger le tableau de bord DG.');
    }

    setWarnings(localWarnings);
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const projectById = useMemo(() => new Map(managedProjects.map((project) => [project.id, project])), [managedProjects]);
  const selectedProjectId = selectedProject === 'all' ? null : Number(selectedProject);
  const selectedProjectName = selectedProjectId ? projectById.get(selectedProjectId)?.name : null;
  const searchQuery = search.trim().toLowerCase();

  const projectOptions = useMemo(
    () => ['all', ...managedProjects.map((project) => String(project.id))],
    [managedProjects],
  );

  const teamOptions = useMemo(() => {
    const values = new Set<string>();
    managedProjects.forEach((project) => {
      (project.team_names || []).forEach((team) => team && values.add(team));
      if (project.team_name) values.add(project.team_name);
    });
    weeklyValidations.forEach((row) => {
      if (row.team_name) values.add(row.team_name);
    });
    return ['all', ...Array.from(values)];
  }, [managedProjects, weeklyValidations]);

  const managerOptions = useMemo(() => {
    const values = new Set<string>();
    managedProjects.forEach((project) => {
      const manager = readProjectManager(project);
      if (manager) values.add(manager);
    });
    weeklyValidations.forEach((row) => {
      if (row.manager_name) values.add(row.manager_name);
    });
    missionClosures.forEach((row) => {
      if (row.manager_name) values.add(row.manager_name);
    });
    return ['all', ...Array.from(values)];
  }, [managedProjects, missionClosures, weeklyValidations]);

  const filteredProjects = useMemo(() => {
    return managedProjects.filter((project) => {
      const manager = readProjectManager(project);
      const teams = project.team_names?.length ? project.team_names : [project.team_name || 'Sans équipe'];
      const matchesProject = selectedProject === 'all' || String(project.id) === selectedProject;
      const matchesTeam = selectedTeam === 'all' || teams.includes(selectedTeam);
      const matchesManager = selectedManager === 'all' || manager === selectedManager;
      const matchesSearch =
        !searchQuery ||
        project.name.toLowerCase().includes(searchQuery) ||
        manager.toLowerCase().includes(searchQuery) ||
        (project.code || '').toLowerCase().includes(searchQuery) ||
        (project.description || '').toLowerCase().includes(searchQuery);
      const matchesPeriod = inPeriod(project.updated_at || project.created_at || project.start_date, period);
      return matchesProject && matchesTeam && matchesManager && matchesSearch && matchesPeriod;
    });
  }, [managedProjects, period, searchQuery, selectedManager, selectedProject, selectedTeam]);

  const filteredAlerts = useMemo(() => {
    return (projectAlerts.alerts || []).filter((alert) => {
      const project = alert.project_id ? projectById.get(alert.project_id) : managedProjects.find((item) => item.name === alert.project_name);
      const projectIdMatches = selectedProject === 'all' || (project?.id && String(project.id) === selectedProject);
      const projectNameMatches = selectedProject === 'all' || (selectedProjectName && alert.project_name === selectedProjectName);
      const matchesProject = projectIdMatches || projectNameMatches;
      const matchesTeam =
        selectedTeam === 'all' ||
        Boolean(project?.team_name && project.team_name === selectedTeam) ||
        Boolean(project?.team_names?.includes(selectedTeam));
      const matchesManager = selectedManager === 'all' || readProjectManager(project) === selectedManager;
      const matchesSearch =
        !searchQuery ||
        (alert.title || '').toLowerCase().includes(searchQuery) ||
        (alert.message || '').toLowerCase().includes(searchQuery) ||
        (alert.project_name || '').toLowerCase().includes(searchQuery);
      return matchesProject && matchesTeam && matchesManager && matchesSearch && inPeriod(alert.created_at, period);
    });
  }, [managedProjects, period, projectAlerts.alerts, projectById, searchQuery, selectedManager, selectedProject, selectedProjectName, selectedTeam]);

  const filteredValidations = useMemo(() => {
    return weeklyValidations.filter((row) => {
      const matchesProject =
        selectedProject === 'all' ||
        (selectedProjectName ? String(row.projects || '').toLowerCase().includes(selectedProjectName.toLowerCase()) : true);
      const matchesManager = selectedManager === 'all' || (row.manager_name || 'Non assigné') === selectedManager;
      const matchesTeam = selectedTeam === 'all' || (row.team_name || 'Sans équipe') === selectedTeam;
      const matchesSearch =
        !searchQuery ||
        (row.manager_name || '').toLowerCase().includes(searchQuery) ||
        (row.collaborateur_name || '').toLowerCase().includes(searchQuery) ||
        (row.projects || '').toLowerCase().includes(searchQuery);
      return matchesProject && matchesManager && matchesTeam && matchesSearch && inPeriod(row.submitted_at || row.submitted_to_dg_at, period);
    });
  }, [period, searchQuery, selectedManager, selectedProject, selectedProjectName, selectedTeam, weeklyValidations]);

  const filteredMissionClosures = useMemo(() => {
    return missionClosures.filter((mission) => {
      const project = mission.project_id ? projectById.get(mission.project_id) : undefined;
      const matchesProject = selectedProject === 'all' || String(mission.project_id) === selectedProject || mission.project_name === selectedProjectName;
      const matchesManager = selectedManager === 'all' || (mission.manager_name || 'Non assigné') === selectedManager;
      const matchesTeam = selectedTeam === 'all' || Boolean(project?.team_name && project.team_name === selectedTeam) || Boolean(project?.team_names?.includes(selectedTeam));
      const matchesSearch =
        !searchQuery ||
        (mission.project_name || '').toLowerCase().includes(searchQuery) ||
        (mission.mission_name || '').toLowerCase().includes(searchQuery) ||
        (mission.manager_name || '').toLowerCase().includes(searchQuery);
      return matchesProject && matchesManager && matchesTeam && matchesSearch && inPeriod(mission.requested_at || mission.end_date, period);
    });
  }, [missionClosures, period, projectById, searchQuery, selectedManager, selectedProject, selectedProjectName, selectedTeam]);

  const filteredTasks = useMemo(() => {
    return globalTasks.filter((task) => {
      const project = task.project_id ? projectById.get(task.project_id) : undefined;
      const projectName = task.project_name || 'Projet';
      const missionName = task.mission_name || task.sub_mission_name || 'Mission';
      const collaboratorName = task.assignee_name || task.user_name || 'Collaborateur';
      const managerName = task.manager_name || task.owner_name || 'Manager';
      const teamName = task.team_name || project?.team_name || 'Sans équipe';
      const matchesProject = selectedProject === 'all' || String(task.project_id || '') === selectedProject || projectName === selectedProjectName;
      const matchesTeam = selectedTeam === 'all' || teamName === selectedTeam;
      const matchesManager = selectedManager === 'all' || managerName === selectedManager;
      const matchesSearch =
        !searchQuery ||
        projectName.toLowerCase().includes(searchQuery) ||
        missionName.toLowerCase().includes(searchQuery) ||
        String(task.task_title || '').toLowerCase().includes(searchQuery) ||
        String(task.task_description || '').toLowerCase().includes(searchQuery) ||
        collaboratorName.toLowerCase().includes(searchQuery) ||
        managerName.toLowerCase().includes(searchQuery) ||
        teamName.toLowerCase().includes(searchQuery);
      return matchesProject && matchesTeam && matchesManager && matchesSearch && inPeriod(task.task_date, period);
    });
  }, [globalTasks, period, projectById, searchQuery, selectedManager, selectedProject, selectedProjectName, selectedTeam]);

  const filteredFinancialEntries = useMemo(() => {
    return financialEntries.filter((entry) => {
      const project = entry.project_id ? projectById.get(entry.project_id) : undefined;
      const projectName = entry.project_name || project?.name || 'Projet';
      const managerName = entry.manager_name || readProjectManager(project);
      const matchesProject = selectedProject === 'all' || String(entry.project_id || '') === selectedProject || projectName === selectedProjectName;
      const matchesManager = selectedManager === 'all' || managerName === selectedManager;
      const matchesTeam =
        selectedTeam === 'all' ||
        Boolean(project?.team_name && project.team_name === selectedTeam) ||
        Boolean(project?.team_names?.includes(selectedTeam));
      const matchesSearch =
        !searchQuery ||
        projectName.toLowerCase().includes(searchQuery) ||
        (entry.comment || '').toLowerCase().includes(searchQuery) ||
        (entry.mission_name || '').toLowerCase().includes(searchQuery) ||
        managerName.toLowerCase().includes(searchQuery);
      return matchesProject && matchesManager && matchesTeam && matchesSearch && inPeriod(entry.created_at, period);
    });
  }, [financialEntries, period, projectById, searchQuery, selectedManager, selectedProject, selectedProjectName, selectedTeam]);

  const projectFinanceMap = useMemo(() => {
    const map = new Map<number, { consumed: number; estimated: number; entries: ProjectFinancialEntry[]; lastUpdate: string | null }>();
    filteredFinancialEntries.forEach((entry) => {
      const key = entry.project_id;
      if (!key) return;
      const current = map.get(key) || { consumed: 0, estimated: 0, entries: [], lastUpdate: null };
      const total = sumEntryCost(entry);
      current.consumed += total;
      current.estimated += toNumber(entry.estimated_cost);
      current.entries.push(entry);
      if (!current.lastUpdate || new Date(entry.created_at).getTime() > new Date(current.lastUpdate).getTime()) {
        current.lastUpdate = entry.created_at;
      }
      map.set(key, current);
    });
    return map;
  }, [filteredFinancialEntries]);

  const missionFinanceMap = useMemo(() => {
    const map = new Map<number, { consumed: number; estimated: number; entries: ProjectFinancialEntry[]; lastUpdate: string | null }>();
    filteredFinancialEntries.forEach((entry) => {
      if (!entry.mission_id) return;
      const current = map.get(entry.mission_id) || { consumed: 0, estimated: 0, entries: [], lastUpdate: null };
      const total = sumEntryCost(entry);
      current.consumed += total;
      current.estimated += toNumber(entry.estimated_cost);
      current.entries.push(entry);
      if (!current.lastUpdate || new Date(entry.created_at).getTime() > new Date(current.lastUpdate).getTime()) {
        current.lastUpdate = entry.created_at;
      }
      map.set(entry.mission_id, current);
    });
    return map;
  }, [filteredFinancialEntries]);

  const projectMissionMap = useMemo(() => {
    const map = new Map<number, DgMissionClosureRow[]>();
    filteredMissionClosures.forEach((mission) => {
      const current = map.get(mission.project_id) || [];
      current.push(mission);
      map.set(mission.project_id, current);
    });
    return map;
  }, [filteredMissionClosures]);

  const teamInsights = useMemo(() => {
    const map = new Map<string, { team: string; hours: number; tasks: number; submissions: number; managers: Set<string> }>();
    filteredValidations.forEach((row) => {
      const team = row.team_name || 'Sans équipe';
      const current = map.get(team) || { team, hours: 0, tasks: 0, submissions: 0, managers: new Set<string>() };
      current.hours += toNumber(row.total_hours);
      current.tasks += toNumber(row.tasks_count);
      current.submissions += 1;
      if (row.manager_name) current.managers.add(row.manager_name);
      map.set(team, current);
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        overload: clamp((item.hours / 40) * 100 + item.tasks * 2.5),
        managerCount: item.managers.size,
      }))
      .sort((a, b) => b.overload - a.overload);
  }, [filteredValidations]);

  const managerBlockers = useMemo(() => {
    const map = new Map<string, { manager: string; blockedTasks: number; projects: Set<string>; missions: Set<string> }>();
    filteredTasks.forEach((task) => {
      if (!task.is_blocking) return;
      const manager = task.manager_name || task.owner_name || 'Manager';
      const current = map.get(manager) || { manager, blockedTasks: 0, projects: new Set<string>(), missions: new Set<string>() };
      current.blockedTasks += 1;
      if (task.project_name) current.projects.add(task.project_name);
      if (task.mission_name || task.sub_mission_name) current.missions.add(task.mission_name || task.sub_mission_name || '');
      map.set(manager, current);
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        projectCount: item.projects.size,
        missionCount: item.missions.size,
      }))
      .sort((a, b) => b.blockedTasks - a.blockedTasks);
  }, [filteredTasks]);

  const strategicProjects = useMemo(() => {
    return filteredProjects
      .map((project) => {
        const finance = projectFinanceMap.get(project.id);
        const budgetTotal = readProjectBudget(project);
        const consumed = finance?.consumed ?? (budgetTotal > 0 ? (budgetTotal * readProjectProgress(project)) / 100 : 0);
        const remaining = Math.max(0, budgetTotal - consumed);
        const budgetRate = budgetTotal > 0 ? (consumed / budgetTotal) * 100 : readProjectProgress(project);
        const delayedTasks = toNumber(project.delay_count);
        const blockedTasks = toNumber(project.blocking_count);
        const alertCount = filteredAlerts.filter((alert) => alert.project_id === project.id || alert.project_name === project.name).length;
        const riskScore = clamp(
          (isProjectDelayed(project) ? 25 : 0) +
            (budgetRate >= 100 ? 35 : budgetRate >= 90 ? 28 : budgetRate >= 75 ? 16 : 0) +
            (alertCount > 0 ? Math.min(20, alertCount * 4) : 0) +
            (blockedTasks > 0 ? Math.min(18, blockedTasks * 3) : 0) +
            (delayedTasks > 0 ? Math.min(18, delayedTasks * 2) : 0) +
            (toNumber(project.days_remaining) <= 0 ? 15 : toNumber(project.days_remaining) <= 15 ? 8 : 0),
        );
        const level: PriorityLevel = riskScore >= 65 ? 'critical' : riskScore >= 35 ? 'risk' : riskScore >= 20 ? 'attention' : 'good';
        return {
          id: project.id,
          project,
          consumed,
          remaining,
          budgetRate,
          riskScore,
          level,
          finance,
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [filteredAlerts, filteredProjects, projectFinanceMap]);

  const financeSummary = useMemo(() => {
    const budgetTotal = filteredProjects.reduce((sum, project) => sum + readProjectBudget(project), 0);
    const budgetConsumed = strategicProjects.reduce((sum, item) => sum + item.consumed, 0);
    const budgetRemaining = Math.max(0, budgetTotal - budgetConsumed);
    const overrunAmount = strategicProjects.reduce((sum, item) => sum + Math.max(0, item.consumed - readProjectBudget(item.project)), 0);
    const overrunProjects = strategicProjects.filter((item) => item.consumed > readProjectBudget(item.project)).length;
    const billedAmount = filteredProjects.reduce((sum, project) => sum + (project.is_invoiced ? readProjectBudget(project) : 0), 0);
    const paidAmount = filteredProjects.reduce((sum, project) => sum + (project.is_paid ? readProjectBudget(project) : 0), 0);
    const pendingAmount = Math.max(0, billedAmount - paidAmount);
    const estimatedCount = filteredFinancialEntries.length;
    const lastUpdate = filteredFinancialEntries.reduce<string | null>((latest, entry) => {
      if (!latest) return entry.created_at;
      return new Date(entry.created_at).getTime() > new Date(latest).getTime() ? entry.created_at : latest;
    }, null);
    const consumptionPercent = budgetTotal > 0 ? (budgetConsumed / budgetTotal) * 100 : 0;
    return {
      budgetTotal,
      budgetConsumed,
      budgetRemaining,
      overrunAmount,
      overrunProjects,
      billedAmount,
      paidAmount,
      pendingAmount,
      estimatedCount,
      lastUpdate,
      consumptionPercent,
    };
  }, [filteredFinancialEntries, filteredProjects, strategicProjects]);

  const monthlyFinance = useMemo(() => {
    const map = new Map<string, { month: string; consumed: number; estimated: number }>();
    filteredFinancialEntries.forEach((entry) => {
      const date = new Date(entry.created_at);
      if (Number.isNaN(date.getTime())) return;
      const month = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      const current = map.get(month) || { month, consumed: 0, estimated: 0 };
      current.consumed += sumEntryCost(entry);
      current.estimated += toNumber(entry.estimated_cost);
      map.set(month, current);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredFinancialEntries]);

  const financeBreakdown = useMemo(() => {
    const totals = filteredFinancialEntries.reduce(
      (acc, entry) => {
        acc.rh += toNumber(entry.resource_cost);
        acc.temps += toNumber(entry.consumed_hours_cost);
        acc.operationnel += toNumber(entry.operational_cost);
        acc.divers += toNumber(entry.miscellaneous_cost);
        return acc;
      },
      { rh: 0, temps: 0, operationnel: 0, divers: 0 },
    );
    return [
      { name: 'RH', value: totals.rh },
      { name: 'Temps', value: totals.temps },
      { name: 'Opérationnel', value: totals.operationnel },
      { name: 'Divers', value: totals.divers },
    ];
  }, [filteredFinancialEntries]);

  const projectBudgetChart = useMemo(
    () =>
      strategicProjects.slice(0, 8).map((item) => ({
        name: item.project.name,
        budget: readProjectBudget(item.project),
        consumed: item.consumed,
        remaining: item.remaining,
        rate: item.budgetRate,
      })),
    [strategicProjects],
  );

  const missionRows = useMemo(() => {
    return filteredMissionClosures.map((mission) => {
      const finance = missionFinanceMap.get(mission.id);
      const project = projectById.get(mission.project_id);
      const budgetConsumed = finance?.consumed ?? 0;
      const progress = clamp(toNumber(mission.progress_percent));
      let delayDays = 0;
      if (mission.end_date) {
        const end = new Date(mission.end_date);
        if (!Number.isNaN(end.getTime())) {
          const diff = Date.now() - end.getTime();
          delayDays = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
        }
      }
      const level: PriorityLevel = delayDays > 15 ? 'critical' : delayDays > 0 ? 'risk' : progress < 80 ? 'attention' : 'good';
      return {
        mission,
        project,
        budgetConsumed,
        progress,
        delayDays,
        level,
      };
    });
  }, [filteredMissionClosures, missionFinanceMap, projectById]);

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    filteredAlerts
      .filter((alert) => ['critical', 'risk', 'attention'].includes(normalizeStatus(alert.severity)))
      .slice(0, 4)
      .forEach((alert) => {
        const project = alert.project_id ? projectById.get(alert.project_id) : managedProjects.find((item) => item.name === alert.project_name);
        const mission = project ? projectMissionMap.get(project.id)?.[0] : undefined;
        const remainingDays = project ? toNumber(project.days_remaining) : 0;
        const impact =
          normalizeStatus(alert.type) === 'budget_overrun'
            ? `Impact budgétaire: ${formatMoney(Math.max(0, (projectFinanceMap.get(project?.id || 0)?.consumed ?? 0) - readProjectBudget(project || ({} as ProjectManagementRow))))}`
            : normalizeStatus(alert.type).includes('delay')
              ? `Retard: ${formatDayDelta(Math.abs(remainingDays))}`
              : alert.message;
        items.push({
          id: `alert-${alert.id}`,
          title: alert.title,
          project: project?.name || alert.project_name || '-',
          mission: mission?.mission_name || 'Mission critique',
          manager: readProjectManager(project),
          deadline: formatDate(project?.end_date || mission?.end_date || null),
          impact,
          level: normalizeStatus(alert.severity) === 'critical' ? 'critical' : normalizeStatus(alert.severity) === 'risk' ? 'risk' : 'attention',
          target: SECTION_IDS.alerts,
        });
      });

    missionRows.slice(0, 4).forEach((row) => {
      items.push({
        id: `mission-${row.mission.id}`,
        title: row.mission.mission_name || 'Mission à clôturer',
        project: row.project?.name || row.mission.project_name || '-',
        mission: row.mission.mission_name || '-',
        manager: row.mission.manager_name || readProjectManager(row.project),
        deadline: formatDate(row.mission.end_date || row.mission.requested_at || null),
        impact: `${formatMoney(row.budgetConsumed)} consommés`,
        level: row.level,
        target: SECTION_IDS.validations,
      });
    });

    filteredValidations.slice(0, 3).forEach((row) => {
      items.push({
        id: `validation-${row.id}`,
        title: `Validation en attente - Semaine ${row.week_number}`,
        project: row.projects || '-',
        mission: 'Semaine DG',
        manager: row.manager_name || 'Manager',
        deadline: formatDate(row.submitted_to_dg_at || row.submitted_at || null),
        impact: `${formatHours(row.total_hours)} / ${row.tasks_count} tâche(s)`,
        level: normalizeStatus(row.status) === 'approved' ? 'good' : 'attention',
        target: SECTION_IDS.validations,
      });
    });

    return items
      .sort((a, b) => {
        const priority: Record<PriorityLevel, number> = { critical: 4, risk: 3, attention: 2, good: 1 };
        return priority[b.level] - priority[a.level];
      })
      .slice(0, 8);
  }, [filteredAlerts, filteredValidations, missionRows, projectById, projectFinanceMap, projectMissionMap, managedProjects]);

  const alertTypeSummary = useMemo(() => {
    const counts = new Map<string, number>();
    filteredAlerts.forEach((alert) => {
      const key = alertTypeLabel(alert.type);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    if (filteredTasks.some((task) => task.is_blocking)) {
      counts.set('Tâches bloquées', filteredTasks.filter((task) => task.is_blocking).length);
    }
    if (teamInsights.some((team) => team.overload >= 80)) {
      counts.set('Équipes en surcharge', teamInsights.filter((team) => team.overload >= 80).length);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredAlerts, filteredTasks, teamInsights]);

  const riskRadar = useMemo(() => {
    const criticalAlerts = filteredAlerts.filter((alert) => normalizeStatus(alert.severity) === 'critical');
    const budgetOverruns = strategicProjects.filter((item) => item.consumed > readProjectBudget(item.project)).length;
    const delayedProjects = filteredProjects.filter(isProjectDelayed).length;
    const blockedTasks = filteredTasks.filter((task) => task.is_blocking).length;
    const overloadedTeams = teamInsights.filter((team) => team.overload >= 80).length;
    const stoppedProjects = filteredAlerts.filter((alert) => normalizeStatus(alert.type) === 'project_stopped').length;
    const missingDocuments = filteredAlerts.filter((alert) => normalizeStatus(alert.type) === 'project_documents_missing').length;
    const unpaidInvoices = filteredAlerts.filter((alert) => normalizeStatus(alert.type) === 'project_invoiced_unpaid').length;
    return [
      { subject: 'Financier', score: clamp(budgetOverruns * 25 + unpaidInvoices * 12 + financeSummary.consumptionPercent * 0.5) },
      { subject: 'Planning', score: clamp(delayedProjects * 20 + missionRows.filter((row) => row.delayDays > 0).length * 12 + criticalAlerts.length * 4) },
      { subject: 'Ressources', score: clamp(overloadedTeams * 25 + blockedTasks * 4) },
      { subject: 'Technique', score: clamp(blockedTasks * 10 + criticalAlerts.filter((alert) => normalizeStatus(alert.type) === 'progress_risk').length * 8) },
      { subject: 'Contractuel', score: clamp(missingDocuments * 25 + stoppedProjects * 20 + unpaidInvoices * 15) },
    ];
  }, [financeSummary.consumptionPercent, filteredAlerts, filteredProjects, filteredTasks, missionRows, strategicProjects, teamInsights]);

  const timelineFeed = useMemo(() => {
    const feed = [
      ...filteredAlerts.map((alert) => ({
        id: `alert-${alert.id}`,
        date: alert.created_at,
        title: alert.title,
        subtitle: `${alert.project_name || 'Projet'} • ${alertTypeLabel(alert.type)}`,
        level: normalizeStatus(alert.severity) as PriorityLevel,
      })),
      ...filteredValidations.map((row) => ({
        id: `validation-${row.id}`,
        date: row.submitted_to_dg_at || row.submitted_at || '',
        title: `Validation semaine ${row.week_number}`,
        subtitle: `${row.manager_name || 'Manager'} • ${formatHours(row.total_hours)}`,
        level: normalizeStatus(row.status) === 'approved' ? ('good' as PriorityLevel) : ('attention' as PriorityLevel),
      })),
      ...missionRows.map((row) => ({
        id: `mission-${row.mission.id}`,
        date: row.mission.requested_at || row.mission.end_date || '',
        title: row.mission.mission_name || 'Mission',
        subtitle: `${row.project?.name || row.mission.project_name || 'Projet'} • ${formatDayDelta(row.delayDays)}`,
        level: row.level,
      })),
    ];
    return feed
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [filteredAlerts, filteredValidations, missionRows]);

  const kpis = useMemo(() => {
    const delayedProjects = filteredProjects.filter(isProjectDelayed).length;
    const missionPendingClosures = missionRows.length;
    const budgetOverruns = strategicProjects.filter((item) => item.consumed > readProjectBudget(item.project)).length;
    const criticalAlerts = filteredAlerts.filter((alert) => normalizeStatus(alert.severity) === 'critical').length;
    const validationsPending = filteredValidations.length + missionRows.length;
    const blockedTasks = filteredTasks.filter((task) => task.is_blocking).length;
    const overloadedTeams = teamInsights.filter((team) => team.overload >= 80).length;
    const projectsToClose = filteredProjects.filter((project) => normalizeStatus(project.status) === 'completed' || readProjectProgress(project) >= 95).length;
    return {
      delayedProjects,
      missionPendingClosures,
      budgetOverruns,
      criticalAlerts,
      validationsPending,
      blockedTasks,
      overloadedTeams,
      projectsToClose,
    };
  }, [filteredAlerts, filteredProjects, filteredTasks, filteredValidations.length, missionRows.length, strategicProjects, teamInsights]);

  const exportRows = useMemo(
    () =>
      strategicProjects.map((item) => ({
        Projet: item.project.name,
        Manager: readProjectManager(item.project),
        Avancement: formatPct(readProjectProgress(item.project)),
        Budget_total: formatMoney(readProjectBudget(item.project)),
        Budget_consomme: formatMoney(item.consumed),
        Budget_restant: formatMoney(item.remaining),
        Délai_restant: formatDayDelta(toNumber(item.project.days_remaining)),
        Missions: toNumber(item.project.missions_count),
        Taches: toNumber(item.project.tasks_count),
        Risque: item.level,
      })),
    [strategicProjects],
  );

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExportCsv = () => {
    if (exportRows.length === 0) return;
    const headers = Object.keys(exportRows[0]);
    const lines = [headers.map(csvEscape).join(',')];
    exportRows.forEach((row) => {
      lines.push(headers.map((header) => csvEscape((row as Record<string, unknown>)[header])).join(','));
    });
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportPrefix}-strategie.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const runBusyAction = async (key: string, handler: () => Promise<void>) => {
    try {
      setBusyAction(key);
      await handler();
      await loadDashboard();
    } catch (err: unknown) {
      setWarnings((current) => [...current, err instanceof Error ? err.message : 'Action impossible']);
    } finally {
      setBusyAction(null);
    }
  };

  const handleAlertAction = (alert: ProjectAlert, action: 'validate' | 'resolve' | 'ignore') =>
    runBusyAction(`alert-${alert.id}-${action}`, async () => {
      if (action === 'validate') {
        await analyticsApi.validateProjectAlert(alert.id, { status: 'treated' });
        return;
      }
      if (action === 'resolve') {
        await analyticsApi.resolveProjectAlert(alert.id);
        return;
      }
      await analyticsApi.ignoreProjectAlert(alert.id);
    });

  const handleWeekAction = (submissionId: number, action: 'approve' | 'reject') =>
    runBusyAction(`week-${submissionId}-${action}`, async () => {
      if (action === 'approve') {
        await analyticsApi.approveDgWeeklyValidation(submissionId);
        return;
      }
      await analyticsApi.rejectDgWeeklyValidation(submissionId);
    });

  const handleMissionAction = (projectId: number, missionId: number) =>
    runBusyAction(`mission-${missionId}`, async () => {
      await analyticsApi.validateProjectMissionByDg(projectId, missionId);
    });

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-slate-900">Erreur</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            onClick={() => void loadDashboard()}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const notificationBadge = Math.max(notificationCount, projectAlerts.counts.unresolved || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{scopeBadge}</Badge>
            <button
              type="button"
              onClick={() => scrollToSection(SECTION_IDS.notifications)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Bell className="h-3.5 w-3.5" />
              Notifications
              {notificationBadge > 0 && <span className="ml-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">{notificationBadge}</span>}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/task-analytics/alertes-dg')}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Centre d'alertes
            </button>
          </div>
        }
      />

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.join(' ')}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" />
        </div>
      ) : (
        <>
          <section className="rounded-[32px] border border-slate-900/5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 px-6 py-6 text-white shadow-2xl shadow-slate-200/60">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
              <div>
                <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Pilotage exécutif</Badge>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Le DG voit ce qui menace l’entreprise en moins de 30 secondes.</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  Projets en retard, missions à clôturer, dépassements budgétaires, validations en attente, risques de planning et blocages critiques sont regroupés dans un seul centre de commande.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.pilotage)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    <Target className="h-4 w-4" />
                    Voir les priorités
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.finance)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    <DollarSign className="h-4 w-4" />
                    Ouvrir la finance
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.alerts)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Centre d'alertes
                  </button>
                </div>
              </div>

              <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Urgence</p>
                    <p className="mt-1 text-2xl font-black">{kpis.criticalAlerts + kpis.budgetOverruns}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-300" />
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Attente DG</p>
                    <p className="mt-1 text-2xl font-black">{kpis.validationsPending}</p>
                  </div>
                  <FileCheck2 className="h-8 w-8 text-emerald-300" />
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Budget consommé</p>
                    <p className="mt-1 text-2xl font-black">{formatPct(financeSummary.consumptionPercent)}</p>
                  </div>
                  <Gauge className="h-8 w-8 text-cyan-300" />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">{kpis.delayedProjects} projets en retard</Badge>
                  <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">{kpis.missionPendingClosures} missions à clôturer</Badge>
                  <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">{kpis.blockedTasks} tâches bloquées</Badge>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Recherche stratégique : projet, mission, manager, tâche..."
                className="h-11 rounded-xl border-slate-200 bg-white lg:col-span-2"
              />
              <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Période complète</SelectItem>
                  <SelectItem value="30d">30 derniers jours</SelectItem>
                  <SelectItem value="90d">90 derniers jours</SelectItem>
                  <SelectItem value="1y">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Projet" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? 'Tous les projets' : projectById.get(Number(option))?.name || option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Manager" />
                </SelectTrigger>
                <SelectContent>
                  {managerOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? 'Tous les managers' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Équipe" />
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'all' ? 'Toutes les équipes' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm shadow-slate-200/60">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Pilotage', target: SECTION_IDS.pilotage },
                { label: 'Attention', target: SECTION_IDS.attention },
                { label: 'Projets', target: SECTION_IDS.projects },
                { label: 'Missions', target: SECTION_IDS.missions },
                { label: 'Finances', target: SECTION_IDS.finance },
                { label: 'Alertes', target: SECTION_IDS.alerts },
                { label: 'Validations', target: SECTION_IDS.validations },
                { label: 'Risques', target: SECTION_IDS.risks },
                { label: 'Notifications', target: SECTION_IDS.notifications },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <SectionCard
            id={SECTION_IDS.pilotage}
            eyebrow="Bloc prioritaire"
            title="Pilotage exécutif"
            description="Les cartes les plus critiques sont mises en avant pour décider immédiatement."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  title: 'Projets en retard',
                  value: kpis.delayedProjects,
                  subtitle: 'Projets qui dépassent la date cible',
                  icon: TrendingDown,
                  tone: 'from-red-600 to-rose-500',
                  target: SECTION_IDS.projects,
                },
                {
                  title: 'Missions en retard',
                  value: kpis.missionPendingClosures,
                  subtitle: 'Missions en attente de clôture DG',
                  icon: Clock3,
                  tone: 'from-red-600 to-orange-500',
                  target: SECTION_IDS.missions,
                },
                {
                  title: 'Dépassements budgétaires',
                  value: kpis.budgetOverruns,
                  subtitle: 'Projets dont le budget est dépassé',
                  icon: DollarSign,
                  tone: 'from-red-600 to-pink-500',
                  target: SECTION_IDS.finance,
                },
                {
                  title: 'Alertes critiques',
                  value: kpis.criticalAlerts,
                  subtitle: 'Signaux rouges à traiter en priorité',
                  icon: ShieldAlert,
                  tone: 'from-red-700 to-red-500',
                  target: SECTION_IDS.alerts,
                },
                {
                  title: 'Validations DG en attente',
                  value: kpis.validationsPending,
                  subtitle: 'Clôtures, validations et arbitrages',
                  icon: FileCheck2,
                  tone: 'from-red-700 to-orange-500',
                  target: SECTION_IDS.validations,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => scrollToSection(card.target)}
                    className={`group rounded-[24px] border border-red-100 bg-gradient-to-br ${card.tone} p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl bg-white/15 p-3">
                        <Icon className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-70 transition group-hover:translate-x-1" />
                    </div>
                    <p className="mt-6 text-3xl font-black">{card.value}</p>
                    <p className="mt-1 text-sm font-bold">{card.title}</p>
                    <p className="mt-2 text-xs leading-5 text-white/85">{card.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]" id={SECTION_IDS.attention}>
            <SectionCard
              id={`${SECTION_IDS.attention}-list`}
              eyebrow="Ce qui nécessite votre attention"
              title="Centre de commandes DG"
              description="Les lignes ci-dessous résument ce qui demande une décision ou un arbitrage immédiat."
              className="h-full"
            >
              <div className="space-y-3">
                {attentionItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Aucune alerte prioritaire pour le filtre sélectionné.
                  </div>
                ) : (
                  attentionItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={item.level === 'critical' ? 'bg-red-100 text-red-700 hover:bg-red-100' : item.level === 'risk' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}>
                              {item.level === 'critical' ? 'Critique' : item.level === 'risk' ? 'Risque' : item.level === 'attention' ? 'Attention' : 'Stable'}
                            </Badge>
                            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{item.project}</span>
                          </div>
                          <p className="text-sm font-black text-slate-900">{item.title}</p>
                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <p>
                              <span className="font-semibold text-slate-900">Mission:</span> {item.mission}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-900">Responsable:</span> {item.manager}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-900">Date limite:</span> {item.deadline}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-900">Impact:</span> {item.impact}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => scrollToSection(item.target)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Voir le détail
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard
                id={`${SECTION_IDS.attention}-summary`}
                eyebrow="Instantané"
                title="Synthèse critique"
                description="Indicateurs bruts utiles pour un arbitrage rapide."
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Projets critiques', value: kpis.delayedProjects + kpis.budgetOverruns, icon: TrendingDown, tone: 'red' },
                    { label: 'Tâches bloquées', value: kpis.blockedTasks, icon: ShieldAlert, tone: 'amber' },
                    { label: 'Équipes surchargées', value: kpis.overloadedTeams, icon: Users, tone: 'blue' },
                    { label: 'Projets à clôturer', value: kpis.projectsToClose, icon: CheckCircle2, tone: 'emerald' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className={`rounded-2xl p-2 ${item.tone === 'red' ? 'bg-red-100 text-red-600' : item.tone === 'amber' ? 'bg-amber-100 text-amber-600' : item.tone === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">DG</span>
                        </div>
                        <p className="mt-3 text-2xl font-black text-slate-900">{item.value}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                id={`${SECTION_IDS.attention}-types`}
                eyebrow="Alerte intelligente"
                title="Répartition des alertes"
                description="Les catégories ci-dessous donnent une lecture rapide de la nature des risques."
              >
                <div className="space-y-3">
                  {alertTypeSummary.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      Aucune alerte sur le filtre courant.
                    </div>
                  ) : (
                    alertTypeSummary.slice(0, 7).map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                        <Badge className="bg-white text-slate-700 hover:bg-white">{item.value}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]" id={SECTION_IDS.projects}>
            <SectionCard
              id={`${SECTION_IDS.projects}-list`}
              eyebrow="Carte stratégique"
              title="État des projets"
              description="Chaque projet est représenté par une barre de santé, avec avancement, consommation et délai restant."
              className="h-full"
            >
              <div className="space-y-3">
                {strategicProjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Aucun projet ne correspond aux filtres sélectionnés.
                  </div>
                ) : (
                  strategicProjects.slice(0, 8).map((item) => {
                    const project = item.project;
                    const levelColor = item.level === 'critical' ? 'bg-red-500' : item.level === 'risk' ? 'bg-amber-500' : item.level === 'attention' ? 'bg-blue-500' : 'bg-emerald-500';
                    const progress = clamp(readProjectProgress(project));
                    const projectAlertsCount = filteredAlerts.filter((alert) => alert.project_id === project.id || alert.project_name === project.name).length;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => scrollToSection(SECTION_IDS.projects)}
                        className="w-full rounded-[22px] border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-black text-slate-900">{project.name}</p>
                              <Badge className={item.level === 'critical' ? 'bg-red-100 text-red-700 hover:bg-red-100' : item.level === 'risk' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : item.level === 'attention' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                                {item.level === 'critical' ? 'Critique' : item.level === 'risk' ? 'À surveiller' : item.level === 'attention' ? 'Stable' : 'Maîtrisé'}
                              </Badge>
                              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{readProjectManager(project)}</span>
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500">{project.description || 'Aucune description disponible.'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Budget consommé</p>
                            <p className="mt-1 text-lg font-black text-slate-900">{formatMoney(item.consumed)}</p>
                            <p className="text-xs text-slate-500">sur {formatMoney(readProjectBudget(project))}</p>
                          </div>
                        </div>

                        <div className="mt-4 h-2 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${levelColor}`}
                            style={{ width: `${clamp(progress)}%` }}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1">Avancement {formatPct(progress)}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Délai {formatDayDelta(toNumber(project.days_remaining))}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Missions {toNumber(project.missions_count)}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Tâches {toNumber(project.tasks_count)}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Alertes {projectAlertsCount}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </SectionCard>

            <ChartCard title="Budget prévu vs budget consommé" empty={projectBudgetChart.length === 0}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={projectBudgetChart} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(value: number) => formatMoney(value)} />
                  <Legend />
                  <Bar dataKey="consumed" name="Consommé" radius={[0, 8, 8, 0]}>
                    {projectBudgetChart.map((_, index) => (
                      <Cell key={`consumed-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="remaining" name="Restant" radius={[0, 8, 8, 0]}>
                    {projectBudgetChart.map((_, index) => (
                      <Cell key={`remaining-${index}`} fill="#cbd5e1" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <SectionCard
            id={SECTION_IDS.missions}
            eyebrow="Suivi des missions"
            title="État des missions"
            description="Les missions prêtes à clôturer ou déjà remonter par les managers sont contrôlées ici."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">Mission</th>
                    <th className="px-3 py-3 text-left font-semibold">Projet</th>
                    <th className="px-3 py-3 text-left font-semibold">Manager</th>
                    <th className="px-3 py-3 text-left font-semibold">Avancement</th>
                    <th className="px-3 py-3 text-left font-semibold">Budget consommé</th>
                    <th className="px-3 py-3 text-left font-semibold">Retard</th>
                    <th className="px-3 py-3 text-left font-semibold">Statut</th>
                    <th className="px-3 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missionRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-slate-500" colSpan={8}>
                        Aucune mission à afficher pour les filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    missionRows.slice(0, 10).map((row) => {
                      const mission = row.mission;
                      const statusLabel = row.level === 'critical' ? 'Critique' : row.level === 'risk' ? 'À surveiller' : row.level === 'attention' ? 'En cours de traitement' : 'Stable';
                      const statusClass =
                        row.level === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : row.level === 'risk'
                            ? 'bg-amber-100 text-amber-700'
                            : row.level === 'attention'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700';
                      return (
                        <tr key={mission.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-4">
                            <div className="font-semibold text-slate-900">{mission.mission_name || '-'}</div>
                            <div className="text-xs text-slate-500">{mission.requested_at ? `Demandée le ${formatDate(mission.requested_at)}` : 'Mission suivie'}</div>
                          </td>
                          <td className="px-3 py-4">{row.project?.name || mission.project_name || '-'}</td>
                          <td className="px-3 py-4">{mission.manager_name || readProjectManager(row.project)}</td>
                          <td className="px-3 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{formatPct(row.progress)}</span>
                                <span>{row.delayDays > 0 ? `${row.delayDays} j de retard` : 'Dans les temps'}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100">
                                <div className={`h-2 rounded-full ${row.level === 'critical' ? 'bg-red-500' : row.level === 'risk' ? 'bg-amber-500' : row.level === 'attention' ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${row.progress}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 font-semibold text-slate-900">{formatMoney(row.budgetConsumed)}</td>
                          <td className="px-3 py-4">{formatDayDelta(row.delayDays)}</td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                          </td>
                          <td className="px-3 py-4">
                            <button
                              type="button"
                              onClick={() => handleMissionAction(mission.project_id, mission.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Valider DG
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.finance}
            eyebrow="Suivi financier exécutif"
            title="Finances du portefeuille"
            description="Lecture immédiate des budgets, des consommations et des écarts, avec un historique des estimations."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
              {[
                { label: 'Budget total', value: formatMoney(financeSummary.budgetTotal), icon: DollarSign, color: 'bg-indigo-100 text-indigo-700' },
                { label: 'Budget consommé', value: formatMoney(financeSummary.budgetConsumed), icon: TrendingUp, color: 'bg-cyan-100 text-cyan-700' },
                { label: 'Budget restant', value: formatMoney(financeSummary.budgetRemaining), icon: Gauge, color: 'bg-emerald-100 text-emerald-700' },
                { label: 'Dépassements', value: formatMoney(financeSummary.overrunAmount), icon: TrendingDown, color: 'bg-red-100 text-red-700' },
                { label: 'Montants facturés', value: formatMoney(financeSummary.billedAmount), icon: BarChart3, color: 'bg-amber-100 text-amber-700' },
                { label: 'Montants payés', value: formatMoney(financeSummary.paidAmount), icon: CheckCircle2, color: 'bg-violet-100 text-violet-700' },
                { label: 'En attente', value: formatMoney(financeSummary.pendingAmount), icon: Clock3, color: 'bg-slate-100 text-slate-700' },
                { label: "Estimations", value: `${financeSummary.estimatedCount}`, icon: FileCheck2, color: 'bg-blue-100 text-blue-700' },
                { label: 'Dernière mise à jour', value: formatDate(financeSummary.lastUpdate), icon: CalendarClock, color: 'bg-slate-100 text-slate-700' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-2xl p-2 ${item.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <ChartCard title="Évolution mensuelle des coûts" empty={monthlyFinance.length === 0}>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthlyFinance}>
                    <defs>
                      <linearGradient id="financeConsumed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="financeEstimated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="consumed" stroke="#4f46e5" fill="url(#financeConsumed)" name="Coût consommé" />
                    <Area type="monotone" dataKey="estimated" stroke="#06b6d4" fill="url(#financeEstimated)" name="Coût estimé" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Répartition RH / Temps / Opérationnel / Divers" empty={financeBreakdown.length === 0}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={financeBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={110} paddingAngle={3}>
                      {financeBreakdown.map((_, index) => (
                        <Cell key={`finance-breakdown-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Budget consommé vs restant" empty={projectBudgetChart.length === 0}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={projectBudgetChart.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Legend />
                    <Bar dataKey="consumed" name="Consommé" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="remaining" name="Restant" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.alerts}
            eyebrow="Alertes intelligentes"
            title="Centre d'alertes DG"
            description="Les alertes sont regroupées par priorité avec des boutons rapides pour valider, traiter ou reporter."
          >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Aucune alerte à afficher avec les filtres actuels.
                  </div>
                ) : (
                  filteredAlerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className={`rounded-2xl border p-4 ${alertToneClass(alert.severity)}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${alertToneDot(alert.severity)}`} />
                            <Badge className="bg-white/70 text-slate-700 hover:bg-white/70">{alertTypeLabel(alert.type)}</Badge>
                            <Badge className="bg-white/70 text-slate-700 hover:bg-white/70">{normalizeStatus(alert.severity) || 'attention'}</Badge>
                          </div>
                          <p className="text-sm font-black text-slate-900">{alert.title}</p>
                          <p className="text-sm text-slate-600">{alert.message}</p>
                          <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                            <p>
                              <span className="font-semibold text-slate-900">Projet:</span> {alert.project_name || '-'}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-900">Date:</span> {formatDate(alert.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyAction === `alert-${alert.id}-validate`}
                            onClick={() => handleAlertAction(alert, 'validate')}
                            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            disabled={busyAction === `alert-${alert.id}-resolve`}
                            onClick={() => handleAlertAction(alert, 'resolve')}
                            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Traiter
                          </button>
                          <button
                            type="button"
                            disabled={busyAction === `alert-${alert.id}-ignore`}
                            onClick={() => handleAlertAction(alert, 'ignore')}
                            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reporter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                {alertTypeSummary.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Lecture rapide</p>
                    <div className="mt-4 space-y-3">
                      {alertTypeSummary.slice(0, 8).map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                          <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{item.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Lecture DG</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p>• Projets en danger: {kpis.delayedProjects}</p>
                    <p>• Missions bloquées ou à clôturer: {kpis.missionPendingClosures}</p>
                    <p>• Budgets dépassés: {kpis.budgetOverruns}</p>
                    <p>• Validations DG en attente: {kpis.validationsPending}</p>
                    <p>• Managers avec blocages: {managerBlockers.length}</p>
                    <p>• Équipes en surcharge: {kpis.overloadedTeams}</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.validations}
            eyebrow="Actions à valider"
            title="Validations en attente"
            description="Les semaines soumises par les managers et les clôtures de missions remontées au DG sont visibles ici."
          >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-black text-slate-900">Soumissions hebdomadaires</p>
                {filteredValidations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Aucune soumission DG sur la période sélectionnée.
                  </div>
                ) : (
                  filteredValidations.slice(0, 6).map((row) => {
                    const statusClass = normalizeStatus(row.status) === 'approved' ? 'bg-emerald-100 text-emerald-700' : normalizeStatus(row.status) === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
                    return (
                      <div key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-slate-900">{row.collaborateur_name || 'Collaborateur'}</p>
                              <Badge className={`hover:bg-transparent ${statusClass}`}>{row.status}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{row.projects || 'Projet non précisé'}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>Manager: {row.manager_name || '-'}</span>
                              <span>Équipe: {row.team_name || '-'}</span>
                              <span>{formatHours(row.total_hours)}</span>
                              <span>{row.tasks_count} tâche(s)</span>
                              <span>{formatDate(row.submitted_to_dg_at || row.submitted_at || null)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyAction === `week-${row.id}-approve`}
                              onClick={() => handleWeekAction(row.id, 'approve')}
                              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              disabled={busyAction === `week-${row.id}-reject`}
                              onClick={() => handleWeekAction(row.id, 'reject')}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-black text-slate-900">Clôtures de missions</p>
                {missionRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Aucune mission à clôturer pour les filtres sélectionnés.
                  </div>
                ) : (
                  missionRows.slice(0, 6).map((row) => (
                    <div key={row.mission.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">{row.mission.mission_name || 'Mission'}</p>
                            <Badge className={row.level === 'critical' ? 'bg-red-100 text-red-700 hover:bg-red-100' : row.level === 'risk' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}>
                              {row.level === 'critical' ? 'Critique' : row.level === 'risk' ? 'Risque' : 'À traiter'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{row.project?.name || row.mission.project_name || '-'}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>Manager: {row.mission.manager_name || '-'}</span>
                            <span>{formatPct(row.progress)}</span>
                            <span>{formatMoney(row.budgetConsumed)}</span>
                            <span>{row.delayDays > 0 ? `${row.delayDays} j de retard` : 'Sans retard'}</span>
                            <span>{formatDate(row.mission.end_date || row.mission.requested_at || null)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={busyAction === `mission-${row.mission.id}`}
                          onClick={() => handleMissionAction(row.mission.project_id, row.mission.id)}
                          className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Valider clôture
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.risks}
            eyebrow="Risque exécutif"
            title="Radar des risques"
            description="Une lecture consolidée des risques financiers, planning, ressources, techniques et contractuels."
          >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="min-h-[340px] rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={riskRadar}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" name="Score de risque" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {riskRadar.map((item) => {
                  const level: PriorityLevel = item.score >= 65 ? 'critical' : item.score >= 35 ? 'risk' : item.score >= 20 ? 'attention' : 'good';
                  return (
                    <div key={item.subject} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">{item.subject}</p>
                          <p className="text-xs text-slate-500">Score de risque consolidé</p>
                        </div>
                        <Badge className={level === 'critical' ? 'bg-red-100 text-red-700 hover:bg-red-100' : level === 'risk' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : level === 'attention' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                          {item.score}/100
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${level === 'critical' ? 'bg-red-500' : level === 'risk' ? 'bg-amber-500' : level === 'attention' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.notifications}
            eyebrow="Notifications"
            title="Notifications importantes"
            description="La cloche DG agrège ici les événements qui méritent une lecture rapide."
          >
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="space-y-3">
                {timelineFeed.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Aucune notification récente.
                  </div>
                ) : (
                  timelineFeed.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${alertToneDot(item.level)}`} />
                            <p className="text-sm font-black text-slate-900">{item.title}</p>
                          </div>
                          <p className="text-sm text-slate-600">{item.subtitle}</p>
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Managers avec blocages</p>
                  <div className="mt-4 space-y-3">
                    {managerBlockers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        Aucun manager bloqué pour le filtre courant.
                      </div>
                    ) : (
                      managerBlockers.slice(0, 5).map((item) => (
                        <div key={item.manager} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800">{item.manager}</p>
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{item.blockedTasks} blocage(s)</Badge>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {item.projectCount} projet(s) • {item.missionCount} mission(s)
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Équipes en surcharge</p>
                  <div className="mt-4 space-y-3">
                    {teamInsights.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        Aucune équipe surchargée pour le filtre courant.
                      </div>
                    ) : (
                      teamInsights.slice(0, 5).map((item) => (
                        <div key={item.team} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800">{item.team}</p>
                            <Badge className={item.overload >= 80 ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                              {Math.round(item.overload)}%
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>{formatHours(item.hours)}</span>
                            <span>{item.tasks} tâche(s)</span>
                            <span>{item.managerCount} manager(s)</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default AnalyticsDG;
