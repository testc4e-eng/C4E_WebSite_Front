import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, TaskLog, WeekSummary } from '../../lib/api-analytics';
import { WeekSelector } from '../../components/TaskAnalytics/WeekSelector';
import { TaskTable } from '../../components/TaskAnalytics/TaskTable';
import { StatusBadge } from '../../components/TaskAnalytics/StatusBadge';
import { TaskForm } from '../../components/TaskAnalytics/TaskForm';
import { Send, AlertTriangle, Filter } from 'lucide-react';
import { getWeek, getYear } from 'date-fns';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

interface TimesheetSaisieProps {
  mode?: 'mine' | 'team';
}

export default function TimesheetSaisie({ mode = 'mine' }: TimesheetSaisieProps) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { user, appRole } = useAuth();
  const { can } = usePermissions();
  const canFilterBySource = can('time_entries:read_team');
  const showComparativeHours = appRole !== 'EMPLOYE';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [year, setYear] = useState(getYear(new Date()));
  const [week, setWeek] = useState(getWeek(new Date(), { weekStartsOn: 1 }));
  const [sourceFilter, setSourceFilter] = useState<'all' | 'mine' | 'team'>(mode === 'team' ? 'team' : 'mine');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'validated' | 'to_correct' | 'closed'>('all');
  const [memberFilter, setMemberFilter] = useState('');

  const [tasks, setTasks] = useState<TaskLog[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskLog | undefined>(undefined);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [year, week, token, mode]);

  useEffect(() => {
    if (!token) return;
    const scope = mode === 'team' ? 'saisie_equipe' : 'saisie_moi';
    analyticsApi.markNotificationsReadAll(scope).then(() => {
      window.dispatchEvent(new Event('notifications:refresh'));
    }).catch(() => undefined);
  }, [mode, token]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [tasksResponse, summaryResponse] = await Promise.all([
        analyticsApi.getMyWeek(year, week),
        analyticsApi.getWeekSummary(year, week),
      ]);

      const tasksData = tasksResponse.data || tasksResponse;
      setTasks(Array.isArray(tasksData) ? tasksData : (tasksData as any).tasks || []);

      const summaryData = summaryResponse.data || summaryResponse;
      setSummary(summaryData as WeekSummary);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des taches.');
    } finally {
      setLoading(false);
    }
  }

  const handleWeekChange = (date: Date, newYear: number, newWeek: number) => {
    setCurrentDate(date);
    setYear(newYear);
    setWeek(newWeek);
  };

  const handleSubmitWeek = async () => {
    if (!window.confirm('Etes-vous sur de vouloir soumettre cette semaine ? Les taches seront verrouillees apres soumission.')) return;

    try {
      await analyticsApi.submitWeek(year, week);
      window.dispatchEvent(new Event('notifications:refresh'));
      setSuccess('Semaine soumise avec succes !');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission de la semaine.');
    }
  };

  const handleDeleteTask = async (task: TaskLog) => {
    if (!window.confirm(`Supprimer la tache "${task.task_title}" ?`)) return;
    setError('');
    try {
      await analyticsApi.deleteTask(task.id);
      window.dispatchEvent(new Event('notifications:refresh'));
      setSuccess('Tache supprimee avec succes.');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression de la tache.');
    }
  };

  const totalHoursWeek = summary?.totals?.weekHours ?? tasks.reduce((acc, t) => acc + Number(t.duration_hours), 0);

  const dailyTotals: Record<string, number> = {};
  tasks.forEach((t) => {
    const dateStr = t.task_date.split('T')[0];
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + Number(t.duration_hours);
  });

  const overloads = Object.entries(dailyTotals).filter(([_, total]) => total > 8);
  const canEdit = Boolean(summary?.permissions?.can_edit);
  const canSubmit = Boolean(summary?.permissions?.can_submit);

  const reportStatusLabels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    approved: 'Valide',
    manager_validated: 'Valide Manager',
    to_correct: 'Refuse / A corriger',
  };

  const reportStatusTone: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    submitted: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    manager_validated: 'bg-violet-100 text-violet-800 border-violet-200',
    to_correct: 'bg-red-100 text-red-800 border-red-200',
  };

  const reportStatus = summary?.report?.status || 'draft';

  const visibleTasks = useMemo(() => {
    if (!canFilterBySource || sourceFilter === 'all' || !user?.id) {
      return tasks;
    }

    const currentUserId = Number(user.id);
    return tasks.filter((task) => {
      const ownerId = Number(task.user_id);
      const assigneeId = Number(task.assigned_to || task.user_id);
      const createdByMe = ownerId === currentUserId;
      const createdForTeam = createdByMe && assigneeId !== currentUserId;

      if (sourceFilter === 'mine') {
        return ownerId === currentUserId && assigneeId === currentUserId;
      }

      if (sourceFilter === 'team') {
        return createdForTeam;
      }

      return true;
    });
  }, [canFilterBySource, sourceFilter, tasks, user?.id]);

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const taskDate = (task.task_date || '').split('T')[0];
      const inFrom = !dateFrom || taskDate >= dateFrom;
      const inTo = !dateTo || taskDate <= dateTo;
      const byProject = !projectFilter || (task.project_name || '').toLowerCase().includes(projectFilter.toLowerCase());
      const byStatus = statusFilter === 'all' || task.status === statusFilter;
      const byMember = mode !== 'team' || !memberFilter || (task.user_name || '').toLowerCase().includes(memberFilter.toLowerCase());
      return inFrom && inTo && byProject && byStatus && byMember;
    });
  }, [visibleTasks, dateFrom, dateTo, projectFilter, statusFilter, memberFilter, mode]);

  const displayedTasks = useMemo(() => {
    if (!user?.id) return filteredTasks;
    const me = Number(user.id);
    if (mode === 'team') {
      return filteredTasks.filter((task) => Number(task.assigned_to || task.user_id) !== me);
    }
    return filteredTasks.filter((task) => Number(task.assigned_to || task.user_id) === me);
  }, [filteredTasks, mode, user?.id]);

  const personalHours = useMemo(
    () => displayedTasks.reduce((acc, t) => acc + Number(t.duration_hours || 0), 0),
    [displayedTasks]
  );

  const groupedProjects = useMemo(() => {
    const map = new Map<string, {
      key: string;
      label: string;
      projectId: number | null;
      hours: number;
      tasksCount: number;
      missions: Array<{
        key: string;
        label: string;
        hours: number;
        tasks: TaskLog[];
      }>;
    }>();

    displayedTasks.forEach((task) => {
      const projectId = Number(task.project_id || 0) || null;
      const projectLabel = task.project_name || `Projet #${task.project_id}`;
      const projectKey = `${projectId || projectLabel}`;
      const missionLabel = task.mission_name || task.project_module_name || 'Mission non liée';
      const missionKey = `${projectKey}::${missionLabel}`;
      const duration = Number(task.duration_hours || 0);

      const projectEntry = map.get(projectKey) || {
        key: projectKey,
        label: projectLabel,
        projectId,
        hours: 0,
        tasksCount: 0,
        missions: [],
      };
      projectEntry.hours += duration;
      projectEntry.tasksCount += 1;

      const missionIndex = projectEntry.missions.findIndex((mission) => mission.key === missionKey);
      if (missionIndex >= 0) {
        projectEntry.missions[missionIndex].hours += duration;
        projectEntry.missions[missionIndex].tasks.push(task);
      } else {
        projectEntry.missions.push({
          key: missionKey,
          label: missionLabel,
          hours: duration,
          tasks: [task],
        });
      }

      map.set(projectKey, projectEntry);
    });

    return Array.from(map.values()).map((project) => ({
      ...project,
      missions: project.missions.map((mission) => ({
        ...mission,
        tasks: mission.tasks.sort((a, b) => (b.task_date || '').localeCompare(a.task_date || '')),
      })),
    }));
  }, [displayedTasks]);

  const canCreateTask = mode === 'team' && can('tasks:create');

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'team' ? "Tâches de l'équipe" : 'Mes Tâches affectées'}
        description={
          mode === 'team'
            ? "Pilotage, affectation et validation des tâches de l'équipe."
            : "Suivi des tâches affectées, avec mise à jour de l'état et des sous-tâches."
        }
        compact
        actions={canCreateTask ? (
          <button
            type="button"
            onClick={() => {
              setEditingTask(undefined);
              setIsFormOpen(true);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Ajouter une Tâche
          </button>
        ) : null}
      />

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">{success}</div>}

      <WeekSelector currentDate={currentDate} onChange={handleWeekChange} />

      {canFilterBySource && (
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4" />
            Filtrer les Tâches
          </label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'all' | 'mine' | 'team')}
            className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">Toutes les Tâches</option>
            <option value="mine">A moi</option>
            <option value="team">À l'équipe</option>
          </select>
        </div>
      )}

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2" />
          <input type="text" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} placeholder="Projet" className="rounded-md border border-gray-300 px-3 py-2" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-md border border-gray-300 px-3 py-2">
            <option value="all">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="submitted">Soumis</option>
            <option value="validated">Validee</option>
            <option value="to_correct">A corriger</option>
            <option value="closed">Fermee</option>
          </select>
          {mode === 'team' ? (
            <input type="text" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} placeholder="Collaborateur" className="rounded-md border border-gray-300 px-3 py-2" />
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">Vue personnelle</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Heures Semaine</p>
          <p className="text-2xl font-bold text-gray-900">{mode === 'team' ? personalHours : totalHoursWeek} h</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Statut du rapport</p>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${reportStatusTone[reportStatus]}`}
          >
            {reportStatusLabels[reportStatus]}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 md:col-span-2">
          <p className="text-sm text-gray-500 mb-2">Totaux journaliers</p>
          <div className="flex flex-wrap gap-2">
            {(summary?.totals?.byDay || []).map((item) => (
              <span key={item.date} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                {item.date}: {item.hours}h
              </span>
            ))}
            {(summary?.totals?.byDay || []).length === 0 && (
              <span className="text-xs text-gray-400">Aucune heure saisie.</span>
            )}
          </div>
        </div>

        {overloads.map(([date, hours]) => (
          <div
            key={date}
            className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200 col-span-1 md:col-span-4 flex items-start gap-3"
          >
            <AlertTriangle className="text-orange-500 w-5 h-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Surcharge detectee</p>
              <p className="text-sm text-orange-700">Le {date}, vous avez saisi {hours}h (maximum recommande : 8h).</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === 'team' ? "Tâches de l'équipe" : 'Mes Tâches affectées'}
            </h2>
            <p className="text-xs text-gray-500">
              {mode === 'team'
                ? 'Création, affectation et validation des Tâches de votre périmêtre.'
                : 'Tâches regroupées par projet puis par mission.'}
            </p>
          </div>
          {mode === 'mine' && canSubmit && (
            <button
              onClick={handleSubmitWeek}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" /> Soumettre la semaine
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement des Tâches...</div>
        ) : mode === 'mine' ? (
          displayedTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucune Tâche affectée pour le moment.</div>
          ) : (
            <div className="space-y-4 p-4">
              {groupedProjects.map((project) => (
                <section key={project.key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Projet</p>
                      <h3 className="text-xl font-bold text-slate-900">{project.label}</h3>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">{project.tasksCount} Tâche(s)</p>
                      <p>{project.hours.toFixed(1)} h consommées</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {project.missions.map((mission) => (
                      <div key={mission.key} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Mission</p>
                            <h4 className="text-base font-semibold text-slate-900">{mission.label}</h4>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{mission.tasks.length} Tâche(s)</p>
                            <p>{mission.hours.toFixed(1)} h</p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          {mission.tasks.map((task) => {
                            const isEditableTask = canEdit && ['draft', 'in_progress', 'completed', 'to_correct'].includes(task.status);
                            return (
                              <div key={task.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-semibold text-slate-900">{task.task_title}</p>
                                      <StatusBadge status={task.status} />
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">
                                      {task.task_description || 'Aucune description'}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                      <span className="rounded-full bg-white px-2.5 py-1 font-medium shadow-sm">
                                        Temps réalisé: {Number(task.duration_hours || 0).toFixed(2)} h
                                      </span>
                                      <span className="rounded-full bg-white px-2.5 py-1 font-medium shadow-sm">
                                        {task.subtasks?.length || 0} sous-Tâches
                                      </span>
                                      <span className="rounded-full bg-white px-2.5 py-1 font-medium shadow-sm">
                                        {task.project_module_name || task.mission_name || 'Mission'}
                                      </span>
                                    </div>
                                  </div>

                                  {isEditableTask && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTask(task);
                                        setIsFormOpen(true);
                                      }}
                                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    >
                                      Modifier
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : (
        <TaskTable
          tasks={displayedTasks}
          showComparativeHours={showComparativeHours}
          onEdit={
            canEdit
              ? (task) => {
                    setEditingTask(task);
                    setIsFormOpen(true);
                  }
                : undefined
            }
            onDelete={mode === 'team' && canEdit ? handleDeleteTask : undefined}
            readOnly={!canEdit}
            currentUserId={user?.id ? Number(user.id) : null}
          />
        )}
      </div>

      {isFormOpen && (
        <TaskForm
          task={editingTask}
          scope={mode}
          initialDate={currentDate}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
