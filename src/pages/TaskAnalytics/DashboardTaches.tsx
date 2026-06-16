import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Filter, GitBranch, ListChecks, Plus, Send, XCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import { TaskForm } from '../../components/TaskAnalytics/TaskForm';
import { analyticsApi, type ManagerTaskRow, type ProjectHierarchyResponse, type ProjectManagementRow } from '../../lib/api-analytics';
import { formatDateForDisplay } from '../../lib/date';
import { useAuth } from '../../hooks/useAuth';

function getCurrentWeekId() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function parseWeekId(weekId: string) {
  const m = weekId.match(/^(\d{4})-W(\d{1,2})$/i);
  if (!m) return { year: new Date().getUTCFullYear(), week: 1 };
  return { year: Number(m[1]), week: Number(m[2]) };
}

function formatWeekId(year: number, week: number) {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function isoWeekStartDate(year: number, week: number) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  if (dow <= 4) simple.setUTCDate(simple.getUTCDate() - dow + 1);
  else simple.setUTCDate(simple.getUTCDate() + 8 - dow);
  return simple;
}

function formatWeekPeriod(year: number, week: number) {
  const start = isoWeekStartDate(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
}

function taskProgressPercent(status?: string | null) {
  switch (String(status || '').toLowerCase()) {
    case 'validated':
    case 'manager_validated':
    case 'closed':
      return 100;
    case 'submitted':
      return 85;
    case 'completed':
      return 70;
    case 'in_progress':
      return 45;
    case 'to_correct':
      return 30;
    default:
      return 15;
  }
}

function getTaskHours(task: { duration_hours?: number | null; estimated_hours?: number | null }) {
  const estimated = Number(task.estimated_hours ?? task.duration_hours ?? 0);
  const actual = Number(task.duration_hours || 0);
  return {
    estimated,
    actual,
    gap: Number((actual - estimated).toFixed(2)),
  };
}

function computeMissionProgress(mission: any) {
  const directTasks = mission.tasks || [];
  const subTasks = (mission.sub_missions || []).flatMap((s: any) => s.tasks || []);
  const all = [...directTasks, ...subTasks];
  if (!all.length) return Number(mission.progress_percent || 0);
  const done = all.filter((t: any) => ['validated', 'manager_validated', 'closed', 'completed'].includes(String(t.status || '').toLowerCase())).length;
  return Number(((done / all.length) * 100).toFixed(1));
}

const FINAL_TASK_STATUSES = new Set(['validated', 'manager_validated', 'closed']);

function isFinalTaskStatus(status?: string | null) {
  return FINAL_TASK_STATUSES.has(String(status || '').toLowerCase());
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'submitted', label: 'Soumis' },
  { value: 'validated', label: 'Validé' },
  { value: 'manager_validated', label: 'Validé manager' },
  { value: 'to_correct', label: 'Refusé / à corriger' },
  { value: 'closed', label: 'Clôturé' },
];

const statusBadgeClass: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-cyan-100 text-cyan-700',
  submitted: 'bg-blue-100 text-blue-700',
  validated: 'bg-emerald-100 text-emerald-700',
  manager_validated: 'bg-indigo-100 text-indigo-700',
  to_correct: 'bg-rose-100 text-rose-700',
  closed: 'bg-zinc-100 text-zinc-700',
};

const WEEK_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  en_validation_manager: 'En validation manager',
  validee_manager: 'Validée manager',
  soumise_dg: 'Soumise DG',
  validee_dg: 'Validée DG',
  refusee: 'Refusée',
};

