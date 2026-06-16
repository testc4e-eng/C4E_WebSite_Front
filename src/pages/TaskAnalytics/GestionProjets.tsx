import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, FileText, FolderKanban, Pencil, Plus, Search, Settings, Target, Trash2, Upload, Users } from 'lucide-react';
import { analyticsApi, type ProjectDetailsResponse, type ProjectDocumentDetail, type ProjectManagementRow, type ProjectTrackingStats, type ProjectMissionDetail } from '../../lib/api-analytics';
import { httpGet } from '../../lib/api';
import { usePermissions } from '../../hooks/usePermissions';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import MultiSelectField, { type MultiSelectOption } from '../../components/TaskAnalytics/MultiSelectField';
import PageHeader from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import ActionIconButton from '../../components/ui/ActionIconButton';
import { toast } from '@/hooks/use-toast';
import { formatDateForApi, formatDateForDisplay, formatDateForInput, parseDateValue } from '../../lib/date';

type ProjectStatus = 'planned' | 'active' | 'completed' | 'on_hold';
type ProjectPriority = 'low' | 'medium' | 'high';
type RetardFilter = 'all' | 'delayed' | 'near' | 'late' | 'ontime';

interface TeamOption { id: number; team_name?: string; name?: string; }
interface ManagerOption { id: number; nom: string; email?: string; }
interface FormState {
  name: string;
  code: string;
  description: string;
  client_name: string;
  start_date: string;
  duration_months: string;
  expected_end_date: string;
  project_manager_ids: string[];
  team_ids: string[];
  expected_end_date_manual: boolean;
  priority: ProjectPriority;
  status: ProjectStatus;
  budget_amount: string;
  financial_status: string;
  cps_type: 'provisional' | 'definitive';
  is_invoiced: 'yes' | 'no';
  is_paid: 'yes' | 'no';
  risk_level: string;
  delay_status: string;
  cps_file_path: string;
  stop_order_date: string;
  stop_order_file: string;
  resume_order_date: string;
  resume_order_file: string;
  real_end_date: string;
}

interface MissionFormState {
  name: string;
  description: string;
  start_date: string;
  duration_days: string;
  estimated_cost: string;
  budget_percentage: string;
  manager_ids: string[];
  status: string;
  stop_order_file: string;
  stop_reason: string;
}

const STATUS_LABELS: Record<string, string> = { planned: 'Planifié', active: 'En cours', completed: 'Terminé', on_hold: 'Suspendu', cancelled: 'Annulé' };
const STATUS_CLASSES: Record<string, string> = { planned: 'bg-sky-100 text-sky-700', active: 'bg-indigo-100 text-indigo-700', completed: 'bg-emerald-100 text-emerald-700', on_hold: 'bg-amber-100 text-amber-700', cancelled: 'bg-rose-100 text-rose-700' };
const PRIORITY_LABELS: Record<ProjectPriority, string> = { low: 'Faible', medium: 'Moyenne', high: 'Élevée' };
const PRIORITY_CLASSES: Record<ProjectPriority, string> = { low: 'bg-slate-100 text-slate-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-rose-100 text-rose-700' };
const today = () => formatDateForInput(new Date().toISOString());
const fmtDate = (v?: string | null) => formatDateForDisplay(v);
const fileNameFromPath = (value?: string | null) => {
  if (!value) return '';
  return value.split(/[\\/]/).filter(Boolean).pop() || value;
};
const addMonths = (d: string, m: string) => {
  const months = Number(m);
  if (!d || !Number.isFinite(months) || months <= 0) return '';
  const date = parseDateValue(d);
  if (!date) return '';
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() !== day) date.setUTCDate(0);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
const delayBadge = (p: ProjectManagementRow) => {
  if (p.status === 'completed') return p.delay_status === 'completed_delayed' ? ['Terminé avec retard', 'bg-rose-100 text-rose-700'] : ['Dans les délais', 'bg-emerald-100 text-emerald-700'];
  if (p.is_delayed) return ['En retard', 'bg-rose-100 text-rose-700'];
  if (p.is_near_deadline) return ['Proche deadline', 'bg-amber-100 text-amber-700'];
  return ['OK', 'bg-slate-100 text-slate-700'];
};

const PROJECT_DOCUMENT_OPTIONS = [
  { value: 'cps', label: 'CPS' },
  { value: 'service_notification_order', label: 'Ordre de notification de service' },
  { value: 'service_commencement_order', label: 'Ordre de commencement de service' },
  { value: 'registration_attestation', label: "Attestation d'immatriculation" },
  { value: 'definitive_guarantee_attestation', label: 'Attestation de garantie definitive' },
  { value: 'stop_order', label: "Ordre d'arret" },
  { value: 'resume_order', label: 'Ordre de reprise' },
  { value: 'other', label: 'Autre document' },
];

function createDefaultProjectForm(): FormState {
  return {
    name: '',
    code: '',
    description: '',
    client_name: '',
    start_date: '',
    duration_months: '',
    expected_end_date: '',
    project_manager_ids: [],
    team_ids: [],
    expected_end_date_manual: false,
    priority: 'medium',
    status: 'planned',
    budget_amount: '',
    financial_status: 'sous_controle',
    cps_type: 'provisional',
    is_invoiced: 'no',
    is_paid: 'no',
    risk_level: 'moyen',
    delay_status: '',
    cps_file_path: '',
    stop_order_date: '',
    stop_order_file: '',
    resume_order_date: '',
    resume_order_file: '',
    real_end_date: '',
  };
}

