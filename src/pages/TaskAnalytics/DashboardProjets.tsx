import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { analyticsApi } from '../../lib/api-analytics';
import type { ProjectBudget, WeeklyProjectCost, BlockingTask, Project, TaskAlert } from '../../lib/api-analytics';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import AlertList from '../../components/TaskAnalytics/AlertList';
import ProjectSelector from '../../components/TaskAnalytics/ProjectSelector';

import PageHeader from '../../components/layout/PageHeader';

const DashboardProjets: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<ProjectBudget[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyProjectCost[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [alerts, setAlerts] = useState<Array<BlockingTask | TaskAlert>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [projRes, refRes, alertRes] = await Promise.all([
          analyticsApi.getProjectsDashboard(),
          analyticsApi.getProjects(),
          analyticsApi.getAlerts(),
        ]);
        setProjects(projRes.data);
        setProjectList(refRes.data);
        setAlerts(alertRes.data.task_alerts || alertRes.data.blocking_tasks || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) { setWeeklyData([]); return; }
    const loadDetail = async () => {
      try {
        setLoadingDetail(true);
        const res = await analyticsApi.getProjectDetail(selectedProjectId);
        setWeeklyData(res.data);
      } catch {
        setWeeklyData([]);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.project_id === selectedProjectId);
  const projectAlerts = selectedProjectId
    ? alerts.filter(a => a.project_name === selectedProject?.project_name)
    : alerts;

  const weeklyChartData = [...weeklyData]
    .sort((a, b) => a.year - b.year || a.week_number - b.week_number)
    .map(w => ({
      semaine: `S${w.week_number}`,
      heures: Number(w.total_hours),
    }));

  const budgetChartData = projects
    .map(p => ({
      name: p.project_name.length > 12 ? p.project_name.substring(0, 12) + '…' : p.project_name,
      consommé: Number(p.consumed_hours),
      budget: Number(p.budget_hours) || 0,
    }))
    .sort((a, b) => b.consommé - a.consommé);

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-gray-100">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Projets"
        description="Suivi de la consommation des budgets et alertes par projet."
        actions={
          <Link to="/dashboard/task-analytics/dg" className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors">
            Dashboard DG
          </Link>
        }
      />

      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <>
            {/* Filtre projet */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">Projet :</span>
                <ProjectSelector
                  projects={projectList}
                  selectedId={selectedProjectId}
                  onChange={setSelectedProjectId}
                />
              </div>
            </div>

            {/* KPIs projet sélectionné ou global */}
            {selectedProject ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KPIBox icon={Clock} label="Heures consommées" value={`${Number(selectedProject.consumed_hours).toFixed(1)}h`} color="indigo" />
                <KPIBox icon={FolderOpen} label="Budget heures" value={selectedProject.budget_hours ? `${Number(selectedProject.budget_hours).toFixed(0)}h` : '—'} color="blue" />
                <KPIBox icon={TrendingUp} label="% Consommation" value={`${Number(selectedProject.hours_consumption_percentage).toFixed(0)}%`} color={Number(selectedProject.hours_consumption_percentage) > 90 ? 'red' : 'green'} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <KPIBox icon={FolderOpen} label="Projets suivis" value={projects.length} color="blue" />
                <KPIBox icon={Clock} label="Heures totales" value={`${projects.reduce((s, p) => s + Number(p.consumed_hours), 0).toFixed(1)}h`} color="indigo" />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Détail hebdomadaire si projet sélectionné */}
              {selectedProjectId ? (
                <ChartCard title="Heures par semaine" loading={loadingDetail} empty={weeklyChartData.length === 0}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`${v}h`, 'Heures']} contentStyle={{ borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="heures" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : (
                <ChartCard title="Heures par projet" empty={budgetChartData.length === 0}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={budgetChartData} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="consommé" fill="#6366f1" radius={[4, 4, 0, 0]} name="Heures consommées" />
                      <Bar dataKey="budget" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="Budget heures" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Alertes projet */}
              <ChartCard
                title={selectedProjectId ? 'Alertes du projet' : 'Alertes globales'}
                actions={<span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">{projectAlerts.length}</span>}
              >
                <AlertList alerts={projectAlerts} maxItems={8} />
              </ChartCard>
            </div>

            {/* Tableau projets */}
            {!selectedProjectId && (
              <ChartCard title="Tous les projets" empty={projects.length === 0}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Projet</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Heures</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Budget h.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.map(p => {
                        const pct = Number(p.hours_consumption_percentage) || 0;
                        return (
                          <tr key={p.project_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedProjectId(p.project_id)}>
                            <td className="px-4 py-3 font-medium text-indigo-700">{p.project_name}</td>
                            <td className="px-4 py-3 text-right">{Number(p.consumed_hours).toFixed(1)}h</td>
                            <td className="px-4 py-3 text-right text-gray-500">{p.budget_hours ? `${Number(p.budget_hours).toFixed(0)}h` : '—'}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pct > 90 ? 'bg-red-100 text-red-700' : pct > 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardProjets;

