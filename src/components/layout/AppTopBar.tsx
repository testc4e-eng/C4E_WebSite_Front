import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../lib/roles';
import { Menu, LogOut, User, ChevronDown, PanelLeftClose, PanelLeftOpen, Bell, AlertTriangle, ExternalLink, Settings2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { analyticsApi, type ProjectAlert } from '../../lib/api-analytics';

interface AppTopBarProps {
  onToggleSidebar: () => void;
  onToggleCollapsed?: () => void;
  sidebarCollapsed?: boolean;
  focusMode?: boolean;
}

export default function AppTopBar({
  onToggleSidebar,
  onToggleCollapsed,
  sidebarCollapsed = false,
  focusMode = false,
}: AppTopBarProps) {
  const { user, appRole, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ProjectAlert[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setAlertsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let alive = true;
    const loadAlerts = async () => {
      if (appRole !== 'dg' && appRole !== 'admin') {
        return;
      }

      try {
        const [criticalRes, alertsRes] = await Promise.all([
          analyticsApi.getCriticalProjectAlerts(),
          analyticsApi.getProjectAlerts({ validated: false }),
        ]);
        const criticalData = (criticalRes as any)?.data || criticalRes;
        const alertsData = (alertsRes as any)?.data || alertsRes;
        if (!alive) return;
        setAlerts((alertsData?.alerts || []).slice(0, 5));
        setAlertsCount(Number(alertsData?.counts?.unresolved ?? criticalData?.count ?? 0));
      } catch {
        if (!alive) return;
        setAlerts([]);
        setAlertsCount(0);
      }
    };

    loadAlerts();
    const timer = window.setInterval(loadAlerts, 45000);
    const refresh = () => loadAlerts();
    window.addEventListener('projectAlerts:refresh', refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('projectAlerts:refresh', refresh);
    };
  }, [appRole]);

  const initials = (user?.nom || user?.email || '?')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-xl">
      <div className="flex h-20 w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-2xl border border-slate-200 bg-white/80 p-2.5 text-slate-500 shadow-sm transition-all hover:scale-[1.02] hover:bg-slate-50 hover:text-slate-700 lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {!focusMode && onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="hidden rounded-2xl border border-slate-200 bg-white/80 p-2.5 text-slate-500 shadow-sm transition-all hover:scale-[1.02] hover:bg-indigo-50 hover:text-indigo-600 lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Etendre la navigation' : 'Reduire la navigation'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          )}

          <Link to="/dashboard/personnel" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="C4E Africa"
              className="h-10 w-10 rounded-2xl border border-white/80 shadow-md shadow-slate-200/70"
            />
            <div className="hidden sm:block">
              <span className="block text-lg font-semibold tracking-tight text-slate-900">C4E Africa</span>
              <span className="block text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                Workspace
              </span>
            </div>
          </Link>
        </div>

        <div className="relative flex items-center gap-3" ref={actionsRef}>
          {(appRole === 'dg' || appRole === 'admin') && (
            <div className="relative">
              <button
                onClick={() => {
                  setAlertsOpen((value) => !value);
                  setDropdownOpen(false);
                }}
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-500 shadow-sm shadow-slate-200/50 transition-all hover:scale-[1.01] hover:bg-white hover:text-slate-700"
                aria-label="Alertes projet"
              >
                <Bell className="h-5 w-5" />
                {alertsCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-md">
                    {alertsCount > 99 ? '99+' : alertsCount}
                  </span>
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 z-50 mt-3 w-[24rem] overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-2xl shadow-slate-200/80 backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Alertes DG</p>
                      <p className="text-xs text-slate-500">{alertsCount} alerte(s) active(s)</p>
                    </div>
                    <Link
                      to="/dashboard/task-analytics/alertes-dg"
                      onClick={() => setAlertsOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Ouvrir
                    </Link>
                  </div>

                  <div className="max-h-[22rem] space-y-3 overflow-y-auto px-4 py-4">
                    {alerts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-emerald-400" />
                        <p className="mt-2 text-sm font-medium text-slate-700">Aucune alerte active</p>
                        <p className="mt-1 text-xs text-slate-500">Les alertes critiques et financières apparaissent ici.</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={cn(
                            'rounded-2xl border px-4 py-3 transition',
                            alert.severity === 'critical'
                              ? 'border-rose-100 bg-rose-50/80'
                              : alert.severity === 'risk'
                                ? 'border-amber-100 bg-amber-50/80'
                                : 'border-sky-100 bg-sky-50/80'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                              alert.severity === 'critical'
                                ? 'bg-rose-100 text-rose-600'
                                : alert.severity === 'risk'
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-sky-100 text-sky-600'
                            )}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900">{alert.title}</p>
                                <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  {alert.severity}
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{alert.message}</p>
                              <p className="mt-2 text-[11px] text-slate-400">
                                {alert.project_name || 'Projet'} {alert.project_code ? `• ${alert.project_code}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <Link
                      to="/dashboard/task-analytics/alertes-dg/settings"
                      onClick={() => setAlertsOpen(false)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      <Settings2 className="h-4 w-4" />
                      Parametres
                    </Link>
                    <Link
                      to="/dashboard/task-analytics/alertes-dg"
                      onClick={() => setAlertsOpen(false)}
                      className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Centre complet
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 shadow-sm shadow-slate-200/50 transition-all',
              'hover:scale-[1.01] hover:bg-white'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-md shadow-indigo-200/70">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-slate-800">
                {user?.nom || user?.email || 'Utilisateur'}
              </p>
              <p className="text-xs leading-tight text-slate-400">{ROLE_LABELS[appRole]}</p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-white/80 bg-white/90 py-2 shadow-xl shadow-slate-200/70 backdrop-blur-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{user?.nom || user?.email}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <p className="mt-1 text-xs text-indigo-600">{ROLE_LABELS[appRole]}</p>
              </div>

              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <User className="h-4 w-4 text-slate-400" />
                Mon Profil
              </Link>

              <div className="mt-1 border-t border-slate-100">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Deconnexion
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
