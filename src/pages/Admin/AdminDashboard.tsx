import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  ListTodo,
  RefreshCcw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Wallet,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
  type LucideIcon,
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
import { Progress } from '../../components/ui/progress';
import {
  analyticsApi,
  type AlertsResponse,
  type ProjectAlert,
  type ProjectAlertsResponse,
  type ProjectBudget,
  type ProjectMissionDetail,
  type ProjectTrackingDashboard,
  type ProjectTrackingRow,
  type ProjectTrackingStats,
  type TeamMember,
  type TopTask,
} from '../../lib/api-analytics';
import { httpGet } from '../../lib/api';
import { formatDateForDisplay } from '../../lib/date';

type ViewKey = 'projects' | 'missions' | 'tasks' | 'teams' | 'collaborators';
type PeriodFilter = 'all' | '30d' | '90d' | '1y';
type ToneKey = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';

interface AuditUser {
  id: number;
  nom: string;
  email: string;
  role: string | null;
  type: string | null;
  statut: string;
  date_creation?: string | null;
  dernier_connexion?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  appRole?: string | null;
  isValid?: boolean;
}

interface AuditResponse {
  total: number;
  byRole: Record<string, number>;
  invalidUsers: Array<{
    id: number;
    nom?: string;
    email?: string;
    role?: string | null;
    type?: string | null;
    appRole?: string | null;
    statut?: string | null;
    reason?: string | null;
  }>;
  users: AuditUser[];
}

interface TeamOverviewRow {
  id: number;
  team_name: string;
  manager_id?: number | null;
  manager_name?: string | null;
  member_count: number;
}

interface TaskAlertRow {
  id: number;
  task_id: number;
  alert_type: string;
  recipient_user_id?: number | null;
  recipient_role?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  task_title?: string | null;
  task_date?: string | null;
  blocking_reason?: string | null;
  status?: string | null;
  project_name?: string | null;
  user_name?: string | null;
  category_name?: string | null;
  project_module_name?: string | null;
  deliverable_name?: string | null;
}

interface EnrichedMission extends ProjectMissionDetail {
  project_name: string;
}

interface TeamLoadRow extends TeamOverviewRow {
  workload_hours: number;
  blocking_tasks: number;
  active_members: number;
  average_hours: number;
  risk_level: 'good' | 'attention' | 'critical';
}

interface CollaboratorRow {
  id: number;
  nom: string;
  email: string;
  role: string | null;
  statut: string;
  team_id: number | null;
  team_name: string | null;
  hours: number;
  blocking: number;
  last_login: string | null;
  isValid: boolean;
}

interface AttentionItem {
  id: string;
  title: string;
  project: string;
  description: string;
  level: 'critical' | 'risk' | 'attention' | 'good';
  actionLabel: string;
  actionTo: string;
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: ToneKey;
}

const toneStyles: Record<ToneKey, { bg: string; icon: string; border: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-700', border: 'border-blue-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-700', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-700', border: 'border-amber-100' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-700', border: 'border-rose-100' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-700', border: 'border-violet-100' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-700', border: 'border-cyan-100' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-700', border: 'border-slate-100' },
};

const PROJECT_COLORS = ['#4f46e5', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];
const ROLE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

function MetricCard({ icon: Icon, label, value, subtitle, tone = 'blue' }: MetricCardProps) {
  const palette = toneStyles[tone];
  return (
    <div className={`rounded-[1.5rem] border ${palette.border} bg-white/90 p-5 shadow-sm shadow-slate-200/50 backdrop-blur-xl`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.bg}`}>
          <Icon className={`h-5 w-5 ${palette.icon}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0))} MAD`;
}

function formatPercent(value: number) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${safe.toFixed(1)}%`;
}

