import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock3,
  Eye,
  ListTodo,
  Search,
  Target,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../../lib/api-analytics';
import type {
  ProjectDetailsResponse,
  ProjectTrackingDashboard,
  ProjectTrackingRow,
} from '../../lib/api-analytics';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import ActionIconButton from '../../components/ui/ActionIconButton';
import { formatDateForDisplay } from '../../lib/date';

const STATUS_COLORS: Record<string, string> = {
  active: '#2563eb',
  completed: '#16a34a',
  on_hold: '#f59e0b',
  cancelled: '#ef4444',
};

const TASK_COLORS = ['#2563eb', '#7c3aed', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e'];
const PROGRESS_GOOD = '#16a34a';
const PROGRESS_RISK = '#f59e0b';
const PROGRESS_DELAY = '#ef4444';

function formatCompactLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function progressColor(progress: number) {
  if (progress >= 75) return PROGRESS_GOOD;
  if (progress >= 45) return PROGRESS_RISK;
  return PROGRESS_DELAY;
}

function formatDate(value?: string | null) {
  return formatDateForDisplay(value);
}

function formatStatus(value: string) {
  switch (value) {
    case 'active':
      return 'Actif';
    case 'completed':
      return 'Terminé';
    case 'on_hold':
      return 'En pause';
    case 'cancelled':
      return 'Annulé';
    default:
      return value;
  }
}

function statusClass(value: string) {
  switch (value) {
    case 'active':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'on_hold':
      return 'bg-amber-100 text-amber-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'validated':
      return 'bg-green-100 text-green-700';
    case 'submitted':
      return 'bg-indigo-100 text-indigo-700';
    case 'manager_validated':
      return 'bg-violet-100 text-violet-700';
    case 'closed':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

const SuiviProjets: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<ProjectTrackingDashboard | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await analyticsApi.getProjectsTrackingDashboard();
        setDashboard(response.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openDetails = async (projectId: number) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailError('');
    setProjectDetails(null);
    try {
      const response = await analyticsApi.getProjectTrackingDetails(projectId);
      setProjectDetails(response.data);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Impossible de charger le détail du projet');
    } finally {
      setDetailsLoading(false);
    }
  };

  const projects = dashboard?.projects || [];
  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      project.project_name.toLowerCase().includes(query) ||
      (project.manager_name || '').toLowerCase().includes(query) ||
      (project.client_name || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesManager = managerFilter === 'all' || project.manager_name === managerFilter;
    const matchesTeam =
      teamFilter === 'all' || (project.team_names || []).some((team) => team === teamFilter);

    return matchesSearch && matchesStatus && matchesManager && matchesTeam;
  });

  const stats = dashboard?.stats;
  const progressData = filteredProjects.slice(0, 8).map((project) => ({
    name: project.project_name.length > 18 ? `${project.project_name.slice(0, 18)}…` : project.project_name,
    progress: project.progress_percent,
  }));

  const tasksComparisonData = filteredProjects.slice(0, 8).map((project) => ({
    name: project.project_name.length > 18 ? `${project.project_name.slice(0, 18)}…` : project.project_name,
    completed: project.tasks_completed_count,
    inProgress: project.tasks_in_progress_count,
  }));

  const statusDistribution = stats?.statusDistribution || [];
  const monthlyEvolution = dashboard?.charts.monthlyEvolution || [];
  const professionalProgressData = progressData.map((item) => ({
    ...item,
    progress: Number(item.progress || 0),
    color: progressColor(Number(item.progress || 0)),
  }));
  const professionalTasksData = tasksComparisonData.map((item) => ({
    ...item,
    completed: Number(item.completed || 0),
    inProgress: Number(item.inProgress || 0),
    delayed: Number((item as any).delayed || 0),
  }));
  const professionalMonthlyEvolution = monthlyEvolution.map((item: any) => ({
    ...item,
    completed_tasks: Number(item?.completed_tasks || 0),
    in_progress_tasks: Number(item?.in_progress_tasks || 0),
    consumed_hours: Number(item?.consumed_hours || 0),
  }));

  const totalProjects = stats?.projects.total || 0;
  const totalTasks = stats?.tasks.total || 0;
  const budgetInitial = filteredProjects.reduce((acc, p) => acc + Number(p.budget_amount || 0), 0);
  const budgetConsumed = filteredProjects.reduce((acc, p) => acc + (Number(p.budget_amount || 0) * Number(p.progress_percent || 0) / 100), 0);
  const budgetRemaining = Math.max(0, budgetInitial - budgetConsumed);

  const projectDetail = projectDetails?.project;
  const modules = projectDetails?.modules || [];
  const deliverables = projectDetails?.deliverables || [];
  const team = projectDetails?.team || [];
  const tasks = projectDetails?.tasks || { all: [], inProgress: [], completed: [], delayed: [] };
  const timeline = projectDetails?.timeline || [];

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-slate-900">Erreur</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/65 px-5 py-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl lg:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Suivi des Projets</h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">Vue globale de l'avancement des projets et des équipes.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KPIBox icon={Briefcase} label="Total projets" value={totalProjects} color="indigo" />
            <KPIBox icon={Target} label="Projets actifs" value={stats?.projects.active || 0} subtitle={`${stats?.projects.changeVsLastMonth || 0} vs mois précédent`} color="blue" />
            <KPIBox icon={CheckCircle2} label="Projets terminés" value={stats?.projects.completed || 0} color="green" />
            <KPIBox icon={AlertTriangle} label="Projets en retard" value={stats?.projects.delayed || 0} subtitle={`${stats?.tasks.delayAlerts || 0} tâches à risque`} color="red" />
            <KPIBox icon={ListTodo} label="Tâches en cours" value={stats?.tasks.inProgress || 0} color="purple" />
            <KPIBox icon={Clock3} label="Tâches terminées" value={stats?.tasks.completed || 0} color="green" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KPIBox icon={Briefcase} label="Budget initial" value={`${Math.round(budgetInitial)} MAD`} color="indigo" />
            <KPIBox icon={Clock3} label="Budget consommé estimé" value={`${Math.round(budgetConsumed)} MAD`} color="blue" />
            <KPIBox icon={Target} label="Budget restant estimé" value={`${Math.round(budgetRemaining)} MAD`} color="green" />
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-sm shadow-slate-200/50 backdrop-blur-xl lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rechercher</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom du projet, client ou responsable"
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Statut</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {dashboard?.filters.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chef de projet</label>
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les responsables</SelectItem>
                  {dashboard?.filters.managers.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Équipe</label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les équipes</SelectItem>
                  {dashboard?.filters.teams.map((teamName) => (
                    <SelectItem key={teamName} value={teamName}>
                      {teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Progression des projets" empty={professionalProgressData.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={professionalProgressData} margin={{ top: 10, right: 24, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Avancement']}
                    labelFormatter={(_, payload) => (payload?.[0]?.payload as any)?.name || ''}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="progress" radius={[8, 8, 0, 0]}>
                    {professionalProgressData.map((item, idx) => (
                      <Cell key={idx} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tâches terminées vs en cours" empty={professionalTasksData.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={professionalTasksData} margin={{ top: 10, right: 24, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    labelFormatter={(_, payload) => (payload?.[0]?.payload as any)?.name || ''}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="#22c55e" radius={[8, 8, 0, 0]} name="Terminées" />
                  <Bar dataKey="inProgress" fill="#6366f1" radius={[8, 8, 0, 0]} name="En cours" />
                  <Bar dataKey="delayed" fill="#ef4444" radius={[8, 8, 0, 0]} name="En retard" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Répartition des projets par statut" empty={statusDistribution.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={110}
                    label={({ status, percent }) => `${formatStatus(status)} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistribution.map((entry, idx) => (
                      <Cell key={entry.status} fill={TASK_COLORS[idx % TASK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}`, 'Projets']} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Évolution mensuelle" empty={professionalMonthlyEvolution.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={professionalMonthlyEvolution} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="inProgressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Area type="monotone" dataKey="completed_tasks" stroke="#22c55e" fill="url(#completedGradient)" name="Terminées" />
                  <Area type="monotone" dataKey="in_progress_tasks" stroke="#6366f1" fill="url(#inProgressGradient)" name="En cours" />
                  <Line type="monotone" dataKey="consumed_hours" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} name="Heures consommées" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Tableau des projets"
            empty={filteredProjects.length === 0}
            actions={<Badge variant="secondary">{filteredProjects.length} résultats</Badge>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nom projet</th>
                    <th className="px-4 py-3 text-left font-semibold">Responsable</th>
                    <th className="px-4 py-3 text-left font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold">Avancement</th>
                    <th className="px-4 py-3 text-left font-semibold">Date début</th>
                    <th className="px-4 py-3 text-left font-semibold">Date fin</th>
                    <th className="px-4 py-3 text-left font-semibold">Missions</th>
                    <th className="px-4 py-3 text-left font-semibold">Membres</th>
                    <th className="px-4 py-3 text-left font-semibold">Tâches</th>
                    <th className="px-4 py-3 text-left font-semibold">Retards</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr key={project.project_id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{project.project_name}</div>
                        <div className="text-xs text-slate-500">{project.client_name || 'Client interne'}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{project.manager_name}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(project.status)}`}>
                          {formatStatus(project.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-40">
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                            <span>{project.progress_percent}%</span>
                            <span>{project.tasks_completed_count}/{project.tasks_count}</span>
                          </div>
                          <Progress value={project.progress_percent} className="h-2 bg-slate-200" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatDate(project.start_date)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDate(project.end_date)}</td>
                      <td className="px-4 py-4 text-slate-700">{project.missions_count}</td>
                      <td className="px-4 py-4 text-slate-700">{project.team_members_count}</td>
                      <td className="px-4 py-4 text-slate-700">{project.tasks_count}</td>
                      <td className="px-4 py-4">
                        <span className={project.delay_count > 0 ? 'font-semibold text-rose-600' : 'text-slate-600'}>
                          {project.delay_count}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ActionIconButton
                          onClick={() => openDetails(project.project_id)}
                          label="Voir"
                          className="text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          icon={<Eye className="h-4 w-4" />}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-6xl border-slate-200 p-0">
          <div className="max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {projectDetail?.project_name || 'Détail du projet'}
              </DialogTitle>
              <DialogDescription>
                Vue complète du projet, de l'équipe, des tâches et de la timeline.
              </DialogDescription>
            </DialogHeader>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-500" />
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
                {detailError}
              </div>
            ) : projectDetails ? (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Statut</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatStatus(projectDetail?.status || '')}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Avancement</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{projectDetail?.progress_percent || 0}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Missions</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{modules.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Retards</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{projectDetail?.delay_count || 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h4 className="text-base font-semibold text-slate-900">Informations</h4>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{projectDetail?.description || 'Aucune description disponible.'}</p>
                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div><span className="font-semibold text-slate-900">Client:</span> {projectDetail?.client_name || '—'}</div>
                      <div><span className="font-semibold text-slate-900">Début:</span> {formatDate(projectDetail?.start_date)}</div>
                      <div><span className="font-semibold text-slate-900">Fin:</span> {formatDate(projectDetail?.end_date)}</div>
                      <div><span className="font-semibold text-slate-900">Budget:</span> {Number(projectDetail?.budget_hours || 0).toFixed(0)} h</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h4 className="text-base font-semibold text-slate-900">Équipe affectée</h4>
                    <div className="mt-4 space-y-3">
                      {team.length > 0 ? team.map((member) => (
                        <div key={`${member.user_id}-${member.role}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">{member.user_name}</p>
                            <p className="text-xs text-slate-500">{member.email || 'Email non disponible'} · {member.team_name}</p>
                          </div>
                          <Badge variant="secondary">{member.role}</Badge>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500">Aucun membre affecté.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <ChartCard title="Missions du projet" empty={modules.length === 0}>
                    <div className="space-y-3">
                      {modules.map((module) => (
                        <div key={module.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{module.name}</p>
                              <p className="text-sm text-slate-500">{module.description || 'Mission sans description'}</p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <p>{module.deliverables_count} livrables</p>
                              <p>{module.tasks_count} tâches</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  <ChartCard title="Tâches en cours et terminées" empty={tasks.all.length === 0}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-indigo-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500">En cours</p>
                          <p className="mt-2 text-2xl font-semibold text-indigo-700">{tasks.inProgress.length}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">Terminées</p>
                          <p className="mt-2 text-2xl font-semibold text-emerald-700">{tasks.completed.length}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {tasks.all.slice(0, 5).map((task) => (
                          <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{task.task_title}</p>
                              <p className="text-xs text-slate-500">{task.user_name} · {formatDate(task.task_date)}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <ChartCard title="Deliverables" empty={deliverables.length === 0}>
                    <div className="space-y-3">
                      {deliverables.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.module_name || 'Mission principale'}</p>
                            </div>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Échéance: {formatDate(item.due_date)}</p>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  <ChartCard title="Timeline du projet" empty={timeline.length === 0}>
                    <div className="space-y-3">
                      {timeline.slice(0, 10).map((item, idx) => (
                        <div key={`${item.event_type}-${idx}`} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <div className="mt-1 h-3 w-3 rounded-full bg-indigo-500" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <span className="text-xs text-slate-500">{formatDate(item.event_date)}</span>
                            </div>
                            <p className="text-sm text-slate-600">{item.details || item.owner_name || 'Événement projet'}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.event_type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuiviProjets;
