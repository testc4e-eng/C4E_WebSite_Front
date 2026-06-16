import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Briefcase, Clock3, Target, Users, Wallet, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import { analyticsApi, type ProjectFinancialEntry, type ProjectManagementRow } from '../../lib/api-analytics';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateForDisplay } from '../../lib/date';

type SortMode = 'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc';

const money = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

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

function totalCost(entry: ProjectFinancialEntry) {
  return (
    n(entry.resource_cost) +
    n(entry.consumed_hours_cost) +
    n(entry.operational_cost) +
    n(entry.miscellaneous_cost)
  );
}

export default function SuiviFinancierProjet() {
  const [projects, setProjects] = useState<ProjectManagementRow[]>([]);
  const [entries, setEntries] = useState<ProjectFinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<{
    projectId: string;
    missionId: string;
    managerId: string;
    dateFrom: string;
    dateTo: string;
    minCost: string;
    maxCost: string;
    sortBy: SortMode;
  }>({
    projectId: 'all',
    missionId: 'all',
    managerId: 'all',
    dateFrom: '',
    dateTo: '',
    minCost: '',
    maxCost: '',
    sortBy: 'date_desc',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [projectsResponse, entriesResponse] = await Promise.all([
          analyticsApi.getManagedProjects(),
          analyticsApi.getGlobalFinancialEntries(),
        ]);

        setProjects((projectsResponse.data || []) as ProjectManagementRow[]);
        setEntries((entriesResponse.data || []) as ProjectFinancialEntry[]);
      } catch (err: any) {
        setError(err?.message || 'Erreur de chargement du suivi financier DG.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const projectOptions = useMemo(
    () => [
      { value: 'all', label: 'Tous les projets' },
      ...projects.map((project) => ({ value: String(project.id), label: project.name })),
    ],
    [projects],
  );

  const missionOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      if (filters.projectId !== 'all' && entry.project_id !== Number(filters.projectId)) {
        return;
      }
      const key = entry.mission_id ? String(entry.mission_id) : 'none';
      const label = entry.mission_name || 'Sans mission';
      if (!map.has(key)) {
        map.set(key, label);
      }
    });

    return [
      { value: 'all', label: 'Toutes les missions' },
      ...(map.has('none') ? [{ value: 'none', label: 'Sans mission' }] : []),
      ...Array.from(map.entries())
        .filter(([key]) => key !== 'none')
        .map(([key, label]) => ({ value: key, label })),
    ];
  }, [entries, filters.projectId]);

  const managerOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      if (filters.projectId !== 'all' && entry.project_id !== Number(filters.projectId)) return;
      if (filters.missionId !== 'all') {
        if (filters.missionId === 'none') {
          if (entry.mission_id != null) return;
        } else if (String(entry.mission_id) !== filters.missionId) {
          return;
        }
      }
      if (entry.manager_id && entry.manager_name) {
        map.set(String(entry.manager_id), entry.manager_name);
      }
    });

    return [
      { value: 'all', label: 'Tous les managers' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [entries, filters.projectId, filters.missionId]);

  useEffect(() => {
    setFilters((current) => ({ ...current, missionId: 'all', managerId: 'all' }));
  }, [filters.projectId]);

  const filteredEntries = useMemo(() => {
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
    const min = filters.minCost ? Number(filters.minCost) : null;
    const max = filters.maxCost ? Number(filters.maxCost) : null;

    return entries
      .filter((entry) => {
        if (filters.projectId !== 'all' && entry.project_id !== Number(filters.projectId)) return false;
        if (filters.missionId !== 'all') {
          if (filters.missionId === 'none') {
            if (entry.mission_id != null) return false;
          } else if (String(entry.mission_id) !== filters.missionId) {
            return false;
          }
        }
        if (filters.managerId !== 'all' && String(entry.manager_id) !== filters.managerId) return false;

        const date = new Date(entry.created_at);
        if (from && date < from) return false;
        if (to && date > to) return false;

        const total = totalCost(entry);
        if (min !== null && total < min) return false;
        if (max !== null && total > max) return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        const costA = totalCost(a);
        const costB = totalCost(b);

        if (filters.sortBy === 'date_asc') return dateA - dateB;
        if (filters.sortBy === 'date_desc') return dateB - dateA;
        if (filters.sortBy === 'cost_asc') return costA - costB;
        return costB - costA;
      });
  }, [entries, filters]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === filters.projectId) || null,
    [projects, filters.projectId],
  );

  const projectBudgetTotal = useMemo(
    () =>
      filters.projectId === 'all'
        ? projects.reduce((acc, project) => acc + n(project.budget_amount), 0)
        : n(selectedProject?.budget_amount),
    [filters.projectId, projects, selectedProject],
  );

  const consumedTotal = useMemo(
    () => filteredEntries.reduce((acc, entry) => acc + totalCost(entry), 0),
    [filteredEntries],
  );

  const remainingTotal = Math.max(0, projectBudgetTotal - consumedTotal);
  const varianceTotal = consumedTotal - projectBudgetTotal;
  const consumptionPercent = projectBudgetTotal > 0 ? clamp((consumedTotal / projectBudgetTotal) * 100) : 0;

  const budgetVsConsumedData = useMemo(() => {
    const map = new Map<number, { name: string; fullName: string; budget: number; consumed: number }>();
    projects.forEach((project) => {
      map.set(project.id, {
        name: project.name.length > 20 ? `${project.name.slice(0, 20)}...` : project.name,
        fullName: project.name,
        budget: n(project.budget_amount),
        consumed: 0,
      });
    });
    entries.forEach((entry) => {
      const project = map.get(entry.project_id);
      if (project) {
        project.consumed += totalCost(entry);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        budget: Math.round(item.budget),
        consumed: Math.round(item.consumed),
      }));
  }, [entries, projects]);

  const missionConsumptionData = useMemo(() => {
    const map = new Map<string, { missionName: string; total: number }>();
    entries.forEach((entry) => {
      if (filters.projectId !== 'all' && entry.project_id !== Number(filters.projectId)) return;
      const key = entry.mission_id ? String(entry.mission_id) : 'none';
      const label = entry.mission_name || 'Sans mission';
      const existing = map.get(key);
      const nextTotal = (existing?.total || 0) + totalCost(entry);
      map.set(key, { missionName: label, total: nextTotal });
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((item) => ({ name: item.missionName, value: Math.round(item.total) }));
  }, [entries, filters.projectId]);

  const costDistributionData = useMemo(() => {
    const totalResource = filteredEntries.reduce((acc, entry) => acc + n(entry.resource_cost), 0);
    const totalTime = filteredEntries.reduce((acc, entry) => acc + n(entry.consumed_hours_cost), 0);
    const totalOperational = filteredEntries.reduce((acc, entry) => acc + n(entry.operational_cost), 0);
    const totalMisc = filteredEntries.reduce((acc, entry) => acc + n(entry.miscellaneous_cost), 0);

    return [
      { name: 'RH', value: Math.round(totalResource), color: '#4f46e5' },
      { name: 'Temps', value: Math.round(totalTime), color: '#0ea5e9' },
      { name: 'Opérationnel', value: Math.round(totalOperational), color: '#f59e0b' },
      { name: 'Divers', value: Math.round(totalMisc), color: '#22c55e' },
    ].filter((item) => item.value > 0);
  }, [filteredEntries]);

  const consumptionProgressData = useMemo(() => {
    const map = new Map<number, { name: string; fullName: string; consumptionPct: number }>();
    projects.forEach((project) => {
      map.set(project.id, {
        name: project.name.length > 20 ? `${project.name.slice(0, 20)}...` : project.name,
        fullName: project.name,
        consumptionPct: 0,
      });
    });

    const consumedByProject = new Map<number, number>();
    entries.forEach((entry) => {
      consumedByProject.set(
        entry.project_id,
        (consumedByProject.get(entry.project_id) || 0) + totalCost(entry),
      );
    });

    projectOptions
      .filter((option) => option.value !== 'all')
      .forEach((option) => {
        const projectId = Number(option.value);
        const project = projects.find((projectRow) => projectRow.id === projectId);
        const consumed = consumedByProject.get(projectId) || 0;
        const budget = n(project?.budget_amount);
        const consumptionPct = budget > 0 ? clamp((consumed / budget) * 100) : 0;
        const summary = map.get(projectId);
        if (summary) {
          summary.consumptionPct = consumptionPct;
        }
      });

    return Array.from(map.values())
      .sort((a, b) => b.consumptionPct - a.consumptionPct)
      .slice(0, 8);
  }, [projectOptions, projects, entries]);

  const visibleEntriesCount = filteredEntries.length;
  const totalEntriesCount = entries.length;
  const projectCount = projects.length;
  const overrunCount = projects.filter((project) => {
    const projectConsumed = entries
      .filter((entry) => entry.project_id === project.id)
      .reduce((acc, entry) => acc + totalCost(entry), 0);
    return projectConsumed > n(project.budget_amount);
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi financier DG"
        description="Vue financière stratégique : budgets projets, missions, managers et alertes de dépassement."
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPIBox icon={Briefcase} label="Budget total" value={fmt(projectBudgetTotal)} color="indigo" />
            <KPIBox icon={Wallet} label="Budget consommé" value={fmt(consumedTotal)} color="blue" />
            <KPIBox icon={Target} label="Budget restant" value={fmt(remainingTotal)} color="green" />
            <KPIBox
              icon={AlertTriangle}
              label="Projets en dépassement"
              value={overrunCount}
              color="red"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KPIBox icon={Users} label="Managers actifs" value={managerOptions.length - 1} color="purple" />
            <KPIBox icon={BarChart3} label="Entrées financières" value={visibleEntriesCount} color="yellow" />
            <KPIBox
              icon={TrendingUp}
              label="Consommation moyenne"
              value={`${consumptionPercent.toFixed(1)}%`}
              color={consumptionPercent >= 90 ? 'red' : consumptionPercent >= 80 ? 'yellow' : 'purple'}
            />
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Filtrer les données
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Sélectionnez les projets, missions et managers</h2>
              </div>
              <Badge variant="secondary">{projectCount} projet(s) | {totalEntriesCount} entrée(s)</Badge>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Projet</Label>
                  <Select
                    value={filters.projectId}
                    onValueChange={(value) => setFilters((current) => ({ ...current, projectId: value }))}
                  >
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
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Mission</Label>
                  <Select
                    value={filters.missionId}
                    onValueChange={(value) => setFilters((current) => ({ ...current, missionId: value }))}
                  >
                    <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choisir une mission" />
                    </SelectTrigger>
                    <SelectContent>
                      {missionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Manager</Label>
                  <Select
                    value={filters.managerId}
                    onValueChange={(value) => setFilters((current) => ({ ...current, managerId: value }))}
                  >
                    <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Choisir un manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Tri</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => setFilters((current) => ({ ...current, sortBy: value as SortMode }))}
                  >
                    <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Trier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Date décroissante</SelectItem>
                      <SelectItem value="date_asc">Date croissante</SelectItem>
                      <SelectItem value="cost_desc">Coût décroissant</SelectItem>
                      <SelectItem value="cost_asc">Coût croissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Date de début</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                    className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Date de fin</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                    className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Coût min</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={filters.minCost}
                    onChange={(event) => setFilters((current) => ({ ...current, minCost: event.target.value }))}
                    className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Coût max</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="99999"
                    value={filters.maxCost}
                    onChange={(event) => setFilters((current) => ({ ...current, maxCost: event.target.value }))}
                    className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Budget initial vs consommé" empty={budgetVsConsumedData.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={budgetVsConsumedData} margin={{ top: 10, right: 24, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(_, payload) => (payload?.[0]?.payload as any)?.fullName || ''}
                    formatter={(value: number, key: string) => [`${Math.round(value)} MAD`, key === 'budget' ? 'Budget initial' : 'Budget consommé']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="budget" name="Budget initial" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="consumed" name="Budget consommé" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Répartition des coûts" empty={costDistributionData.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={110}
                    cx="50%"
                    cy="50%"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {costDistributionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [fmt(value), 'Montant']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Consommation par mission" empty={missionConsumptionData.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={missionConsumptionData} margin={{ top: 10, right: 24, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${Math.round(value)} MAD`, 'Coût']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Bar dataKey="value" name="Coût total" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Projet : taux de consommation" empty={consumptionProgressData.length === 0}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={consumptionProgressData} layout="vertical" margin={{ top: 10, right: 20, left: 12, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Consommation']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="consumptionPct" radius={[8, 8, 8, 8]}>
                    {consumptionProgressData.map((row) => (
                      <Cell
                        key={row.fullName}
                        fill={row.consumptionPct >= 100 ? '#ef4444' : row.consumptionPct >= 85 ? '#f59e0b' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Tableau des entrées financières" empty={filteredEntries.length === 0} actions={<Badge variant="secondary">{filteredEntries.length} entrée(s) filtrée(s)</Badge>}>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[1300px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Projet</th>
                    <th className="px-4 py-3 text-left font-semibold">Mission</th>
                    <th className="px-4 py-3 text-left font-semibold">Manager</th>
                    <th className="px-4 py-3 text-right font-semibold">Coût RH</th>
                    <th className="px-4 py-3 text-right font-semibold">Coût Temps</th>
                    <th className="px-4 py-3 text-right font-semibold">Opérationnel</th>
                    <th className="px-4 py-3 text-right font-semibold">Divers</th>
                    <th className="px-4 py-3 text-right font-semibold">Coût total</th>
                    <th className="px-4 py-3 text-left font-semibold">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.length ? (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-slate-600">{formatDateForDisplay(entry.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{entry.project_name || '—'}</div>
                          <div className="text-xs text-slate-500">{entry.project_code || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{entry.mission_name || 'Sans mission'}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.manager_name || '—'}</td>
                        <td className="px-4 py-3 text-right">{fmt(entry.resource_cost)}</td>
                        <td className="px-4 py-3 text-right">{fmt(entry.consumed_hours_cost)}</td>
                        <td className="px-4 py-3 text-right">{fmt(entry.operational_cost)}</td>
                        <td className="px-4 py-3 text-right">{fmt(entry.miscellaneous_cost)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(totalCost(entry))}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.comment || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={10}>
                        Aucune entrée ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
