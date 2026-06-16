import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { addWeeks, endOfWeek, format, getWeek, getYear, startOfWeek, subWeeks } from 'date-fns';
import { ArrowRight, BarChart3, Bell, CalendarDays, CheckCircle2, CircleAlert, Clock3, FolderKanban, Loader2, MessageSquareWarning, RefreshCw, Send, ShieldAlert, Sparkles, Target, TrendingUp, Users, Activity, ListTodo } from 'lucide-react';
import PageHeader from '../layout/PageHeader';
import { analyticsApi, TaskLog, UserNotification, WeekSummary } from '../../lib/api-analytics';
import { formatDateForDisplay } from '../../lib/date';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import StatCard from './StatCard';
import { Skeleton } from '@/components/ui/skeleton';

type CollaboratorTaskPriority = 'critique' | 'urgente' | 'a_traiter' | 'normale';

type WeeklySnapshot = {
  year: number;
  week: number;
  label: string;
  hours: number;
  submitted: number;
  validated: number;
  blocked: number;
  status: string;
  progress: number;
};

type MissionGroup = {
  key: string;
  name: string;
  hours: number;
  tasks: TaskLog[];
  urgentCount: number;
  status: {
    label: string;
    tone: string;
  };
};

type ProjectGroup = {
  key: string;
  name: string;
  hours: number;
  tasksCount: number;
  urgentCount: number;
  missions: MissionGroup[];
  status: {
    label: string;
    tone: string;
  };
};

const WEEKLY_GOAL_HOURS = 35;

function toDateKey(value?: string | null) {
  return String(value || '').slice(0, 10);
}

function formatHours(value: number) {
  return `${value.toFixed(1)} h`;
}

function isTaskCompleted(task: TaskLog) {
  return ['completed', 'validated', 'manager_validated', 'closed'].includes(String(task.status || '').toLowerCase());
}

function isUrgentTask(task: TaskLog) {
  const status = String(task.status || '').toLowerCase();
  return Boolean(
    task.is_blocking ||
      task.blocking_reason ||
      task.is_delay_risk ||
      status === 'submitted' ||
      status === 'to_correct'
  );
}

function taskPriorityScore(task: TaskLog) {
  const status = String(task.status || '').toLowerCase();
  let score = 0;
  if (task.is_blocking) score += 50;
  if (task.blocking_reason) score += 15;
  if (task.is_delay_risk) score += 25;
  if (status === 'submitted') score += 20;
  if (status === 'to_correct') score += 30;
  if (status === 'draft') score += 8;
  if (status === 'in_progress') score += 12;
  if (Number(task.duration_hours || 0) <= 0) score += 10;
  return score;
}

function taskPriorityMeta(task: TaskLog): { label: string; tone: string } {
  if (task.is_blocking || task.blocking_reason) return { label: 'Critique', tone: 'rose' };
  if (task.status === 'to_correct') return { label: 'À corriger', tone: 'violet' };
  if (task.status === 'submitted') return { label: 'Soumise', tone: 'amber' };
  if (task.is_delay_risk) return { label: 'Urgente', tone: 'orange' };
  if (isTaskCompleted(task)) return { label: 'Terminée', tone: 'emerald' };
  return { label: 'Normale', tone: 'blue' };
}

function taskStatusMeta(status?: string | null) {
  switch (String(status || '').toLowerCase()) {
    case 'draft':
      return { label: 'Brouillon', tone: 'slate' };
    case 'in_progress':
      return { label: 'En cours', tone: 'blue' };
    case 'completed':
      return { label: 'Terminée', tone: 'emerald' };
    case 'submitted':
      return { label: 'Soumise', tone: 'amber' };
    case 'validated':
      return { label: 'Validée', tone: 'emerald' };
    case 'manager_validated':
      return { label: 'Validée manager', tone: 'violet' };
    case 'to_correct':
      return { label: 'À corriger', tone: 'rose' };
    case 'closed':
      return { label: 'Clôturée', tone: 'emerald' };
    default:
      return { label: status || '—', tone: 'slate' };
  }
}

