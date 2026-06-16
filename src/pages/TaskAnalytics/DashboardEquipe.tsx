import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Clock, AlertTriangle, FolderOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyticsApi } from '../../lib/api-analytics';
import type { TeamMember } from '../../lib/api-analytics';
import KPIBox from '../../components/TaskAnalytics/KPIBox';
import ChartCard from '../../components/TaskAnalytics/ChartCard';
import AnalyticsTable from '../../components/TaskAnalytics/AnalyticsTable';

import PageHeader from '../../components/layout/PageHeader';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const DashboardEquipe: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await analyticsApi.getTeamDashboard();
        setTeam(res.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalHours = team.reduce((s, m) => s + Number(m.total_hours_logged || 0), 0);
  const totalBlocking = team.reduce((s, m) => s + Number(m.blocking_tasks_count || 0), 0);

  const chartData = team
    .map(m => ({
      name: m.user_name.length > 12 ? m.user_name.substring(0, 12) + '…' : m.user_name,
      heures: Number(m.total_hours_logged) || 0,
    }))
    .sort((a, b) => b.heures - a.heures);

  const columns = [
    { key: 'user_name', header: 'Collaborateur', sortable: true },
    {
      key: 'total_hours_logged',
      header: 'Heures totales',
      sortable: true,
      render: (item: TeamMember) => {
        const h = Number(item.total_hours_logged) || 0;
        return (
          <span className={h > 200 ? 'text-red-600 font-semibold' : ''}>
            {h.toFixed(1)}h
          </span>
        );
      },
    },
    {
      key: 'active_projects_count',
      header: 'Projets actifs',
      sortable: true,
      render: (item: TeamMember) => (
        <span className="inline-flex items-center space-x-1">
          <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
          <span>{item.active_projects_count}</span>
        </span>
      ),
    },
    {
      key: 'blocking_tasks_count',
      header: 'Tâches bloquantes',
      sortable: true,
      render: (item: TeamMember) => {
        const n = Number(item.blocking_tasks_count) || 0;
        return n > 0 ? (
          <span className="inline-flex items-center space-x-1 text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-semibold">{n}</span>
          </span>
        ) : (
          <span className="text-green-600 text-xs">Aucune</span>
        );
      },
    },
  ];

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
        title="Dashboard Équipe"
        description="Charge de travail et productivité des collaborateurs."
        actions={
          <Link to="/dashboard/task-analytics/dg" className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors">
            Dashboard DG
          </Link>
        }
      />

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <KPIBox icon={Users} label="Collaborateurs" value={team.length} color="green" />
              <KPIBox icon={Clock} label="Heures totales" value={`${totalHours.toFixed(1)}h`} color="indigo" />
              <KPIBox icon={AlertTriangle} label="Tâches bloquantes" value={totalBlocking} color="red" />
            </div>

            {/* Chart + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="Heures par collaborateur" empty={chartData.length === 0}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: number) => [`${v}h`, 'Heures']} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="heures" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Détails équipe">
                <AnalyticsTable
                  data={team as unknown as Record<string, unknown>[]}
                  columns={columns as { key: string; header: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode; className?: string }[]}
                  searchable={true}
                  searchKeys={['user_name']}
                  pageSize={10}
                  emptyMessage="Aucun collaborateur trouvé"
                />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardEquipe;
