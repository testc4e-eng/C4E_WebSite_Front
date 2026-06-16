import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import { analyticsApi } from '../../lib/api-analytics';
import type {
  DgMissionClosureDetailsResponse,
  DgMissionClosureRow,
  DgWeeklyValidationDetailsResponse,
  DgWeeklyValidationRow,
} from '../../lib/api-analytics';
import { formatDateForDisplay } from '../../lib/date';

type DgValidationTab = 'weeks' | 'missions';

const DG_WEEK_STATUS_LABEL: Record<string, string> = {
  submitted: 'Soumise',
  manager_validated: 'Validee manager',
  approved: 'Validee DG',
  rejected: 'Refusee DG',
};

const DG_WEEK_STATUS_CLASS: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700',
  manager_validated: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const DG_MISSION_STATUS_LABEL: Record<string, string> = {
  terminee_manager: 'Soumise',
  validee_dg: 'Validee DG',
  en_cours: 'Refusee DG',
};

const DG_MISSION_STATUS_CLASS: Record<string, string> = {
  terminee_manager: 'bg-amber-100 text-amber-700',
  validee_dg: 'bg-emerald-100 text-emerald-700',
  en_cours: 'bg-rose-100 text-rose-700',
};

const fmtDate = (value?: string | null) => (value ? formatDateForDisplay(value) : '-');