function statusBadgeClass(tone: string) {
  switch (tone) {
    case 'rose':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'orange':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'violet':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'blue':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function stepStatus(progress: number, index: number) {
  if (progress >= index) return 'done';
  if (progress + 1 === index) return 'current';
  return 'todo';
}

function notificationIcon(type?: string) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('task')) return ListTodo;
  if (normalized.includes('week')) return CalendarDays;
  if (normalized.includes('validation')) return CheckCircle2;
  if (normalized.includes('alert')) return ShieldAlert;
  return Bell;
}

function weekLabelFromDate(date: Date) {
  return `S${String(getWeek(date, { weekStartsOn: 1 })).padStart(2, '0')}`;
}

export default function CollaboratorDashboard() {
  const [currentTasks, setCurrentTasks] = useState<TaskLog[]>([]);
  const [currentSummary, setCurrentSummary] = useState<WeekSummary | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [history, setHistory] = useState<WeeklySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      const now = new Date();
      const currentYear = getYear(now);
      const currentWeek = getWeek(now, { weekStartsOn: 1 });
      const historySeeds = Array.from({ length: 8 }, (_, index) => {
        const date = subWeeks(now, 7 - index);
        return {
          year: getYear(date),
          week: getWeek(date, { weekStartsOn: 1 }),
          label: weekLabelFromDate(date),
        };
      });

      try {
        const [tasksRes, summaryRes, notificationsRes, historyRes] = await Promise.allSettled([
          analyticsApi.getMyWeek(currentYear, currentWeek),
          analyticsApi.getWeekSummary(currentYear, currentWeek),
          analyticsApi.getNotifications(),
          Promise.allSettled(historySeeds.map(async (seed) => {
            const response = await analyticsApi.getWeekSummary(seed.year, seed.week);
            return {
              year: seed.year,
              week: seed.week,
              label: seed.label,
              summary: (response as any).data || response,
            } as WeeklySnapshot;
          })),
        ]);

        if (!alive) return;

        const tasksPayload = tasksRes.status === 'fulfilled' ? ((tasksRes.value as any)?.data || tasksRes.value || []) : [];
        const summaryPayload = summaryRes.status === 'fulfilled' ? ((summaryRes.value as any)?.data || summaryRes.value || null) : null;
        const notificationsPayload = notificationsRes.status === 'fulfilled'
          ? ((notificationsRes.value as any)?.data || notificationsRes.value || { notifications: [], unread_count: 0 })
          : { notifications: [], unread_count: 0 };
        const historyPayload = historyRes.status === 'fulfilled' ? historyRes.value : [];

        const normalizedTasks = Array.isArray(tasksPayload) ? tasksPayload : (tasksPayload?.tasks || []);
        setCurrentTasks(normalizedTasks);
        setCurrentSummary(summaryPayload);
        setNotifications(Array.isArray(notificationsPayload?.notifications) ? notificationsPayload.notifications : []);

        const historySnapshots: WeeklySnapshot[] = historyPayload
          .filter((item): item is PromiseFulfilledResult<WeeklySnapshot> => item.status === 'fulfilled')
          .map((item) => {
            const summary = item.value.summary as WeekSummary | undefined;
            const hours = Number(summary?.totals?.weekHours || 0);
            const submitted = Number(summary?.counts?.submitted || 0);
            const validated = Number((summary?.counts?.validated || 0) + (summary?.counts?.manager_validated || 0));
            const blocked = Number(summary?.counts?.to_correct || 0);
            const total = Number(
              (summary?.counts?.draft || 0) +
                (summary?.counts?.in_progress || 0) +
                (summary?.counts?.completed || 0) +
                (summary?.counts?.submitted || 0) +
                (summary?.counts?.validated || 0) +
                (summary?.counts?.to_correct || 0) +
                (summary?.counts?.closed || 0) +
                (summary?.counts?.manager_validated || 0)
            );

            return {
              year: item.value.year,
              week: item.value.week,
              label: item.value.label,
              hours,
              submitted,
              validated,
              blocked,
              status: String(summary?.report?.status || 'draft'),
              progress: total > 0 ? Math.round((validated / total) * 100) : 0,
            };
          });

        setHistory(historySnapshots);
      } catch (loadError: any) {
        if (!alive) return;
        setError(loadError?.message || 'Impossible de charger le tableau de bord collaborateur.');
        setCurrentTasks([]);
        setCurrentSummary(null);
        setNotifications([]);
        setHistory([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const currentWeekHours = Number(currentSummary?.totals?.weekHours || currentTasks.reduce((sum, task) => sum + Number(task.duration_hours || 0), 0));
  const completedTaskCount = currentTasks.filter((task) => isTaskCompleted(task)).length;
  const activeTaskCount = Math.max(currentTasks.length - completedTaskCount, 0);
  const urgentTaskCount = currentTasks.filter(isUrgentTask).length;
  const pendingValidationCount = Number(currentSummary?.counts?.submitted || currentTasks.filter((task) => task.status === 'submitted').length);
  const blockingCount = currentTasks.filter((task) => task.is_blocking || task.blocking_reason).length;
  const missingTimeCount = currentTasks.filter((task) => !isTaskCompleted(task) && Number(task.duration_hours || 0) <= 0).length;
  const remainingHours = Math.max(WEEKLY_GOAL_HOURS - currentWeekHours, 0);
  const overtimeHours = Math.max(currentWeekHours - WEEKLY_GOAL_HOURS, 0);

  const currentWeekDate = new Date();
  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekStatus = String(currentSummary?.report?.status || 'draft');
  const weekProgress = weekStatus === 'approved' || weekStatus === 'manager_validated' ? 2 : weekStatus === 'submitted' || weekStatus === 'to_correct' ? 1 : 0;

  const sortedTasks = useMemo(() => {
    return [...currentTasks].sort((a, b) => {
      const diff = taskPriorityScore(b) - taskPriorityScore(a);
      if (diff !== 0) return diff;
      const dateDiff = String(a.task_date || '').localeCompare(String(b.task_date || ''));
      if (dateDiff !== 0) return dateDiff;
      return String(a.task_title || '').localeCompare(String(b.task_title || ''));
    });
  }, [currentTasks]);

  const priorityTasks = sortedTasks.slice(0, 8);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayFocus = sortedTasks.filter((task) => {
    const taskDate = toDateKey(task.task_date);
    return taskDate === todayKey || isUrgentTask(task);
  }).slice(0, 3);

  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const projectMap = new Map<string, ProjectGroup>();

    sortedTasks.forEach((task) => {
      const projectName = task.project_name || `Projet #${task.project_id}`;
      const projectKey = String(task.project_id || projectName);
      const missionName = task.mission_name || task.project_module_name || 'Mission non liée';
      const missionKey = `${projectKey}::${missionName}`;

      const currentProject = projectMap.get(projectKey) || {
        key: projectKey,
        name: projectName,
        hours: 0,
        tasksCount: 0,
        urgentCount: 0,
        missions: [],
        status: { label: 'Stable', tone: 'emerald' },
      };

      let currentMission = currentProject.missions.find((mission) => mission.key === missionKey);
      if (!currentMission) {
        currentMission = {
          key: missionKey,
          name: missionName,
          hours: 0,
          tasks: [],
          urgentCount: 0,
          status: { label: 'Planifiée', tone: 'slate' },
        };
        currentProject.missions.push(currentMission);
      }

      currentProject.hours += Number(task.duration_hours || 0);
      currentProject.tasksCount += 1;
      currentProject.urgentCount += isUrgentTask(task) ? 1 : 0;

      currentMission.hours += Number(task.duration_hours || 0);
      currentMission.tasks.push(task);
      currentMission.urgentCount += isUrgentTask(task) ? 1 : 0;

      projectMap.set(projectKey, currentProject);
    });

    return Array.from(projectMap.values())
      .map((project) => {
        const projectDone = project.missions.every((mission) => mission.tasks.every(isTaskCompleted)) && project.tasksCount > 0;
        const projectTone = project.urgentCount > 0 ? 'amber' : projectDone ? 'emerald' : 'blue';
        project.status = {
          label: project.urgentCount > 0 ? 'À surveiller' : projectDone ? 'Maîtrisé' : 'En cours',
          tone: projectTone,
        };

        project.missions = project.missions
          .map((mission) => {
            const hasBlocking = mission.tasks.some((task) => task.is_blocking || task.blocking_reason);
            const hasPending = mission.tasks.some((task) => task.status === 'submitted' || task.status === 'to_correct');
            const missionDone = mission.tasks.every(isTaskCompleted) && mission.tasks.length > 0;
            mission.status = {
              label: hasBlocking ? 'Bloquée' : hasPending ? 'En validation' : missionDone ? 'Terminée' : 'En cours',
              tone: hasBlocking ? 'rose' : hasPending ? 'amber' : missionDone ? 'emerald' : 'blue',
            };
            return mission;
          })
          .sort((a, b) => b.hours - a.hours);

        return project;
      })
      .sort((a, b) => b.hours - a.hours);
  }, [sortedTasks]);

  const workloadChartData = useMemo(() => [
    { label: 'Objectif', value: WEEKLY_GOAL_HOURS, tone: '#6366f1' },
    { label: 'Réalisé', value: currentWeekHours, tone: '#10b981' },
    { label: 'Restant', value: remainingHours, tone: '#cbd5e1' },
  ], [currentWeekHours, remainingHours]);

  const historyChartData = useMemo(() => {
    return history.map((item) => ({
      label: item.label,
      hours: item.hours,
      objective: WEEKLY_GOAL_HOURS,
      submitted: item.submitted,
      validated: item.validated,
      blocked: item.blocked,
    }));
  }, [history]);

  const performanceStats = useMemo(() => {
    const averageHours = history.length > 0 ? history.reduce((sum, item) => sum + item.hours, 0) / history.length : currentWeekHours;
    const bestWeek = [...history].sort((a, b) => b.hours - a.hours)[0];
    const submissionRate = history.length > 0
      ? Math.round((history.reduce((sum, item) => sum + item.submitted, 0) / Math.max(history.reduce((sum, item) => sum + item.submitted + item.blocked, 0), 1)) * 100)
      : 0;

    return {
      averageHours: Number(averageHours.toFixed(1)),
      bestWeek,
      submissionRate,
    };
  }, [history, currentWeekHours]);

  const personalAlerts = useMemo(() => {
    const alerts: Array<{
      title: string;
      description: string;
      tone: string;
      icon: typeof CircleAlert;
      count: number;
    }> = [];

    if (blockingCount > 0) {
      alerts.push({
        title: 'Blocages signalés',
        description: 'Certaines tâches ont un blocage actif. Prévenez votre manager rapidement.',
        tone: 'rose',
        icon: ShieldAlert,
        count: blockingCount,
      });
    }

    if (pendingValidationCount > 0) {
      alerts.push({
        title: 'Validations en attente',
        description: 'Vos tâches soumises attendent encore une décision.',
        tone: 'amber',
        icon: MessageSquareWarning,
        count: pendingValidationCount,
      });
    }

    if (missingTimeCount > 0) {
      alerts.push({
        title: 'Temps non saisi',
        description: 'Des tâches actives n’ont pas encore de durée renseignée.',
        tone: 'violet',
        icon: Clock3,
        count: missingTimeCount,
      });
    }

    const urgentDue = currentTasks.filter((task) => !isTaskCompleted(task) && isUrgentTask(task)).length;
    if (urgentDue > 0) {
      alerts.push({
        title: 'Échéance proche',
        description: 'Priorisez les éléments urgents pour garder votre semaine sous contrôle.',
        tone: 'orange',
        icon: Target,
        count: urgentDue,
      });
    }

    return alerts.slice(0, 4);
  }, [blockingCount, pendingValidationCount, missingTimeCount, currentTasks]);

  const notificationItems = useMemo(() => {
    return [...notifications]
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 5);
  }, [notifications]);

  const canShowHistory = history.length > 0;
  const canShowTasks = sortedTasks.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord collaborateur"
          description="Suivi opérationnel des tâches, validations et alertes personnelles."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Skeleton className="h-64 rounded-[1.75rem]" />
          <Skeleton className="h-64 rounded-[1.75rem]" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[1.2rem]" />
          ))}
        </div>
        <Skeleton className="h-[30rem] rounded-[1.75rem]" />
        <Skeleton className="h-[24rem] rounded-[1.75rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord collaborateur"
        description="Suivi opérationnel des tâches, missions, validations et alertes personnelles."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-2xl">
              <Link to="/timesheet/moi">
                <Clock3 className="h-4 w-4" />
                Voir mes tâches
              </Link>
            </Button>
            <Button asChild className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700">
              <Link to="/timesheet/saisie">
                <Send className="h-4 w-4" />
                Ouvrir la saisie
              </Link>
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="rounded-[1.4rem] border-rose-200 bg-rose-50/70">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-semibold text-rose-700">Chargement interrompu</p>
              <p className="text-sm text-rose-600">{error}</p>
            </div>
            <Button onClick={() => setReloadKey((value) => value + 1)} className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
        <Card className="relative overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-200/60">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_24%)]" />
          <CardContent className="relative p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-50">
                  <Sparkles className="h-3.5 w-3.5" />
                  Focus de travail
                </div>
                <p className="mt-4 text-sm text-indigo-100/90">
                  {formatDateForDisplay(currentWeekDate.toISOString())} · {formatDateForDisplay(weekStart.toISOString())} au {formatDateForDisplay(weekEnd.toISOString())}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.2rem]">
                  Bonjour, gardez vos priorités visibles et vos heures à jour.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-indigo-100/95 sm:text-[15px]">
                  Votre espace collaborateur met en avant les tâches à traiter aujourd’hui, les validations en attente,
                  les blocages et votre charge hebdomadaire pour rester concentré sur l’essentiel.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild className="rounded-2xl bg-white px-4 py-2.5 text-indigo-700 shadow-lg shadow-indigo-900/10 hover:bg-indigo-50">
                    <Link to="/timesheet/moi">
                      <ListTodo className="h-4 w-4" />
                      Continuer la saisie
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-indigo-50 backdrop-blur">
                    Statut semaine: <span className="font-semibold">{taskStatusMeta(weekStatus).label}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
                <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100/80">Heures saisies</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{formatHours(currentWeekHours)}</p>
                  <p className="mt-1 text-sm text-indigo-100/80">Objectif hebdomadaire {WEEKLY_GOAL_HOURS} h</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100/80">Validations</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{pendingValidationCount}</p>
                  <p className="mt-1 text-sm text-indigo-100/80">Tâches soumises en attente</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100/80">Blocages</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{blockingCount}</p>
                  <p className="mt-1 text-sm text-indigo-100/80">À signaler au manager</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mes priorités aujourd’hui</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Focus immédiat</h3>
              </div>
              <Badge className="rounded-full border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700">
                {todayFocus.length} priorités
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {todayFocus.length > 0 ? (
                todayFocus.map((task) => {
                  const priority = taskPriorityMeta(task);
                  const status = taskStatusMeta(task.status);
                  return (
                    <div key={`${task.id}-${task.task_title}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`rounded-full ${statusBadgeClass(priority.tone)}`}>{priority.label}</Badge>
                            <Badge className={`rounded-full ${statusBadgeClass(status.tone)}`}>{status.label}</Badge>
                          </div>
                          <p className="mt-3 text-sm text-slate-500">{task.project_name || 'Projet'}</p>
                          <h4 className="mt-1 text-base font-semibold text-slate-900">{task.task_title}</h4>
                          <p className="mt-1 text-sm text-slate-600">{task.mission_name || task.project_module_name || 'Mission non liée'}</p>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2 text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Temps</p>
                          <p className="text-sm font-semibold text-slate-900">{formatHours(Number(task.duration_hours || 0))}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">Aucune priorité urgente pour le moment</p>
                  <p className="mt-1 text-sm text-slate-500">Vous pouvez vous concentrer sur la saisie normale de vos tâches.</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to="/timesheet/moi">
                  <Activity className="h-4 w-4" />
                  Mes tâches
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to="/timesheet/saisie">
                  <Send className="h-4 w-4" />
                  Saisir du temps
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Tâches actives" value={String(activeTaskCount)} helper="En cours, brouillon ou à traiter" icon={<ListTodo className="h-5 w-5" />} tone="blue" />
        <StatCard label="Tâches urgentes" value={String(urgentTaskCount)} helper="Blocages, corrections ou retards" icon={<CircleAlert className="h-5 w-5" />} tone="amber" />
        <StatCard label="Tâches terminées" value={String(completedTaskCount)} helper="Validées, clôturées ou finalisées" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Heures saisies" value={formatHours(currentWeekHours)} helper="Volume de la semaine en cours" icon={<Clock3 className="h-5 w-5" />} tone="violet" />
        <StatCard label="Validations en attente" value={String(pendingValidationCount)} helper="Tâches soumises au manager" icon={<MessageSquareWarning className="h-5 w-5" />} tone="amber" />
        <StatCard label="Blocages" value={String(blockingCount)} helper="Actions à remonter immédiatement" icon={<ShieldAlert className="h-5 w-5" />} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.85fr)]">
        <div className="space-y-6">
          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Charge de travail</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Charge hebdomadaire</h3>
                  <p className="mt-1 text-sm text-slate-500">Objectif {WEEKLY_GOAL_HOURS} h · Réalisé {formatHours(currentWeekHours)} · Restant {formatHours(remainingHours)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full border-indigo-100 bg-indigo-50 text-indigo-700">Objectif {WEEKLY_GOAL_HOURS} h</Badge>
                  <Badge className="rounded-full border-emerald-100 bg-emerald-50 text-emerald-700">Réalisé {formatHours(currentWeekHours)}</Badge>
                  <Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-700">Restant {formatHours(remainingHours)}</Badge>
                  {overtimeHours > 0 && <Badge className="rounded-full border-rose-200 bg-rose-50 text-rose-700">Dépassement {formatHours(overtimeHours)}</Badge>}
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.7fr)]">
                <div className="h-[300px] rounded-3xl bg-slate-50/80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadChartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
                      <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="value" radius={[14, 14, 14, 14]}>
                        {workloadChartData.map((entry) => (
                          <Cell key={entry.label} fill={entry.tone} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Avancement</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {Math.min(100, Math.round((currentWeekHours / WEEKLY_GOAL_HOURS) * 100 || 0))}%
                    </p>
                    <Progress value={Math.min(100, (currentWeekHours / WEEKLY_GOAL_HOURS) * 100)} className="mt-3 h-2" />
                    <p className="mt-2 text-sm text-slate-500">Votre charge suit le rythme attendu de la semaine.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Résumé rapide</p>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tâches ouvertes</span>
                        <span className="font-semibold text-slate-900">{activeTaskCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Validation DG / manager</span>
                        <span className="font-semibold text-slate-900">{pendingValidationCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tâches à risque</span>
                        <span className="font-semibold text-slate-900">{urgentTaskCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tableau prioritaire</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Mes tâches prioritaires</h3>
                  <p className="mt-1 text-sm text-slate-500">Regroupement visuel par Projet → Mission → Tâche.</p>
                </div>
                <Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-700">{priorityTasks.length} tâche(s)</Badge>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="max-h-[28rem] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Projet</th>
                        <th className="px-4 py-3 text-left font-semibold">Mission</th>
                        <th className="px-4 py-3 text-left font-semibold">Tâche</th>
                        <th className="px-4 py-3 text-center font-semibold">Date</th>
                        <th className="px-4 py-3 text-center font-semibold">Heures</th>
                        <th className="px-4 py-3 text-center font-semibold">Statut</th>
                        <th className="px-4 py-3 text-center font-semibold">Priorité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {canShowTasks ? (
                        priorityTasks.map((task) => {
                          const priority = taskPriorityMeta(task);
                          const status = taskStatusMeta(task.status);
                          return (
                            <tr key={`${task.id}-${task.task_title}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">{task.project_name || 'Projet'}</div>
                                <div className="text-xs text-slate-500">{task.project_module_name || '—'}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{task.mission_name || 'Mission non liée'}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{task.task_title}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {task.subtasks?.length ? `${task.subtasks.length} sous-tâche(s)` : 'Aucune sous-tâche enregistrée'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-700">{task.task_date ? formatDateForDisplay(task.task_date) : '—'}</td>
                              <td className="px-4 py-3 text-center text-slate-700">{formatHours(Number(task.duration_hours || 0))}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={`rounded-full ${statusBadgeClass(status.tone)}`}>{status.label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={`rounded-full ${statusBadgeClass(priority.tone)}`}>{priority.label}</Badge>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                            Aucune tâche prioritaire disponible.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mes missions</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Projet → Mission → Tâches</h3>
                  <p className="mt-1 text-sm text-slate-500">Vue hiérarchique de vos missions et des tâches associées.</p>
                </div>
                <Badge className="rounded-full border-indigo-100 bg-indigo-50 text-indigo-700">{projectGroups.length} projet(s)</Badge>
              </div>

              {projectGroups.length > 0 ? (
                <Accordion type="multiple" className="space-y-3">
                  {projectGroups.map((project) => (
                    <AccordionItem key={project.key} value={project.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 px-4">
                      <AccordionTrigger className="py-4 text-left hover:no-underline">
                        <div className="flex w-full flex-wrap items-center justify-between gap-3 pr-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">{project.name}</p>
                              <Badge className={`rounded-full ${statusBadgeClass(project.status.tone)}`}>{project.status.label}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {project.tasksCount} tâche(s) · {project.missions.length} mission(s) · {formatHours(project.hours)}
                            </p>
                          </div>
                          <div className="text-right text-sm text-slate-500">
                            <p>{project.urgentCount} élément(s) urgent(s)</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-3">
                          {project.missions.map((mission) => (
                            <div key={mission.key} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-slate-900">{mission.name}</p>
                                    <Badge className={`rounded-full ${statusBadgeClass(mission.status.tone)}`}>{mission.status.label}</Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {mission.tasks.length} tâche(s) · {formatHours(mission.hours)}
                                  </p>
                                </div>
                                <div className="text-sm text-slate-500">
                                  {mission.urgentCount} urgente(s)
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {mission.tasks.slice(0, 6).map((task) => {
                                  const status = taskStatusMeta(task.status);
                                  return (
                                    <div key={`${task.id}-${task.task_title}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                      <p className="text-sm font-medium text-slate-900">{task.task_title}</p>
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Badge className={`rounded-full ${statusBadgeClass(status.tone)}`}>{status.label}</Badge>
                                        <span className="text-xs text-slate-500">{formatHours(Number(task.duration_hours || 0))}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-900">Aucune mission disponible pour le moment</p>
                  <p className="mt-1 text-sm text-slate-500">Vos missions apparaîtront ici dès qu’elles seront liées à vos projets.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Historique de performance personnelle</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Progression hebdomadaire</h3>
                  <p className="mt-1 text-sm text-slate-500">Comparez vos heures réelles avec votre objectif hebdomadaire.</p>
                </div>
                <Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-700">
                  {history.length} semaine(s) suivie(s)
                </Badge>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.7fr)]">
                <div className="h-[320px] rounded-3xl bg-slate-50/80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyChartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#64748b" />
                      <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                      <Tooltip />
                      <Area type="monotone" dataKey="hours" stroke="#4f46e5" fill="url(#hoursGradient)" strokeWidth={3} />
                      <Line type="monotone" dataKey="objective" stroke="#94a3b8" strokeDasharray="6 6" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Moyenne sur 8 semaines</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatHours(performanceStats.averageHours)}</p>
                    <p className="mt-1 text-sm text-slate-500">Charge de travail moyenne observée.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Meilleure semaine</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{performanceStats.bestWeek ? formatHours(performanceStats.bestWeek.hours) : '—'}</p>
                    <p className="mt-1 text-sm text-slate-500">{performanceStats.bestWeek ? `${performanceStats.bestWeek.label} · ${performanceStats.bestWeek.status}` : 'Aucune donnée encore.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Taux de soumission</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{performanceStats.submissionRate}%</p>
                    <p className="mt-1 text-sm text-slate-500">Évolution des semaines envoyées au manager.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dernière tendance</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Votre semaine en cours affiche {formatHours(currentWeekHours)} avec {pendingValidationCount} validation(s) en attente.
                    </p>
                  </div>
                </div>
              </div>

              {canShowHistory && (
                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Semaine</th>
                        <th className="px-4 py-3 text-right font-semibold">Heures</th>
                        <th className="px-4 py-3 text-right font-semibold">Soumises</th>
                        <th className="px-4 py-3 text-right font-semibold">Validées</th>
                        <th className="px-4 py-3 text-right font-semibold">Bloquées</th>
                        <th className="px-4 py-3 text-right font-semibold">Progression</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {history.slice().reverse().map((item) => (
                        <tr key={`${item.year}-${item.week}`}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{formatHours(item.hours)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{item.submitted}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{item.validated}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{item.blocked}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{item.progress}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notifications manager</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Centre de notifications</h3>
                </div>
                <Badge className="rounded-full border-indigo-100 bg-indigo-50 text-indigo-700">{notificationItems.length}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {notificationItems.length > 0 ? (
                  notificationItems.map((notification) => {
                    const Icon = notificationIcon(notification.type);
                    return (
                      <div key={notification.id} className={`rounded-2xl border p-4 ${notification.is_read ? 'border-slate-200 bg-slate-50/70' : 'border-indigo-100 bg-indigo-50/70'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${notification.is_read ? 'bg-slate-100 text-slate-500' : 'bg-white text-indigo-600 shadow-sm'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">{notification.title}</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                              </div>
                              {!notification.is_read && <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">Nouveau</Badge>}
                            </div>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateForDisplay(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-900">Aucune notification récente</p>
                    <p className="mt-1 text-sm text-slate-500">Les retours du manager apparaîtront ici dès qu’ils arrivent.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Alertes personnelles</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Points d’attention</h3>
                </div>
                <Badge className="rounded-full border-rose-100 bg-rose-50 text-rose-700">{personalAlerts.length}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {personalAlerts.length > 0 ? (
                  personalAlerts.map((alert) => {
                    const Icon = alert.icon;
                    return (
                      <div key={alert.title} className={`rounded-2xl border p-4 ${statusBadgeClass(alert.tone)}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold">{alert.title}</p>
                              <Badge className="rounded-full border-white/60 bg-white/70 text-slate-700">{alert.count}</Badge>
                            </div>
                            <p className="mt-1 text-sm leading-6 opacity-90">{alert.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-emerald-700">Aucune alerte personnelle</p>
                    <p className="mt-1 text-sm text-emerald-600">Votre tableau est propre et vos heures sont à jour.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Validation hebdomadaire</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Brouillon → Soumise → Validée</h3>
                </div>
                <Badge className={`rounded-full ${statusBadgeClass(taskStatusMeta(weekStatus).tone)}`}>
                  {taskStatusMeta(weekStatus).label}
                </Badge>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Brouillon', description: 'Saisie locale', index: 0 },
                    { label: 'Soumise', description: 'Envoyée au manager', index: 1 },
                    { label: 'Validée', description: 'Terminée et confirmée', index: 2 },
                  ].map((step) => {
                    const state = stepStatus(weekProgress, step.index);
                    const isActive = state === 'current';
                    const isDone = state === 'done';
                    return (
                      <div
                        key={step.label}
                        className={`rounded-2xl border p-3 ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50'
                            : isActive
                              ? 'border-indigo-200 bg-indigo-50'
                              : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                          }`}>
                            {step.index + 1}
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{step.description}</p>
                      </div>
                    );
                  })}
                </div>

                <Progress value={weekProgress * 50} className="h-2" />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">Statut actuel</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {taskStatusMeta(weekStatus).label} · {pendingValidationCount} tâche(s) en attente de validation.
                  </p>
                  {weekStatus === 'to_correct' && (
                    <p className="mt-2 text-sm font-medium text-rose-600">
                      Votre manager a demandé une correction sur une ou plusieurs tâches.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border border-white/80 bg-white/85 shadow-lg shadow-slate-200/70 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Accès rapide</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Raccourcis utiles</h3>
                </div>
                <Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-700">Productivité</Badge>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {[
                  { label: 'Saisie des temps', desc: 'Remplir ou ajuster vos heures de la semaine.', to: '/timesheet/moi', icon: Clock3 },
                  { label: 'Soumettre la semaine', desc: 'Envoyer vos saisies au manager.', to: '/timesheet/saisie', icon: Send },
                  { label: 'Voir mes missions', desc: 'Consulter les tâches regroupées par projet.', to: '/timesheet/moi', icon: FolderKanban },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button key={action.label} asChild variant="outline" className="h-auto justify-between rounded-2xl border-slate-200 py-4 text-left">
                      <Link to={action.to} className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-left">
                            <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                            <span className="block text-xs font-normal text-slate-500">{action.desc}</span>
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
