import { useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Users,
  User,
  Briefcase,
  ClipboardList,
  ClipboardCheck,
  Bell,
  Shield,
  SlidersHorizontal,
  Database,
  ListChecks,
} from 'lucide-react';
import Sidebar from '../dashboard/Sidebar';
import { analyticsApi, type NotificationsResponse } from '../../lib/api-analytics';

type PermissionRole = 'admin' | 'dg' | 'manager' | 'collaborator';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission: string | null;
  roles?: PermissionRole[];
  children?: NavItem[];
  badgeCount?: number;
}

const DG_NAV_ITEMS: NavItem[] = [
  {
    label: 'Vision globale projets',
    path: '/dashboard/task-analytics/dg',
    icon: <BarChart3 className="h-5 w-5" />,
    permission: 'analytics:read_global',
  },
  {
    label: 'Tableau de bord',
    path: '/dashboard/personnel',
    icon: <LayoutDashboard className="h-5 w-5" />,
    permission: null,
  },
  {
    label: 'Suivi des projets',
    path: '/dashboard/task-analytics/suivi-projets',
    icon: <ListChecks className="h-5 w-5" />,
    permission: null,
  },
  {
    label: 'Suivi financier projet',
    path: '/dashboard/task-analytics/suivi-financier',
    icon: <BarChart3 className="h-5 w-5" />,
    permission: 'analytics:read_global',
  },
  {
    label: 'RH & Offres',
    path: '/dashboard/rh-offres',
    icon: <Briefcase className="h-5 w-5" />,
    permission: 'rh:read_all',
  },
  {
    label: "Centre d'alertes",
    path: '/dashboard/task-analytics/alertes-dg',
    icon: <Bell className="h-5 w-5" />,
    permission: 'analytics:read_global',
  },
  {
    label: 'Gestion',
    path: '/dashboard/gestion',
    icon: <Shield className="h-5 w-5" />,
    permission: null,
    children: [
      {
        label: 'Gestion des projets',
        path: '/admin/projects',
        icon: <FolderKanban className="h-5 w-5" />,
        permission: 'projects:create',
      },
      {
        label: 'Gestion des missions',
        path: '/dashboard/task-analytics/gestion-missions',
        icon: <ClipboardCheck className="h-5 w-5" />,
        permission: 'analytics:read_global',
      },
      {
        label: 'Gestion des équipes',
        path: '/dashboard/equipes',
        icon: <Users className="h-5 w-5" />,
        permission: 'teams:read_own',
      },
      {
        label: 'Gestion des utilisateurs',
        path: '/admin/users',
        icon: <Users className="h-5 w-5" />,
        permission: 'users:create',
      },
    ],
  },
  {
    label: 'Mon Profil',
    path: '/profile',
    icon: <User className="h-5 w-5" />,
    permission: null,
  },
];

const MANAGER_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    path: '/dashboard/personnel',
    icon: <LayoutDashboard className="h-5 w-5" />,
    permission: null,
  },
  {
    label: 'Mes Tâches',
    path: '/timesheet',
    icon: <ClipboardList className="h-5 w-5" />,
    permission: null,
    roles: ['manager'],
    children: [
      {
        label: 'Mes Tâches',
        path: '/timesheet/moi',
        icon: <ClipboardList className="h-4 w-4" />,
        permission: 'time_entries:create',
        roles: ['manager'],
      },
      {
        label: "Tâches de l'équipe",
        path: '/timesheet/equipe',
        icon: <ClipboardList className="h-4 w-4" />,
        permission: 'tasks:read_team',
        roles: ['manager'],
      },
    ],
  },
  {
    label: 'Validation Temps',
    path: '/timesheet/validation',
    icon: <ClipboardCheck className="h-5 w-5" />,
    permission: 'time_entries:validate',
    roles: ['manager'],
  },
  {
    label: 'Gestion des Tâches',
    path: '/dashboard/task-analytics/taches',
    icon: <ListChecks className="h-5 w-5" />,
    permission: 'tasks:create',
    roles: ['manager'],
  },
  {
    label: 'Gestion des équipes',
    path: '/dashboard/equipes',
    icon: <Users className="h-5 w-5" />,
    permission: 'teams:read_own',
  },
  {
    label: 'Suivi financier projet',
    path: '/dashboard/task-analytics/suivi-financier-manager',
    icon: <BarChart3 className="h-5 w-5" />,
    permission: null,
    roles: ['manager'],
  },
  {
    label: 'RH & Offres',
    path: '/dashboard/rh-offres',
    icon: <Briefcase className="h-5 w-5" />,
    permission: 'rh:read_all',
  },
  {
    label: 'Mon Profil',
    path: '/profile',
    icon: <User className="h-5 w-5" />,
    permission: null,
  },
];