const getIsoWeekPeriod = (year: number, week: number) => {
  const start = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = start.getUTCDay() || 7;
  if (day <= 4) start.setUTCDate(start.getUTCDate() - day + 1);
  else start.setUTCDate(start.getUTCDate() + 8 - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

const DashboardDG: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<DgValidationTab>('weeks');
  const [processing, setProcessing] = useState(false);
  const [weeklyValidations, setWeeklyValidations] = useState<DgWeeklyValidationRow[]>([]);
  const [missionClosures, setMissionClosures] = useState<DgMissionClosureRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [weeklyDetails, setWeeklyDetails] = useState<DgWeeklyValidationDetailsResponse | null>(null);
  const [missionDetails, setMissionDetails] = useState<DgMissionClosureDetailsResponse | null>(null);

  const loadWorkflow = async () => {
    const [weeks, missions] = await Promise.all([
      analyticsApi.getDgWeeklyValidations(),
      analyticsApi.getDgMissionClosures(),
    ]);
    setWeeklyValidations((weeks.data as any)?.submissions || []);
    setMissionClosures((missions.data as any)?.requests || []);
  };

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');
      await loadWorkflow();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const openWeekDetails = async (id: number) => {
    try {
      setDetailsLoading(true);
      setDetailsError('');
      setMissionDetails(null);
      const response = await analyticsApi.getDgWeeklyValidationDetails(id);
      setWeeklyDetails(response.data);
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Impossible de charger le detail semaine');
      setWeeklyDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openMissionDetails = async (id: number) => {
    try {
      setDetailsLoading(true);
      setDetailsError('');
      setWeeklyDetails(null);
      const response = await analyticsApi.getDgMissionClosureDetails(id);
      setMissionDetails(response.data);
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Impossible de charger le detail mission');
      setMissionDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setWeeklyDetails(null);
    setMissionDetails(null);
    setDetailsError('');
  };

  const approveWeek = async (id: number) => {
    try {
      setProcessing(true);
      await analyticsApi.approveDgWeeklyValidation(id);
      await loadWorkflow();
    } finally {
      setProcessing(false);
    }
  };

  const rejectWeek = async (id: number) => {
    try {
      setProcessing(true);
      await analyticsApi.rejectDgWeeklyValidation(id);
      await loadWorkflow();
    } finally {
      setProcessing(false);
    }
  };

  const approveMission = async (mission: DgMissionClosureRow) => {
    if (!mission.id || !mission.project_id) return;
    try {
      setProcessing(true);
      await analyticsApi.validateProjectMissionByDg(Number(mission.project_id), Number(mission.id));
      await loadWorkflow();
    } finally {
      setProcessing(false);
    }
  };

  const rejectMission = async (mission: DgMissionClosureRow) => {
    if (!mission.id || !mission.project_id) return;
    try {
      setProcessing(true);
      await analyticsApi.updateProjectMission(Number(mission.project_id), Number(mission.id), { status: 'en_cours' });
      await loadWorkflow();
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md rounded-xl border border-gray-100 bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">Erreur</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button onClick={loadPage} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validations recues DG"
        description="Controle des soumissions hebdomadaires et clotures de missions envoyees par les managers."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('weeks')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === 'weeks' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Soumissions des semaines
            </button>
            <button
              type="button"
              onClick={() => setTab('missions')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === 'missions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Soumissions des missions
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-600">Chargement...</div>
      ) : (
        <ChartCard title={tab === 'weeks' ? 'Soumissions des semaines' : 'Soumissions des missions'} empty={tab === 'weeks' ? weeklyValidations.length === 0 : missionClosures.length === 0}>
          {tab === 'weeks' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 text-left font-semibold">Semaine</th><th className="px-4 py-3 text-left font-semibold">Periode</th><th className="px-4 py-3 text-left font-semibold">Equipe</th><th className="px-4 py-3 text-left font-semibold">Manager</th><th className="px-4 py-3 text-left font-semibold">Projet</th><th className="px-4 py-3 text-left font-semibold">Total heures</th><th className="px-4 py-3 text-left font-semibold">Nombre taches</th><th className="px-4 py-3 text-left font-semibold">Statut</th><th className="px-4 py-3 text-left font-semibold">Date soumission</th><th className="px-4 py-3 text-left font-semibold">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyValidations.map((row) => { const k = String(row.status || '').toLowerCase(); return <tr key={row.id}><td className="px-4 py-3">{row.year}-W{String(row.week_number).padStart(2, '0')}</td><td className="px-4 py-3">{getIsoWeekPeriod(Number(row.year), Number(row.week_number))}</td><td className="px-4 py-3">{row.team_name || '-'}</td><td className="px-4 py-3">{row.manager_name || '-'}</td><td className="px-4 py-3">{row.projects || '-'}</td><td className="px-4 py-3">{Number(row.total_hours || 0).toFixed(2)} h</td><td className="px-4 py-3">{Number(row.tasks_count || 0)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${DG_WEEK_STATUS_CLASS[k] || 'bg-slate-100 text-slate-700'}`}>{DG_WEEK_STATUS_LABEL[k] || row.status}</span></td><td className="px-4 py-3">{fmtDate(row.submitted_to_dg_at || row.submitted_at)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openWeekDetails(Number(row.id))} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Voir detail</button><button type="button" disabled={processing || k === 'approved'} onClick={() => approveWeek(Number(row.id))} className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">Valider</button><button type="button" disabled={processing || k === 'rejected'} onClick={() => rejectWeek(Number(row.id))} className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50">Refuser</button></div></td></tr>; })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 text-left font-semibold">Projet</th><th className="px-4 py-3 text-left font-semibold">Mission</th><th className="px-4 py-3 text-left font-semibold">Manager</th><th className="px-4 py-3 text-left font-semibold">Date debut</th><th className="px-4 py-3 text-left font-semibold">Date fin prevue</th><th className="px-4 py-3 text-left font-semibold">Duree</th><th className="px-4 py-3 text-left font-semibold">Avancement</th><th className="px-4 py-3 text-left font-semibold">Total taches</th><th className="px-4 py-3 text-left font-semibold">Total semaines</th><th className="px-4 py-3 text-left font-semibold">Statut</th><th className="px-4 py-3 text-left font-semibold">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {missionClosures.map((row) => { const k = String(row.status || '').toLowerCase(); const ext = row as DgMissionClosureRow & { start_date?: string | null; end_date?: string | null; duration_days?: number | null; total_tasks?: number | null; total_weeks?: number | null; }; return <tr key={row.id}><td className="px-4 py-3">{row.project_name || '-'}</td><td className="px-4 py-3">{row.mission_name || '-'}</td><td className="px-4 py-3">{row.manager_name || '-'}</td><td className="px-4 py-3">{fmtDate(ext.start_date)}</td><td className="px-4 py-3">{fmtDate(ext.end_date)}</td><td className="px-4 py-3">{ext.duration_days ? `${ext.duration_days} j` : '-'}</td><td className="px-4 py-3">{Number(row.progress_percent || 0).toFixed(1)}%</td><td className="px-4 py-3">{Number(ext.total_tasks || 0)}</td><td className="px-4 py-3">{Number(ext.total_weeks || 0)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${DG_MISSION_STATUS_CLASS[k] || 'bg-slate-100 text-slate-700'}`}>{DG_MISSION_STATUS_LABEL[k] || row.status}</span></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openMissionDetails(Number(row.id))} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Voir detail</button><button type="button" disabled={processing} onClick={() => approveMission(row)} className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">Valider cloture</button><button type="button" disabled={processing} onClick={() => rejectMission(row)} className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50">Refuser</button></div></td></tr>; })}
                </tbody>
              </table>
            </div>
          )}

          {(detailsLoading || detailsError || weeklyDetails || missionDetails) && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold text-slate-800">{weeklyDetails ? 'Detail soumission semaine' : 'Detail soumission mission'}</h4><button type="button" onClick={closeDetails} className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Fermer</button></div>{detailsLoading ? <p className="text-sm text-slate-600">Chargement du detail...</p> : detailsError ? <p className="text-sm text-rose-600">{detailsError}</p> : weeklyDetails ? <div className="space-y-3"><div className="text-xs text-slate-600">Semaine {weeklyDetails.submission?.year}-W{String(weeklyDetails.submission?.week_number || '').padStart(2, '0')}</div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-xs"><thead className="bg-white text-slate-600"><tr><th className="px-3 py-2 text-left font-semibold">Date</th><th className="px-3 py-2 text-left font-semibold">Collaborateur</th><th className="px-3 py-2 text-left font-semibold">Projet</th><th className="px-3 py-2 text-left font-semibold">Mission</th><th className="px-3 py-2 text-left font-semibold">Sous-mission</th><th className="px-3 py-2 text-left font-semibold">Tache</th><th className="px-3 py-2 text-left font-semibold">Duree</th><th className="px-3 py-2 text-left font-semibold">Observation</th><th className="px-3 py-2 text-left font-semibold">Statut</th></tr></thead><tbody className="divide-y divide-slate-100">{(weeklyDetails.tasks || []).map((task) => <tr key={task.id}><td className="px-3 py-2">{fmtDate(task.task_date)}</td><td className="px-3 py-2">{task.collaborateur_name || '-'}</td><td className="px-3 py-2">{task.project_name || '-'}</td><td className="px-3 py-2">{task.mission_name || '-'}</td><td className="px-3 py-2">{task.sub_mission_name || '-'}</td><td className="px-3 py-2">{task.task_title || '-'}</td><td className="px-3 py-2">{Number(task.duration_hours || 0).toFixed(2)} h</td><td className="px-3 py-2">{task.task_description || '-'}</td><td className="px-3 py-2">{task.status || '-'}</td></tr>)}</tbody></table></div></div> : missionDetails ? <div className="space-y-3"><div className="text-xs text-slate-600">Projet {missionDetails.mission?.project_name || '-'} | Mission {missionDetails.mission?.mission_name || '-'}</div><div className="grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-5"><div className="rounded-md bg-white p-2">Total taches: <span className="font-semibold">{missionDetails.totals.totalTasks}</span></div><div className="rounded-md bg-white p-2">Terminees: <span className="font-semibold">{missionDetails.totals.completedTasks}</span></div><div className="rounded-md bg-white p-2">Total semaines: <span className="font-semibold">{missionDetails.totals.totalWeeks}</span></div><div className="rounded-md bg-white p-2">Total heures: <span className="font-semibold">{missionDetails.totals.totalHours.toFixed(2)} h</span></div><div className="rounded-md bg-white p-2">Avancement final: <span className="font-semibold">{missionDetails.totals.progressFinal.toFixed(1)}%</span></div></div></div> : null}</div>}
        </ChartCard>
      )}
    </div>
  );
};

export default DashboardDG;
