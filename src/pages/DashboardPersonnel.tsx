import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../lib/roles';
import PageHeader from '../components/layout/PageHeader';
import { usePermissions } from '../hooks/usePermissions';
import { formatDateForDisplay } from '../lib/date';
import { analyticsApi, WeekSummary, ManagerSummary, DGSummary, ProjectTrackingDashboard, BlockingTask, TaskAlert } from '../lib/api-analytics';
import CollaboratorDashboard from '../components/dashboard/CollaboratorDashboard';
import DashboardCard from '../components/dashboard/DashboardCard';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/TaskAnalytics/ChartCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClipboardList,
  CheckSquare,
  BarChart3,
  FolderKanban,
  Users,
  ListChecks,
  Briefcase,
  User,
  Sparkles,
  Clock3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers3,
  Rocket,
  CircleAlert,
  AlertTriangle,
  Gauge,
  CalendarDays,
  Target,
  Eye,
  Activity,
  Brain,
  FileDown,
  Bell,
  Workflow,
} from 'lucide-react';
import { getWeek, getYear } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell, Legend, PieChart, Pie, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

interface QuickCard {
  label: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  accentClass: string;
  iconClass: string;
  permission: string | null;
  badge?: string;
  roles?: Array<'ADMIN' | 'DG' | 'CHEF_PROJET' | 'EMPLOYE'>;
}

const QUICK_CARDS: QuickCard[] = [
  {
    label: 'Saisie des Temps',
    description: 'Declarez vos activites quotidiennes sans perdre le fil de votre semaine.',
    path: '/timesheet/saisie',
    icon: <ClipboardList className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    iconClass: 'bg-blue-100 text-blue-600',
    permission: 'time_entries:create',
    badge: 'Essentiel',
  },
  {
    label: 'Validation Temps',
    description: "Approuvez les tâches soumises par les membres de votre équipe.",
    path: '/timesheet/validation',
    icon: <CheckSquare className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    iconClass: 'bg-emerald-100 text-emerald-600',
    permission: 'time_entries:validate',
    badge: 'Equipe',
  },
  {
    label: 'Analytics DG',
    description: "Consultez une lecture strategique de l'activite et des performances.",
    path: '/dashboard/task-analytics/dg',
    icon: <BarChart3 className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    iconClass: 'bg-violet-100 text-violet-600',
    permission: 'analytics:read_global',
    badge: 'Pilotage',
  },
  {
    label: 'Gestion des Equipes',
    description: "Orchestrez les équipes, les affectations et les priorités de travail.",
    path: '/dashboard/equipes',
    icon: <Users className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    iconClass: 'bg-cyan-100 text-cyan-700',
    permission: 'teams:read_own',
    badge: 'Structure',
  },
  {
    label: 'Suivi Projets',
    description: 'Suivez la consommation, le budget et la progression des projets actifs.',
    path: '/dashboard/task-analytics/projets',
    icon: <FolderKanban className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-amber-400 to-orange-500',
    iconClass: 'bg-amber-100 text-amber-700',
    permission: 'projects:read_own',
    badge: 'Projet',
  },
  {
    label: 'Mon Equipe',
    description: 'Gardez un oeil sur la charge, la cadence et les points de blocage.',
    path: '/dashboard/task-analytics/equipe',
    icon: <Users className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-teal-500 to-emerald-500',
    iconClass: 'bg-teal-100 text-teal-700',
    permission: 'tasks:read_team',
    badge: 'Suivi',
  },
  {
    label: 'Analyse Taches',
    description: 'Repérez rapidement les tâches chronophages, sensibles ou répétitives.',
    path: '/dashboard/task-analytics/taches',
    icon: <ListChecks className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-rose-500 to-pink-500',
    iconClass: 'bg-rose-100 text-rose-600',
    permission: 'analytics:read_own_projects',
    badge: 'Analyse',
  },
  {
    label: 'RH & Offres',
    description: 'Administrez les offres, les candidatures et les archives RH.',
    path: '/dashboard/rh-offres',
    icon: <Briefcase className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
    iconClass: 'bg-fuchsia-100 text-fuchsia-600',
    permission: 'rh:read_all',
    badge: 'Admin',
    roles: ['ADMIN', 'DG'],
  },
  {
    label: 'Audit Utilisateurs',
    description: 'Controlez les comptes, les roles et la qualite des donnees utilisateurs.',
    path: '/admin/audit',
    icon: <Users className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-emerald-500 to-lime-500',
    iconClass: 'bg-emerald-100 text-emerald-700',
    permission: 'users:read_all',
    badge: 'Controle',
    roles: ['ADMIN'],
  },
  {
    label: 'Nouvel utilisateur',
    description: 'Créez un compte utilisateur avec le rôle et les accès appropriés.',
    path: '/admin/users',
    icon: <Users className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    iconClass: 'bg-indigo-100 text-indigo-700',
    permission: 'users:create',
    badge: 'Action',
    roles: ['ADMIN', 'DG'],
  },
  {
    label: 'Nouveau projet',
    description: 'Lancez un nouveau projet et structurez rapidement son exécution.',
    path: '/admin/projects',
    icon: <FolderKanban className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-cyan-500 to-indigo-500',
    iconClass: 'bg-cyan-100 text-cyan-700',
    permission: 'projects:create',
    badge: 'Action',
    roles: ['ADMIN', 'DG'],
  },
  {
    label: 'Mon Profil',
    description: 'Mettez a jour vos informations et gardez votre espace personnel a jour.',
    path: '/profile',
    icon: <User className="h-6 w-6" />,
    accentClass: 'bg-gradient-to-r from-slate-500 to-slate-600',
    iconClass: 'bg-slate-100 text-slate-600',
    permission: null,
    badge: 'Compte',
  },
];

