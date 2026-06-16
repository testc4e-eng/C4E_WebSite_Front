import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Flag,
  Gauge,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { analyticsApi, type AlertSettings, type ProjectAlert } from '../../lib/api-analytics';

const DEFAULT_SETTINGS: AlertSettings = {
  budget_threshold: [70, 85, 90],
  delay_threshold_days: [30, 15, 7],
  cost_threshold: { project: 0, daily: 0, weekly: 0 },
  notification_frequency: 'instant',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function severityClass(severity: string) {
  switch (severity) {
    case 'critical':
      return 'border-rose-100 bg-rose-50 text-rose-700';
    case 'risk':
      return 'border-amber-100 bg-amber-50 text-amber-700';
    case 'attention':
      return 'border-yellow-100 bg-yellow-50 text-yellow-700';
    case 'resolved':
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    default:
      return 'border-slate-100 bg-slate-50 text-slate-700';
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4" />;
    case 'risk':
      return <ShieldAlert className="h-4 w-4" />;
    case 'resolved':
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

export default function AlertesDG() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<ProjectAlert[]>([]);
  const [counts, setCounts] = useState({ critical: 0, risk: 0, unresolved: 0, total: 0 });
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setMessage('');
      const [alertsResult, settingsResult] = await Promise.allSettled([
        analyticsApi.getProjectAlerts(),
        analyticsApi.getProjectAlertSettings(),
      ]);

      if (alertsResult.status === 'fulfilled') {
        const alertsData = (alertsResult.value as any)?.data || alertsResult.value;
        setAlerts(alertsData?.alerts || []);
        setCounts(alertsData?.counts || { critical: 0, risk: 0, unresolved: 0, total: 0 });
      } else {
        const status = alertsResult.reason?.response?.status;
        if (status === 404) {
          setAlerts([]);
          setCounts({ critical: 0, risk: 0, unresolved: 0, total: 0 });
        } else {
          setMessage(alertsResult.reason?.message || 'Erreur de chargement des alertes.');
        }
      }

      if (settingsResult.status === 'fulfilled') {
        const settingsData = (settingsResult.value as any)?.data || settingsResult.value;
        setSettings(settingsData?.settings || DEFAULT_SETTINGS);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err: any) {
      setMessage(err?.message || 'Erreur de chargement des alertes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const types = useMemo(() => {
    return Array.from(new Set(alerts.map((alert) => alert.type))).filter(Boolean);
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      const matchesSearch =
        !q ||
        alert.title.toLowerCase().includes(q) ||
        alert.message.toLowerCase().includes(q) ||
        (alert.project_name || '').toLowerCase().includes(q) ||
        (alert.project_code || '').toLowerCase().includes(q);
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'validated' && ['treated', 'ignored', 'resolved'].includes(alert.status)) ||
        (statusFilter === 'not_validated' && alert.status === 'open') ||
        alert.status === statusFilter;
      const matchesType = typeFilter === 'all' || alert.type === typeFilter;
      return matchesSearch && matchesSeverity && matchesStatus && matchesType;
    });
  }, [alerts, search, severityFilter, statusFilter, typeFilter]);

  const handleValidate = async (alert: ProjectAlert, nextStatus: string) => {
    try {
      setSaving(true);
      await analyticsApi.validateProjectAlert(alert.id, { status: nextStatus, severity: nextStatus === 'critical' ? 'critical' : alert.severity });
      await load();
      window.dispatchEvent(new Event('projectAlerts:refresh'));
    } catch (err: any) {
      setMessage(err?.message || 'Impossible de mettre a jour l alerte.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await analyticsApi.saveProjectAlertSettings(settings);
      await load();
      setMessage('Parametres alertes enregistres.');
    } catch (err: any) {
      setMessage(err?.message || 'Impossible de sauvegarder les parametres.');
    } finally {
      setSaving(false);
    }
  };

  const changeArrayValue = (key: 'budget_threshold' | 'delay_threshold_days', value: string) => {
    const items = value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
    setSettings((current) => ({ ...current, [key]: items.length ? items : DEFAULT_SETTINGS[key] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d'alertes DG"
        description="Alertes automatiques sur les delais, les budgets, les risques et les projets critiques."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={load}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        }
      />

      {message && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPIBox icon={AlertTriangle} label="Alertes critiques" value={counts.critical} color="red" />
        <KPIBox icon={Flag} label="Alertes risques" value={counts.risk} color="yellow" />
        <KPIBox icon={Clock3} label="Non validées" value={counts.unresolved} color="indigo" />
        <KPIBox icon={Gauge} label="Total historique" value={counts.total} color="purple" />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-sm shadow-slate-200/50 backdrop-blur-xl lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recherche</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Projet, titre, message..." className="h-10 rounded-lg border-slate-200 bg-white pl-10 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sévérité</label>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Toutes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="critical">Critiques</SelectItem>
              <SelectItem value="risk">Risques</SelectItem>
              <SelectItem value="attention">Attention</SelectItem>
              <SelectItem value="resolved">Résolues</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Statut</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Ouvertes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Non validées</SelectItem>
              <SelectItem value="validated">Validées</SelectItem>
              <SelectItem value="treated">Traitées</SelectItem>
              <SelectItem value="ignored">Ignorées</SelectItem>
              <SelectItem value="resolved">Résolues</SelectItem>
              <SelectItem value="all">Toutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {types.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <ChartCard title="Historique des alertes" empty={loading || filteredAlerts.length === 0} actions={<Badge variant="secondary">{filteredAlerts.length} alertes</Badge>}>
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border p-4 shadow-sm ${severityClass(alert.severity)}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                      {severityIcon(alert.severity)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {alert.type}
                        </span>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {alert.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{alert.message}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {alert.project_name || 'Projet'} {alert.project_code ? `• ${alert.project_code}` : ''} • {formatDate(alert.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="rounded-xl border-slate-200 bg-white" onClick={() => handleValidate(alert, 'treated')} disabled={saving}>
                      Traité
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="rounded-xl border-slate-200 bg-white" onClick={() => handleValidate(alert, 'ignored')} disabled={saving}>
                      Ignorer
                    </Button>
                    <Button type="button" size="sm" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleValidate(alert, 'resolved')} disabled={saving}>
                      Résoudre
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Paramètres Alertes DG" actions={<Settings2 className="h-4 w-4 text-slate-400" />}>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Seuil délai (jours, séparés par virgule)</label>
              <Input
                value={settings.delay_threshold_days.join(', ')}
                onChange={(e) => changeArrayValue('delay_threshold_days', e.target.value)}
                className="h-10 rounded-lg border-slate-200 bg-white"
                placeholder="30, 15, 7"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Seuil budget (%)</label>
              <Input
                value={settings.budget_threshold.join(', ')}
                onChange={(e) => changeArrayValue('budget_threshold', e.target.value)}
                className="h-10 rounded-lg border-slate-200 bg-white"
                placeholder="70, 85, 90"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Coût projet</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.cost_threshold.project}
                  onChange={(e) => setSettings((current) => ({ ...current, cost_threshold: { ...current.cost_threshold, project: Number(e.target.value) } }))}
                  className="h-10 rounded-lg border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Coût jour</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.cost_threshold.daily}
                  onChange={(e) => setSettings((current) => ({ ...current, cost_threshold: { ...current.cost_threshold, daily: Number(e.target.value) } }))}
                  className="h-10 rounded-lg border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Coût semaine</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.cost_threshold.weekly}
                  onChange={(e) => setSettings((current) => ({ ...current, cost_threshold: { ...current.cost_threshold, weekly: Number(e.target.value) } }))}
                  className="h-10 rounded-lg border-slate-200 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Fréquence</label>
              <Select value={settings.notification_frequency} onValueChange={(value) => setSettings((current) => ({ ...current, notification_frequency: value }))}>
                <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instantané</SelectItem>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleSaveSettings} disabled={saving}>
              Enregistrer les parametres
            </Button>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