const DashboardTaches: React.FC = () => {
  const { appRole, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState<ManagerTaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectManagementRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, submitted: 0, validated: 0, to_correct: 0, week_hours_validated: 0 });
  const [hierarchy, setHierarchy] = useState<ProjectHierarchyResponse | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ManagerTaskRow | undefined>(undefined);

  const [weekId, setWeekId] = useState(getCurrentWeekId());
  const [projectId, setProjectId] = useState('all');
  const [userId, setUserId] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState<ManagerTaskRow | null>(null);
  const [weekStatus, setWeekStatus] = useState<'brouillon' | 'en_validation_manager' | 'validee_manager' | 'soumise_dg' | 'validee_dg' | 'refusee' | string>('brouillon');
  const [weeksTable, setWeeksTable] = useState<Array<{ weekId: string; week: number; year: number; period: string; totalHours: number; status: string }>>([]);

  const isManagerLike =
    appRole === 'MANAGER' ||
    appRole === 'CHEF_PROJET' ||
    appRole === 'CHEF_EQUIPE' ||
    appRole === 'DG' ||
    appRole === 'ADMIN';

  const collaborators = useMemo(() => {
    const map = new Map<number, string>();
    tasks.forEach((t) => {
      const id = Number(t.assigned_to || t.user_id || 0);
      if (id > 0 && !map.has(id)) {
        map.set(id, t.assignee_name || t.user_name || t.owner_name || `Utilisateur ${id}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const parsedWeek = parseWeekId(weekId);
      const normalizedWeekId = formatWeekId(parsedWeek.year, parsedWeek.week);
      const [taskRes, projRes] = await Promise.all([
        analyticsApi.getManagerTasks({
          week: normalizedWeekId,
          projectId: projectId !== 'all' ? Number(projectId) : undefined,
          userId: userId !== 'all' ? Number(userId) : undefined,
          status: status !== 'all' ? status : undefined,
        }),
        analyticsApi.getMyManagedProjects(),
      ]);

      const taskPayload = taskRes.data || (taskRes as any);
      setTasks(taskPayload.tasks || []);
      setSummary(taskPayload.summary || { total: 0, submitted: 0, validated: 0, to_correct: 0, week_hours_validated: 0 });

      const managedProjects = (projRes.data || projRes || []) as ProjectManagementRow[];
      setProjects(managedProjects);

      const hierarchyProjectId = projectId !== 'all'
        ? Number(projectId)
        : (managedProjects[0]?.id || null);

      if (hierarchyProjectId) {
        try {
          const hRes = await analyticsApi.getProjectHierarchy(hierarchyProjectId);
          const payload = (hRes.data || (hRes as any)) as ProjectHierarchyResponse;
          setHierarchy({
            success: true,
            project: payload?.project || { id: hierarchyProjectId, name: managedProjects.find((p) => p.id === hierarchyProjectId)?.name || 'Projet' },
            missions: Array.isArray(payload?.missions) ? payload.missions : [],
          });
        } catch {
          setHierarchy({
            success: true,
            project: { id: hierarchyProjectId, name: managedProjects.find((p) => p.id === hierarchyProjectId)?.name || 'Projet' },
            missions: [],
          });
        }
      } else {
        setHierarchy(null);
      }

      try {
        const weekStatusRes = await analyticsApi.getManagerWeekStatus(normalizedWeekId);
        setWeekStatus((weekStatusRes.data as any)?.status || 'brouillon');
      } catch {
        setWeekStatus('brouillon');
      }

      const base = parseWeekId(normalizedWeekId);
      const candidates = Array.from({ length: 6 }).map((_, idx) => {
        const delta = idx - 2;
        const d = isoWeekStartDate(base.year, base.week);
        d.setUTCDate(d.getUTCDate() + delta * 7);
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNo };
      });

      const statusRows = await Promise.all(
        candidates.map(async (w) => {
          const id = formatWeekId(w.year, w.week);
          try {
            const [statusRes, taskResForWeek] = await Promise.all([
              analyticsApi.getManagerWeekStatus(id),
              analyticsApi.getManagerTasks({ week: id }),
            ]);
            const statusData = (statusRes.data as any) || {};
            const sum = ((taskResForWeek.data as any)?.summary || {}) as any;
            return {
              weekId: id,
              week: w.week,
              year: w.year,
              period: formatWeekPeriod(w.year, w.week),
              totalHours: Number(sum.week_hours_validated || statusData?.totals?.total_hours || 0),
              status: statusData.status || 'brouillon',
            };
          } catch {
            return {
              weekId: id,
              week: w.week,
              year: w.year,
              period: formatWeekPeriod(w.year, w.week),
              totalHours: 0,
              status: 'brouillon',
            };
          }
        })
      );
      setWeeksTable(statusRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la gestion des tâches');
      setTasks([]);
      setHierarchy(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isManagerLike) return;
    loadTasks();
  }, [weekId, projectId, userId, status, isManagerLike]);

  const handleValidateTask = async (task: ManagerTaskRow) => {
    try {
      setSaving(true);
      await analyticsApi.validateManagerTask(task.id, { validation_comment: 'Validé par manager depuis Gestion des tâches' });
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Validation impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectTask = async (task: ManagerTaskRow) => {
    const reason = window.prompt('Motif de refus (obligatoire) :', task.validation_comment || '');
    if (!reason) return;
    try {
      setSaving(true);
      await analyticsApi.rejectManagerTask(task.id, { reason });
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refus impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateWeek = async () => {
    try {
      setSaving(true);
      setError('');
      const pendingResponse = await analyticsApi.getManagerTasks({ week: weekId });
      const pendingTasks = (pendingResponse.data || pendingResponse || []).tasks || [];
      const pendingCount = pendingTasks.filter((t) => !isFinalTaskStatus(t.status)).length;
      if (pendingCount > 0) {
        setError(`Validation impossible : ${pendingCount} tâche(s) non finalisée(s).`);
        return;
      }
      await analyticsApi.validateManagerWeek(weekId);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Validation hebdomadaire impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitWeekToDg = async () => {
    try {
      setSaving(true);
      setError('');
      await analyticsApi.submitManagerWeekToDg(weekId);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Soumission DG impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateSpecificWeek = async (selectedWeekId: string) => {
    try {
      setSaving(true);
      await analyticsApi.validateManagerWeek(selectedWeekId);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Validation semaine impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSpecificWeek = async (selectedWeekId: string) => {
    try {
      setSaving(true);
      await analyticsApi.submitManagerWeekToDg(selectedWeekId);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Soumission semaine impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseMissionRequest = async (missionId: number) => {
    const activeProjectId = projectId !== 'all' ? Number(projectId) : Number(hierarchy?.project?.id || 0);
    if (!activeProjectId || !missionId) return;
    try {
      setSaving(true);
      setError('');
      await analyticsApi.completeProjectMissionByManager(activeProjectId, missionId);
      await loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Clôture mission impossible');
    } finally {
      setSaving(false);
    }
  };

  const hierarchyProgress = useMemo(() => {
    if (!hierarchy?.missions?.length) return { project: 0 };
    let totalTasks = 0;
    let validatedTasks = 0;

    hierarchy.missions.forEach((mission) => {
      const directTasks = mission.tasks || [];
      const subTasks = (mission.sub_missions || []).flatMap((s) => s.tasks || []);
      const all = [...directTasks, ...subTasks];
      totalTasks += all.length;
      validatedTasks += all.filter((t) => ['validated', 'manager_validated', 'closed', 'completed'].includes(String(t.status || '').toLowerCase())).length;
    });

    return { project: totalTasks > 0 ? Number(((validatedTasks / totalTasks) * 100).toFixed(1)) : 0 };
  }, [hierarchy]);

  const currentUserId = Number(user?.id || 0) || null;
  const personalTasks = useMemo(
    () => tasks.filter((task) => currentUserId && Number(task.assigned_to || task.user_id) === currentUserId),
    [currentUserId, tasks]
  );
  const teamTasks = useMemo(
    () => tasks.filter((task) => !currentUserId || Number(task.assigned_to || task.user_id) !== currentUserId),
    [currentUserId, tasks]
  );

  const taskStateCounts = useMemo(
    () => tasks.reduce((acc, task) => {
      const statusKey = String(task.status || '').toLowerCase();
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [tasks]
  );

  const openTaskForm = (task?: ManagerTaskRow) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  if (!isManagerLike) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
        Cette page est réservée au périmètre manager.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des tâches"
        description="Mission → Sous-mission → Tâches → Validation hebdomadaire → Envoi au DG"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openTaskForm()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Ajouter une Tâche
            </button>
            <button
              type="button"
              onClick={handleValidateWeek}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider la semaine
            </button>
            <button
              type="button"
              onClick={handleSubmitWeekToDg}
              disabled={saving || loading || weekStatus !== 'validee_manager'}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Soumettre au DG
            </button>
          </div>
        }
      />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KPIBox icon={ListChecks} label="Tâches" value={summary.total} color="blue" />
        <KPIBox icon={Clock3} label="En cours" value={(taskStateCounts.in_progress || 0) + (taskStateCounts.completed || 0)} color="purple" />
        <KPIBox icon={Clock3} label="Soumises" value={summary.submitted} color="yellow" />
        <KPIBox icon={CheckCircle2} label="Validées" value={summary.validated} color="green" />
        <KPIBox icon={XCircle} label="Refusées" value={summary.to_correct} color="red" />
        <KPIBox icon={GitBranch} label="Avancement projet" value={`${hierarchyProgress.project}%`} color="indigo" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Semaine active: {weekId.replace('-W', ' — W')}</p>
            <p className="text-xs text-slate-500">Total heures semaine validables: {Number(summary.week_hours_validated || 0).toFixed(2)} h</p>
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Statut semaine: {WEEK_STATUS_LABELS[weekStatus] || weekStatus}
          </span>
        </div>
      </div>

      <ChartCard title="Vue par semaine" empty={false}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Semaine</span>
            <input
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3"
              placeholder="2026-W21"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Projet</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
              <option value="all">Tous</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Collaborateur</span>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
              <option value="all">Tous</option>
              {collaborators.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1 block font-medium">Statut</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3">
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </ChartCard>

      <ChartCard title="Gestion des semaines" empty={weeksTable.length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Semaine</th>
                <th className="px-3 py-2 text-left font-semibold">Période</th>
                <th className="px-3 py-2 text-left font-semibold">Total heures validées</th>
                <th className="px-3 py-2 text-left font-semibold">Statut</th>
                <th className="px-3 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weeksTable.map((w) => {
                const locked = w.status === 'soumise_dg' || w.status === 'validee_dg';
                const canSubmit = w.status === 'validee_manager';
                return (
                  <tr key={w.weekId}>
                    <td className="px-3 py-3">Semaine {w.week}</td>
                    <td className="px-3 py-3">{w.period}</td>
                    <td className="px-3 py-3">{Number(w.totalHours || 0).toFixed(2)} h</td>
                    <td className="px-3 py-3">{WEEK_STATUS_LABELS[w.status] || w.status}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving || locked}
                          onClick={() => handleValidateSpecificWeek(w.weekId)}
                          className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          Valider semaine
                        </button>
                        <button
                          type="button"
                          disabled={saving || !canSubmit || locked}
                          onClick={() => handleSubmitSpecificWeek(w.weekId)}
                          className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                        >
                          Soumettre
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Gestion des missions" empty={!hierarchy?.missions?.length}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Projet</th>
                <th className="px-3 py-2 text-left font-semibold">Mission</th>
                <th className="px-3 py-2 text-left font-semibold">Date début mission</th>
                <th className="px-3 py-2 text-left font-semibold">Durée</th>
                <th className="px-3 py-2 text-left font-semibold">Nombre de semaines</th>
                <th className="px-3 py-2 text-left font-semibold">Avancement</th>
                <th className="px-3 py-2 text-left font-semibold">Statut</th>
                <th className="px-3 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(hierarchy?.missions || []).map((mission: any) => {
                const missionStart = mission.start_date || null;
                const durationDays = Number(mission.duration_days || 0);
                const weeksCount = durationDays > 0 ? Math.max(1, Math.ceil(durationDays / 7)) : 0;
                const progress = computeMissionProgress(mission);
                const canValidateMission = progress >= 100 && String(mission.status || '').toLowerCase() === 'en_cours';
                const canSubmitMission = String(mission.status || '').toLowerCase() === 'terminee_manager';
                return (
                  <tr key={mission.id}>
                    <td className="px-3 py-3">{hierarchy?.project?.name || '-'}</td>
                    <td className="px-3 py-3">{mission.name}</td>
                    <td className="px-3 py-3">{missionStart ? formatDateForDisplay(missionStart) : '-'}</td>
                    <td className="px-3 py-3">{durationDays ? `${durationDays} jours` : '-'}</td>
                    <td className="px-3 py-3">{weeksCount ? `${weeksCount} semaines` : '-'}</td>
                    <td className="px-3 py-3">
                      <div className="w-40">
                        <div className="mb-1 text-xs text-slate-500">{progress}%</div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{mission.status || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving || !canValidateMission}
                          onClick={() => handleCloseMissionRequest(Number(mission.id))}
                          className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          Valider mission
                        </button>
                        <button
                          type="button"
                          disabled={saving || !canSubmitMission}
                          onClick={() => handleCloseMissionRequest(Number(mission.id))}
                          className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                        >
                          Soumettre mission
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Mes tâches" empty={!personalTasks.length} className="overflow-hidden">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Projet</th>
                <th className="px-3 py-2 text-left font-semibold">Mission</th>
                <th className="px-3 py-2 text-left font-semibold">Tâche</th>
                <th className="px-3 py-2 text-left font-semibold">Temps</th>
                <th className="px-3 py-2 text-left font-semibold">Progression</th>
                <th className="px-3 py-2 text-left font-semibold">Statut</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {personalTasks.map((task) => {
                const progress = taskProgressPercent(task.status);
                const editable = ['draft', 'in_progress', 'completed', 'to_correct'].includes(String(task.status || '').toLowerCase());
                const hours = getTaskHours(task);
                return (
                  <tr key={task.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3">{task.project_name || '-'}</td>
                    <td className="px-3 py-3">{task.mission_name || task.project_module_name || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{task.task_title}</div>
                      <div className="text-xs text-slate-500">{task.task_description || 'Aucune description'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="inline-flex flex-col rounded-lg bg-slate-50 px-2.5 py-2 text-xs">
                        <span className="font-medium text-slate-500">Est. {hours.estimated.toFixed(2)} h</span>
                        <span className="font-semibold text-slate-900">Réel {hours.actual.toFixed(2)} h</span>
                        <span className={`font-semibold ${hours.gap >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Écart {hours.gap.toFixed(2)} h</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-36">
                        <div className="mb-1 text-xs text-slate-500">{progress}%</div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[String(task.status || '').toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                        {String(task.status || '-')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => openTaskForm(task)}
                          className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
                        >
                          Modifier
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Verrouillée</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Tâches de l'équipe" empty={!teamTasks.length} className="overflow-hidden">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1300px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Projet</th>
                <th className="px-3 py-2 text-left font-semibold">Mission</th>
                <th className="px-3 py-2 text-left font-semibold">Sous-mission</th>
                <th className="px-3 py-2 text-left font-semibold">Tâche</th>
                <th className="px-3 py-2 text-left font-semibold">Collaborateur</th>
                <th className="px-3 py-2 text-left font-semibold">Temps</th>
                <th className="px-3 py-2 text-left font-semibold">Observation</th>
                <th className="px-3 py-2 text-left font-semibold">Sous-tâches réalisées</th>
                <th className="px-3 py-2 text-left font-semibold">Statut</th>
                <th className="px-3 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamTasks.map((t) => {
                const st = String(t.status || '').toLowerCase();
                const canAct = st === 'submitted';
                const hours = getTaskHours(t);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3">{formatDateForDisplay(t.task_date)}</td>
                    <td className="px-3 py-3">{t.project_name || '-'}</td>
                    <td className="px-3 py-3">{t.mission_name || '-'}</td>
                    <td className="px-3 py-3">{t.sub_mission_name || t.project_module_name || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{t.task_title}</div>
                    </td>
                    <td className="px-3 py-3">{t.assignee_name || t.user_name || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="inline-flex flex-col rounded-lg bg-slate-50 px-2.5 py-2 text-xs">
                        <span className="font-medium text-slate-500">Est. {hours.estimated.toFixed(2)} h</span>
                        <span className="font-semibold text-slate-900">Réel {hours.actual.toFixed(2)} h</span>
                        <span className={`font-semibold ${hours.gap >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Écart {hours.gap.toFixed(2)} h</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{t.task_description || '-'}</td>
                    <td className="px-3 py-3 text-slate-600">{(t.subtasks || []).length ? `${(t.subtasks || []).length} élément(s)` : '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[st] || 'bg-slate-100 text-slate-700'}`}>{st || '-'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving || !canAct}
                          onClick={() => handleValidateTask(t)}
                          className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          disabled={saving || !canAct}
                          onClick={() => handleRejectTask(t)}
                          className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTask(t)}
                          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Voir détail
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Gestion hiérarchique (Projet → Missions → Sous-missions → Tâches)" empty={!hierarchy?.missions?.length}>
        <div className="max-h-[460px] space-y-3 overflow-auto pr-1">
          {(hierarchy?.missions || []).map((mission) => {
            const directTasks = mission.tasks || [];
            const subTasks = (mission.sub_missions || []).flatMap((s) => s.tasks || []);
            const total = directTasks.length + subTasks.length;
            const done = [...directTasks, ...subTasks].filter((t) => ['validated', 'manager_validated', 'closed', 'completed'].includes(String(t.status || '').toLowerCase())).length;
            const missionProgress = total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0;
            return (
              <div key={mission.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Mission: {mission.name}</p>
                    <p className="text-xs text-slate-500">Statut: {mission.status || '-'} · Progression: {missionProgress}%</p>
                  </div>
                  <div className="w-48 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${missionProgress}%` }} />
                  </div>
                </div>
                {missionProgress >= 100 && mission.status !== 'cloturee' && mission.status !== 'validee_dg' ? (
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCloseMissionRequest(Number(mission.id))}
                      disabled={saving}
                      className="rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 disabled:opacity-60"
                    >
                      Clôturer mission
                    </button>
                  </div>
                ) : null}

                {(mission.sub_missions || []).map((sub) => {
                  const subTotal = (sub.tasks || []).length;
                  const subDone = (sub.tasks || []).filter((t) => ['validated', 'manager_validated', 'closed', 'completed'].includes(String(t.status || '').toLowerCase())).length;
                  const subProgress = subTotal > 0 ? Number(((subDone / subTotal) * 100).toFixed(1)) : 0;
                  return (
                    <div key={sub.id} className="ml-3 mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">Sous-mission: {sub.name}</p>
                        <span className="text-xs text-slate-500">{subProgress}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${subProgress}%` }} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {(sub.tasks || []).map((t) => (
                          <li key={t.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">
                            {t.task_title} · Est. {getTaskHours(t).estimated.toFixed(2)}h · Réel {getTaskHours(t).actual.toFixed(2)}h · {t.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ChartCard>

      {selectedTask ? (
        <ChartCard title="Détail tâche" empty={false}>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div><span className="font-semibold">Titre :</span> {selectedTask.task_title}</div>
            <div><span className="font-semibold">Projet :</span> {selectedTask.project_name || '-'}</div>
            <div><span className="font-semibold">Mission :</span> {selectedTask.mission_name || '-'}</div>
            <div><span className="font-semibold">Sous-mission :</span> {selectedTask.sub_mission_name || selectedTask.project_module_name || '-'}</div>
            <div><span className="font-semibold">Date :</span> {formatDateForDisplay(selectedTask.task_date)}</div>
            <div><span className="font-semibold">Durée estimée :</span> {getTaskHours(selectedTask).estimated.toFixed(2)} h</div>
            <div><span className="font-semibold">Temps réel :</span> {getTaskHours(selectedTask).actual.toFixed(2)} h</div>
            <div><span className="font-semibold">Écart :</span> {getTaskHours(selectedTask).gap.toFixed(2)} h</div>
            <div className="md:col-span-2"><span className="font-semibold">Observation :</span> {selectedTask.task_description || '-'}</div>
            <div className="md:col-span-2"><span className="font-semibold">Sous-tâches réalisées :</span> {(selectedTask.subtasks || []).length ? (selectedTask.subtasks || []).map((s) => s.title).join(' | ') : '-'}</div>
          </div>
        </ChartCard>
      ) : null}

      {isTaskFormOpen ? (
        <TaskForm
          task={editingTask || undefined}
          scope="team"
          initialDate={new Date()}
          onClose={() => {
            setIsTaskFormOpen(false);
            setEditingTask(undefined);
          }}
          onSave={() => {
            setIsTaskFormOpen(false);
            setEditingTask(undefined);
            loadTasks();
          }}
        />
      ) : null}

      {loading ? <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Chargement en cours...</div> : null}

      {!loading && summary.submitted > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          {summary.submitted} tâche(s) soumise(s) sont encore en attente de décision manager.
        </div>
      ) : null}

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <Filter className="mr-1 inline h-4 w-4" />
        Validation hebdomadaire: seules les semaines validées par le manager sont remontées au périmètre DG.
      </div>
    </div>
  );
};

export default DashboardTaches;
