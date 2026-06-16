import React, { useState, useEffect } from 'react';
import { TaskLog, Project, TaskCategory, analyticsApi, type ProjectMissionDetail } from '../../lib/api-analytics';
import { X, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';

interface TaskFormProps {
  task?: TaskLog;
  initialDate?: Date;
  scope?: 'mine' | 'team';
  onClose: () => void;
  onSave: () => void;
}

interface SubtaskForm {
  id: string;
  title: string;
  description: string;
  duration_hours: string;
  status: 'faite' | 'en_cours' | 'bloquee';
}

const TASK_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'submitted', label: 'Soumise pour validation' },
  { value: 'manager_validated', label: 'Validée manager' },
  { value: 'to_correct', label: 'À corriger' },
];

const createEmptySubtask = (): SubtaskForm => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  description: '',
  duration_hours: '',
  status: 'en_cours',
});

const normalizeLoadedSubtasks = (value: unknown): SubtaskForm[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      const title = typeof raw.title === 'string' ? raw.title : typeof raw.description === 'string' ? raw.description : '';
      return {
        id: typeof raw.id === 'string' ? raw.id : `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        description: typeof raw.description === 'string' ? raw.description : '',
        duration_hours: raw.duration_hours != null ? String(raw.duration_hours) : '',
        status: raw.status === 'faite' || raw.status === 'bloquee' ? raw.status : 'en_cours',
      } as SubtaskForm;
    })
    .filter(Boolean) as SubtaskForm[];
};

export const TaskForm: React.FC<TaskFormProps> = ({ task, initialDate, scope = 'mine', onClose, onSave }) => {
  const OTHER_PROJECT_VALUE = '__other_project__';
  const { can } = usePermissions();
  const { appRole } = useAuth();
  const canCreateProject = can('projects:create');
  const canAssignTeamTask = scope === 'team' && (can('time_entries:read_team') || can('time_entries:read_all'));
  const canSeeComparativeHours = appRole !== 'EMPLOYE';
  const isCollaboratorLimited = Boolean(task) && scope === 'mine' && !can('time_entries:read_team') && !can('time_entries:read_all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [missions, setMissions] = useState<ProjectMissionDetail[]>([]);
  const [subMissions, setSubMissions] = useState<Array<{ id: number; name: string; description?: string | null }>>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; nom: string; team_name?: string | null }>>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [subtasks, setSubtasks] = useState<SubtaskForm[]>([]);

  const [formData, setFormData] = useState<Partial<TaskLog>>({
    task_date: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    task_title: '',
    duration_hours: 1,
    estimated_hours: 1,
    status: 'draft',
    difficulty_level: 'medium',
    is_blocking: false,
    blocking_reason: '',
    is_delay_risk: false,
    is_automation_candidate: false,
    mission_id: undefined,
  });

  useEffect(() => {
    if (task) {
        setFormData({
          ...task,
          assigned_to: task.assigned_to ?? task.user_id,
          mission_id: task.mission_id ?? undefined,
          task_date: new Date(task.task_date).toISOString().split('T')[0],
          status: task.status || 'draft',
          estimated_hours: task.estimated_hours ?? task.duration_hours ?? 1,
        });
        setSubtasks(normalizeLoadedSubtasks((task as any).subtasks));
      } else {
        setSubtasks([]);
      }
    }, [task]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, catRes, teamRes] = await Promise.all([
          analyticsApi.getProjects(),
          analyticsApi.getTaskCategories(),
          canAssignTeamTask ? analyticsApi.getMyTeamMembers() : Promise.resolve({ data: [] } as any),
        ]);
        setProjects((projRes as any).data || (projRes as any) || []);
        setCategories((catRes as any).data || (catRes as any) || []);
        setTeamMembers((teamRes as any).data || (teamRes as any) || []);
      } catch (err) {
        console.error('Erreur chargement listes:', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const loadMissions = async () => {
      const selectedProjectId = Number(formData.project_id || 0);
      if (!selectedProjectId || Number.isNaN(selectedProjectId)) {
        setMissions([]);
        return;
      }

      try {
        const res = await analyticsApi.getProjectMissions(selectedProjectId);
        const data = (res as any)?.data || res || [];
        setMissions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement missions projet:', err);
        setMissions([]);
      }
    };

    loadMissions();
  }, [formData.project_id]);

  useEffect(() => {
    const loadSubMissions = async () => {
      const selectedProjectId = Number(formData.project_id || 0);
      const selectedMissionId = Number(formData.mission_id || 0);
      if (!selectedProjectId || !selectedMissionId) {
        setSubMissions([]);
        return;
      }

      try {
        const hierarchyRes = await analyticsApi.getProjectHierarchy(selectedProjectId);
        const hierarchy = (hierarchyRes as any)?.data || hierarchyRes || {};
        const mission = (hierarchy?.missions || []).find((m: any) => Number(m.id) === selectedMissionId);
        setSubMissions((mission?.sub_missions || []).map((sm: any) => ({
          id: Number(sm.id),
          name: sm.name,
          description: sm.description || null,
        })));
      } catch (err) {
        console.error('Erreur chargement sous-missions:', err);
        setSubMissions([]);
      }
    };

    loadSubMissions();
  }, [formData.project_id, formData.mission_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'project_id') {
      setFormData((prev) => ({ ...prev, project_id: value, mission_id: undefined, project_module_id: undefined }));
      if (value !== OTHER_PROJECT_VALUE) setNewProjectName('');
      return;
    }

    if (name === 'mission_id') {
      setFormData((prev) => ({ ...prev, mission_id: value, project_module_id: undefined }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('submit mission', {
        projectId: formData.project_id,
        formData,
      });
      console.log('projectId', formData.project_id);

      let effectiveProjectId = formData.project_id as number | string | undefined;

      if (String(formData.project_id || '') === OTHER_PROJECT_VALUE) {
        if (!canCreateProject) {
          throw new Error("Vous n'avez pas la permission de creer un projet.");
        }
        const trimmedName = newProjectName.trim();
        if (!trimmedName) {
          throw new Error('Veuillez saisir le nom du nouveau projet.');
        }

        const createRes = await analyticsApi.createProject({
          name: trimmedName,
          status: 'active',
        });
        const createdProject = (createRes as any)?.data ?? createRes;
        if (!createdProject?.id) {
          throw new Error('Projet cree mais ID introuvable.');
        }

        effectiveProjectId = createdProject.id;
        const projRes = await analyticsApi.getProjects();
        setProjects((projRes as any)?.data ?? []);
      }

      const estimatedHours = Number(formData.estimated_hours ?? formData.duration_hours ?? task?.estimated_hours ?? task?.duration_hours ?? 0);
      const actualHours = Number(formData.duration_hours ?? task?.duration_hours ?? 0);
      const preservedActualHours = task ? Number(task.duration_hours || 0) : 0;

      const collaboratorPayload = {
        project_id: Number(effectiveProjectId),
        mission_id: formData.mission_id ? Number(formData.mission_id) : undefined,
        project_module_id: formData.project_module_id ? Number(formData.project_module_id) : undefined,
        category_id: Number(formData.category_id),
        duration_hours: actualHours,
        status: formData.status || 'draft',
        task_description: formData.task_description || '',
        subtasks: subtasks.map((subtask) => ({
          title: subtask.title.trim(),
          description: subtask.description.trim() || null,
          duration_hours: subtask.duration_hours ? Number(subtask.duration_hours) : null,
          status: subtask.status,
        })),
      };

      const managerPayload = {
        ...formData,
        project_id: Number(effectiveProjectId),
        mission_id: formData.mission_id ? Number(formData.mission_id) : undefined,
        project_module_id: formData.project_module_id ? Number(formData.project_module_id) : undefined,
        category_id: Number(formData.category_id),
        duration_hours: preservedActualHours,
        estimated_hours: estimatedHours,
        status: formData.status || 'draft',
        task_description: formData.task_description || '',
        user_id: canAssignTeamTask ? Number(formData.assigned_to || formData.user_id || task?.assigned_to || task?.user_id || 0) || undefined : undefined,
        assigned_to: canAssignTeamTask ? Number(formData.assigned_to || formData.user_id || task?.assigned_to || task?.user_id || 0) || undefined : undefined,
        subtasks: subtasks.map((subtask) => ({
          title: subtask.title.trim(),
          description: subtask.description.trim() || null,
          duration_hours: subtask.duration_hours ? Number(subtask.duration_hours) : null,
          status: subtask.status,
        })),
      };

      const payload = isCollaboratorLimited ? collaboratorPayload : managerPayload;
      console.log('mission payload', payload);

      if (task && task.id) {
        await analyticsApi.updateTask(task.id, payload);
      } else {
        await analyticsApi.createTask(payload);
      }
      window.dispatchEvent(new Event('notifications:refresh'));
      onSave();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatusLabel = task
    ? TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label || task.status
    : 'Brouillon';
  const canEditStatus = !task || ['draft', 'in_progress', 'completed', 'to_correct'].includes(task.status);
  const isManagerScope = scope === 'team';
  const plannedHoursValue = Number(formData.estimated_hours ?? formData.duration_hours ?? task?.estimated_hours ?? task?.duration_hours ?? 0);
  const actualHoursValue = Number(formData.duration_hours ?? task?.duration_hours ?? 0);
  const hoursGap = Number((actualHoursValue - plannedHoursValue).toFixed(2));

  const visibleTeamMembers = teamMembers.filter((member) => member.id && member.nom);
  const showSubtasksSection = true;

  const addSubtask = () => {
    setSubtasks((current) => [...current, createEmptySubtask()]);
  };

  const updateSubtask = (id: string, field: keyof SubtaskForm, value: string) => {
    setSubtasks((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeSubtask = (id: string) => {
    setSubtasks((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{task ? 'Modifier la tache' : 'Saisir une nouvelle tache'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                name="task_date"
                required
                value={formData.task_date || ''}
                onChange={handleChange}
                disabled={isCollaboratorLimited}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isCollaboratorLimited ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Projet *</label>
              <select
                name="project_id"
                required
                value={formData.project_id || ''}
                onChange={handleChange}
                disabled={loadingLookups || isCollaboratorLimited}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isCollaboratorLimited ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              >
                <option value="">Selectionner un projet</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {canCreateProject && <option value={OTHER_PROJECT_VALUE}>Autre projet...</option>}
              </select>
              {String(formData.project_id || '') === OTHER_PROJECT_VALUE && (
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom du nouveau projet"
                  required
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Categorie *</label>
              <select
                name="category_id"
                required
                value={formData.category_id || ''}
                onChange={handleChange}
                disabled={isCollaboratorLimited}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isCollaboratorLimited ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              >
                <option value="">Selectionner une categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.team_name ? ` - ${c.team_name}` : ' (Global)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Mission</label>
              <select
                name="mission_id"
                value={formData.mission_id || ''}
                onChange={handleChange}
                disabled={loadingLookups || missions.length === 0 || isCollaboratorLimited}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isCollaboratorLimited ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              >
                <option value="">Selectionner une mission</option>
                {missions.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.name}
                  </option>
                ))}
              </select>
              {!missions.length && formData.project_id && (
                <p className="text-xs text-gray-500">Aucune mission disponible pour ce projet.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Sous-mission</label>
              <select
                name="project_module_id"
                value={formData.project_module_id || ''}
                onChange={handleChange}
                disabled={isCollaboratorLimited || !formData.mission_id}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isCollaboratorLimited ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              >
                <option value="">Selectionner une sous-mission</option>
                {subMissions.map((subMission) => (
                  <option key={subMission.id} value={subMission.id}>
                    {subMission.name}
                  </option>
                ))}
              </select>
              {!subMissions.length && formData.mission_id && (
                <p className="text-xs text-gray-500">Aucune sous-mission disponible pour cette mission.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {isManagerScope ? 'Durée estimée (heures) *' : 'Temps réalisé (heures) *'}
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                name={isManagerScope ? 'estimated_hours' : 'duration_hours'}
                required
                value={(isManagerScope ? formData.estimated_hours : formData.duration_hours) || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {task && canSeeComparativeHours ? (
                <p className="text-xs text-gray-500">
                  Temps réel actuel: <span className="font-semibold text-gray-700">{actualHoursValue.toFixed(2)} h</span>
                  {' '}· Écart: <span className={`font-semibold ${hoursGap >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{hoursGap.toFixed(2)} h</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Titre *</label>
            <input
              type="text"
              name="task_title"
              required
              value={formData.task_title || ''}
              onChange={handleChange}
              disabled={isCollaboratorLimited}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isCollaboratorLimited ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
              placeholder="Ex: Correction API timesheet"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Observation / remarque</label>
            <textarea
              name="task_description"
              value={formData.task_description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Details de l'intervention..."
            />
          </div>

          {showSubtasksSection && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Sous-tâches réalisées</p>
                  <p className="text-xs text-gray-500">Ajoutez les actions concrètes effectuées par le collaborateur.</p>
                </div>
                <button
                  type="button"
                  onClick={addSubtask}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Ajouter une sous-tâche
                </button>
              </div>

              {subtasks.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune sous-tâche saisie pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {subtasks.map((subtask, index) => (
                    <div key={subtask.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-800">Sous-tâche {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeSubtask(subtask.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600">Titre / description courte</label>
                          <input
                            type="text"
                            value={subtask.title}
                            onChange={(e) => updateSubtask(subtask.id, 'title', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Ex: Relecture de la carte"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-600">Durée optionnelle (h)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={subtask.duration_hours}
                            onChange={(e) => updateSubtask(subtask.id, 'duration_hours', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-600">Statut</label>
                          <select
                            value={subtask.status}
                            onChange={(e) => updateSubtask(subtask.id, 'status', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="en_cours">En cours</option>
                            <option value="faite">Faite</option>
                            <option value="bloquee">Bloquée</option>
                          </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600">Remarque</label>
                          <textarea
                            rows={2}
                            value={subtask.description}
                            onChange={(e) => updateSubtask(subtask.id, 'description', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Commentaire bref"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Statut</label>
            {canEditStatus ? (
              <select
                name="status"
                value={formData.status || 'draft'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={currentStatusLabel}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_blocking"
                  name="is_blocking"
                  checked={formData.is_blocking || false}
                  onChange={handleChange}
                  disabled={isCollaboratorLimited}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label htmlFor="is_blocking" className="ml-2 block text-sm text-gray-700">
                  Tache bloquante
                </label>
              </div>

              {formData.is_blocking && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-red-700">Raison du blocage *</label>
                  <input
                    type="text"
                    name="blocking_reason"
                    required={formData.is_blocking}
                    value={formData.blocking_reason || ''}
                    onChange={handleChange}
                    disabled={isCollaboratorLimited}
                    className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Expliquez le blocage"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {canAssignTeamTask && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Affecter a *</label>
                  <select
                    name="assigned_to"
                    required={canAssignTeamTask}
                    value={formData.assigned_to || formData.user_id || task?.assigned_to || task?.user_id || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selectionner un membre</option>
                    {visibleTeamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.nom}{member.team_name ? ` - ${member.team_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_delay_risk"
                  name="is_delay_risk"
                  checked={formData.is_delay_risk || false}
                  onChange={handleChange}
                  disabled={isCollaboratorLimited}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label htmlFor="is_delay_risk" className="ml-2 block text-sm text-gray-700">
                  Risque de retard
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_automation_candidate"
                  name="is_automation_candidate"
                  checked={formData.is_automation_candidate || false}
                  onChange={handleChange}
                  disabled={isCollaboratorLimited}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label htmlFor="is_automation_candidate" className="ml-2 block text-sm text-gray-700">
                  Candidat a l'automatisation
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