const STRATEGIC_ROLES = ['DG', 'ADMIN'] as const;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatStatusLabel(value?: string | null) {
  switch ((value || '').toLowerCase()) {
    case 'completed':
      return 'Terminé';
    case 'active':
      return 'En cours';
    case 'planned':
      return 'Planifié';
    case 'on_hold':
      return 'En pause';
    case 'cancelled':
      return 'Annulé';
    default:
      return value || 'â€”';
  }
}

function formatPriorityLabel(value?: string | null) {
  switch ((value || '').toLowerCase()) {
    case 'high':
      return 'Élevée';
    case 'medium':
      return 'Moyenne';
    case 'low':
      return 'Faible';
    default:
      return value || 'â€”';
  }
}

export default function DashboardPersonnel() {
  const { user, appRole } = useAuth();
  const { can } = usePermissions();
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [managerSummary, setManagerSummary] = useState<ManagerSummary | null>(null);
  const [dgSummary, setDGSummary] = useState<DGSummary | null>(null);
  const [trackingDashboard, setTrackingDashboard] = useState<ProjectTrackingDashboard | null>(null);
  const [strategicAlerts, setStrategicAlerts] = useState<Array<BlockingTask | TaskAlert>>([]);
  const [selectedDashboardFilter, setSelectedDashboardFilter] = useState<'all' | 'retard' | 'critique' | 'termines'>('all');
  const isStrategicRole = STRATEGIC_ROLES.includes(appRole as (typeof STRATEGIC_ROLES)[number]);
  const showStrategicGraphs = appRole === 'DG';

  const visibleCards = QUICK_CARDS.filter(
    (card) => (!card.permission || can(card.permission)) && (!card.roles || card.roles.includes(appRole))
  );
  const isCollaborator = appRole === 'EMPLOYE';
  const isManager = appRole === 'CHEF_PROJET';
  const canLoadWeekSummary = false;
  const firstName = user?.nom ? user.nom.split(' ')[0] : '';
  const todayLabel = formatDateForDisplay(new Date().toISOString());

  useEffect(() => {
    let cancelled = false;
    const loadSummary = async () => {
      try {
        const now = new Date();
        const year = getYear(now);
        const week = getWeek(now, { weekStartsOn: 1 });
        if (canLoadWeekSummary) {
          const weekRes = await analyticsApi.getWeekSummary(year, week);
          if (!cancelled) {
            setWeekSummary((weekRes as any).data || (weekRes as any) || null);
          }
        } else if (!cancelled) {
          setWeekSummary(null);
        }

        if (isManager) {
          const managerRes = await analyticsApi.getManagerDashboard();
          if (!cancelled) {
            setManagerSummary((managerRes as any).data || (managerRes as any) || null);
          }
        } else if (!cancelled) {
          setManagerSummary(null);
        }
      } catch (_e) {
        if (!cancelled) {
          setWeekSummary(null);
          setManagerSummary(null);
        }
      }
    };
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [canLoadWeekSummary, isManager]);

  useEffect(() => {
    let cancelled = false;

    const loadStrategicData = async () => {
      if (!isStrategicRole) {
        setDGSummary(null);
        setTrackingDashboard(null);
        setStrategicAlerts([]);
        return;
      }

      try {
        const [dgRes, trackingRes, alertsRes] = await Promise.all([
          analyticsApi.getDGDashboard(),
          analyticsApi.getProjectsTrackingDashboard(),
          analyticsApi.getAlerts(),
        ]);

        if (cancelled) return;

        setDGSummary(dgRes.data);
        setTrackingDashboard(trackingRes.data);
        setStrategicAlerts(alertsRes.data.task_alerts || alertsRes.data.blocking_tasks || []);
      } catch (_error) {
        if (!cancelled) {
          setDGSummary(null);
          setTrackingDashboard(null);
          setStrategicAlerts([]);
        }
      }
    };

    loadStrategicData();

    return () => {
      cancelled = true;
    };
  }, [isStrategicRole]);

  if (isCollaborator) {
    return <CollaboratorDashboard />;
  }

  const heroStats = [
    {
      label: 'Priorite',
      value: 'Saisie',
      helper: 'Gardez vos heures à jour chaque jour', 
      icon: <Rocket className="h-5 w-5" />,
    },
    {
      label: 'Navigation',
      value: `${visibleCards.length}`,
      helper: 'espaces utiles disponibles',
      icon: <Layers3 className="h-5 w-5" />,
    },
    {
      label: 'Qualite',
      value: 'Clair',
      helper: 'descriptions propres et faciles a relire',
      icon: <ShieldCheck className="h-5 w-5" />,
    },
  ];




  const collaborators = Array.from(new Set(
    Object.values(dgSummary?.grouped_by_team || {})
      .flatMap((projects) => Object.values(projects).flat())
      .map((entry) => entry.collaborateur)
      .filter(Boolean)
  ));
  const activeCollaborators = collaborators.length;

  const strategicMetrics = isStrategicRole
    ? [
        { label: 'Projets actifs', value: String(toNumber(trackingDashboard?.stats?.projects?.active ?? (trackingDashboard?.projects || []).filter((project) => (project.status || '').toLowerCase() === 'active').length)), helper: `${trackingDashboard?.stats?.projects?.changeVsLastMonth || 0} vs mois précédent`, icon: <FolderKanban className="h-5 w-5" />, tone: 'blue' as const },
        { label: 'Projets terminés', value: String(toNumber(trackingDashboard?.stats?.projects?.completed ?? (trackingDashboard?.projects || []).filter((project) => (project.status || '').toLowerCase() === 'completed').length)), helper: 'Livrés ou finalisés', icon: <CheckCircle2 className="h-5 w-5" />, tone: 'emerald' as const },
        { label: 'Projets en retard', value: String(toNumber(trackingDashboard?.stats?.projects?.delayed ?? (trackingDashboard?.projects || []).filter((project) => project.is_delayed).length)), helper: 'Échéances dépassées', icon: <AlertTriangle className="h-5 w-5" />, tone: 'amber' as const },
        { label: 'Tâches critiques', value: String(toNumber(trackingDashboard?.stats?.tasks?.blocking ?? strategicAlerts.filter((alert) => 'blocking_reason' in alert).length)), helper: `${trackingDashboard?.stats?.tasks?.delayAlerts || 0} risques`, icon: <CircleAlert className="h-5 w-5" />, tone: 'amber' as const },
        { label: 'Collaborateurs actifs', value: String(activeCollaborators), helper: 'Présents dans les équipes', icon: <Users className="h-5 w-5" />, tone: 'violet' as const },
        { label: 'Productivité globale', value: `${Math.round(toNumber(trackingDashboard?.stats?.management?.averageProgress ?? 0))}%`, helper: 'Progression consolidée', icon: <Gauge className="h-5 w-5" />, tone: 'violet' as const },
        { label: 'Heures travaillées', value: `${compactNumber(toNumber(dgSummary?.kpis.totalHours ?? 0))} h`, helper: 'Volume total', icon: <Clock3 className="h-5 w-5" />, tone: 'blue' as const },
        { label: 'Validations en attente', value: String(toNumber(dgSummary?.kpis.pendingValidation ?? 0)), helper: 'À traiter rapidement', icon: <CheckSquare className="h-5 w-5" />, tone: 'amber' as const },
      ]
    : [];

  const trackingStats = trackingDashboard?.stats;

  const strategicProjects = trackingDashboard?.projects || [];
  const projectStats = trackingStats?.projects;
  const taskStats = trackingStats?.tasks;
  const rhStats = trackingStats?.rh;

  const strategicHealthScore =
    toNumber(projectStats?.delayed) * 4 +
    toNumber(taskStats?.blocking) * 3 +
    toNumber(rhStats?.important) * 2 +
    (strategicAlerts.length > 0 ? 1 : 0);

  const strategicHealth =
    strategicHealthScore >= 10
      ? { label: 'Critique', badge: 'bg-rose-100 text-rose-700', icon: AlertTriangle, gradient: 'from-rose-600 via-red-600 to-orange-500' }
      : strategicHealthScore >= 4
        ? { label: 'Attention', badge: 'bg-amber-100 text-amber-700', icon: CircleAlert, gradient: 'from-amber-500 via-orange-500 to-rose-500' }
        : { label: 'Stable', badge: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck, gradient: 'from-emerald-500 via-teal-500 to-cyan-500' };

  const activeProjects = toNumber(projectStats?.active ?? strategicProjects.filter((project) => (project.status || '').toLowerCase() === 'active').length);
  const completedProjects = toNumber(projectStats?.completed ?? strategicProjects.filter((project) => (project.status || '').toLowerCase() === 'completed').length);
  const delayedProjects = toNumber(projectStats?.delayed ?? strategicProjects.filter((project) => project.is_delayed).length);
  const criticalTasks = toNumber(taskStats?.blocking ?? strategicAlerts.filter((alert) => 'blocking_reason' in alert).length);
  const totalHours = toNumber(dgSummary?.kpis.totalHours ?? 0);
  const totalTasks = toNumber(dgSummary?.kpis.totalTasks ?? 0);
  const pendingValidations = toNumber(dgSummary?.kpis.pendingValidation ?? 0);
  const productivityGlobal = toNumber(trackingStats?.management?.averageProgress ?? 0);
  const budgetConsumed = strategicProjects.reduce((acc, project) => acc + toNumber(project.time_consumed_percent), 0) / Math.max(strategicProjects.length, 1);
  const validationRate = totalTasks > 0 ? Math.round(((totalTasks - pendingValidations) / totalTasks) * 100) : 0;
  const overloadedTeams = (dgSummary?.grouped_by_team ? Object.entries(dgSummary.grouped_by_team) : []).filter(([, projects]) => {
    const entries = Object.values(projects).flat();
    return entries.length >= 8;
  }).length;

  const projectCharts = {
    progress: (trackingDashboard?.charts.progressByProject || []).slice(0, 8),
    tasks: trackingDashboard?.charts.tasksStatus || [],
    monthly: trackingDashboard?.charts.monthlyEvolution || [],
  };

  const teamHoursData = Object.entries(dgSummary?.grouped_by_team || {}).map(([teamName, projects]) => {
    const entries = Object.values(projects).flat() as Array<{ hours: number }>;
    return {
      name: teamName,
      hours: entries.reduce((acc, entry) => acc + toNumber(entry.hours), 0),
    };
  });

  const projectFilterRows = strategicProjects.filter((project) => {
    const filterState = selectedDashboardFilter;
    if (filterState === 'retard') return Boolean(project.is_delayed);
    if (filterState === 'critique') return Boolean(project.is_delayed || project.is_near_deadline || toNumber(project.delay_count) > 0);
    if (filterState === 'termines') return (project.status || '').toLowerCase() === 'completed';
    return true;
  });

  return (
    <>

      {isStrategicRole && (
        <>
          <section className="mb-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
              {strategicMetrics.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  helper={stat.helper}
                  icon={stat.icon}
                  tone={stat.tone}
                />
              ))}
            </div>
          </section>

          {showStrategicGraphs && (
            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Surveillance des projets</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Surveillance des projets</h3>
                    <p className="mt-1 text-sm text-slate-500">Vue consolidée des projets, chefs projet, priorités et deadlines.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['all', 'Tous'],
                      ['retard', 'Retard'],
                      ['critique', 'Critique'],
                      ['termines', 'Terminés'],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedDashboardFilter(value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          selectedDashboardFilter === value
                            ? 'border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-200/60'
                            : 'border-white/80 bg-white/70 text-slate-600 hover:border-indigo-200 hover:bg-white hover:text-indigo-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Projet</th>
                        <th className="px-4 py-3 text-left font-semibold">Chef Projet</th>
                        <th className="px-4 py-3 text-left font-semibold">Avancement</th>
                        <th className="px-4 py-3 text-left font-semibold">Deadline</th>
                        <th className="px-4 py-3 text-left font-semibold">Statut</th>
                        <th className="px-4 py-3 text-left font-semibold">Priorité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectFilterRows.slice(0, 8).map((project) => (
                        <tr key={project.project_id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{project.project_name}</div>
                            <div className="text-xs text-slate-500">{project.client_name || 'Client interne'}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{project.manager_name || project.project_manager_name || '?'}</td>
                          <td className="px-4 py-4">
                            <div className="w-40">
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{Math.round(toNumber(project.progress_percent))}%</span>
                                <span>{project.tasks_completed_count || 0}/{project.tasks_count || 0}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${Math.max(0, Math.min(100, toNumber(project.progress_percent)))}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{formatDateForDisplay(project.expected_end_date || project.end_date || project.start_date)}</td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{formatStatusLabel(project.status)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{formatPriorityLabel(project.priority)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Actions rapides</p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Actions stratégiques</h3>
                  </div>
                  <div className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 sm:inline-flex">
                    Pilotage express
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Button asChild className="h-12 justify-between rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700">
                    <Link to="/dashboard/task-analytics/suivi-projets">
                      <span className="flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Ajouter Projet</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button onClick={() => window.print()} variant="secondary" className="h-12 justify-between rounded-2xl">
                    <span className="flex items-center gap-2"><FileDown className="h-4 w-4" /> Générer Rapport PDF</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="outline" className="h-12 justify-between rounded-2xl">
                    <Link to="/dashboard/task-analytics/dg">
                      <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Voir Analytics DG</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 justify-between rounded-2xl">
                    <Link to="/dashboard/rh-offres">
                      <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Voir RH & Offres</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 justify-between rounded-2xl">
                    <Link to="/dashboard/task-analytics/equipe">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Réunion Équipe</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
            </section>
            </div>
          )}
          </>
      )}
      {!isStrategicRole && isManager && (
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pilotage équipe</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Statistiques manager</h3>
            </div>
            <div className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 sm:inline-flex">
              Semaine en cours
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Projets réalisés"
              value={String(managerSummary?.kpis?.projectsRealised ?? 0)}
              helper="Projets terminés ou validés sur l'équipe"
              icon={<FolderKanban className="h-5 w-5" />}
              tone="violet"
            />
            <StatCard
              label="Tâches bloquées"
              value={String(managerSummary?.kpis?.blockingTasks ?? 0)}
              helper="Signalées par les collaborateurs"
              icon={<CircleAlert className="h-5 w-5" />}
              tone="amber"
            />
            <StatCard
              label="Risque de retard"
              value={String(managerSummary?.kpis?.delayRiskTasks ?? 0)}
              helper="Tâches à surveiller cette semaine"
              icon={<Clock3 className="h-5 w-5" />}
              tone="amber"
            />
            <StatCard
              label="Candidatures RH"
              value={String(managerSummary?.kpis?.rhCandidaturesReceived ?? 0)}
              helper="Nouvelles demandes reçues"
              icon={<Briefcase className="h-5 w-5" />}
              tone="emerald"
            />
          </div>
        </section>
      )}

      {!isStrategicRole && isCollaborator && (
        <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
          <Card className="relative overflow-hidden rounded-[1.75rem] border border-indigo-200/40 bg-gradient-to-br from-[#4F46E5] via-[#5560F1] to-[#6366F1] text-white shadow-xl shadow-indigo-200/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.14),_transparent_26%)]" />
            <div className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <CardContent className="relative p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-50/90">
                    <Sparkles className="h-3.5 w-3.5" />
                    Journée de travail
                  </div>
                  <p className="mt-5 text-sm capitalize text-indigo-100">{todayLabel}</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2rem]">
                    Prêt pour une saisie claire et rapide ?
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-indigo-100/95 sm:text-[15px]">
                    Renseignez vos tâches en continu pour garder une semaine lisible, éviter les oublis
                    et faciliter la validation de votre chef d'équipe.
                  </p>
                </div>
                <div className="hidden rounded-[1.5rem] border border-white/15 bg-white/10 p-4 shadow-lg shadow-indigo-900/10 backdrop-blur-md sm:block">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                    <Sparkles className="h-8 w-8 text-indigo-50" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="rounded-2xl bg-white/18 px-4 py-2.5 text-white shadow-lg shadow-indigo-900/10 backdrop-blur-md hover:scale-[1.02] hover:bg-white/24"
                >
                  <Link to="/timesheet/saisie">
                    Commencer la saisie
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-indigo-50/95 backdrop-blur-md">
                  Pensee pour un suivi quotidien, pas seulement en fin de semaine.
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-2 text-indigo-100">
                      {stat.icon}
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">{stat.label}</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-indigo-100/90">{stat.helper}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/80 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Checklist</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">Checklist rapide</h4>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  {
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                    shell: 'bg-emerald-50 border-emerald-100',
                    title: 'Date et projet verifies',
                    helper: 'Assurez-vous que la tâche est placée au bon moment.',
                  },
                  {
                    icon: <Clock3 className="h-4 w-4 text-amber-600" />,
                    shell: 'bg-amber-50 border-amber-100',
                    title: 'Duree reelle renseignee',
                    helper: 'Une duree precise simplifie la validation et le reporting.',
                  },
                  {
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                    shell: 'bg-emerald-50 border-emerald-100',
                    title: 'Titre de tâche clair',
                    helper: 'Formulez un intitule simple, relisible et actionnable.',
                  },
                  {
                    icon: <CircleAlert className="h-4 w-4 text-violet-600" />,
                    shell: 'bg-violet-50 border-violet-100',
                    title: 'Blocage signalé si besoin',
                    helper: 'Si nécessaire, signalez rapidement le blocage à votre chef d’équipe.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${item.shell}`}
                  >
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.helper}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {!isStrategicRole && !isManager && isCollaborator && (
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-1">
          <StatCard
            label="Semaine Courante"
            value={`${weekSummary?.totals?.weekHours ?? 0} h`}
            helper={`Statut: ${
              weekSummary?.report?.status === 'approved'
                ? 'Valide'
                : weekSummary?.report?.status === 'manager_validated'
                ? 'Valide manager'
                : weekSummary?.report?.status === 'submitted'
                ? 'Soumis'
                : weekSummary?.report?.status === 'to_correct'
                ? 'A corriger'
                : 'Brouillon'
            }`}
            icon={<ClipboardList className="h-5 w-5" />}
            tone="emerald"
          />
        </section>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Actions disponibles</h2>
        </div>
        <div className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 sm:inline-flex">
          Navigation rapide
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleCards.map((card) => (
          <DashboardCard
            key={card.path}
            title={card.label}
            description={card.description}
            path={card.path}
            icon={card.icon}
            accentClass={card.accentClass}
            iconClass={card.iconClass}
            badge={card.badge}
          />
        ))}
      </div>
    </>
  );
}


