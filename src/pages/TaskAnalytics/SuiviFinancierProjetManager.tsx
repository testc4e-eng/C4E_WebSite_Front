import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  DollarSign,
  FilePlus2,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { formatDateForDisplay, formatDateForInput } from '../../lib/date';
import {
  analyticsApi,
  type ProjectFinancialEntry,
  type ProjectFinancialSummary,
  type ProjectManagementRow,
  type ProjectMissionDetail,
} from '../../lib/api-analytics';

type SortMode = 'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc';
type AlertTone = 'green' | 'orange' | 'red';

interface EnrichedFinancialEntry extends ProjectFinancialEntry {
  project_name: string;
  project_code: string | null;
  manager_label: string;
  mission_name?: string | null;
  total_cost: number;
  display_date: string;
  sort_date: string;
}

interface ProjectFinancialSnapshot {
  project: ProjectManagementRow;
  summary: ProjectFinancialSummary;
  entries: EnrichedFinancialEntry[];
  error?: string | null;
}

interface EntryFormState {
  projectId: string;
  missionId: string;
  date: string;
  resource_cost: string;
  operational_cost: string;
  miscellaneous_cost: string;
  consumed_hours_cost: string;
  comment: string;
}

interface TableFilters {
  dateFrom: string;
  dateTo: string;
  minCost: string;
  maxCost: string;
  sortBy: SortMode;
}

const money = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const alertToneClasses: Record<AlertTone, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  orange: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
};

const costFields = [
  { key: 'resource_cost', label: 'Coût RH' },
  { key: 'consumed_hours_cost', label: 'Coût Temps' },
  { key: 'operational_cost', label: 'Coût Opérationnel' },
  { key: 'miscellaneous_cost', label: 'Coût Divers' },
] as const;

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function fmt(value: number) {
  return `${money.format(n(value))} MAD`;
}