function formatHours(value: number) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${safe.toFixed(1)} h`;
}

function normalize(value?: string | null) {
  return String(value || '').toLowerCase().trim();
}

function monthKey(value?: string | null) {
  return value ? String(value).slice(0, 7) : '';
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric',
  });
}

function isWithinPeriod(dateValue: string | null | undefined, period: PeriodFilter) {
  if (period === 'all') return true;
  if (!dateValue) return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;
  const rangeDays = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const min = new Date();
  min.setDate(min.getDate() - rangeDays);
  return date >= min && date <= new Date();
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function projectStatusLabel(status?: string | null) {
  switch (normalize(status)) {
    case 'planned':
      return 'Planifié';
    case 'active':
      return 'En cours';
    case 'completed':
      return 'Terminé';
    case 'on_hold':
      return 'Suspendu';
    case 'cancelled':
      return 'Annulé';
    default:
      return status || 'Inconnu';
  }
}

function projectStatusTone(status?: string | null): ToneKey {
  switch (normalize(status)) {
    case 'active':
      return 'blue';
    case 'completed':
      return 'emerald';
    case 'planned':
      return 'violet';
    case 'on_hold':
      return 'amber';
    case 'cancelled':
      return 'rose';
    default:
      return 'slate';
  }
}

function missionStatusLabel(status?: string | null) {
  switch (normalize(status)) {
    case 'planifiee':
      return 'Planifiée';
    case 'en_cours':
      return 'En cours';
    case 'terminee_manager':
      return 'Terminée manager';
    case 'validee_dg':
      return 'Validée DG';
    case 'cloturee':
      return 'Clôturée';
    case 'suspendue':
      return 'Suspendue';
    case 'arretee':
      return 'Arrêtée';
    default:
      return status || 'Inconnu';
  }
}

function missionStatusTone(status?: string | null): ToneKey {
  switch (normalize(status)) {
    case 'terminee_manager':
      return 'amber';
    case 'validee_dg':
    case 'cloturee':
      return 'emerald';
    case 'en_cours':
      return 'blue';
    case 'planifiee':
      return 'violet';
    case 'suspendue':
    case 'arretee':
      return 'rose';
    default:
      return 'slate';
  }
}

function taskStatusLabel(status?: string | null) {
  switch (normalize(status)) {
    case 'submitted':
      return 'Soumise';
    case 'validated':
      return 'Validée';
    case 'manager_validated':
      return 'Validée manager';
    case 'closed':
      return 'Clôturée';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Terminée';
    case 'to_correct':
      return 'À corriger';
    case 'draft':
      return 'Brouillon';
    default:
      return status || 'Inconnu';
  }
}

function taskStatusTone(status?: string | null): ToneKey {
  switch (normalize(status)) {
    case 'validated':
    case 'manager_validated':
    case 'closed':
      return 'emerald';
    case 'submitted':
      return 'amber';
    case 'to_correct':
      return 'rose';
    case 'draft':
      return 'slate';
    case 'in_progress':
    case 'completed':
      return 'blue';
    default:
      return 'slate';
  }
}

function roleLabel(role?: string | null, appRole?: string | null) {
  const normalized = normalize(role || appRole);
  switch (normalized) {
    case 'admin':
    case 'administrateur':
      return 'Administrateur';
    case 'dg':
    case 'direction':
      return 'DG';
    case 'manager':
    case 'chef_projet':
      return 'Manager';
    case 'collaborator':
    case 'collaborateur':
    case 'employe':
      return 'Collaborateur';
    default:
      return appRole || role || 'Autre';
  }
}

function statusBadgeClass(tone: ToneKey) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'rose':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'violet':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'cyan':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'blue':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function shortText(value: string, max = 28) {
  if (!value) return '—';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function joinNonEmpty(values: Array<string | null | undefined>, separator = ' · ') {
  return values.filter(Boolean).join(separator);
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [projectsDashboard, setProjectsDashboard] = useState<ProjectTrackingDashboard | null>(null);
  const [projectsStats, setProjectsStats] = useState<ProjectTrackingStats | null>(null);
  const [budgetRows, setBudgetRows] = useState<ProjectBudget[]>([]);
  const [teams, setTeams] = useState<TeamOverviewRow[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<TeamMember[]>([]);
  const [topTasks, setTopTasks] = useState<TopTask[]>([]);
  const [taskAlerts, setTaskAlerts] = useState<AlertsResponse | null>(null);
  const [projectAlerts, setProjectAlerts] = useState<ProjectAlertsResponse | null>(null);
  const [missionsByProject, setMissionsByProject] = useState<Record<number, EnrichedMission[]>>({});
  const [view, setView] = useState<ViewKey>('projects');
  const [projectFilter, setProjectFilter] = useState('all');
  const [missionFilter, setMissionFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('90d');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setWarnings([]);

      const issues: string[] = [];
      const resolve = async <T,>(label: string, promise: Promise<{ data: T }>): Promise<T | null> => {
        try {
          const result = await promise;
          return result.data;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur inconnue';
          issues.push(`${label}: ${message}`);
          return null;
        }
      };

      const [auditData, dashboardsData, statsData, budgetData, teamsData, workloadData, topTasksData, taskAlertsData, projectAlertsData] =
        await Promise.all([
          resolve('Utilisateurs', httpGet<AuditResponse>('/api/users/audit')),
          resolve('Tableau projets', analyticsApi.getProjectsTrackingDashboard()),
          resolve('Statistiques projets', analyticsApi.getProjectsTrackingStats()),
          resolve('Budget projets', analyticsApi.getProjectsDashboard()),
          resolve('Equipes', httpGet<TeamOverviewRow[]>('/api/teams')),
          resolve('Charge equipe', analyticsApi.getTeamDashboard()),
          resolve('Top taches', analyticsApi.getTasksDashboard()),
          resolve('Alertes workflow', analyticsApi.getAlerts()),
          resolve('Alertes projets', httpGet<ProjectAlertsResponse>('/api/alerts')),
        ]);

      const projectList = dashboardsData?.projects || [];
      const missionMap: Record<number, EnrichedMission[]> = {};
      if (projectList.length > 0) {
        await Promise.all(
          projectList.map(async (project) => {
            try {
              const response = await analyticsApi.getProjectMissions(project.project_id);
              missionMap[project.project_id] = (response.data || []).map((mission) => ({
                ...mission,
                project_name: project.project_name,
              }));
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Erreur inconnue';
              issues.push(`Missions ${project.project_name}: ${message}`);
              missionMap[project.project_id] = [];
            }
          })
        );
      }

      if (cancelled) return;

      setAudit(auditData);
      setProjectsDashboard(dashboardsData);
      setProjectsStats(statsData);
      setBudgetRows(budgetData || []);
      setTeams(teamsData || []);
      setTeamWorkload(workloadData || []);
      setTopTasks(topTasksData || []);
      setTaskAlerts(taskAlertsData);
      setProjectAlerts(projectAlertsData);
      setMissionsByProject(missionMap);
      setWarnings(issues);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const projectRows = projectsDashboard?.projects || [];
  const taskStats = projectsStats?.tasks || projectsDashboard?.stats.tasks || { total: 0, inProgress: 0, completed: 0, delayAlerts: 0, blocking: 0 };
  const projectStats = projectsStats?.projects || projectsDashboard?.stats.projects || {
    total: 0,
    planned: 0,
    active: 0,
    completed: 0,
    delayed: 0,
    onHold: 0,
    changeVsLastMonth: 0,
    currentMonth: 0,
    previousMonth: 0,
  };

  const auditUsers = audit?.users || [];
  const invalidUsers = audit?.invalidUsers || [];
  const projectAlertsList = projectAlerts?.alerts || [];
  const taskAlertsList = taskAlerts?.task_alerts || [];
  const blockingTaskAlerts = taskAlerts?.blocking_tasks || [];

  const workloadByUser = useMemo(() => new Map(teamWorkload.map((row) => [row.user_id, row])), [teamWorkload]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const projectById = useMemo(() => new Map(projectRows.map((project) => [project.project_id, project])), [projectRows]);

  const managerOptions = useMemo(() => {
    const names = new Set<string>();
    projectRows.forEach((project) => {
      const manager = project.manager_name || project.project_manager_name || project.chefProjet;
      if (manager && normalize(manager) !== 'non assigné') names.add(manager);
    });
    auditUsers.forEach((user) => {
      if (['manager', 'chef_projet'].includes(normalize(user.role)) && user.nom) names.add(user.nom);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [projectRows, auditUsers]);

  const projectOptions = useMemo(() => {
    return [...projectRows]
      .sort((a, b) => a.project_name.localeCompare(b.project_name, 'fr'))
      .map((project) => ({ id: String(project.project_id), label: project.project_name }));
  }, [projectRows]);

  const allMissionRows = useMemo(() => {
    return Object.entries(missionsByProject).flatMap(([projectId, missions]) =>
      missions.map((mission) => ({
        ...mission,
        project_name: projectById.get(Number(projectId))?.project_name || mission.project_name,
      }))
    );
  }, [missionsByProject, projectById]);

  const missionOptions = useMemo(() => {
    const scope = projectFilter === 'all'
      ? allMissionRows
      : allMissionRows.filter((mission) => String(mission.project_id) === projectFilter);
    return [...scope]
      .sort((a, b) => a.project_name.localeCompare(b.project_name, 'fr') || a.name.localeCompare(b.name, 'fr'))
      .map((mission) => ({ id: String(mission.id), label: `${mission.project_name} · ${mission.name}` }));
  }, [allMissionRows, projectFilter]);

  const teamOptions = useMemo(() => {
    return [...teams]
      .sort((a, b) => a.team_name.localeCompare(b.team_name, 'fr'))
      .map((team) => ({ id: String(team.id), label: team.team_name }));
  }, [teams]);

  const collaboratorRows = useMemo<CollaboratorRow[]>(() => {
    return auditUsers
      .filter((user) => ['collaborator', 'employe'].includes(normalize(user.role)) || normalize(user.appRole) === 'employe')
      .map((user) => {
        const workload = workloadByUser.get(user.id);
        return {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          statut: user.statut,
          team_id: user.team_id ?? null,
          team_name: user.team_name || teamById.get(user.team_id || 0)?.team_name || null,
          hours: Number(workload?.total_hours_logged || 0),
          blocking: Number(workload?.blocking_tasks_count || 0),
          last_login: user.dernier_connexion || null,
          isValid: Boolean(user.isValid),
        };
      });
  }, [auditUsers, workloadByUser, teamById]);

  const teamLoadRows = useMemo<TeamLoadRow[]>(() => {
    return teams.map((team) => {
      const members = auditUsers.filter((user) => user.team_id === team.id);
      const membersActive = members.filter((user) => normalize(user.statut) === 'actif').length;
      const load = members.reduce((sum, user) => sum + Number(workloadByUser.get(user.id)?.total_hours_logged || 0), 0);
      const blocking = members.reduce((sum, user) => sum + Number(workloadByUser.get(user.id)?.blocking_tasks_count || 0), 0);
      const averageHours = membersActive > 0 ? load / membersActive : 0;
      const riskLevel: TeamLoadRow['risk_level'] = averageHours >= 35 || blocking >= 3 ? 'critical' : averageHours >= 18 || blocking > 0 ? 'attention' : 'good';

      return {
        ...team,
        workload_hours: load,
        blocking_tasks: blocking,
        active_members: membersActive,
        average_hours: averageHours,
        risk_level: riskLevel,
      };
    });
  }, [teams, auditUsers, workloadByUser]);

  const totalUsers = audit?.total || auditUsers.length || 0;
  const activeUsers = auditUsers.filter((user) => normalize(user.statut) === 'actif').length;
  const inactiveUsers = auditUsers.filter((user) => normalize(user.statut) === 'inactif').length;
  const newAccounts = auditUsers.filter((user) => monthKey(user.date_creation) === monthKey(new Date().toISOString())).length;
  const recentLogins = auditUsers.filter((user) => {
    if (!user.dernier_connexion) return false;
    const diff = Date.now() - new Date(user.dernier_connexion).getTime();
    return Number.isFinite(diff) && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const activeManagers = auditUsers.filter((user) => normalize(user.statut) === 'actif' && ['manager', 'chef_projet'].includes(normalize(user.role))).length;
  const activeCollaborators = auditUsers.filter((user) => normalize(user.statut) === 'actif' && ['collaborator', 'employe'].includes(normalize(user.role))).length;

  const delayedProjects = projectStats.delayed || 0;
  const activeProjects = projectStats.active || 0;
  const completedProjects = projectStats.completed || 0;
  const suspendedProjects = projectStats.onHold || 0;
  const totalProjects = projectStats.total || 0;

  const missionStats = useMemo(() => {
    const missions = allMissionRows;
    const completedStatuses = new Set(['terminee_manager', 'validee_dg', 'cloturee']);
    const openStatuses = new Set(['planifiee', 'en_cours', 'terminee_manager']);
    const pendingDg = missions.filter((mission) => normalize(mission.status) === 'terminee_manager').length;
    const ongoing = missions.filter((mission) => ['planifiee', 'en_cours'].includes(normalize(mission.status))).length;
    const completed = missions.filter((mission) => completedStatuses.has(normalize(mission.status))).length;
    const suspended = missions.filter((mission) => ['suspendue', 'arretee'].includes(normalize(mission.status))).length;
    const delayed = missions.filter((mission) => {
      const endDate = mission.end_date ? new Date(mission.end_date) : null;
      if (!endDate || Number.isNaN(endDate.getTime())) return false;
      return !completedStatuses.has(normalize(mission.status)) && endDate.getTime() < Date.now();
    }).length;

    return {
      total: missions.length,
      open: missions.filter((mission) => openStatuses.has(normalize(mission.status))).length,
      ongoing,
      completed,
      pendingDg,
      suspended,
      delayed,
    };
  }, [allMissionRows]);

  const totalBudget = budgetRows.reduce((sum, row) => sum + Number(row.budget_amount || 0), 0);
  const consumedBudget = budgetRows.reduce((sum, row) => sum + Number(row.consumed_amount || 0), 0);
  const remainingBudget = Math.max(0, totalBudget - consumedBudget);
  const budgetOverruns = budgetRows.filter((row) => Number(row.budget_amount || 0) > 0 && Number(row.consumed_amount || 0) > Number(row.budget_amount || 0)).length;
  const financialRiskProjects = budgetRows.filter((row) => Number(row.budget_consumption_percentage || 0) >= 85 || (Number(row.budget_amount || 0) > 0 && Number(row.consumed_amount || 0) > Number(row.budget_amount || 0))).length;

  const overloadedTeams = teamLoadRows.filter((team) => team.risk_level !== 'good').length;
  const unresolvedProjectAlerts = projectAlerts?.counts.unresolved || 0;
  const criticalProjectAlerts = projectAlerts?.counts.critical || 0;
  const taskBlockingCount = Number(taskStats.blocking || 0);
  const taskRiskCount = Number(taskStats.delayAlerts || 0);

  const riskRadarData = [
    { subject: 'Financier', score: totalProjects > 0 ? clamp((financialRiskProjects / totalProjects) * 100) : 0 },
    { subject: 'Planning', score: totalProjects > 0 ? clamp((delayedProjects / totalProjects) * 100) : 0 },
    { subject: 'Ressources', score: teamLoadRows.length > 0 ? clamp((overloadedTeams / teamLoadRows.length) * 100) : 0 },
    { subject: 'Workflow', score: Number(taskStats.total || 0) > 0 ? clamp((taskBlockingCount / Number(taskStats.total || 0)) * 100) : 0 },
    { subject: 'Sécurité', score: totalUsers > 0 ? clamp((invalidUsers.length / totalUsers) * 100) : 0 },
  ];

  const projectStatusData = (projectsDashboard?.stats.statusDistribution || []).map((item) => ({
    name: projectStatusLabel(item.status),
    value: Number(item.count || 0),
  })).filter((item) => item.value > 0);

  const missionStatusData = [
    { name: 'En cours', value: missionStats.ongoing },
    { name: 'À valider DG', value: missionStats.pendingDg },
    { name: 'Terminées', value: missionStats.completed },
    { name: 'Suspendues', value: missionStats.suspended },
    { name: 'En retard', value: missionStats.delayed },
  ].filter((item) => item.value > 0);

  const taskStatusData = [
    { name: 'Terminées', value: Number(taskStats.completed || 0) },
    { name: 'En cours', value: Number(taskStats.inProgress || 0) },
    { name: 'Bloquées', value: Number(taskStats.blocking || 0) },
    { name: 'En retard', value: Number(taskStats.delayAlerts || 0) },
  ].filter((item) => item.value > 0);

  const roleDistributionData = [
    { name: 'Administrateur', value: Number(audit?.byRole?.ADMIN || 0) },
    { name: 'DG', value: Number(audit?.byRole?.DG || 0) },
    { name: 'Manager', value: Number(audit?.byRole?.CHEF_PROJET || 0) + Number(audit?.byRole?.MANAGER || 0) },
    { name: 'Collaborateur', value: Number(audit?.byRole?.EMPLOYE || 0) + Number(audit?.byRole?.COLLABORATEUR || 0) },
  ].filter((item) => item.value > 0);

  const projectProgressData = [...projectRows]
    .sort((a, b) => Number(b.progress_percent || 0) - Number(a.progress_percent || 0))
    .slice(0, 8)
    .map((project) => ({
      name: shortText(project.project_name, 20),
      project_name: project.project_name,
      progress: Number(project.progress_percent || 0),
      missions: Number(project.missions_count || 0),
      tasks: Number(project.tasks_count || 0),
    }));

  const budgetChartData = [...budgetRows]
    .sort((a, b) => Number(b.consumed_amount || 0) - Number(a.consumed_amount || 0))
    .slice(0, 6)
    .map((row) => ({
      name: shortText(row.project_name || 'Projet', 20),
      project_name: row.project_name,
      budget: Number(row.budget_amount || 0),
      consumed: Number(row.consumed_amount || 0),
      remaining: Math.max(0, Number(row.budget_amount || 0) - Number(row.consumed_amount || 0)),
    }));

  const teamLoadChartData = [...teamLoadRows]
    .sort((a, b) => Number(b.average_hours || 0) - Number(a.average_hours || 0))
    .slice(0, 8)
    .map((team) => ({
      name: shortText(team.team_name, 20),
      team_name: team.team_name,
      hours: Number(team.workload_hours || 0),
      average: Number(team.average_hours || 0),
      blockers: Number(team.blocking_tasks || 0),
    }));

  const projectEvolutionData = useMemo(() => {
    const months = new Map<string, { month: string; total: number; active: number; delayed: number; completed: number }>();
    [...projectRows].forEach((project) => {
      const key = monthKey(project.created_at || project.updated_at || project.start_date);
      if (!key) return;
      if (!months.has(key)) {
        months.set(key, {
          month: monthLabelFromKey(key),
          total: 0,
          active: 0,
          delayed: 0,
          completed: 0,
        });
      }
      const bucket = months.get(key)!;
      bucket.total += 1;
      if (normalize(project.status) === 'active') bucket.active += 1;
      if (normalize(project.status) === 'completed') bucket.completed += 1;
      if (project.is_delayed || Number(project.delay_count || 0) > 0) bucket.delayed += 1;
    });

    return Array.from(months.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }, [projectRows]);

  const collaboratorChartData = useMemo(() => {
    return [...collaboratorRows]
      .sort((a, b) => Number(b.hours || 0) - Number(a.hours || 0))
      .slice(0, 8)
      .map((user) => ({
        name: shortText(user.nom, 20),
        user_name: user.nom,
        hours: Number(user.hours || 0),
        blockers: Number(user.blocking || 0),
      }));
  }, [collaboratorRows]);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...projectRows]
      .filter((project) => {
        const matchesSearch =
          !query ||
          project.project_name.toLowerCase().includes(query) ||
          String(project.code || '').toLowerCase().includes(query) ||
          String(project.manager_name || project.project_manager_name || project.chefProjet || '').toLowerCase().includes(query) ||
          (project.team_names || []).some((team) => String(team).toLowerCase().includes(query));
        const matchesProject = projectFilter === 'all' || String(project.project_id) === projectFilter;
        const matchesManager =
          managerFilter === 'all' ||
          String(project.manager_name || project.project_manager_name || project.chefProjet || 'Non assigné') === managerFilter;
        const matchesTeam =
          teamFilter === 'all' ||
          (project.team_names || []).some((team) => team === teamFilter);
        const matchesPeriod = isWithinPeriod(project.created_at || project.updated_at || project.start_date, periodFilter);
        return matchesSearch && matchesProject && matchesManager && matchesTeam && matchesPeriod;
      })
      .sort((a, b) =>
        Number(b.is_delayed ? 1 : 0) - Number(a.is_delayed ? 1 : 0) ||
        Number(b.progress_percent || 0) - Number(a.progress_percent || 0) ||
        String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))
      );
  }, [projectRows, searchTerm, projectFilter, managerFilter, teamFilter, periodFilter]);

  const filteredMissions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const projectScope = projectFilter === 'all' ? null : Number(projectFilter);
    return allMissionRows
      .filter((mission) => {
        const matchesSearch =
          !query ||
          mission.name.toLowerCase().includes(query) ||
          String(mission.project_name || '').toLowerCase().includes(query) ||
          String(mission.manager_name || '').toLowerCase().includes(query);
        const matchesProject = projectScope ? Number(mission.project_id) === projectScope : true;
        const matchesManager = managerFilter === 'all' || String(mission.manager_name || 'Non assigné') === managerFilter;
        const matchesMission = missionFilter === 'all' || String(mission.id) === missionFilter;
        const matchesPeriod = isWithinPeriod(mission.start_date || mission.end_date, periodFilter);
        return matchesSearch && matchesProject && matchesManager && matchesMission && matchesPeriod;
      })
      .sort((a, b) =>
        Number(b.progress_percent || 0) - Number(a.progress_percent || 0) ||
        String(a.project_name).localeCompare(String(b.project_name), 'fr') ||
        String(a.name).localeCompare(String(b.name), 'fr')
      );
  }, [allMissionRows, searchTerm, projectFilter, managerFilter, missionFilter, periodFilter]);

  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...topTasks]
      .filter((task) => {
        const matchesSearch =
          !query ||
          String(task.task_title || '').toLowerCase().includes(query) ||
          String(task.project_name || '').toLowerCase().includes(query) ||
          String(task.user_name || '').toLowerCase().includes(query);
        const matchingProject = projectFilter === 'all' ? null : projectById.get(Number(projectFilter)) || null;
        const matchesProject = projectFilter === 'all' || String(task.project_name || '') === String(matchingProject?.project_name || '');
        const matchesManager =
          managerFilter === 'all' ||
          String(matchingProject?.manager_name || matchingProject?.project_manager_name || matchingProject?.chefProjet || '') === managerFilter;
        const matchesPeriod = isWithinPeriod(task.task_date, periodFilter);
        return matchesSearch && matchesProject && matchesManager && matchesPeriod;
      })
      .sort((a, b) => Number(b.duration_hours || 0) - Number(a.duration_hours || 0));
  }, [topTasks, searchTerm, projectFilter, managerFilter, periodFilter, projectById]);

  const filteredTeamRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...teamLoadRows]
      .filter((team) => {
        const matchesSearch =
          !query ||
          team.team_name.toLowerCase().includes(query) ||
          String(team.manager_name || '').toLowerCase().includes(query);
        const matchesTeam = teamFilter === 'all' || String(team.id) === teamFilter || team.team_name === teamFilter;
        return matchesSearch && matchesTeam;
      })
      .sort((a, b) => Number(b.average_hours || 0) - Number(a.average_hours || 0));
  }, [teamLoadRows, searchTerm, teamFilter]);

  const filteredCollaborators = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...collaboratorRows]
      .filter((user) => {
        const matchesSearch =
          !query ||
          user.nom.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          String(user.team_name || '').toLowerCase().includes(query);
        const matchesProject = projectFilter === 'all' || true;
        const team = user.team_id ? teamById.get(user.team_id) || null : null;
        const matchesManager = managerFilter === 'all' || String(team?.manager_name || '') === managerFilter;
        const matchesTeam = teamFilter === 'all' || String(user.team_id || '') === teamFilter || user.team_name === teamFilter;
        const matchesPeriod = isWithinPeriod(user.last_login || undefined, periodFilter);
        return matchesSearch && matchesProject && matchesManager && matchesTeam && matchesPeriod;
      })
      .sort((a, b) => Number(b.hours || 0) - Number(a.hours || 0));
  }, [collaboratorRows, searchTerm, projectFilter, managerFilter, teamFilter, periodFilter]);

  const projectFocus = useMemo(() => {
    if (projectFilter !== 'all') {
      return filteredProjects.find((project) => String(project.project_id) === projectFilter) || null;
    }
    return filteredProjects[0] || projectRows[0] || null;
  }, [filteredProjects, projectRows, projectFilter]);

  const missionFocus = useMemo(() => {
    if (missionFilter !== 'all') {
      return filteredMissions.find((mission) => String(mission.id) === missionFilter) || null;
    }
    if (projectFocus) {
      return filteredMissions.find((mission) => mission.project_id === projectFocus.project_id) || filteredMissions[0] || null;
    }
    return filteredMissions[0] || null;
  }, [filteredMissions, missionFilter, projectFocus]);

  const teamFocus = useMemo(() => {
    if (teamFilter !== 'all') {
      return filteredTeamRows.find((team) => String(team.id) === teamFilter || team.team_name === teamFilter) || null;
    }
    return filteredTeamRows[0] || null;
  }, [filteredTeamRows, teamFilter]);

  const collaboratorFocus = useMemo(() => filteredCollaborators[0] || null, [filteredCollaborators]);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    if (criticalProjectAlerts > 0) {
      items.push({
        id: 'critical-project-alerts',
        title: `${criticalProjectAlerts} alerte(s) critique(s) projet`,
        project: 'Portefeuille global',
        description: 'Risque de retard ou de dépassement budgetaire à traiter.',
        level: 'critical',
        actionLabel: 'Voir les alertes',
        actionTo: '/dashboard/task-analytics/alertes-dg',
      });
    }

    if (missionStats.pendingDg > 0) {
      items.push({
        id: 'missions-pending-dg',
        title: `${missionStats.pendingDg} mission(s) en attente DG`,
        project: 'Validation métier',
        description: 'Des missions sont terminées côté manager mais pas encore validées.',
        level: 'risk',
        actionLabel: 'Voir les missions',
        actionTo: '/dashboard/task-analytics/gestion-missions',
      });
    }

    if (taskBlockingCount > 0 || blockingTaskAlerts.length > 0) {
      items.push({
        id: 'blocking-tasks',
        title: `${taskBlockingCount || blockingTaskAlerts.length} tâche(s) bloquée(s)`,
        project: 'Workflow tâches',
        description: 'Blocages de production ou validations en attente.',
        level: 'risk',
        actionLabel: 'Voir les tâches',
        actionTo: '/dashboard/task-analytics/taches',
      });
    }

    if (financialRiskProjects > 0) {
      items.push({
        id: 'financial-risk-projects',
        title: `${financialRiskProjects} projet(s) à risque financier`,
        project: 'Financier',
        description: 'Consommation budgetaire élevée ou dépassement détecté.',
        level: 'attention',
        actionLabel: 'Voir la finance',
        actionTo: '/dashboard/task-analytics/suivi-financier',
      });
    }

    if (invalidUsers.length > 0) {
      items.push({
        id: 'invalid-users',
        title: `${invalidUsers.length} compte(s) non conforme(s)`,
        project: 'Sécurité',
        description: 'Des utilisateurs ont un rôle ou un mapping à corriger.',
        level: 'attention',
        actionLabel: 'Gérer les utilisateurs',
        actionTo: '/admin/users',
      });
    }

    if (overloadedTeams > 0) {
      items.push({
        id: 'overloaded-teams',
        title: `${overloadedTeams} équipe(s) à surveiller`,
        project: 'Ressources',
        description: 'Charge moyenne élevée ou blocages détectés.',
        level: 'good',
        actionLabel: 'Voir les équipes',
        actionTo: '/dashboard/equipes',
      });
    }

    return items.slice(0, 6);
  }, [criticalProjectAlerts, missionStats.pendingDg, taskBlockingCount, blockingTaskAlerts.length, financialRiskProjects, invalidUsers.length, overloadedTeams]);

  const filteredProjectCount = filteredProjects.length;
  const filteredMissionCount = filteredMissions.length;
  const filteredTaskCount = filteredTasks.length;
  const filteredTeamCount = filteredTeamRows.length;
  const filteredCollaboratorCount = filteredCollaborators.length;

  const selectedMissionWithinProject = missionFocus && projectFocus ? missionFocus.project_id === projectFocus.project_id : false;

  const focusPanel = useMemo(() => {
    if (view === 'projects') {
      const project = projectFocus;
      if (!project) {
        return <p className="text-sm text-slate-500">Aucun projet à afficher avec les filtres actuels.</p>;
      }
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Projet prioritaire</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{project.project_name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{project.description || 'Aucune description disponible.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Budget</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(Number(project.budget_amount || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Progression</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatPercent(Number(project.progress_percent || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Missions</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{Number(project.missions_count || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Tâches</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{Number(project.tasks_count || 0)}</p>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Avancement global</span>
              <span className="font-semibold text-slate-900">{formatPercent(Number(project.progress_percent || 0))}</span>
            </div>
            <Progress value={Number(project.progress_percent || 0)} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Statut</span>
              <Badge className={statusBadgeClass(projectStatusTone(project.status))}>{projectStatusLabel(project.status)}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Gestionnaire</span>
              <span className="text-sm font-semibold text-slate-900">{valueOrDash(project.manager_name || project.project_manager_name || project.chefProjet)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Retard</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${project.is_delayed || Number(project.delay_count || 0) > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {project.is_delayed || Number(project.delay_count || 0) > 0 ? 'Oui' : 'OK'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (view === 'missions') {
      const mission = missionFocus;
      if (!mission) {
        return <p className="text-sm text-slate-500">Aucune mission à afficher avec les filtres actuels.</p>;
      }
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Mission sélectionnée</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{mission.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{mission.description || 'Aucune description disponible.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Projet</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{mission.project_name}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Responsable</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{valueOrDash(mission.manager_name)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Coût estimé</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(Number(mission.estimated_cost || 0))}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Budget</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatPercent(Number(mission.budget_percentage || 0))}</p>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Progression</span>
              <span className="font-semibold text-slate-900">{formatPercent(Number(mission.progress_percent || 0))}</span>
            </div>
            <Progress value={Number(mission.progress_percent || 0)} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Statut</span>
              <Badge className={statusBadgeClass(missionStatusTone(mission.status))}>{missionStatusLabel(mission.status)}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Échéance</span>
              <span className="text-sm font-semibold text-slate-900">{valueOrDash(mission.end_date ? formatDateForDisplay(mission.end_date) : null)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Tâches liées</span>
              <span className="text-sm font-semibold text-slate-900">{Number(mission.tasks_count || 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Retard de tâches</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${Number(mission.tasks_delayed_count || 0) > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {Number(mission.tasks_delayed_count || 0) > 0 ? `${Number(mission.tasks_delayed_count || 0)} en retard` : 'Aucun'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (view === 'tasks') {
      const spotlight = filteredTasks[0] || topTasks[0] || null;
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Flux des tâches</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Tâches et blocages</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Les tâches les plus critiques remontent ici pour traitement immédiat.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Tâches en cours</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{Number(taskStats.inProgress || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Tâches terminées</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{Number(taskStats.completed || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Tâches bloquées</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{Number(taskStats.blocking || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Alertes retard</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{Number(taskStats.delayAlerts || 0)}</p>
            </div>
          </div>
          <div className="space-y-2">
            {spotlight ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{spotlight.task_title}</p>
                    <p className="mt-1 text-xs text-slate-500">{joinNonEmpty([spotlight.project_name, spotlight.user_name, spotlight.task_date ? formatDateForDisplay(spotlight.task_date) : null])}</p>
                  </div>
                  <Badge className={statusBadgeClass('blue')}>{formatHours(Number(spotlight.duration_hours || 0))}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucune tâche critique détectée.</p>
            )}
            {filteredTasks.slice(1, 4).map((task) => (
              <div key={`${task.id}-${task.project_name}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{task.task_title}</p>
                <p className="mt-1 text-xs text-slate-500">{joinNonEmpty([task.project_name, task.user_name, task.task_date ? formatDateForDisplay(task.task_date) : null])}</p>
              </div>
            ))}
            {blockingTaskAlerts.slice(0, 3).map((alert) => (
              <div key={`${alert.id}-${alert.task_id}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{alert.task_title || 'Tâche bloquée'}</p>
                <p className="mt-1 text-xs text-slate-500">{joinNonEmpty([alert.project_name, alert.user_name, alert.blocking_reason])}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (view === 'teams') {
      const team = teamFocus;
      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Équipes</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Charge et saturation</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Les équipes les plus chargées apparaissent ici pour arbitrage.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Équipes</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{teamLoadRows.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Équipes à surveiller</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{overloadedTeams}</p>
            </div>
          </div>
          {team ? (
            <div className="space-y-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{team.team_name}</p>
                <p className="mt-1 text-xs text-slate-500">{valueOrDash(team.manager_name)} · {Number(team.member_count || 0)} membre(s)</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Charge moyenne</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatHours(Number(team.average_hours || 0))}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Blocages</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{Number(team.blocking_tasks || 0)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune équipe disponible.</p>
          )}
        </div>
      );
    }

    const collaborator = collaboratorFocus;
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Collaborateurs</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Comptes actifs et conformité</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Suivi des connexions, des comptes non conformes et de l’activité utilisateur.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Collaborateurs actifs</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{activeCollaborators}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Connexions récentes</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{recentLogins}</p>
          </div>
        </div>
        {collaborator ? (
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{collaborator.nom}</p>
              <p className="mt-1 text-xs text-slate-500">{collaborator.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Equipe</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{collaborator.team_name || 'Sans équipe'}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Dernière connexion</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{collaborator.last_login ? formatDateForDisplay(collaborator.last_login) : 'Jamais'}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Conformité</p>
              <Badge className={statusBadgeClass(collaborator.isValid ? 'emerald' : 'rose')}>{collaborator.isValid ? 'Conforme' : 'À corriger'}</Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucun collaborateur disponible.</p>
        )}
      </div>
    );
  }, [
    view,
    projectFocus,
    missionFocus,
    teamFocus,
    collaboratorFocus,
    taskStats,
    blockingTaskAlerts,
    criticalProjectAlerts,
    missionStats.pendingDg,
    missionStats,
    overloadedTeams,
    teamLoadRows.length,
    activeCollaborators,
    recentLogins,
  ]);

  const viewMeta: Record<ViewKey, { label: string; icon: LucideIcon; description: string }> = {
    projects: { label: 'Vue Projets', icon: FolderKanban, description: 'Pilotage des projets, délais, budgets et avancement.' },
    missions: { label: 'Vue Missions', icon: Target, description: 'Suivi des missions, validations DG et blocages.' },
    tasks: { label: 'Vue Tâches', icon: ListTodo, description: 'Contrôle des tâches, validations et alertes de workflow.' },
    teams: { label: 'Vue Équipes', icon: Building2, description: 'Charge, saturation et blocs opérationnels par équipe.' },
    collaborators: { label: 'Vue Collaborateurs', icon: Users, description: 'Suivi des comptes actifs, connexions et conformité.' },
  };

  const activeViewMeta = viewMeta[view];

  const projectTable = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Portefeuille filtré</p>
          <p className="text-xs text-slate-500">{filteredProjectCount} projet(s) affiché(s)</p>
        </div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">{projectStats.delayed} en retard</Badge>
      </div>
      <div className="max-h-[31rem] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Projet</th>
              <th className="px-4 py-3 text-left font-semibold">Manager</th>
              <th className="px-4 py-3 text-center font-semibold">Missions</th>
              <th className="px-4 py-3 text-center font-semibold">Tâches</th>
              <th className="px-4 py-3 text-center font-semibold">Avancement</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProjects.slice(0, 8).map((project) => (
              <tr key={project.project_id} className={`${project.is_delayed ? 'bg-rose-50/30' : ''} hover:bg-slate-50`}>
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{project.project_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{valueOrDash(project.code)}</div>
                </td>
                <td className="px-4 py-4 text-slate-600">{valueOrDash(project.manager_name || project.project_manager_name || project.chefProjet)}</td>
                <td className="px-4 py-4 text-center text-slate-700">{Number(project.missions_count || 0)}</td>
                <td className="px-4 py-4 text-center text-slate-700">{Number(project.tasks_count || 0)}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-xs text-slate-500">{formatPercent(Number(project.progress_percent || 0))}</span>
                    <Progress value={Number(project.progress_percent || 0)} className="h-2 flex-1" />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClass(projectStatusTone(project.status))}>{projectStatusLabel(project.status)}</Badge>
                    {project.is_delayed || Number(project.delay_count || 0) > 0 ? <Badge className={statusBadgeClass('rose')}>Retard</Badge> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const missionTable = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Missions filtrées</p>
          <p className="text-xs text-slate-500">{filteredMissionCount} mission(s) visible(s)</p>
        </div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">{missionStats.pendingDg} en attente DG</Badge>
      </div>
      <div className="max-h-[31rem] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Mission</th>
              <th className="px-4 py-3 text-left font-semibold">Projet</th>
              <th className="px-4 py-3 text-left font-semibold">Manager</th>
              <th className="px-4 py-3 text-center font-semibold">Progression</th>
              <th className="px-4 py-3 text-left font-semibold">Échéance</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMissions.slice(0, 8).map((mission) => (
              <tr key={mission.id} className={`${mission.id === Number(missionFilter) ? 'bg-indigo-50/50' : ''} hover:bg-slate-50`}>
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{mission.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{shortText(mission.description || 'Aucune description', 34)}</div>
                </td>
                <td className="px-4 py-4 text-slate-600">{mission.project_name}</td>
                <td className="px-4 py-4 text-slate-600">{valueOrDash(mission.manager_name)}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-xs text-slate-500">{formatPercent(Number(mission.progress_percent || 0))}</span>
                    <Progress value={Number(mission.progress_percent || 0)} className="h-2 flex-1" />
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600">{mission.end_date ? formatDateForDisplay(mission.end_date) : '—'}</td>
                <td className="px-4 py-4">
                  <Badge className={statusBadgeClass(missionStatusTone(mission.status))}>{missionStatusLabel(mission.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const taskTable = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Tâches critiques</p>
          <p className="text-xs text-slate-500">{filteredTaskCount} alerte(s) visible(s)</p>
        </div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">{taskBlockingCount} bloquée(s)</Badge>
      </div>
      <div className="max-h-[31rem] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Tâche</th>
              <th className="px-4 py-3 text-left font-semibold">Projet</th>
              <th className="px-4 py-3 text-left font-semibold">Collaborateur</th>
              <th className="px-4 py-3 text-center font-semibold">Durée</th>
              <th className="px-4 py-3 text-center font-semibold">Date</th>
              <th className="px-4 py-3 text-center font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(filteredTasks.length > 0 ? filteredTasks : blockingTaskAlerts).slice(0, 8).map((task) => (
              <tr key={`${task.id}-${task.task_id}`} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{task.task_title}</div>
                  <div className="mt-1 text-xs text-slate-500">{shortText(`${task.project_name || ''} · ${task.user_name || ''}`, 36)}</div>
                </td>
                <td className="px-4 py-4 text-slate-600">{valueOrDash(task.project_name)}</td>
                <td className="px-4 py-4 text-slate-600">{valueOrDash(task.user_name)}</td>
                <td className="px-4 py-4 text-center text-slate-600">{formatHours(Number(task.duration_hours || 0))}</td>
                <td className="px-4 py-4 text-center text-slate-600">{task.task_date ? formatDateForDisplay(task.task_date) : '—'}</td>
                <td className="px-4 py-4 text-center">
                  <Badge className={statusBadgeClass('amber')}>Chronophage</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const teamTable = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Équipes sous surveillance</p>
          <p className="text-xs text-slate-500">{filteredTeamCount} équipe(s) visible(s)</p>
        </div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">{overloadedTeams} en surcharge</Badge>
      </div>
      <div className="max-h-[31rem] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Equipe</th>
              <th className="px-4 py-3 text-left font-semibold">Manager</th>
              <th className="px-4 py-3 text-center font-semibold">Membres</th>
              <th className="px-4 py-3 text-center font-semibold">Charge</th>
              <th className="px-4 py-3 text-center font-semibold">Blocages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTeamRows.slice(0, 8).map((team) => (
              <tr key={team.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{team.team_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{team.risk_level === 'critical' ? 'Critique' : team.risk_level === 'attention' ? 'À surveiller' : 'Stable'}</div>
                </td>
                <td className="px-4 py-4 text-slate-600">{valueOrDash(team.manager_name)}</td>
                <td className="px-4 py-4 text-center text-slate-700">{Number(team.member_count || 0)}</td>
                <td className="px-4 py-4 text-center text-slate-700">{formatHours(Number(team.average_hours || 0))}</td>
                <td className="px-4 py-4 text-center text-slate-700">{Number(team.blocking_tasks || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const collaboratorTable = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Collaborateurs</p>
          <p className="text-xs text-slate-500">{filteredCollaboratorCount} utilisateur(s) visible(s)</p>
        </div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">{invalidUsers.length} non conformes</Badge>
      </div>
      <div className="max-h-[31rem] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Utilisateur</th>
              <th className="px-4 py-3 text-left font-semibold">Equipe</th>
              <th className="px-4 py-3 text-center font-semibold">Heures</th>
              <th className="px-4 py-3 text-center font-semibold">Blocages</th>
              <th className="px-4 py-3 text-center font-semibold">Connexion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCollaborators.slice(0, 8).map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{user.nom}</div>
                  <div className="mt-1 text-xs text-slate-500">{user.email}</div>
                </td>
                <td className="px-4 py-4 text-slate-600">{user.team_name || 'Sans équipe'}</td>
                <td className="px-4 py-4 text-center text-slate-700">{formatHours(Number(user.hours || 0))}</td>
                <td className="px-4 py-4 text-center text-slate-700">{Number(user.blocking || 0)}</td>
                <td className="px-4 py-4 text-center text-slate-600">{user.last_login ? formatDateForDisplay(user.last_login) : 'Jamais'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const rolePieData = roleDistributionData.map((item) => ({ ...item, value: Number(item.value || 0) }));

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord Admin"
          description="Supervision opérationnelle de la plateforme, des workflows, des équipes et des anomalies."
        />
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" />
        </div>
      </div>
    );
  }

  const hasData = Boolean(audit || projectsDashboard || projectsStats || budgetRows.length > 0);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord Admin"
          description="Supervision opérationnelle de la plateforme, des workflows, des équipes et des anomalies."
          actions={
            <button
              type="button"
              onClick={() => setRefreshTick((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </button>
          }
        />
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
          Impossible de charger les données du tableau de bord administrateur.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord Admin"
        description="Supervision opérationnelle de la plateforme, des workflows, des équipes et des anomalies."
        actions={
          <>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              <Users className="h-4 w-4" />
              Utilisateurs
            </Link>
            <button
              type="button"
              onClick={() => setRefreshTick((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Actualiser
            </button>
          </>
        }
      />

      {warnings.length > 0 ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Certaines données sont incomplètes</p>
              <p className="mt-1 text-sm leading-6">{warnings.slice(0, 3).join(' · ')}{warnings.length > 3 ? ' …' : ''}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white via-slate-50 to-indigo-50 p-6 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Supervision globale
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Le centre de contrôle de l&apos;administrateur.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Projets, missions, tâches, équipes, finances et alertes sont réunis dans un seul écran pour détecter les anomalies et agir vite.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/admin/projects"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <FolderKanban className="h-4 w-4" />
                Gérer les projets
              </Link>
              <Link
                to="/dashboard/task-analytics/suivi-financier"
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Wallet className="h-4 w-4" />
                Suivi financier
              </Link>
              <Link
                to="/dashboard/task-analytics/alertes-dg"
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
              >
                <Bell className="h-4 w-4" />
                Centre d&apos;alertes
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[34rem]">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Projets en retard</span>
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{delayedProjects}</p>
              <p className="mt-1 text-xs text-slate-500">À traiter en priorité</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Missions à valider</span>
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{missionStats.pendingDg}</p>
              <p className="mt-1 text-xs text-slate-500">En attente de décision DG</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Tâches bloquées</span>
                <ListTodo className="h-5 w-5 text-violet-500" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{taskBlockingCount}</p>
              <p className="mt-1 text-xs text-slate-500">Workflow à débloquer</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Alertes critiques</span>
                <Bell className="h-5 w-5 text-sky-500" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{criticalProjectAlerts}</p>
              <p className="mt-1 text-xs text-slate-500">{unresolvedProjectAlerts} alertes ouvertes</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total utilisateurs" value={totalUsers} subtitle={`${activeUsers} actifs · ${inactiveUsers} inactifs`} tone="blue" />
        <MetricCard icon={UserCheck} label="Comptes actifs" value={activeUsers} subtitle={`${activeManagers} managers · ${activeCollaborators} collaborateurs`} tone="emerald" />
        <MetricCard icon={CalendarDays} label="Nouveaux comptes" value={newAccounts} subtitle="Créés ce mois-ci" tone="violet" />
        <MetricCard icon={Activity} label="Connexions récentes" value={recentLogins} subtitle="Derniers 7 jours" tone="cyan" />
        <MetricCard icon={FolderKanban} label="Projets actifs" value={activeProjects} subtitle={`${completedProjects} terminés · ${suspendedProjects} suspendus`} tone="blue" />
        <MetricCard icon={TrendingUp} label="Projets en retard" value={delayedProjects} subtitle={`${financialRiskProjects} à risque financier`} tone="rose" />
        <MetricCard icon={Target} label="Missions ouvertes" value={missionStats.open} subtitle={`${missionStats.pendingDg} à valider DG`} tone="violet" />
        <MetricCard icon={ListTodo} label="Tâches bloquées" value={taskBlockingCount} subtitle={`${taskRiskCount} en risque de délai`} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Ce qui nécessite votre attention"
          actions={<Badge className="border-rose-200 bg-rose-50 text-rose-700">{attentionItems.length}</Badge>}
          empty={attentionItems.length === 0}
          emptyMessage="Aucune alerte critique détectée"
        >
          <div className="space-y-3">
            {attentionItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${item.level === 'critical' ? 'bg-rose-500' : item.level === 'risk' ? 'bg-amber-500' : item.level === 'attention' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                      <p className="font-semibold text-slate-900">{item.title}</p>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{item.project}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                  <Link
                    to={item.actionTo}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {item.actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Centre d'alertes plateforme"
          actions={<Badge className="border-slate-200 bg-slate-50 text-slate-700">{projectAlertsList.length + taskAlertsList.length}</Badge>}
          empty={projectAlertsList.length === 0 && taskAlertsList.length === 0}
          emptyMessage="Aucune alerte disponible"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Alertes projets</p>
                <Badge className={statusBadgeClass('rose')}>{projectAlertsList.length}</Badge>
              </div>
              <div className="space-y-2">
                {projectAlertsList.slice(0, 4).map((alert: ProjectAlert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{joinNonEmpty([alert.project_name, alert.message])}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Alertes workflow</p>
                <Badge className={statusBadgeClass('amber')}>{blockingTaskAlerts.length}</Badge>
              </div>
              <div className="space-y-2">
                {blockingTaskAlerts.slice(0, 4).map((task) => (
                  <div key={`${task.id}-${task.task_id}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{task.task_title || 'Blocage'}</p>
                    <p className="mt-1 text-xs text-slate-500">{joinNonEmpty([task.project_name, task.user_name, task.blocking_reason || task.message])}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-slate-400">Supervision globale</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{activeViewMeta.label}</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{activeViewMeta.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(viewMeta) as Array<[ViewKey, (typeof viewMeta)[ViewKey]]>).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = view === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-indigo-200 bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Recherche</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Projet, mission, manager, équipe, collaborateur..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Projet</label>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
            >
              <option value="all">Tous les projets</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Mission</label>
            <select
              value={missionFilter}
              onChange={(event) => setMissionFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
            >
              <option value="all">Toutes les missions</option>
              {missionOptions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Manager</label>
            <select
              value={managerFilter}
              onChange={(event) => setManagerFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
            >
              <option value="all">Tous les managers</option>
              {managerOptions.map((manager) => (
                <option key={manager} value={manager}>
                  {manager}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Equipe</label>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
            >
              <option value="all">Toutes les équipes</option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Période</label>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
            >
              <option value="all">Toute période</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
              <option value="1y">12 mois</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{filteredProjectCount} projets</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{filteredMissionCount} missions</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{filteredTaskCount} alertes tâches</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{filteredTeamCount} équipes</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{filteredCollaboratorCount} collaborateurs</span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-4">
            {view === 'projects' ? projectTable : null}
            {view === 'missions' ? missionTable : null}
            {view === 'tasks' ? taskTable : null}
            {view === 'teams' ? teamTable : null}
            {view === 'collaborators' ? collaboratorTable : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Focus</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{activeViewMeta.label}</h3>
              </div>
              <Badge className="border-slate-200 bg-white text-slate-700">{view === 'projects' ? projectFocus?.project_name || 'Aucun projet' : view === 'missions' ? missionFocus?.name || 'Aucune mission' : view === 'tasks' ? 'Workflow' : view === 'teams' ? teamFocus?.team_name || 'Aucune équipe' : collaboratorFocus?.nom || 'Aucun collaborateur'}</Badge>
            </div>
            <div className="mt-4">{focusPanel}</div>
            <div className="mt-6 rounded-2xl border border-white bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Synthèse rapide</p>
                <Badge className={statusBadgeClass('blue')}>Plateforme</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Total projets</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{totalProjects}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Budget consommé</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(consumedBudget)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Budget restant</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(remainingBudget)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Dépassements</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{budgetOverruns}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                L&apos;administrateur pilote la plateforme, les accès, les anomalies et les workflows, sans se confondre avec le pilotage stratégique DG.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Répartition des statuts projets" empty={projectStatusData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={projectStatusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {projectStatusData.map((_entry, index) => (
                  <Cell key={`project-status-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition des statuts missions" empty={missionStatusData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={missionStatusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {missionStatusData.map((_entry, index) => (
                  <Cell key={`mission-status-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition des statuts tâches" empty={taskStatusData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={taskStatusData} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {taskStatusData.map((_entry, index) => (
                  <Cell key={`task-status-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Avancement moyen des projets" empty={projectProgressData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectProgressData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip formatter={(value: number, _name, props) => [`${Number(value).toFixed(1)}%`, props.payload.project_name]} />
              <Bar dataKey="progress" radius={[10, 10, 0, 0]}>
                {projectProgressData.map((_entry, index) => (
                  <Cell key={`progress-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Suivi financier projet" empty={budgetChartData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetChartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number, _name, props) => [formatMoney(Number(value)), props.payload.project_name]} />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="#c4b5fd" radius={[0, 10, 10, 0]} />
              <Bar dataKey="consumed" name="Consommé" fill="#4f46e5" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Charge des équipes" empty={teamLoadChartData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamLoadChartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number, _name, props) => [formatHours(Number(value)), props.payload.team_name]} />
              <Legend />
              <Bar dataKey="average" name="Moyenne" fill="#0ea5e9" radius={[0, 10, 10, 0]} />
              <Bar dataKey="hours" name="Heures" fill="#94a3b8" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Évolution mensuelle des projets" empty={projectEvolutionData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projectEvolutionData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" name="Nouveaux projets" stroke="#4f46e5" fill="#c7d2fe" />
              <Area type="monotone" dataKey="active" name="Actifs" stroke="#0ea5e9" fill="#bae6fd" />
              <Area type="monotone" dataKey="delayed" name="Retard" stroke="#ef4444" fill="#fecaca" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Radar des risques" empty={riskRadarData.length === 0}>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={riskRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Répartition des rôles" empty={rolePieData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={rolePieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={4}>
                {rolePieData.map((_entry, index) => (
                  <Cell key={`role-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Dernières connexions" empty={auditUsers.filter((user) => user.dernier_connexion).length === 0}>
          <div className="space-y-3">
            {[...auditUsers]
              .filter((user) => user.dernier_connexion)
              .sort((a, b) => String(b.dernier_connexion || '').localeCompare(String(a.dernier_connexion || '')))
              .slice(0, 6)
              .map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{user.nom}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{roleLabel(user.role, user.appRole)}</p>
                    <p className="text-xs text-slate-500">{user.dernier_connexion ? formatDateForDisplay(user.dernier_connexion) : 'Jamais'}</p>
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Comptes non conformes" empty={invalidUsers.length === 0}>
          <div className="space-y-3">
            {invalidUsers.slice(0, 6).map((user) => (
              <div key={user.id} className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-800">
                <p className="font-semibold">{user.nom || user.email || `Utilisateur ${user.id}`}</p>
                <p className="mt-1 text-xs">{joinNonEmpty([roleLabel(user.role, user.appRole), user.reason || 'Rôle à corriger'])}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Synthèse sécurité & workflow" empty={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Alertes projets ouvertes</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{unresolvedProjectAlerts}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Tâches bloquées</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{taskBlockingCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Missions à valider</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{missionStats.pendingDg}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Equipes à surveiller</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{overloadedTeams}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Budget consommé</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(consumedBudget)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Budget restant</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(remainingBudget)}</p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
