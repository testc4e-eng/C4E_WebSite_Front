import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Flag,
  FolderKanban,
  Loader2,
  ListChecks,
  Plus,
  RefreshCcw,
  Search,
  User2,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import MultiSelectField from '../../components/TaskAnalytics/MultiSelectField';
import { analyticsApi, type ProjectManagementRow, type ProjectMissionDetail } from '../../lib/api-analytics';
import { httpGet } from '../../lib/api';
import { formatDateForDisplay } from '../../lib/date';

type MissionStatus = 'planifiee' | 'en_cours' | 'terminee_manager' | 'validee_dg' | 'cloturee' | 'suspendue' | 'arretee';
type MissionPriority = 'low' | 'medium' | 'high';

interface ManagerOption {
  id: number;
  nom: string;
  email?: string | null;
  role?: string | null;
  statut?: string | null;
}

interface MissionFormState {
  project_id: string;
  name: string;
  description: string;
  manager_ids: string[];
  start_date: string;
  end_date: string;
  status: MissionStatus;
  priority: MissionPriority;
}

interface ProjectMissionGroup {
  project: ProjectManagementRow;
  missions: ProjectMissionDetail[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifie',
  active: 'En cours',
  completed: 'Termine',
  on_hold: 'Suspendu',
  cancelled: 'Annule',
};

const PROJECT_STATUS_CLASSES: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  active: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  planifiee: 'Planifiee',
  en_cours: 'En cours',
  terminee_manager: 'Terminee manager',
  validee_dg: 'Validee DG',
  cloturee: 'Cloturee',
  suspendue: 'Suspendue',
  arretee: 'Arretee',
};

const MISSION_STATUS_CLASSES: Record<MissionStatus, string> = {
  planifiee: 'bg-slate-100 text-slate-700',
  en_cours: 'bg-indigo-100 text-indigo-700',
  terminee_manager: 'bg-amber-100 text-amber-700',
  validee_dg: 'bg-emerald-100 text-emerald-700',
  cloturee: 'bg-green-100 text-green-700',
  suspendue: 'bg-orange-100 text-orange-700',
  arretee: 'bg-rose-100 text-rose-700',
};

const PRIORITY_LABELS: Record<MissionPriority, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Elevee',
};

const PRIORITY_CLASSES: Record<MissionPriority, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
};

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  planned: 1,
  on_hold: 2,
  completed: 3,
  cancelled: 4,
};

const unwrapData = <T,>(value: unknown): T => ((value as { data?: T } | null)?.data ?? value) as T;

const todayIso = () => new Date().toISOString().slice(0, 10);

const createMissionForm = (projectId = ''): MissionFormState => ({
  project_id: projectId ? String(projectId) : '',
  name: '',
  description: '',
  manager_ids: [],
  start_date: todayIso(),
  end_date: '',
  status: 'planifiee',
  priority: 'medium',
});

const clampPercent = (value?: number | null) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(100, numberValue));
};

const formatMoney = (value?: number | null) => `${Math.round(Number(value || 0)).toLocaleString('fr-MA')} MAD`;

const formatDate = (value?: string | null) => (value ? formatDateForDisplay(value) : '—');

const joinValues = (values?: Array<string | null | undefined>) => values?.filter(Boolean).join(' · ') || '—';

const missionStatusClass = (status?: string | null) => MISSION_STATUS_CLASSES[(status as MissionStatus) || 'planifiee'] || 'bg-slate-100 text-slate-700';

const missionPriorityClass = (priority?: string | null) => PRIORITY_CLASSES[(priority as MissionPriority) || 'medium'] || PRIORITY_CLASSES.medium;

const missionStatusLabel = (status?: string | null) => MISSION_STATUS_LABELS[(status as MissionStatus) || 'planifiee'] || String(status || 'Planifiee');

const missionPriorityLabel = (priority?: string | null) => PRIORITY_LABELS[(priority as MissionPriority) || 'medium'] || String(priority || 'Moyenne');

