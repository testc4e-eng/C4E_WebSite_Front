import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { analyticsApi, TaskLog } from '../../lib/api-analytics';
import { ValidationPanel } from '../../components/TaskAnalytics/ValidationPanel';
import { CheckCircle, Clock, Filter } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import AlertList from '../../components/TaskAnalytics/AlertList';
import type { BlockingTask, TaskAlert } from '../../lib/api-analytics';
import { useAuth } from '../../hooks/useAuth';
import { formatDateForDisplay } from '../../lib/date';

export default function TimesheetValidation() {
  const navigate = useNavigate();
  const { token, appRole } = useAuth();
  const canValidate = appRole === 'CHEF_PROJET';

  const [tasks, setTasks] = useState<TaskLog[]>([]);
  const [alerts, setAlerts] = useState<Array<BlockingTask | TaskAlert>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [validatingTask, setValidatingTask] = useState<TaskLog | undefined>(undefined);
  const [filterProject, setFilterProject] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const [taskResponse, alertResponse] = await Promise.all([
        analyticsApi.getTasksToValidate(),
        analyticsApi.getAlerts(),
      ]);
      const data = taskResponse.data || taskResponse;
      setTasks(Array.isArray(data) ? data : (data as any).tasks || []);
      setAlerts(alertResponse.data.task_alerts || alertResponse.data.blocking_tasks || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des taches a valider.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!canValidate) {
      navigate('/403', { replace: true });
      return;
    }
    fetchTasks();
  }, [token, canValidate, navigate]);

  useEffect(() => {
    if (!token || !canValidate) return;
    analyticsApi.markNotificationsReadAll('validation_temps').then(() => {
      window.dispatchEvent(new Event('notifications:refresh'));
    }).catch(() => undefined);
  }, [token, canValidate]);

  if (!token || !canValidate) {
    return !token ? <Navigate to="/login" replace /> : <Navigate to="/403" replace />;
  }

  const handleDirectApprove = async (task: TaskLog) => {
    if (task.status !== 'submitted') {
      setError("Cette tache n'a pas encore ete soumise par le collaborateur.");
      return;
    }

    if (!window.confirm(`Approuver directement la tache "${task.task_title}" ?`)) return;

    try {
      await analyticsApi.approveTask(task.id);
      window.dispatchEvent(new Event('notifications:refresh'));
      fetchTasks();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'approbation.");
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (task.status !== 'submitted') return false;

    const matchProj = filterProject
      ? (task.project_name?.toLowerCase().includes(filterProject.toLowerCase()) || String(task.project_id) === filterProject)
      : true;
    const matchUser = filterUser
      ? (task.user_name?.toLowerCase().includes(filterUser.toLowerCase()) || String(task.user_id) === filterUser)
      : true;

    return matchProj && matchUser;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validation des Temps"
        description="Revisez et approuvez les taches soumises par votre equipe."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="rounded-full bg-blue-50 p-3 text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Taches equipe (soumises)</p>
            <p className="text-2xl font-bold text-gray-900">{filteredTasks.length}</p>
            <p className="mt-1 text-xs text-gray-500">Total visibles: {filteredTasks.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Alertes de suivi</h3>
            <p className="text-sm text-gray-500">Alertes visibles dans votre espace de validation.</p>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">{alerts.length}</span>
        </div>
        <AlertList alerts={alerts} maxItems={5} />
      </div>

      <div className="flex items-end gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex-1 space-y-1">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4" /> Filtrer par collaborateur
          </label>
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Nom du collaborateur..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium text-gray-700">Filtrer par projet</label>
          <input
            type="text"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            placeholder="Nom du projet..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => {
            setFilterUser('');
            setFilterProject('');
          }}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200"
        >
          Reinitialiser
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune tache soumise trouvee pour votre equipe.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Collaborateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Projet / Tache</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Temps</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {task.user_name || `User ID: ${task.user_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">{task.project_name || `Projet: ${task.project_id}`}</div>
                      <div className="text-gray-500">{task.task_title}</div>
                      <div className="mt-1 text-xs text-gray-400">{formatDateForDisplay(task.task_date)}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-700">
                      <div className="inline-flex flex-col rounded-lg bg-gray-50 px-3 py-2 text-xs">
                        <span className="font-medium text-gray-500">
                          Est. {Number(task.estimated_hours ?? task.duration_hours ?? 0).toFixed(2)} h
                        </span>
                        <span className="font-semibold text-gray-900">
                          Réel {Number(task.duration_hours || 0).toFixed(2)} h
                        </span>
                        <span className={`font-semibold ${Number(task.duration_hours || 0) - Number(task.estimated_hours ?? task.duration_hours ?? 0) >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          Écart {(Number(task.duration_hours || 0) - Number(task.estimated_hours ?? task.duration_hours ?? 0)).toFixed(2)} h
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDirectApprove(task)}
                          className="flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 font-medium text-green-700 hover:bg-green-200"
                          title="Approuver directement"
                        >
                          <CheckCircle className="h-4 w-4" /> Approuver
                        </button>
                        <button
                          onClick={() => setValidatingTask(task)}
                          className="rounded-md bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200"
                        >
                          Examiner
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {validatingTask && (
        <ValidationPanel
          task={validatingTask}
          onClose={() => setValidatingTask(undefined)}
          onSuccess={() => {
            setValidatingTask(undefined);
            window.dispatchEvent(new Event('notifications:refresh'));
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}
