import { FormEvent, useEffect, useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { tasksApi, WorkflowTask } from '../../lib/api-tasks';
import { formatDateForDisplay, formatDateForInput } from '../../lib/date';
import { analyticsApi, ProjectManagementRow, ProjectFinancialEntry, ProjectFinancialSummary } from '../../lib/api-analytics';
import { useAuth } from '../../hooks/useAuth';

const STATUS_LABEL: Record<WorkflowTask['status'], string> = {
  pending: 'En attente',
  approved: 'Validee',
  rejected: 'Rejetee',
};

const STATUS_CLASS: Record<WorkflowTask['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function MyTasksPage() {
  const { appRole } = useAuth();
  const canViewFinancialSection = appRole === 'DG' || appRole === 'ADMIN';
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [managedProjects, setManagedProjects] = useState<ProjectManagementRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [financialEntries, setFinancialEntries] = useState<ProjectFinancialEntry[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [financialForm, setFinancialForm] = useState({
    estimated_cost: '',
    resource_cost: '',
    operational_cost: '',
    miscellaneous_cost: '',
    consumed_hours_cost: '',
    comment: '',
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    projet: '',
    heures: '',
    date: formatDateForInput(new Date().toISOString()),
  });

  async function loadTasks() {
    setLoading(true);
    setError('');
    try {
      const response = await tasksApi.getMyTasks();
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
    analyticsApi.markNotificationsReadAll('gestion_taches').then(() => {
      window.dispatchEvent(new Event('notifications:refresh'));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!canViewFinancialSection) {
      setManagedProjects([]);
      setSelectedProjectId('');
      return;
    }
    analyticsApi.getMyManagedProjects()
      .then((res) => {
        const rows = res.data || [];
        setManagedProjects(rows);
        if (rows.length > 0) setSelectedProjectId(String(rows[0].id));
      })
      .catch(() => undefined);
  }, [canViewFinancialSection]);

  useEffect(() => {
    if (!canViewFinancialSection) {
      setFinancialEntries([]);
      setFinancialSummary(null);
      return;
    }
    const projectId = Number(selectedProjectId);
    if (!projectId) {
      setFinancialEntries([]);
      setFinancialSummary(null);
      return;
    }
    Promise.all([
      analyticsApi.getProjectFinancialEntries(projectId),
      analyticsApi.getProjectFinancialSummary(projectId),
    ])
      .then(([entriesRes, summaryRes]) => {
        setFinancialEntries(entriesRes.data || []);
        setFinancialSummary(summaryRes.data || null);
      })
      .catch(() => undefined);
  }, [canViewFinancialSection, selectedProjectId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await tasksApi.createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        projet: form.projet.trim(),
        heures: Number(form.heures),
        date: form.date,
      });
      setSuccess('Tache soumise pour validation.');
      setForm({
        title: '',
        description: '',
        projet: '',
        heures: '',
        date: formatDateForInput(new Date().toISOString()),
      });
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la creation de la tache.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitFinancial(event: FormEvent) {
    event.preventDefault();
    if (!canViewFinancialSection) return;
    const projectId = Number(selectedProjectId);
    if (!projectId) return;
    setSavingFinancial(true);
    setError('');
    try {
      await analyticsApi.createProjectFinancialEntry(projectId, {
        estimated_cost: Number(financialForm.estimated_cost || 0),
        resource_cost: Number(financialForm.resource_cost || 0),
        operational_cost: Number(financialForm.operational_cost || 0),
        miscellaneous_cost: Number(financialForm.miscellaneous_cost || 0),
        consumed_hours_cost: Number(financialForm.consumed_hours_cost || 0),
        comment: financialForm.comment.trim() || null,
      });
      const [entriesRes, summaryRes] = await Promise.all([
        analyticsApi.getProjectFinancialEntries(projectId),
        analyticsApi.getProjectFinancialSummary(projectId),
      ]);
      setFinancialEntries(entriesRes.data || []);
      setFinancialSummary(summaryRes.data || null);
      setFinancialForm({
        estimated_cost: '',
        resource_cost: '',
        operational_cost: '',
        miscellaneous_cost: '',
        consumed_hours_cost: '',
        comment: '',
      });
      setSuccess('Saisie financière enregistrée.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la saisie financière.');
    } finally {
      setSavingFinancial(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Taches"
        description="Saisissez vos taches manager. Elles passent automatiquement en attente de validation."
      />

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>}

      {canViewFinancialSection && (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Suivi financier projet</h2>
        <form onSubmit={handleSubmitFinancial} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Projet</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              {managedProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Coût RH</label><input type="number" min={0} step="0.01" value={financialForm.resource_cost} onChange={(e) => setFinancialForm((p) => ({ ...p, resource_cost: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Coût temps</label><input type="number" min={0} step="0.01" value={financialForm.consumed_hours_cost} onChange={(e) => setFinancialForm((p) => ({ ...p, consumed_hours_cost: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Coût tâches / estimation</label><input type="number" min={0} step="0.01" value={financialForm.estimated_cost} onChange={(e) => setFinancialForm((p) => ({ ...p, estimated_cost: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Dépenses opérationnelles</label><input type="number" min={0} step="0.01" value={financialForm.operational_cost} onChange={(e) => setFinancialForm((p) => ({ ...p, operational_cost: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Dépenses diverses</label><input type="number" min={0} step="0.01" value={financialForm.miscellaneous_cost} onChange={(e) => setFinancialForm((p) => ({ ...p, miscellaneous_cost: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" /></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Estimation globale: <span className="font-semibold">{Number(financialForm.estimated_cost || 0).toFixed(2)} MAD</span>
          </div>
          <div className="md:col-span-3"><label className="mb-1 block text-sm font-medium text-slate-700">Commentaire</label><textarea rows={3} value={financialForm.comment} onChange={(e) => setFinancialForm((p) => ({ ...p, comment: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none" /></div>
          <div className="md:col-span-3 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              Budget: <span className="font-semibold">{financialSummary?.budget_initial ?? 0}</span> MAD ·
              Consommé: <span className="font-semibold">{financialSummary?.consumed_cost ?? 0}</span> MAD ·
              Restant: <span className="font-semibold">{financialSummary?.remaining_budget ?? 0}</span> MAD
            </div>
            <button type="submit" disabled={savingFinancial || !selectedProjectId} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60">
              {savingFinancial ? 'Enregistrement...' : 'Enregistrer coûts'}
            </button>
          </div>
        </form>
        {financialEntries.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">RH</th>
                  <th className="px-4 py-2 text-right">Opérationnel</th>
                  <th className="px-4 py-2 text-right">Divers</th>
                  <th className="px-4 py-2 text-right">Temps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialEntries.slice(0, 5).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2">{formatDateForDisplay(entry.created_at)}</td>
                    <td className="px-4 py-2 text-right">{entry.resource_cost}</td>
                    <td className="px-4 py-2 text-right">{entry.operational_cost}</td>
                    <td className="px-4 py-2 text-right">{entry.miscellaneous_cost}</td>
                    <td className="px-4 py-2 text-right">{entry.consumed_hours_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Soumettre pour validation</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titre</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Projet</label>
            <input
              required
              value={form.projet}
              onChange={(e) => setForm((p) => ({ ...p, projet: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Heures</label>
            <input
              required
              min={0.25}
              step={0.25}
              type="number"
              value={form.heures}
              onChange={(e) => setForm((p) => ({ ...p, heures: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Soumission...' : 'Soumettre pour validation'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Historique de mes taches</h2>
        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500">Aucune tache pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Projet</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Titre</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Heures</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 text-slate-700">{task.projet}</td>
                    <td className="px-4 py-3 text-slate-900">{task.title}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{task.heures}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{formatDateForDisplay(task.task_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
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