const projectStatusClass = (status?: string | null) => PROJECT_STATUS_CLASSES[status || 'planned'] || 'bg-slate-100 text-slate-700';

const projectStatusLabel = (status?: string | null) => PROJECT_STATUS_LABELS[status || 'planned'] || String(status || '—');

const parseDateOnly = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const diffDays = (start: string, end: string) => {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate) return null;
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
  return diff > 0 ? diff : null;
};

export default function GestionMissionsDG() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [projects, setProjects] = useState<ProjectManagementRow[]>([]);
  const [missionsByProject, setMissionsByProject] = useState<Record<number, ProjectMissionDetail[]>>({});
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MissionFormState>(createMissionForm());

  const loadData = async () => {
    setLoading(true);
    setError('');
    setWarnings([]);
    setNotice('');
    const localWarnings: string[] = [];

    try {
      const [projectsResult, managersResult] = await Promise.allSettled([
        analyticsApi.getManagedProjects(),
        httpGet<ManagerOption[]>('/api/users/managers'),
      ]);

      if (projectsResult.status !== 'fulfilled') {
        throw new Error('Impossible de charger la liste des projets.');
      }

      const projectData = unwrapData<ProjectManagementRow[]>(projectsResult.value) || [];
      setProjects(projectData);

      if (managersResult.status === 'fulfilled') {
        setManagers(unwrapData<ManagerOption[]>(managersResult.value) || []);
      } else {
        setManagers([]);
        localWarnings.push('La liste des managers est temporairement indisponible.');
      }

      const grouped: Record<number, ProjectMissionDetail[]> = {};

      if (projectData.length > 0) {
        const missionResults = await Promise.allSettled(
          projectData.map(async (project) => {
            const response = await analyticsApi.getProjectMissions(project.id);
            return {
              projectId: project.id,
              missions: unwrapData<ProjectMissionDetail[]>(response) || [],
            };
          }),
        );

        missionResults.forEach((result, index) => {
          const project = projectData[index];
          if (!project) return;

          if (result.status === 'fulfilled') {
            grouped[project.id] = result.value.missions || [];
          } else {
            grouped[project.id] = [];
            localWarnings.push(`Les missions du projet ${project.name} n'ont pas pu etre chargees.`);
          }
        });
      }

      setMissionsByProject(grouped);
      setWarnings(localWarnings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement');
      setProjects([]);
      setMissionsByProject({});
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missionGroups = useMemo<ProjectMissionGroup[]>(() => {
    const searchQuery = search.trim().toLowerCase();

    return [...projects]
      .sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status || 'planned'] ?? 99) - (STATUS_ORDER[b.status || 'planned'] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' });
      })
      .map((project) => {
        const missions = missionsByProject[project.id] || [];
        const projectText = [
          project.name,
          project.code,
          project.description,
          project.client_name,
          project.project_manager_name,
          ...(project.project_manager_names || []),
          project.team_name,
          ...(project.team_names || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const filteredMissions = !searchQuery
          ? missions
          : missions.filter((mission) => {
              const missionText = [
                mission.name,
                mission.description,
                mission.manager_name,
                ...(mission.manager_names || []),
                mission.status,
                mission.status_label,
                mission.priority,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
              return missionText.includes(searchQuery);
            });

        if (searchQuery && !projectText.includes(searchQuery) && filteredMissions.length === 0) {
          return null;
        }

        return {
          project,
          missions: searchQuery && !projectText.includes(searchQuery) ? filteredMissions : missions,
        };
      })
      .filter(Boolean) as ProjectMissionGroup[];
  }, [projects, missionsByProject, search]);

  const visibleMissions = useMemo(() => {
    return missionGroups.reduce<ProjectMissionDetail[]>((acc, group) => acc.concat(group.missions), []);
  }, [missionGroups]);

  const missionStats = useMemo(() => {
    return {
      total: visibleMissions.length,
      enCours: visibleMissions.filter((mission) => mission.status === 'en_cours').length,
      validees: visibleMissions.filter((mission) => mission.status === 'validee_dg' || mission.status === 'cloturee').length,
      suspendues: visibleMissions.filter((mission) => mission.status === 'suspendue' || mission.status === 'arretee').length,
    };
  }, [visibleMissions]);

  const managerSelectOptions = useMemo(
    () => managers.map((manager) => ({ value: String(manager.id), label: manager.nom })),
    [managers],
  );

  const openCreateDialog = (projectId?: number) => {
    setError('');
    setNotice('');
    setDialogOpen(true);
    setForm(createMissionForm(projectId ? String(projectId) : ''));
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setForm(createMissionForm());
  };

  const handleSubmit = async () => {
    const projectId = Number(form.project_id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      setError('Veuillez selectionner un projet.');
      return;
    }
    if (!form.name.trim()) {
      setError('Le nom de la mission est requis.');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError('Veuillez renseigner la date de debut et la date de fin.');
      return;
    }

    const durationDays = diffDays(form.start_date, form.end_date);
    if (!durationDays) {
      setError('La date de fin doit etre posterieure a la date de debut.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const createdProject = projects.find((project) => project.id === projectId);
      const managerIds = form.manager_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
      await analyticsApi.createProjectMission(projectId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        manager_id: managerIds[0] || null,
        manager_ids: managerIds,
        start_date: form.start_date,
        end_date: form.end_date,
        duration_days: durationDays,
        status: form.status,
        priority: form.priority,
        estimated_cost: 0,
        budget_percentage: 0,
      });

      await loadData();
      setExpandedProjects((current) => ({ ...current, [projectId]: true }));
      setNotice(`Mission ajoutee avec succes${createdProject ? ` au projet ${createdProject.name}` : ''}.`);
      closeDialog();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible de creer la mission');
    } finally {
      setSaving(false);
    }
  };

  const missionButtonClass =
    'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60';
  const secondaryButtonClass =
    'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';
  const iconButtonClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des missions DG"
        description="Creer des missions liees a un projet et suivre leur avancement par projet."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void loadData()} className={secondaryButtonClass}>
              <RefreshCcw className="h-4 w-4" />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => openCreateDialog()}
              disabled={loading || projects.length === 0}
              className={missionButtonClass}
            >
              <Plus className="h-4 w-4" />
              Ajouter mission
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warnings.join(' ')}</span>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Projets suivis</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{missionGroups.length}</p>
                </div>
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                  <FolderKanban className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Missions totales</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{missionStats.total}</p>
                </div>
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
                  <ListChecks className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">En cours</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{missionStats.enCours}</p>
                </div>
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Validees DG</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{missionStats.validees}</p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recherche</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un projet, une mission ou un manager..."
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => openCreateDialog()}
                  disabled={projects.length === 0}
                  className={`${missionButtonClass} w-full justify-center`}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter mission
                </button>
              </div>
            </div>
          </div>

          {missionGroups.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500 shadow-sm shadow-slate-200/60">
              <FolderKanban className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-lg font-semibold text-slate-900">Aucun projet ou aucune mission ne correspond a la recherche.</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Vous pouvez creer une nouvelle mission depuis le bouton &quot;Ajouter mission&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {missionGroups.map(({ project, missions }) => {
                const isOpen = expandedProjects[project.id] ?? true;
                const managerNames = joinValues(project.project_manager_names?.length ? project.project_manager_names : project.project_manager_name ? [project.project_manager_name] : []);
                const teamNames = joinValues(project.team_names?.length ? project.team_names : project.team_name ? [project.team_name] : []);

                return (
                  <section key={project.id} className="rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
                          <Badge className={projectStatusClass(project.status)}>{projectStatusLabel(project.status)}</Badge>
                          <Badge variant="secondary">{missions.length} mission(s)</Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {project.code || 'Code indisponible'}
                          {' '}
                          ·
                          {' '}
                          {managerNames}
                          {teamNames !== '—' ? ` · ${teamNames}` : ''}
                        </p>
                        {project.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCreateDialog(project.id)}
                          className={missionButtonClass}
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter mission
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedProjects((current) => ({ ...current, [project.id]: !isOpen }))}
                          className={iconButtonClass}
                          aria-label={isOpen ? 'Replier le projet' : 'Deplier le projet'}
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="mt-5 space-y-3">
                        {missions.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            Aucune mission pour ce projet.
                          </div>
                        ) : (
                          missions.map((mission) => (
                            <article key={mission.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-slate-900">{mission.name}</h3>
                                    <Badge className={missionStatusClass(mission.status)}>{missionStatusLabel(mission.status)}</Badge>
                                    <Badge className={missionPriorityClass(mission.priority)}>{missionPriorityLabel(mission.priority)}</Badge>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {mission.description || 'Aucune description fournie.'}
                                  </p>
                                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="inline-flex items-center gap-2">
                                      <User2 className="h-4 w-4" />
                                      <span>{mission.manager_names?.length ? mission.manager_names.join(', ') : mission.manager_name || 'Sans responsable'}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <CalendarDays className="h-4 w-4" />
                                      <span>
                                        {formatDate(mission.start_date)}
                                        {' '}
                                        →
                                        {' '}
                                        {formatDate(mission.end_date)}
                                      </span>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <Flag className="h-4 w-4" />
                                      <span>{missionPriorityLabel(mission.priority)}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <Clock3 className="h-4 w-4" />
                                      <span>{mission.duration_days ? `${mission.duration_days} jour(s)` : 'Duree a definir'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="w-full shrink-0 rounded-2xl bg-white p-4 shadow-sm sm:w-56">
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{Math.round(clampPercent(mission.progress_percent))}%</span>
                                    <span>{mission.tasks_completed_count}/{mission.tasks_count} taches</span>
                                  </div>
                                  <Progress value={clampPercent(mission.progress_percent)} className="mt-2 h-2" />
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <Badge variant="secondary">{formatMoney(mission.estimated_cost)}</Badge>
                                    <Badge variant="outline">{mission.tasks_delayed_count} risque(s)</Badge>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-4xl border-slate-200 p-0">
          <div className="max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">Ajouter une mission</DialogTitle>
              <DialogDescription>
                La mission sera liee au projet selectionne et affichee dans le groupe correspondant.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Projet</Label>
                <Select
                  value={form.project_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, project_id: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choisir un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <SelectItem value="none" disabled>Aucun projet disponible</SelectItem>
                    ) : (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nom de la mission</Label>
                <Input
                  className="mt-2"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex: Revue des livrables"
                />
              </div>

              <div>
                <Label>Responsables / managers</Label>
                <div className="mt-2">
                  <MultiSelectField
                    placeholder="Sélectionner un ou plusieurs managers"
                    options={managerSelectOptions}
                    values={form.manager_ids}
                    onChange={(values) => setForm((current) => ({ ...current, manager_ids: values }))}
                  />
                </div>
              </div>

              <div>
                <Label>Statut</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((current) => ({ ...current, status: value as MissionStatus }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiee</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee_manager">Terminee manager</SelectItem>
                    <SelectItem value="validee_dg">Validee DG</SelectItem>
                    <SelectItem value="cloturee">Cloturee</SelectItem>
                    <SelectItem value="suspendue">Suspendue</SelectItem>
                    <SelectItem value="arretee">Arretee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date de debut</Label>
                <Input
                  className="mt-2"
                  type="date"
                  value={form.start_date}
                  onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                />
              </div>

              <div>
                <Label>Date de fin</Label>
                <Input
                  className="mt-2"
                  type="date"
                  value={form.end_date}
                  onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                />
              </div>

              <div>
                <Label>Priorite</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm((current) => ({ ...current, priority: value as MissionPriority }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Elevee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  className="mt-2 min-h-28"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Decrire le perimetre de la mission"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeDialog} className={secondaryButtonClass}>
                Annuler
              </button>
              <button type="button" onClick={() => void handleSubmit()} disabled={saving} className={missionButtonClass}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