function monthKey(value?: string | null) {
  return value ? String(value).slice(0, 7) : '';
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fallbackSummary(project: ProjectManagementRow): ProjectFinancialSummary {
  const budget = n(project.budget_amount);
  const progress = clamp(n(project.progress ?? project.progress_percent ?? 0));
  const consumed = budget > 0 ? (budget * progress) / 100 : 0;

  return {
    project_id: project.id,
    project_name: project.name,
    budget_initial: budget,
    consumed_cost: consumed,
    remaining_budget: Math.max(0, budget - consumed),
    variance: consumed - budget,
    consumption_percent: budget > 0 ? clamp((consumed / budget) * 100) : progress,
    totals: {
      estimated_cost: consumed,
      resource_cost: 0,
      operational_cost: 0,
      miscellaneous_cost: 0,
      consumed_hours_cost: 0,
    },
  };
}

function enrichEntry(
  entry: ProjectFinancialEntry,
  project: ProjectManagementRow,
  dateOverride?: string
): EnrichedFinancialEntry {
  const total_cost =
    n(entry.resource_cost) +
    n(entry.consumed_hours_cost) +
    n(entry.operational_cost) +
    n(entry.miscellaneous_cost);

  const display_date = dateOverride || entry.created_at;

  return {
    ...entry,
    project_name: project.name,
    project_code: project.code,
    manager_label:
      entry.manager_name || project.project_manager_name || project.manager_name || 'Manager',
    mission_name: entry.mission_name || null,
    total_cost,
    display_date,
    sort_date: display_date,
  };
}

function mergeSummary(summary: ProjectFinancialSummary, entry: EnrichedFinancialEntry) {
  const totals = summary.totals || {
    estimated_cost: 0,
    resource_cost: 0,
    operational_cost: 0,
    miscellaneous_cost: 0,
    consumed_hours_cost: 0,
  };

  const nextTotals = {
    estimated_cost: n(totals.estimated_cost) + n(entry.estimated_cost),
    resource_cost: n(totals.resource_cost) + n(entry.resource_cost),
    operational_cost: n(totals.operational_cost) + n(entry.operational_cost),
    miscellaneous_cost: n(totals.miscellaneous_cost) + n(entry.miscellaneous_cost),
    consumed_hours_cost: n(totals.consumed_hours_cost) + n(entry.consumed_hours_cost),
  };

  const consumed =
    nextTotals.resource_cost +
    nextTotals.consumed_hours_cost +
    nextTotals.operational_cost +
    nextTotals.miscellaneous_cost;
  const budget = n(summary.budget_initial);

  return {
    ...summary,
    consumed_cost: consumed,
    remaining_budget: Math.max(0, budget - consumed),
    variance: consumed - budget,
    consumption_percent: budget > 0 ? clamp((consumed / budget) * 100) : 0,
    totals: nextTotals,
  };
}

function sumSnapshots(snapshots: ProjectFinancialSnapshot[]) {
  const summaries = snapshots.map((snapshot) => snapshot.summary || fallbackSummary(snapshot.project));
  const budget_initial = summaries.reduce((acc, item) => acc + n(item.budget_initial), 0);
  const consumed_cost = summaries.reduce((acc, item) => acc + n(item.consumed_cost), 0);
  const remaining_budget = Math.max(0, budget_initial - consumed_cost);
  const totals = summaries.reduce<ProjectFinancialSummary['totals']>(
    (acc, item) => ({
      estimated_cost: acc.estimated_cost + n(item.totals?.estimated_cost),
      resource_cost: acc.resource_cost + n(item.totals?.resource_cost),
      operational_cost: acc.operational_cost + n(item.totals?.operational_cost),
      miscellaneous_cost: acc.miscellaneous_cost + n(item.totals?.miscellaneous_cost),
      consumed_hours_cost: acc.consumed_hours_cost + n(item.totals?.consumed_hours_cost),
    }),
    {
      estimated_cost: 0,
      resource_cost: 0,
      operational_cost: 0,
      miscellaneous_cost: 0,
      consumed_hours_cost: 0,
    }
  );

  return {
    budget_initial,
    consumed_cost,
    remaining_budget,
    variance: consumed_cost - budget_initial,
    consumption_percent: budget_initial > 0 ? clamp((consumed_cost / budget_initial) * 100) : 0,
    totals,
  };
}

export default function SuiviFinancierProjetManager() {
  const [projects, setProjects] = useState<ProjectManagementRow[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, ProjectFinancialSnapshot>>({});
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<AlertTone | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [missions, setMissions] = useState<ProjectMissionDetail[]>([]);
  const [filters, setFilters] = useState<TableFilters>({
    dateFrom: '',
    dateTo: '',
    minCost: '',
    maxCost: '',
    sortBy: 'date_desc',
  });
  const [form, setForm] = useState<EntryFormState>({
    projectId: '',
    missionId: '',
    date: formatDateForInput(new Date().toISOString()),
    resource_cost: '',
    operational_cost: '',
    miscellaneous_cost: '',
    consumed_hours_cost: '',
    comment: '',
  });

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    const loadMissions = async () => {
      const currentProjectId = form.projectId
        ? Number(form.projectId)
        : selectedProjectId !== 'all'
        ? Number(selectedProjectId)
        : 0;

      if (!currentProjectId) {
        setMissions([]);
        return;
      }

      try {
        const response = await analyticsApi.getProjectMissions(currentProjectId);
        setMissions(response.data || []);
      } catch (error) {
        console.error('Erreur chargement missions projet :', error);
        setMissions([]);
      }
    };

    loadMissions();
  }, [selectedProjectId, form.projectId]);

  const scopeSnapshots = useMemo(() => {
    if (selectedProjectId === 'all') {
      return projects
        .map((project) => snapshots[project.id])
        .filter((value): value is ProjectFinancialSnapshot => Boolean(value));
    }

    const snapshot = selectedProject ? snapshots[selectedProject.id] : undefined;
    return snapshot ? [snapshot] : [];
  }, [projects, selectedProject, selectedProjectId, snapshots]);

  const scopeEntries = useMemo(
    () => scopeSnapshots.flatMap((snapshot) => snapshot.entries),
    [scopeSnapshots]
  );

  const summary = useMemo(() => {
    if (scopeSnapshots.length === 0) return null;
    if (selectedProjectId === 'all') return sumSnapshots(scopeSnapshots);
    return scopeSnapshots[0].summary;
  }, [scopeSnapshots, selectedProjectId]);

  const filteredEntries = useMemo(() => {
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
    const min = filters.minCost ? Number(filters.minCost) : null;
    const max = filters.maxCost ? Number(filters.maxCost) : null;

    const items = scopeEntries.filter((entry) => {
      const d = new Date(entry.sort_date || entry.display_date || entry.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (min !== null && entry.total_cost < min) return false;
      if (max !== null && entry.total_cost > max) return false;
      return true;
    });

    return items.sort((a, b) => {
      const dateA = new Date(a.sort_date || a.display_date || a.created_at).getTime();
      const dateB = new Date(b.sort_date || b.display_date || b.created_at).getTime();
      if (filters.sortBy === 'date_asc') return dateA - dateB;
      if (filters.sortBy === 'date_desc') return dateB - dateA;
      if (filters.sortBy === 'cost_asc') return a.total_cost - b.total_cost;
      return b.total_cost - a.total_cost;
    });
  }, [filters, scopeEntries]);

  const chartEntries = filteredEntries.length ? filteredEntries : scopeEntries;
  const latestUpdate = useMemo(() => {
    const dates = [
      ...scopeEntries.map((entry) => entry.display_date),
      ...scopeSnapshots.map((snapshot) => snapshot.project.updated_at || snapshot.project.created_at || ''),
    ].filter(Boolean);

    if (!dates.length) return null;
    return dates.reduce((latest, current) =>
      new Date(current).getTime() > new Date(latest).getTime() ? current : latest
    );
  }, [scopeEntries, scopeSnapshots]);

  const warningCount = scopeSnapshots.filter((snapshot) => snapshot.error).length;
  const totalEntriesCount = scopeEntries.length;
  const visibleEntriesCount = filteredEntries.length;
  const budgetVariance = summary?.variance ?? 0;
  const consumptionPercent = summary?.consumption_percent ?? 0;

  const alertState = useMemo(() => {
    if (!summary) return { label: 'Aucune donnée', tone: 'green' as AlertTone };
    if (budgetVariance > 0) return { label: 'Dépassement budget', tone: 'red' as AlertTone };
    if (consumptionPercent >= 90) return { label: 'Consommation > 90%', tone: 'red' as AlertTone };
    if (consumptionPercent >= 80) return { label: 'Consommation > 80%', tone: 'orange' as AlertTone };
    return { label: 'Budget maîtrisé', tone: 'green' as AlertTone };
  }, [budgetVariance, consumptionPercent, summary]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    chartEntries.forEach((entry) => {
      const key = monthKey(entry.display_date || entry.created_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + entry.total_cost);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({ month: monthLabel(key), total: Math.round(total) }));
  }, [chartEntries]);

  const breakdownData = useMemo(() => {
    const total = chartEntries.reduce(
      (acc, entry) => ({
        resource: acc.resource + n(entry.resource_cost),
        time: acc.time + n(entry.consumed_hours_cost),
        operational: acc.operational + n(entry.operational_cost),
        miscellaneous: acc.miscellaneous + n(entry.miscellaneous_cost),
      }),
      { resource: 0, time: 0, operational: 0, miscellaneous: 0 }
    );

    return [
      { name: 'RH', value: Math.round(total.resource), color: '#4f46e5' },
      { name: 'Temps', value: Math.round(total.time), color: '#0ea5e9' },
      { name: 'Opérationnel', value: Math.round(total.operational), color: '#f59e0b' },
      { name: 'Divers', value: Math.round(total.miscellaneous), color: '#22c55e' },
    ].filter((item) => item.value > 0);
  }, [chartEntries]);

  const budgetChartData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Consommé', value: Math.round(summary.consumed_cost), color: '#4f46e5' },
      { name: 'Restant', value: Math.round(summary.remaining_budget), color: '#22c55e' },
    ];
  }, [summary]);

  const thresholdBadges = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Seuil 80%', tone: 'green' as AlertTone, active: false },
        { label: 'Seuil 90%', tone: 'green' as AlertTone, active: false },
        { label: 'Budget dépassé', tone: 'green' as AlertTone, active: false },
      ];
    }
    return [
      {
        label: 'Seuil 80%',
        tone: consumptionPercent >= 90 ? 'red' : consumptionPercent >= 80 ? 'orange' : 'green',
        active: consumptionPercent >= 80,
      },
      {
        label: 'Seuil 90%',
        tone: consumptionPercent >= 90 ? 'red' : 'green',
        active: consumptionPercent >= 90,
      },
      {
        label: 'Budget dépassé',
        tone: budgetVariance > 0 ? 'red' : 'green',
        active: budgetVariance > 0,
      },
    ];
  }, [budgetVariance, consumptionPercent, summary]);

  async function loadData() {
    setLoading(true);
    setError('');
    setMessage('');
    setMessageTone(null);

    try {
      const res = await analyticsApi.getMyManagedProjects();
      const rows = (res.data || []) as ProjectManagementRow[];
      setProjects(rows);

      if (!rows.length) {
        setSnapshots({});
        setSelectedProjectId('');
        return;
      }

      setSelectedProjectId((current) => {
        if (current && (current === 'all' || rows.some((project) => String(project.id) === current))) {
          return current;
        }
        return rows.length > 1 ? 'all' : String(rows[0].id);
      });

      const nextSnapshots: Record<number, ProjectFinancialSnapshot> = {};
      await Promise.all(
        rows.map(async (project) => {
          try {
            const [summaryRes, entriesRes] = await Promise.allSettled([
              analyticsApi.getProjectFinancialSummary(project.id),
              analyticsApi.getProjectFinancialEntries(project.id),
            ]);

            const projectSummary =
              summaryRes.status === 'fulfilled' && summaryRes.value.data
                ? summaryRes.value.data
                : fallbackSummary(project);

            const rawEntries =
              entriesRes.status === 'fulfilled' && Array.isArray(entriesRes.value.data)
                ? (entriesRes.value.data as ProjectFinancialEntry[])
                : [];

            nextSnapshots[project.id] = {
              project,
              summary: projectSummary,
              entries: rawEntries.map((entry) => enrichEntry(entry, project)),
              error:
                summaryRes.status === 'rejected' || entriesRes.status === 'rejected'
                  ? 'Chargement partiel des données financières.'
                  : null,
            };
          } catch (e: any) {
            nextSnapshots[project.id] = {
              project,
              summary: fallbackSummary(project),
              entries: [],
              error: e?.message || 'Données financières indisponibles.',
            };
          }
        })
      );

      setSnapshots(nextSnapshots);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement du suivi financier.');
      setProjects([]);
      setSnapshots({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const projectOptions = useMemo(
    () => [
      { value: 'all', label: 'Vue globale' },
      ...projects.map((project) => ({ value: String(project.id), label: project.name })),
    ],
    [projects]
  );

  const warningMessage = useMemo(() => {
    if (warningCount === 0) return '';
    return 'Certaines données financières n’ont pas pu être chargées pour tous les projets.';
  }, [warningCount]);

  function entryTotal() {
    return (
      n(form.resource_cost) +
      n(form.operational_cost) +
      n(form.miscellaneous_cost) +
      n(form.consumed_hours_cost)
    );
  }

  function openDialog() {
    const defaultProjectId =
      selectedProjectId !== 'all' && projects.some((project) => String(project.id) === selectedProjectId)
        ? selectedProjectId
        : projects.length > 0
        ? String(projects[0].id)
        : '';

    setForm({
      projectId: defaultProjectId,
      missionId: '',
      date: formatDateForInput(new Date().toISOString()),
      resource_cost: '',
      operational_cost: '',
      miscellaneous_cost: '',
      consumed_hours_cost: '',
      comment: '',
    });
    setDialogOpen(true);
  }

  async function submitEntry() {
    if (!form.projectId) {
      setMessage('Veuillez choisir un projet.');
      setMessageTone('red');
      return;
    }

    setSaving(true);
    setMessage('');
    setMessageTone(null);

    try {
      const projectId = Number(form.projectId);
      const response = await analyticsApi.createProjectFinancialEntry(projectId, {
        estimated_cost: entryTotal(),
        resource_cost: n(form.resource_cost),
        operational_cost: n(form.operational_cost),
        miscellaneous_cost: n(form.miscellaneous_cost),
        consumed_hours_cost: n(form.consumed_hours_cost),
        mission_id: form.missionId ? Number(form.missionId) : undefined,
        comment: form.comment.trim() || undefined,
      });

      const project = projects.find((project) => project.id === projectId);
      const entry = project ? enrichEntry(response.data.entry, project) : null;

      if (project && entry) {
        setSnapshots((current) => {
          const previous = current[projectId];
          const nextSummary = mergeSummary(previous?.summary ?? fallbackSummary(project), entry);
          return {
            ...current,
            [projectId]: {
              project,
              summary: nextSummary,
              entries: [...(previous?.entries || []), entry],
              error: previous?.error ?? null,
            },
          };
        });
      }

      setMessage('Estimation enregistrée avec succès.');
      setMessageTone('green');
      setDialogOpen(false);
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Échec de l’enregistrement.');
      setMessageTone('red');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Suivi financier projet"
          description="Chargement du tableau de bord financier Manager..."
        />
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi financier projet"
        description="Consultez les budgets de vos projets, saisissez des estimations et suivez la consommation en temps réel."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={saving}>
              <RefreshCcw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button onClick={openDialog} disabled={projects.length === 0}>
              <FilePlus2 className="h-4 w-4" />
              Ajouter une estimation
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            messageTone === 'green'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : messageTone === 'red'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {message}
        </div>
      ) : null}

      {warningMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warningMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Sélection projet
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Mes projets</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Sélectionnez un projet pour afficher les budgets, les estimations saisies et les indicateurs financiers associés.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{projects.length} projet(s) géré(s)</Badge>
            <Badge variant="outline">
              {selectedProjectId === 'all'
                ? 'Vue globale'
                : selectedProject?.name || 'Projet sélectionné'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <Label className="text-sm font-medium text-slate-700">Projet</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="Choisir un projet" />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Les estimations sont créées sur le projet sélectionné. Le budget, l’historique et les graphiques s’actualisent automatiquement.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Statut financier
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge className={alertToneClasses[alertState.tone]} variant="outline">
                    {alertState.label}
                  </Badge>
                </div>
              </div>
              <div className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Consommation</span>
                <span>{consumptionPercent.toFixed(1)}%</span>
              </div>
              <Progress value={consumptionPercent} className="h-2 bg-slate-200" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Budget initial</p>
                <p className="mt-1 font-semibold text-slate-900">{fmt(summary?.budget_initial ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Dernière mise à jour</p>
                <p className="mt-1 font-semibold text-slate-900">{formatDateTime(latestUpdate)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPIBox
          icon={Wallet}
          label="Budget total projet"
          value={fmt(summary?.budget_initial ?? 0)}
          subtitle={
            selectedProjectId === 'all'
              ? 'Agrégé sur tous vos projets'
              : selectedProject?.name || 'Projet sélectionné'
          }
          color="indigo"
        />
        <KPIBox
          icon={DollarSign}
          label="Budget consommé"
          value={fmt(summary?.consumed_cost ?? 0)}
          subtitle={`Variance: ${fmt(Math.abs(budgetVariance))}`}
          color="blue"
        />
        <KPIBox
          icon={CircleDollarSign}
          label="Budget restant"
          value={fmt(summary?.remaining_budget ?? 0)}
          subtitle="Budget disponible pour les prochains arbitrages"
          color="green"
        />
        <KPIBox
          icon={TrendingUp}
          label="Taux de consommation"
          value={`${consumptionPercent.toFixed(1)}%`}
          subtitle="Budget consommé / budget total"
          color={consumptionPercent >= 90 ? 'red' : consumptionPercent >= 80 ? 'yellow' : 'purple'}
        />
        <KPIBox
          icon={FilePlus2}
          label="Nombre d’estimations saisies"
          value={visibleEntriesCount}
          subtitle={
            totalEntriesCount > visibleEntriesCount
              ? `${totalEntriesCount} au total avant filtres`
              : 'Toutes les estimations visibles'
          }
          color="purple"
        />
        <KPIBox
          icon={CalendarDays}
          label="Dernière mise à jour"
          value={latestUpdate ? formatDateTime(latestUpdate) : '—'}
          subtitle={
            selectedProjectId === 'all'
              ? 'Dernière activité sur l’ensemble des projets'
              : 'Dernière activité du projet sélectionné'
          }
          color="yellow"
        />
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Tableau des coûts consommés
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Estimations financières</h2>
          </div>
          <Badge variant="secondary">{visibleEntriesCount} estimation(s) filtrée(s)</Badge>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Date début</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((c) => ({ ...c, dateFrom: e.target.value }))}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Date fin</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((c) => ({ ...c, dateTo: e.target.value }))}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Coût minimum</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                value={filters.minCost}
                onChange={(e) => setFilters((c) => ({ ...c, minCost: e.target.value }))}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Coût maximum</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="99999"
                value={filters.maxCost}
                onChange={(e) => setFilters((c) => ({ ...c, maxCost: e.target.value }))}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters((c) => ({ ...c, sortBy: value as SortMode }))}
            >
              <SelectTrigger className="h-10 w-[240px] rounded-xl border-slate-200 bg-white text-sm">
                <SelectValue placeholder="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date décroissante</SelectItem>
                <SelectItem value="date_asc">Date croissante</SelectItem>
                <SelectItem value="cost_desc">Coût total décroissant</SelectItem>
                <SelectItem value="cost_asc">Coût total croissant</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Manager: {selectedProjectId === 'all' ? 'Tous' : selectedProject?.project_manager_name || selectedProject?.manager_name || '—'}
              </Badge>
              <Badge variant="outline">Filtres actifs: {visibleEntriesCount}</Badge>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[1280px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Projet</th>
                  <th className="px-4 py-3 text-left font-semibold">Mission</th>
                  <th className="px-4 py-3 text-left font-semibold">Manager</th>
                  {costFields.map((field) => (
                    <th key={field.key} className="px-4 py-3 text-right font-semibold">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Coût Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length ? (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateForDisplay(entry.display_date || entry.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{entry.project_name}</div>
                        <div className="text-xs text-slate-500">{entry.project_code || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.mission_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.manager_label}</td>
                      <td className="px-4 py-3 text-right">{fmt(entry.resource_cost)}</td>
                      <td className="px-4 py-3 text-right">{fmt(entry.consumed_hours_cost)}</td>
                      <td className="px-4 py-3 text-right">{fmt(entry.operational_cost)}</td>
                      <td className="px-4 py-3 text-right">{fmt(entry.miscellaneous_cost)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {fmt(entry.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.comment || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                      {warningCount
                        ? 'Les estimations détaillées ne sont pas disponibles pour cette vue dans l’environnement actuel.'
                        : 'Aucune estimation ne correspond à vos filtres.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Historique</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Estimations déjà saisies</h2>
          </div>
          <Badge variant="secondary">{filteredEntries.length} entrée(s)</Badge>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Auteur</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold">Commentaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length ? (
                  filteredEntries.map((entry) => (
                    <tr key={`history-${entry.id}`} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{entry.manager_label}</div>
                        <div className="text-xs text-slate-500">{entry.project_name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateForDisplay(entry.display_date || entry.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {fmt(entry.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.comment || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                      {warningCount
                        ? 'Aucun historique détaillé n’a pu être chargé pour cette vue.'
                        : 'Aucune estimation enregistrée pour le moment.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Évolution des coûts par mois" empty={!monthlyData.length} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="financialGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [fmt(value), 'Coût total']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                fill="url(#financialGradient)"
                strokeWidth={3}
                name="Coût total"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition des coûts" empty={!breakdownData.length}>
          <ResponsiveContainer width="100%" height={320}>
            <RechartsPieChart>
              <Pie
                data={breakdownData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={112}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {breakdownData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [fmt(value), 'Montant']} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Budget consommé vs restant" empty={!budgetChartData.length}>
          <ResponsiveContainer width="100%" height={320}>
            <RechartsPieChart>
              <Pie
                data={budgetChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={112}
                paddingAngle={1}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {budgetChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [fmt(value), 'Montant']} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Alertes financières
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Seuils de vigilance</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {thresholdBadges.map((badge) => (
              <Badge key={badge.label} className={alertToneClasses[badge.tone]} variant="outline">
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          {[
            {
              title: 'Seuil 80%',
              body: 'Le suivi financier bascule en vigilance dès que la consommation atteint 80% du budget.',
              state: thresholdBadges[0],
            },
            {
              title: 'Seuil 90%',
              body: 'À partir de 90%, le Manager doit arbitrer rapidement les prochaines dépenses.',
              state: thresholdBadges[1],
            },
            {
              title: 'Budget dépassé',
              body: 'Si la consommation dépasse le budget initial, l’alerte remonte au DG.',
              state: thresholdBadges[2],
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <Badge className={alertToneClasses[item.state.tone]} variant="outline">
                  {item.state.active ? 'Atteint' : 'OK'}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl border-slate-200 bg-white p-0">
          <div className="max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">Ajouter une estimation financière</DialogTitle>
              <DialogDescription>
                Saisissez les coûts du projet sélectionné. Le coût total est calculé automatiquement.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Projet</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, projectId: value, missionId: '' }))
                  }
                >
                  <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Choisir un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.code ? `${project.name} · ${project.code}` : project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mission</Label>
                <Select
                  value={form.missionId}
                  onValueChange={(value) => setForm((current) => ({ ...current, missionId: value }))}
                  disabled={missions.length === 0}
                >
                  <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder={missions.length ? 'Choisir une mission' : 'Aucune mission disponible'} />
                  </SelectTrigger>
                  <SelectContent>
                    {missions.length ? (
                      missions.map((mission) => (
                        <SelectItem key={mission.id} value={String(mission.id)}>
                          {mission.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_mission" disabled>
                        Aucune mission
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>

              {costFields.map((field) => (
                <div key={field.key}>
                  <Label>{field.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={form[field.key]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <Label>Commentaire</Label>
                <Textarea
                  rows={4}
                  value={form.comment}
                  onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                  className="mt-2 min-h-28 rounded-xl border-slate-200 bg-white"
                  placeholder="Ajoutez un commentaire facultatif..."
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Coût total calculé</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{fmt(
                  entryTotal()
                )}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Projet cible</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {projects.find((project) => String(project.id) === form.projectId)?.name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Date de saisie</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatDateForDisplay(form.date)}</p>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={submitEntry} disabled={saving || projects.length === 0}>
                {saving ? 'Enregistrement...' : 'Enregistrer l’estimation'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