const COLLABORATOR_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    path: '/dashboard/personnel',
    icon: <LayoutDashboard className="h-5 w-5" />,
    permission: null,
  },
  {
    label: 'Mes Tâches affectées',
    path: '/timesheet/moi',
    icon: <ClipboardCheck className="h-5 w-5" />,
    permission: null,
    roles: ['collaborator'],
  },
  {
    label: 'Mon Profil',
    path: '/profile',
    icon: <User className="h-5 w-5" />,
    permission: null,
  },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord Admin',
    path: '/admin/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    permission: 'users:read_all',
  },
  {
    label: 'Gestion des utilisateurs',
    path: '/admin/users',
    icon: <Users className="h-5 w-5" />,
    permission: 'users:read_all',
  },
  {
    label: 'Rôles & Permissions',
    path: '/admin/roles',
    icon: <Shield className="h-5 w-5" />,
    permission: 'users:read_all',
  },
  {
    label: 'Gestion des équipes',
    path: '/dashboard/equipes',
    icon: <Users className="h-5 w-5" />,
    permission: 'teams:read_own',
  },
  {
    label: 'Gestion des projets',
    path: '/admin/projects',
    icon: <FolderKanban className="h-5 w-5" />,
    permission: 'projects:read_all',
  },
  {
    label: 'RH & Offres',
    path: '/admin/rh-offres',
    icon: <Briefcase className="h-5 w-5" />,
    permission: 'rh:read_all',
  },
  {
    label: 'Paramètres Plateforme',
    path: '/admin/settings',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    permission: 'users:read_all',
  },
  {
    label: 'Sécurité & Sauvegarde',
    path: '/admin/security',
    icon: <Database className="h-5 w-5" />,
    permission: 'users:read_all',
  },
  {
    label: 'Mon Profil',
    path: '/profile',
    icon: <User className="h-5 w-5" />,
    permission: null,
  },
];

