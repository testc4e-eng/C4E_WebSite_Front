import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { tasksApi, WorkflowTask } from '../../lib/api-tasks';
import { getISOWeek, getYear } from 'date-fns';
import { formatDateForDisplay } from '../../lib/date';

const STATUS_STYLE: Record<WorkflowTask['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function TasksValidationPage() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterStatus, setFilterStatus] = useState<WorkflowTask['status'] | ''>('');
  const [filterYear, setFilterYear] = useState<number>(getYear(now));
  const [filterWeek, setFilterWeek] = useState<number>(getISOWeek(now));

  async function loadTasks() {
    setLoading(true);
    setError('');
    try {
      const response = await tasksApi.getAllTasks({
        equipe: filterEquipe || undefined,
        manager: filterManager || undefined,
        status: filterStatus || undefined,
        year: filterYear || undefined,
        week: filterWeek || undefined,
      });
      const data = response.data || response;
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des taches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function approveTask(taskId: number) {
    try {
      await tasksApi.approveTask(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Erreur pendant la validation.');
    }
  }

  async function rejectTask(taskId: number) {
    try {
      await tasksApi.rejectTask(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Erreur pendant le rejet.');
    }
  }

  const equipes = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.equipe).filter(Boolean))) as string[],
    [tasks]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validation des taches"
        description="Le DG/Admin visualise toutes les equipes et valide ou rejette les taches en attente."
      />

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Equipe</label>
            <select
              value={filterEquipe}
              onChange={(e) => setFilterEquipe(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="">Toutes</option>
              {equipes.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Manager</label>
            <input
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              placeholder="Nom manager"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as WorkflowTask['status'] | '')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="">Tous</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Annee</label>
            <input
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Semaine</label>
            <input
              type="number"
              min={1}
              max={53}
              value={filterWeek}
              onChange={(e) => setFilterWeek(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={loadTasks}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Appliquer les filtres
          </button>
          <button
            onClick={() => {
              setFilterEquipe('');
              setFilterManager('');
              setFilterStatus('');
              setFilterYear(getYear(new Date()));
              setFilterWeek(getISOWeek(new Date()));
            }}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Reinitialiser
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500">Aucune tache trouvee.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Manager</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Equipe</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Projet</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Heures</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Statut</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 text-slate-900">{task.manager_full_name || task.manager_name}</td>
                    <td className="px-4 py-3 text-slate-700">{task.equipe || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{task.projet}</td>
                    <td className="px-4 py-3 text-slate-700">{task.description || '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{task.heures}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{formatDateForDisplay(task.task_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          disabled={task.status !== 'pending'}
                          onClick={() => approveTask(task.id)}
                          className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Valider
                        </button>
                        <button
                          disabled={task.status !== 'pending'}
                          onClick={() => rejectTask(task.id)}
                          className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