function createDefaultMissionForm(): MissionFormState {
  return {
    name: '',
    description: '',
    start_date: '',
    duration_days: '',
    estimated_cost: '',
    budget_percentage: '',
    manager_ids: [],
    status: 'planifiee',
    stop_order_file: '',
    stop_reason: '',
  };
}

const computeExpectedEndDate = (startDate: string, durationMonths: string) => {
  const months = Number(durationMonths);
  if (!startDate || !Number.isFinite(months) || months <= 0) {
    return '';
  }

  const date = parseDateValue(startDate);
  if (!date) {
    return '';
  }

  const initialDay = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() !== initialDay) {
    date.setUTCDate(0);
  }

  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const joinOrDash = (values?: string[] | null) => (values && values.length ? values.join(', ') : '—');

const toMultiSelectOptions = (items: Array<{ id: number; nom?: string; team_name?: string; name?: string }>): MultiSelectOption[] =>
  items.map((item) => ({
    value: String(item.id),
    label: item.nom || item.team_name || item.name || `#${item.id}`,
  }));

export default function GestionProjets() {
  const { canAny } = usePermissions();
  const canManage = canAny(['projects:create', 'projects:edit', 'projects:delete']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<ProjectManagementRow[]>([]);
  const [stats, setStats] = useState<ProjectTrackingStats | null>(null);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [retardFilter, setRetardFilter] = useState<RetardFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectManagementRow | null>(null);
  const [details, setDetails] = useState<ProjectDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [documentType, setDocumentType] = useState('cps');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [stopOrderFileUpload, setStopOrderFileUpload] = useState<File | null>(null);
  const [resumeOrderFileUpload, setResumeOrderFileUpload] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(() => createDefaultProjectForm());
  const [cpsFile, setCpsFile] = useState<File | null>(null);
  const [missionForm, setMissionForm] = useState<MissionFormState>(() => createDefaultMissionForm());
  const [missionSaving, setMissionSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true); setError('');
      const [p, s, m, t] = await Promise.all([analyticsApi.getManagedProjects(), analyticsApi.getManagedProjectStats(), httpGet<ManagerOption[]>('/api/users/managers'), httpGet<TeamOption[]>('/api/teams')]);
      setProjects(p.data || []); setStats(s.data || null); setManagers(m.data || []); setTeams(t.data || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur de chargement'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (form.expected_end_date_manual) {
      return;
    }

    const autoExpected = computeExpectedEndDate(form.start_date, form.duration_months);
    if (autoExpected !== form.expected_end_date) {
      setForm((current) => ({
        ...current,
        expected_end_date: autoExpected,
      }));
    }
  }, [form.start_date, form.duration_months, form.expected_end_date, form.expected_end_date_manual]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const managerNames = p.project_manager_names?.length ? p.project_manager_names.join(', ') : p.project_manager_name || '';
      const teamNames = p.team_names?.length ? p.team_names.join(', ') : p.team_name || '';
      const okQ = !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q) || managerNames.toLowerCase().includes(q) || teamNames.toLowerCase().includes(q);
      const okStatus = statusFilter === 'all' || p.status === statusFilter;
      const okManager = managerFilter === 'all' || (p.project_manager_ids?.length ? p.project_manager_ids.map(String).includes(managerFilter) : String(p.project_manager_id || '') === managerFilter);
      const okTeam = teamFilter === 'all' || (p.team_ids?.length ? p.team_ids.map(String).includes(teamFilter) : String(p.team_id || '') === teamFilter);
      const okRetard = retardFilter === 'all' || (retardFilter === 'delayed' && p.is_delayed) || (retardFilter === 'near' && p.is_near_deadline) || (retardFilter === 'late' && p.delay_status === 'completed_delayed') || (retardFilter === 'ontime' && p.delay_status === 'completed_on_time');
      return okQ && okStatus && okManager && okTeam && okRetard;
    });
  }, [projects, search, statusFilter, managerFilter, teamFilter, retardFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...createDefaultProjectForm(), start_date: today() });
    setCpsFile(null);
    setStopOrderFileUpload(null);
    setResumeOrderFileUpload(null);
    setFormOpen(true);
  };
  const openEdit = (project: ProjectManagementRow) => {
    setError('');
    setEditing(project);
    const startDate = formatDateForInput(project.start_date) || today();
    const duration = String(project.duration_months || '');
    const autoExpected = computeExpectedEndDate(startDate, duration);
    const expectedEndDate = formatDateForInput(project.expected_end_date || project.end_date || '') || autoExpected;
    const manual = Boolean(expectedEndDate && autoExpected && expectedEndDate !== autoExpected);

    setForm({
      name: project.name || '',
      code: project.code || '',
      description: project.description || '',
      client_name: project.client_name || '',
      start_date: startDate,
      duration_months: duration,
      expected_end_date: expectedEndDate || '',
      project_manager_ids: (project.project_manager_ids && project.project_manager_ids.length
        ? project.project_manager_ids
        : [project.project_manager_id].filter((item): item is number => typeof item === 'number' && item > 0)
      ).map(String),
      team_ids: (project.team_ids && project.team_ids.length
        ? project.team_ids
        : [project.team_id].filter((item): item is number => typeof item === 'number' && item > 0)
      ).map(String),
      expected_end_date_manual: manual,
      priority: project.priority || 'medium',
      status: (project.status as ProjectStatus) || 'planned',
      budget_amount: project.budget_amount != null ? String(project.budget_amount) : '',
      financial_status: project.financial_status || 'sous_controle',
      cps_type: (project.cps_type as 'provisional' | 'definitive') || 'provisional',
      is_invoiced: project.is_invoiced ? 'yes' : 'no',
      is_paid: project.is_paid ? 'yes' : 'no',
      risk_level: project.risk_level || 'moyen',
      delay_status: project.delay_status || '',
      cps_file_path: project.cps_file_path || '',
      stop_order_date: formatDateForInput(project.stop_order_date || ''),
      stop_order_file: project.stop_order_file || '',
      resume_order_date: formatDateForInput(project.resume_order_date || ''),
      resume_order_file: project.resume_order_file || '',
      real_end_date: formatDateForInput(project.real_end_date || project.actual_end_date || ''),
    });
    setCpsFile(null);
    setStopOrderFileUpload(null);
    setResumeOrderFileUpload(null);
    setFormOpen(true);
  };
  const handleProjectSettings = async (id: number) => {
    setDetailsOpen(true); setDetailsLoading(true); setDetailsError(''); setDetails(null); resetMissionForm();
    setDocumentType('cps');
    setDocumentFile(null);
    setDocumentError('');
    try { const res = await analyticsApi.getProjectTrackingDetails(id); setDetails(res.data); } catch (e: unknown) { setDetailsError(e instanceof Error ? e.message : 'Impossible de charger le détail'); } finally { setDetailsLoading(false); }
  };

  const submit = async () => {
    const managerIds = form.project_manager_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
    const teamIds = form.team_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
    let cpsFilePath = form.cps_file_path || null;
    let stopOrderFilePath = form.stop_order_file || null;
    let resumeOrderFilePath = form.resume_order_file || null;
    if (cpsFile) {
      const cpsUpload = await analyticsApi.uploadProjectCps(cpsFile);
      cpsFilePath = cpsUpload.file_path;
    }
    if (stopOrderFileUpload) {
      if (editing?.id) {
        const stopUpload = await analyticsApi.uploadProjectDocument(
          editing.id,
          stopOrderFileUpload,
          'stop_order',
          stopOrderFileUpload.name,
        );
        stopOrderFilePath = stopUpload.document.file_path;
      } else {
        const stopUpload = await analyticsApi.uploadProjectCps(stopOrderFileUpload);
        stopOrderFilePath = stopUpload.file_path;
      }
    }
    if (resumeOrderFileUpload) {
      if (editing?.id) {
        const resumeUpload = await analyticsApi.uploadProjectDocument(
          editing.id,
          resumeOrderFileUpload,
          'resume_order',
          resumeOrderFileUpload.name,
        );
        resumeOrderFilePath = resumeUpload.document.file_path;
      } else {
        const resumeUpload = await analyticsApi.uploadProjectCps(resumeOrderFileUpload);
        resumeOrderFilePath = resumeUpload.file_path;
      }
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      client_name: form.client_name.trim() || null,
      start_date: formatDateForApi(form.start_date),
      duration_months: Number(form.duration_months),
      expected_end_date: formatDateForApi(form.expected_end_date) || computeExpectedEndDate(form.start_date, form.duration_months) || null,
      project_manager_ids: managerIds,
      team_ids: teamIds,
      priority: form.priority,
      status: form.status,
      budget_amount: Number(form.budget_amount || 0),
      financial_status: form.financial_status || 'sous_controle',
      cps_type: form.cps_type,
      is_invoiced: form.is_invoiced === 'yes',
      is_paid: form.is_paid === 'yes',
      delay_status: form.delay_status || null,
      risk_level: form.risk_level || 'moyen',
      cps_file_path: cpsFilePath,
      stop_order_date: formatDateForApi(form.stop_order_date) || null,
      stop_order_file: stopOrderFilePath,
      resume_order_date: formatDateForApi(form.resume_order_date) || null,
      resume_order_file: resumeOrderFilePath,
      real_end_date: formatDateForApi(form.real_end_date) || null,
    } as const;
    if (!payload.name || !payload.code || !payload.start_date || !Number.isFinite(payload.duration_months) || payload.duration_months <= 0 || !managerIds.length || !teamIds.length) { setError('Veuillez remplir les champs obligatoires.'); return; }
    try {
      setSaving(true);
      setError('');
      editing ? await analyticsApi.updateManagedProject(editing.id, payload) : await analyticsApi.createManagedProject(payload);
      await load();
      setFormOpen(false);
      setEditing(null);
      setForm(createDefaultProjectForm());
      setCpsFile(null);
      setStopOrderFileUpload(null);
      setResumeOrderFileUpload(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (p: ProjectManagementRow) => { if (!window.confirm(`Supprimer le projet ${p.name} ?`)) return; try { setSaving(true); await analyticsApi.deleteManagedProject(p.id); await load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Suppression impossible'); } finally { setSaving(false); } };

  const resetMissionForm = () => {
    setMissionForm(createDefaultMissionForm());
  };

  const submitMission = async (event?: any) => {
    event?.preventDefault();
    const projectId = selectedProjectDetails?.project_id;
    console.log('submit mission', { projectId, formData: missionForm });
    console.log('projectId', projectId);

    if (!projectId) {
      const message = 'Impossible de créer la mission sans projet sélectionné.';
      setDetailsError(message);
      toast({
        title: 'Projet introuvable',
        description: message,
        variant: 'destructive',
      });
      return;
    }
    if (!missionForm.name.trim()) {
      const message = 'Le nom de la mission est requis.';
      setDetailsError(message);
      toast({
        title: 'Champ requis',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    try {
      setMissionSaving(true);
      setDetailsError('');
      const budgetPercentageValue = missionForm.budget_percentage ? Number(missionForm.budget_percentage) : 0;
      const sanitizedBudgetPercentage = Number.isFinite(budgetPercentageValue)
        ? Math.max(0, Math.min(100, budgetPercentageValue))
        : 0;
      const managerIds = missionForm.manager_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);

      const payload = {
        name: missionForm.name.trim(),
        description: missionForm.description.trim() || null,
        start_date: missionForm.start_date || null,
        duration_days: missionForm.duration_days ? Number(missionForm.duration_days) : null,
        estimated_cost: missionForm.estimated_cost ? Number(missionForm.estimated_cost) : 0,
        budget_percentage: sanitizedBudgetPercentage,
        manager_id: managerIds[0] || null,
        manager_ids: managerIds,
        status: missionForm.status,
        stop_order_file: missionForm.stop_order_file.trim() || null,
        stop_reason: missionForm.stop_reason.trim() || null,
      };

      console.log('mission payload', payload);
      await analyticsApi.createProjectMission(projectId, payload);
      const refreshed = await analyticsApi.getProjectTrackingDetails(projectId);
      setDetails(refreshed.data);
      resetMissionForm();
      toast({
        title: 'Mission ajoutée',
        description: 'La mission a été enregistrée avec succès.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Impossible de creer la mission';
      setDetailsError(message);
      console.error('Erreur création mission:', e);
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setMissionSaving(false);
    }
  };

  const submitDocument = async () => {
    const projectId = selectedProjectDetails?.project_id;
    if (!projectId) {
      setDocumentError('Veuillez sélectionner un projet.');
      return;
    }
    if (!documentFile) {
      setDocumentError('Veuillez choisir un fichier.');
      return;
    }

    try {
      setDocumentSaving(true);
      setDocumentError('');
      await analyticsApi.uploadProjectDocument(projectId, documentFile, documentType, documentFile.name);
      const refreshed = await analyticsApi.getProjectTrackingDetails(projectId);
      setDetails(refreshed.data);
      setDocumentFile(null);
    } catch (e: unknown) {
      setDocumentError(e instanceof Error ? e.message : 'Impossible d’ajouter le document');
    } finally {
      setDocumentSaving(false);
    }
  };

  const expectedEndDate = addMonths(form.start_date, form.duration_months);
  const management = stats?.management;
  const selectedProjectDetails = details?.project;
  const projectMissions = details?.missions || details?.modules || [];
  const projectDocuments: ProjectDocumentDetail[] = details?.documents || [];
  const missionManagerOptions = useMemo(() => toMultiSelectOptions(managers), [managers]);
  const managerOptions = selectedProjectDetails
    ? (selectedProjectDetails.project_manager_ids?.length
      ? selectedProjectDetails.project_manager_ids.map((id, index) => ({
          id,
          name: selectedProjectDetails.project_manager_names?.[index] || selectedProjectDetails.project_manager_name || `Responsable ${id}`,
        }))
      : selectedProjectDetails.project_manager_id
        ? [{
            id: selectedProjectDetails.project_manager_id,
            name: selectedProjectDetails.project_manager_name || `Responsable ${selectedProjectDetails.project_manager_id}`,
          }]
        : [])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Gestion des projets" description="Créer, modifier et suivre les projets avec calcul automatique des échéances." actions={canManage ? <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />Nouveau projet</button> : <Link to="/dashboard/task-analytics/suivi-projets" className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">Suivi des projets</Link>} />
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="flex justify-center py-24"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" /></div> : <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
          <KPIBox icon={FolderKanban} label="Total projets" value={management?.total ?? 0} color="indigo" />
          <KPIBox icon={Target} label="Projets actifs" value={management?.active ?? 0} color="blue" />
          <KPIBox icon={CheckCircle2} label="Projets terminés" value={management?.completed ?? 0} color="green" />
          <KPIBox icon={AlertTriangle} label="En retard" value={management?.delayed ?? 0} color="red" />
          <KPIBox icon={Clock3} label="Proche deadline" value={management?.nearDeadline ?? 0} color="yellow" />
          <KPIBox icon={Users} label="Progression moyenne" value={`${management?.averageProgress ?? 0}%`} color="purple" />
        </div>
        <div className="grid grid-cols-1 gap-3 rounded-[1.35rem] border border-white/70 bg-white/70 p-3 shadow-sm shadow-slate-200/50 backdrop-blur-xl lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Filtre projet</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un projet..."
                className="h-10 rounded-lg border-slate-200 bg-white pl-10 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Statut</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="planned">Planifié</SelectItem><SelectItem value="active">En cours</SelectItem><SelectItem value="completed">Terminé</SelectItem><SelectItem value="on_hold">Suspendu</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Chef</Label>
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous</SelectItem>{managers.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Équipe</Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Toutes</SelectItem>{teams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.team_name || t.name || `Équipe ${t.id}`}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-4">
            <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Retard</Label>
            <Select value={retardFilter} onValueChange={(v) => setRetardFilter(v as RetardFilter)}>
              <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="delayed">En retard</SelectItem><SelectItem value="near">Proche deadline</SelectItem><SelectItem value="ontime">Terminés à temps</SelectItem><SelectItem value="late">Terminés en retard</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <ChartCard title="Tableau des projets" empty={filtered.length === 0} actions={<Badge variant="secondary">{filtered.length} résultats</Badge>}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-[13px]">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[15%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Nom projet</th>
                  <th className="px-3 py-2 text-left font-semibold">Code</th>
                  <th className="px-3 py-2 text-left font-semibold">Chefs projet</th>
                  <th className="px-3 py-2 text-left font-semibold">Début</th>
                  <th className="px-3 py-2 text-left font-semibold">Durée</th>
                  <th className="px-3 py-2 text-left font-semibold">Jours restants</th>
                  <th className="px-3 py-2 text-left font-semibold">Avancement</th>
                  <th className="px-3 py-2 text-left font-semibold">Statut</th>
                  <th className="px-3 py-2 text-left font-semibold">Retard</th>
                  <th className="px-3 py-2 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const [delayLabel, delayClass] = delayBadge(p);
                  const progress = p.time_consumed_percent ?? p.progress ?? 0;
                  return <tr key={p.id} className="align-middle hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 align-middle">
                      <div className="truncate font-semibold leading-5 text-slate-900">{p.name}</div>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-slate-700">{p.code || '—'}</td>
                    <td className="px-3 py-2.5 align-middle text-slate-700">
                      <div className="truncate">{joinOrDash(p.project_manager_names) || p.project_manager_name || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-slate-700">{fmtDate(p.start_date)}</td>
                    <td className="px-3 py-2.5 align-middle text-slate-700">{p.duration_months || 0} mois</td>
                    <td className="px-3 py-2.5 align-middle text-slate-700">{p.days_remaining == null ? '—' : `${p.days_remaining} j`}</td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="w-full min-w-0">
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>{progress}%</span>
                          <span>{p.tasks_completed_count}/{p.tasks_count}</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-slate-200" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[p.status] || 'bg-slate-100 text-slate-700'}`}>{p.status_label || STATUS_LABELS[p.status] || p.status}</span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${delayClass}`}>{delayLabel}</span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <ActionIconButton
                          onClick={() => handleProjectSettings(p.id)}
                          label="Voir / paramètres"
                          className="!h-8 !w-8 !rounded-lg text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          icon={<Settings className="h-3.5 w-3.5" />}
                        />
                        {canManage && (
                          <>
                            <ActionIconButton
                              onClick={() => openEdit(p)}
                              label="Modifier"
                              className="!h-8 !w-8 !rounded-lg text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                              icon={<Pencil className="h-3.5 w-3.5" />}
                            />
                            <ActionIconButton
                              onClick={() => remove(p)}
                              label="Supprimer"
                              className="!h-8 !w-8 !rounded-lg text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </>}

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="max-w-4xl border-slate-200 p-0"><div className="max-h-[90vh] overflow-y-auto p-6"><DialogHeader><DialogTitle className="text-2xl">{editing ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle><DialogDescription>La date de fin prévue est calculée automatiquement à partir de la durée globale. Date calculée automatiquement, modifiable si nécessaire.</DialogDescription></DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><Label>Nom du projet</Label><Input className="mt-2" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><Label>Code projet</Label><Input className="mt-2 uppercase" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea className="mt-2 min-h-28" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div><Label>Client / organisme</Label><Input className="mt-2" value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} /></div>
          <div><Label>Date début</Label><Input className="mt-2" type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
          <div><Label>Durée en mois</Label><Input className="mt-2" type="number" min="1" value={form.duration_months} onChange={(e) => setForm((p) => ({ ...p, duration_months: e.target.value }))} /></div>
          <div>
            <Label>Date fin prévue</Label>
            <Input
              className="mt-2"
              type="date"
              value={form.expected_end_date}
              onChange={(e) => setForm((p) => ({ ...p, expected_end_date: e.target.value, expected_end_date_manual: true }))}
            />
            <p className="mt-2 text-xs text-slate-500">Date calculée automatiquement, modifiable si nécessaire.</p>
          </div>
          <div>
            <Label>Chef de projet</Label>
            <div className="mt-2">
              <MultiSelectField
                placeholder="Sélectionner un ou plusieurs chefs"
                options={toMultiSelectOptions(managers)}
                values={form.project_manager_ids}
                onChange={(values) => setForm((p) => ({ ...p, project_manager_ids: values }))}
              />
            </div>
          </div>
          <div>
            <Label>Équipe affectée</Label>
            <div className="mt-2">
              <MultiSelectField
                placeholder="Sélectionner une ou plusieurs équipes"
                options={toMultiSelectOptions(teams)}
                values={form.team_ids}
                onChange={(values) => setForm((p) => ({ ...p, team_ids: values }))}
              />
            </div>
          </div>
          <div><Label>Priorité</Label><Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as ProjectPriority }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Faible</SelectItem><SelectItem value="medium">Moyenne</SelectItem><SelectItem value="high">Élevée</SelectItem></SelectContent></Select></div>
          <div><Label>Statut</Label><Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as ProjectStatus }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planifié</SelectItem><SelectItem value="active">En cours</SelectItem><SelectItem value="on_hold">En arrêt</SelectItem><SelectItem value="completed">Terminé</SelectItem></SelectContent></Select></div>
          <div><Label>Budget global (MAD)</Label><Input className="mt-2" type="number" min="0" value={form.budget_amount} onChange={(e) => setForm((p) => ({ ...p, budget_amount: e.target.value }))} /></div>
          <div><Label>Statut financier</Label><Select value={form.financial_status} onValueChange={(v) => setForm((p) => ({ ...p, financial_status: v }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sous_controle">Sous contrôle</SelectItem><SelectItem value="attention">Attention</SelectItem><SelectItem value="depassement">Dépassement</SelectItem></SelectContent></Select></div>
          <div><Label>Type CPS</Label><Select value={form.cps_type} onValueChange={(v) => setForm((p) => ({ ...p, cps_type: v as 'provisional' | 'definitive' }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="provisional">Provisoire</SelectItem><SelectItem value="definitive">Définitif</SelectItem></SelectContent></Select></div>
          <div><Label>Projet facturé ?</Label><Select value={form.is_invoiced} onValueChange={(v) => setForm((p) => ({ ...p, is_invoiced: v as 'yes' | 'no' }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">Non</SelectItem><SelectItem value="yes">Oui</SelectItem></SelectContent></Select></div>
          <div><Label>Projet payé ?</Label><Select value={form.is_paid} onValueChange={(v) => setForm((p) => ({ ...p, is_paid: v as 'yes' | 'no' }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">Non</SelectItem><SelectItem value="yes">Oui</SelectItem></SelectContent></Select></div>
          <div><Label>Niveau de risque</Label><Select value={form.risk_level} onValueChange={(v) => setForm((p) => ({ ...p, risk_level: v }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="faible">Faible</SelectItem><SelectItem value="moyen">Moyen</SelectItem><SelectItem value="eleve">Élevé</SelectItem></SelectContent></Select></div>
          <div><Label>Statut délai</Label><Select value={form.delay_status || 'auto'} onValueChange={(v) => setForm((p) => ({ ...p, delay_status: v === 'auto' ? '' : v }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Automatique</SelectItem><SelectItem value="on_time">Dans les délais</SelectItem><SelectItem value="near_deadline">Proche deadline</SelectItem><SelectItem value="delayed">En retard</SelectItem></SelectContent></Select></div>
          <div><Label>Date ordre d'arrêt</Label><Input className="mt-2" type="date" value={form.stop_order_date} onChange={(e) => setForm((p) => ({ ...p, stop_order_date: e.target.value }))} /></div>
          <div>
            <Label>Fichier ordre d'arrêt</Label>
            <Input
              className="mt-2"
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setStopOrderFileUpload(e.target.files?.[0] || null)}
            />
            <p className="mt-2 text-xs text-slate-500">
              {stopOrderFileUpload ? `Fichier sélectionné: ${stopOrderFileUpload.name}` : form.stop_order_file ? `Fichier actuel: ${fileNameFromPath(form.stop_order_file)}` : 'Aucun fichier sélectionné'}
            </p>
          </div>
          <div><Label>Date ordre de reprise</Label><Input className="mt-2" type="date" value={form.resume_order_date} onChange={(e) => setForm((p) => ({ ...p, resume_order_date: e.target.value }))} /></div>
          <div>
            <Label>Fichier ordre de reprise</Label>
            <Input
              className="mt-2"
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setResumeOrderFileUpload(e.target.files?.[0] || null)}
            />
            <p className="mt-2 text-xs text-slate-500">
              {resumeOrderFileUpload ? `Fichier sélectionné: ${resumeOrderFileUpload.name}` : form.resume_order_file ? `Fichier actuel: ${fileNameFromPath(form.resume_order_file)}` : 'Aucun fichier sélectionné'}
            </p>
          </div>
          <div><Label>Date réelle de fin</Label><Input className="mt-2" type="date" value={form.real_end_date} onChange={(e) => setForm((p) => ({ ...p, real_end_date: e.target.value }))} /></div>
          <div className="md:col-span-2">
            <Label>CPS (.pdf / .docx)</Label>
            <Input className="mt-2" type="file" accept=".pdf,.docx" onChange={(e) => setCpsFile(e.target.files?.[0] || null)} />
            {form.cps_file_path ? (
              <a href={form.cps_file_path} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">
                Consulter le CPS actuel
              </a>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Annuler</button><button onClick={submit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      </div></DialogContent></Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent className="max-w-6xl border-slate-200 p-0"><div className="max-h-[90vh] overflow-y-auto p-6"><DialogHeader><DialogTitle className="text-2xl">{selectedProjectDetails?.project_name || 'Détail du projet'}</DialogTitle><DialogDescription>Vue complète du projet, des équipes, des tâches et de la timeline.</DialogDescription></DialogHeader>
        {detailsLoading ? <div className="flex justify-center py-16"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-500" /></div> : detailsError ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">{detailsError}</div> : details ? <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Statut</p><p className="mt-2 text-lg font-semibold text-slate-900">{STATUS_LABELS[selectedProjectDetails?.status || ''] || selectedProjectDetails?.status || '—'}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Avancement</p><p className="mt-2 text-lg font-semibold text-slate-900">{selectedProjectDetails?.progress_percent || 0}%</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Retard</p><p className="mt-2 text-lg font-semibold text-slate-900">{selectedProjectDetails?.delay_count || 0}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Fin prévue</p><p className="mt-2 text-lg font-semibold text-slate-900">{fmtDate(selectedProjectDetails?.expected_end_date || selectedProjectDetails?.end_date)}</p></div>
          </div>
          <form className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" onSubmit={submitMission}>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-900">Créer une mission</h4>
              <Badge variant="secondary">{projectMissions.length} mission(s)</Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Nom mission</Label>
                <Input className="mt-2" value={missionForm.name} onChange={(e) => setMissionForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ex: Conception fonctionnelle" />
              </div>
              <div>
                <Label>Responsables / managers</Label>
                <div className="mt-2">
                  <MultiSelectField
                    placeholder="Sélectionner un ou plusieurs managers"
                    options={missionManagerOptions}
                    values={missionForm.manager_ids}
                    onChange={(values) => setMissionForm((current) => ({ ...current, manager_ids: values }))}
                  />
                </div>
              </div>
              <div>
                <Label>Date début</Label>
                <Input className="mt-2" type="date" value={missionForm.start_date} onChange={(e) => setMissionForm((current) => ({ ...current, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Durée (jours)</Label>
                <Input className="mt-2" type="number" min="1" value={missionForm.duration_days} onChange={(e) => setMissionForm((current) => ({ ...current, duration_days: e.target.value }))} />
              </div>
              <div>
                <Label>Coût estimé (MAD)</Label>
                <Input className="mt-2" type="number" min="0" value={missionForm.estimated_cost} onChange={(e) => setMissionForm((current) => ({ ...current, estimated_cost: e.target.value }))} />
              </div>
              <div>
                <Label>% budget projet</Label>
                <Input className="mt-2" type="number" min="0" step="0.1" value={missionForm.budget_percentage} onChange={(e) => setMissionForm((current) => ({ ...current, budget_percentage: e.target.value }))} />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={missionForm.status} onValueChange={(value) => setMissionForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee_manager">Terminée manager</SelectItem>
                    <SelectItem value="validee_dg">Validée DG</SelectItem>
                    <SelectItem value="cloturee">Clôturée</SelectItem>
                    <SelectItem value="suspendue">Suspendue</SelectItem>
                    <SelectItem value="arretee">Arrêtée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea className="mt-2 min-h-[96px]" value={missionForm.description} onChange={(e) => setMissionForm((current) => ({ ...current, description: e.target.value }))} placeholder="Décrire le périmètre de la mission" />
              </div>
              <div>
                <Label>Ordre d’arrêt / suspension</Label>
                <Input className="mt-2" value={missionForm.stop_order_file} onChange={(e) => setMissionForm((current) => ({ ...current, stop_order_file: e.target.value }))} placeholder="Lien ou fichier" />
              </div>
              <div>
                <Label>Motif d’arrêt / suspension</Label>
                <Input className="mt-2" value={missionForm.stop_reason} onChange={(e) => setMissionForm((current) => ({ ...current, stop_reason: e.target.value }))} placeholder="Motif" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={resetMissionForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Réinitialiser</button>
              <button type="submit" disabled={missionSaving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {missionSaving ? 'Enregistrement...' : 'Ajouter la mission'}
              </button>
            </div>
          </form>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h4 className="text-base font-semibold text-slate-900">Informations générales</h4><p className="mt-3 text-sm leading-6 text-slate-600">{selectedProjectDetails?.description || 'Aucune description disponible.'}</p><div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2"><div><span className="font-semibold text-slate-900">Code:</span> {selectedProjectDetails?.code || '—'}</div><div><span className="font-semibold text-slate-900">Client:</span> {selectedProjectDetails?.client_name || '—'}</div><div><span className="font-semibold text-slate-900">Début:</span> {fmtDate(selectedProjectDetails?.start_date)}</div><div><span className="font-semibold text-slate-900">Durée:</span> {selectedProjectDetails?.duration_months || 0} mois</div><div><span className="font-semibold text-slate-900">Priorité:</span> {selectedProjectDetails?.priority || 'medium'}</div><div><span className="font-semibold text-slate-900">Jours restants:</span> {selectedProjectDetails?.days_remaining == null ? '—' : `${selectedProjectDetails.days_remaining} j`}</div><div><span className="font-semibold text-slate-900">Budget:</span> {selectedProjectDetails?.budget_amount ?? 0} MAD</div><div><span className="font-semibold text-slate-900">Risque:</span> {selectedProjectDetails?.risk_level || 'moyen'}</div></div><div className="mt-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Chefs de projet</p><div className="mt-2 flex flex-wrap gap-2">{(selectedProjectDetails?.project_manager_names?.length ? selectedProjectDetails.project_manager_names : selectedProjectDetails?.project_manager_name ? [selectedProjectDetails.project_manager_name] : []).map((name) => <Badge key={name} variant="secondary">{name}</Badge>)}</div></div>{selectedProjectDetails?.cps_file_path ? <div className="mt-4"><a href={selectedProjectDetails.cps_file_path} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-600 hover:underline">Voir/Télécharger CPS</a></div> : null}</div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h4 className="text-base font-semibold text-slate-900">Équipes affectées</h4><div className="mt-4 space-y-3">{(details.teams || []).length ? details.teams.map((team) => <div key={team.team_id} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-900">{team.team_name}</p><p className="text-xs text-slate-500">{team.members.length} membre(s)</p></div><Badge variant="secondary">{team.team_id}</Badge></div><div className="mt-3 space-y-2">{team.members.length ? team.members.map((member) => <div key={`${team.team_id}-${member.user_id}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2"><div><p className="font-medium text-slate-900">{member.user_name}</p><p className="text-xs text-slate-500">{member.email || 'Email non disponible'}</p></div><Badge variant="outline">{member.role}</Badge></div>) : <p className="text-sm text-slate-500">Aucun membre lié.</p>}</div></div>) : <p className="text-sm text-slate-500">Aucune équipe affectée.</p>}</div></div>
          </div>
          <ChartCard
            title="Documents du projet"
            empty={false}
            actions={
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedProjectDetails?.documents_count ?? projectDocuments.length} document(s)</Badge>
                <Badge variant="outline">{selectedProjectDetails?.missing_documents_count ?? 0} manquant(s)</Badge>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Type CPS</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedProjectDetails?.cps_type === 'definitive' ? 'Définitif' : 'Provisoire'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Facturé</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedProjectDetails?.is_invoiced ? 'Oui' : 'Non'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payé</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedProjectDetails?.is_paid ? 'Oui' : 'Non'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Durée effective</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedProjectDetails?.effective_duration_days ? `${selectedProjectDetails.effective_duration_days} j` : '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {projectDocuments.length ? projectDocuments.map((document) => (
                  <a
                    key={document.id}
                    href={document.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <div className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{document.doc_label}</p>
                        {document.is_required ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Obligatoire</Badge> : <Badge variant="secondary">Optionnel</Badge>}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-600">{document.original_name || document.file_path}</p>
                      <p className="mt-2 text-xs text-slate-500">{document.uploaded_by_name || 'Système'} · {fmtDate(document.uploaded_at)}</p>
                    </div>
                  </a>
                )) : <p className="text-sm text-slate-500">Aucun document enregistré pour ce projet.</p>}
              </div>

              {canManage ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <Label>Type de document</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_DOCUMENT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Fichier</Label>
                      <Input className="mt-2" type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Les documents manquants restent visibles ici et dans le centre d’alertes DG.</p>
                    <button
                      type="button"
                      onClick={submitDocument}
                      disabled={documentSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4" />
                      {documentSaving ? 'Ajout...' : 'Ajouter le document'}
                    </button>
                  </div>
                  {documentError ? <p className="mt-3 text-sm text-rose-600">{documentError}</p> : null}
                </div>
              ) : null}
            </div>
          </ChartCard>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Missions du projet" empty={!projectMissions.length}><div className="space-y-3">{projectMissions.map((m) => <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{m.name}</p><p className="text-sm text-slate-500">{m.description || 'Mission sans description'}</p><div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500"><span>{m.manager_names?.length ? m.manager_names.join(', ') : m.manager_name || 'Sans responsable'}</span><span>• {fmtDate(m.start_date)}</span><span>• {m.duration_days || 0} j</span></div></div><div className="text-right text-xs text-slate-500"><p>{m.tasks_count} tâches</p><p>{m.tasks_completed_count} terminées</p><p>{Math.round(m.estimated_cost || 0)} MAD</p><Badge variant="outline" className="mt-2">{m.status_label || m.status}</Badge></div></div>{m.stop_reason ? <p className="mt-3 text-xs text-amber-700">Arrêt / suspension: {m.stop_reason}</p> : null}</div>)}</div></ChartCard>
            <ChartCard title="Tâches" empty={!details.tasks.all.length}><div className="space-y-4"><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-indigo-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-indigo-500">En cours</p><p className="mt-2 text-2xl font-semibold text-indigo-700">{details.tasks.inProgress.length}</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-emerald-500">Terminées</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{details.tasks.completed.length}</p></div></div><div className="space-y-2">{details.tasks.all.slice(0, 5).map((t) => <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"><div><p className="font-medium text-slate-900">{t.task_title}</p><p className="text-xs text-slate-500">{t.user_name} · {fmtDate(t.task_date)}</p><p className="text-[11px] text-slate-400">{t.mission_name || t.module_name || 'Mission non liée'}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t.status}</span></div>)}</div></div></ChartCard>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Livrables" empty={!details.deliverables.length}><div className="space-y-3">{details.deliverables.slice(0, 8).map((d) => <div key={d.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.module_name || 'Mission principale'}</p></div><Badge variant="outline">{d.status}</Badge></div><p className="mt-2 text-xs text-slate-500">Échéance: {fmtDate(d.due_date)}</p></div>)}</div></ChartCard>
            <ChartCard title="Timeline" empty={!details.timeline.length}><div className="space-y-3">{details.timeline.slice(0, 10).map((it, idx) => <div key={`${it.event_type}-${idx}`} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="mt-1 h-3 w-3 rounded-full bg-indigo-500" /><div className="flex-1"><div className="flex items-center justify-between gap-4"><p className="font-semibold text-slate-900">{it.title}</p><span className="text-xs text-slate-500">{fmtDate(it.event_date)}</span></div><p className="text-sm text-slate-600">{it.details || it.owner_name || 'Événement projet'}</p><p className="mt-1 text-xs text-slate-500">{it.event_type}</p></div></div>)}</div></ChartCard>
          </div>
        </div> : null}
      </div></DialogContent></Dialog>
    </div>
  );
}