interface RoleBasedNavProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function RoleBasedNav({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: RoleBasedNavProps) {
  const { can, role } = usePermissions();
  const permissionRole = role as PermissionRole;
  const location = useLocation();
  const [notificationCounts, setNotificationCounts] = useState<NotificationsResponse['counts']>({
    saisie_taches: 0,
    saisie_moi: 0,
    saisie_equipe: 0,
    validation_temps: 0,
    gestion_taches: 0,
  });
  const [dgAlertCount, setDgAlertCount] = useState(0);
  const [dgMissionCount, setDgMissionCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadNotifications = async () => {
      try {
        const res = await analyticsApi.getNotifications();
        const data = (res as any)?.data || res;
        if (alive && data?.counts) {
          setNotificationCounts(data.counts);
        }
        if (permissionRole === 'dg') {
          const [projectAlertsRes, weeklyValidationsRes, missionClosuresRes] = await Promise.allSettled([
            analyticsApi.getProjectAlerts(),
            analyticsApi.getDgWeeklyValidations(),
            analyticsApi.getDgMissionClosures(),
          ]);

          let pendingMissionCount = 0;

          if (projectAlertsRes.status === 'fulfilled') {
            const projectAlertsData = (projectAlertsRes.value as any)?.data || projectAlertsRes.value;
            if (alive) {
              setDgAlertCount(Number(projectAlertsData?.counts?.unresolved || 0));
            }
          }

          if (weeklyValidationsRes.status === 'fulfilled') {
            const weeklyData = (weeklyValidationsRes.value as any)?.data || weeklyValidationsRes.value;
            const submissions = Array.isArray(weeklyData?.submissions) ? weeklyData.submissions : [];
            pendingMissionCount += submissions.filter((submission: any) => {
              const status = String(submission?.status || '').toLowerCase();
              return status !== 'approved' && status !== 'rejected';
            }).length;
          }

          if (missionClosuresRes.status === 'fulfilled') {
            const missionData = (missionClosuresRes.value as any)?.data || missionClosuresRes.value;
            const requests = Array.isArray(missionData?.requests) ? missionData.requests : [];
            pendingMissionCount += requests.length;
          }

          if (alive) {
            setDgMissionCount(pendingMissionCount);
          }
        }
      } catch {
        // ignore polling errors
      }
    };

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 15000);
    const onRefresh = () => loadNotifications();
    window.addEventListener('notifications:refresh', onRefresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('notifications:refresh', onRefresh);
    };
  }, [location.pathname, permissionRole]);

  const roleItems =
    permissionRole === 'admin'
      ? ADMIN_NAV_ITEMS
      : permissionRole === 'manager'
        ? MANAGER_NAV_ITEMS
        : permissionRole === 'collaborator'
          ? COLLABORATOR_NAV_ITEMS
          : DG_NAV_ITEMS;

  const visibleItems = roleItems
    .map((item) => {
      const visibleChildren = (item.children || []).filter(
        (child) =>
          (!child.permission || can(child.permission)) &&
          (!child.roles || child.roles.includes(permissionRole))
      );
      return { ...item, children: visibleChildren };
    })
    .filter(
      (item) =>
        ((!item.permission || can(item.permission)) &&
          (!item.roles || item.roles.includes(permissionRole))) &&
        (!item.children || item.children.length > 0 || !item.path.startsWith('/timesheet'))
    );

  const itemsWithBadges = useMemo(() => {
    const decorateItem = (item: NavItem): NavItem => {
      const children = item.children?.map(decorateItem);
      const nextItem = children ? { ...item, children } : item;

      if (permissionRole === 'dg') {
        if (item.path === '/dashboard/task-analytics/alertes-dg') return { ...nextItem, badgeCount: dgAlertCount };
        if (item.path === '/dashboard/task-analytics/gestion-missions') return { ...nextItem, badgeCount: dgMissionCount };
        return nextItem;
      }

      if (permissionRole !== 'manager' && permissionRole !== 'collaborator') return nextItem;

      if (item.path === '/timesheet') return { ...nextItem, badgeCount: notificationCounts.saisie_taches || 0 };
      if (item.path === '/timesheet/moi') return { ...nextItem, badgeCount: notificationCounts.saisie_moi || 0 };
      if (item.path === '/timesheet/equipe') return { ...nextItem, badgeCount: notificationCounts.saisie_equipe || 0 };
      if (item.path === '/timesheet/validation') return { ...nextItem, badgeCount: notificationCounts.validation_temps || 0 };
      if (item.path === '/dashboard/task-analytics/taches') return { ...nextItem, badgeCount: notificationCounts.gestion_taches || 0 };

      return nextItem;
    };

    return visibleItems.map(decorateItem);
  }, [visibleItems, permissionRole, notificationCounts, dgAlertCount, dgMissionCount]);

  const safeItems = useMemo(() => {
    if (permissionRole !== 'collaborator') return itemsWithBadges;
    const hasTimesheet = itemsWithBadges.some((item) => item.path === '/timesheet/moi');
    if (hasTimesheet) return itemsWithBadges;

    const timesheetItem: NavItem = {
      label: 'Saisie des taches',
      path: '/timesheet/moi',
      icon: <ClipboardCheck className="h-5 w-5" />,
      permission: null,
      roles: ['collaborator'],
      badgeCount: notificationCounts.saisie_moi || 0,
    };

    const profileIndex = itemsWithBadges.findIndex((item) => item.path === '/profile');
    if (profileIndex < 0) return [...itemsWithBadges, timesheetItem];

    return [
      ...itemsWithBadges.slice(0, profileIndex),
      timesheetItem,
      ...itemsWithBadges.slice(profileIndex),
    ];
  }, [itemsWithBadges, permissionRole, notificationCounts.saisie_moi]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <Sidebar
        isOpen={isOpen}
        onClose={onClose}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        items={safeItems}
        isActivePath={(path) =>
          location.pathname === path || (path !== '/dashboard/personnel' && location.pathname.startsWith(path))
        }
      />
    </>
  );
}
