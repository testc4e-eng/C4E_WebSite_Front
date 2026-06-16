import { useEffect, useSyncExternalStore } from 'react';
import { delJson, httpGet, postJson, putJson } from './api';
import type { AppRole } from './roles';

export type PermissionRoleKey = 'admin' | 'dg' | 'manager' | 'collaborator';

export interface PermissionCatalogItem {
  permission: string;
  label: string;
  module: string;
  description: string;
}

export interface RolePermissionRow {
  id: number;
  role: PermissionRoleKey;
  permission: string;
  module: string;
  description: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RolePermissionGroup {
  role: PermissionRoleKey;
  label: string;
  permissions: RolePermissionRow[];
  counts: {
    total: number;
    active: number;
    inactive: number;
    modules: number;
  };
}

interface RolePermissionsSnapshot {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  roles: RolePermissionGroup[];
  permissionsByRole: Record<PermissionRoleKey, Set<string>>;
  catalog: PermissionCatalogItem[];
  roleLabels: Record<PermissionRoleKey, string>;
}

export const ROLE_LABELS: Record<PermissionRoleKey, string> = {
  admin: 'Administrateur',
  dg: 'DG',
  manager: 'Manager',
  collaborator: 'Collaborateur',
};

export const CRITICAL_ADMIN_PERMISSIONS = new Set(['users:read_all', 'security:manage_permissions']);

export const PERMISSION_CATALOG: PermissionCatalogItem[] = [
  { permission: 'teams:read_own', label: 'Voir mon équipe', module: 'Équipes', description: 'Voir les informations de sa propre équipe.' },
  { permission: 'teams:create', label: 'Créer une équipe', module: 'Équipes', description: 'Créer une nouvelle équipe.' },
  { permission: 'teams:edit', label: 'Modifier une équipe', module: 'Équipes', description: 'Modifier les informations d’une équipe.' },
  { permission: 'teams:delete', label: 'Supprimer une équipe', module: 'Équipes', description: 'Supprimer une équipe existante.' },
  { permission: 'teams:read_all', label: 'Voir toutes les équipes', module: 'Équipes', description: 'Consulter toutes les équipes du workspace.' },
  { permission: 'teams:assign_member', label: 'Affecter un membre', module: 'Équipes', description: 'Affecter un collaborateur à une équipe.' },
  { permission: 'teams:reassign_member', label: 'Réaffecter un membre', module: 'Équipes', description: 'Réaffecter un collaborateur vers une autre équipe.' },

  { permission: 'users:create', label: 'Créer un utilisateur', module: 'Utilisateurs', description: 'Créer de nouveaux comptes utilisateurs.' },
  { permission: 'users:edit', label: 'Modifier un utilisateur', module: 'Utilisateurs', description: 'Modifier les informations d’un utilisateur.' },
  { permission: 'users:delete', label: 'Supprimer un utilisateur', module: 'Utilisateurs', description: 'Supprimer un compte utilisateur.' },
  { permission: 'users:read_all', label: 'Voir tous les utilisateurs', module: 'Utilisateurs', description: 'Consulter la liste complète des utilisateurs.' },

  { permission: 'projects:create', label: 'Créer un projet', module: 'Projets', description: 'Créer un nouveau projet.' },
  { permission: 'projects:edit', label: 'Modifier un projet', module: 'Projets', description: 'Modifier un projet existant.' },
  { permission: 'projects:delete', label: 'Supprimer un projet', module: 'Projets', description: 'Supprimer un projet existant.' },
  { permission: 'projects:read_all', label: 'Voir tous les projets', module: 'Projets', description: 'Consulter tous les projets de l’entreprise.' },
  { permission: 'projects:read_own', label: 'Voir mes projets', module: 'Projets', description: 'Consulter les projets qui me sont affectés.' },
  { permission: 'projects:read_assigned', label: 'Voir les projets affectés', module: 'Projets', description: 'Consulter les projets affectés au collaborateur.' },

  { permission: 'tasks:create', label: 'Créer une tâche', module: 'Tâches', description: 'Créer une nouvelle tâche.' },
  { permission: 'tasks:assign', label: 'Affecter une tâche', module: 'Tâches', description: 'Affecter une tâche à un collaborateur.' },
  { permission: 'tasks:read_assigned', label: 'Voir les tâches affectées', module: 'Tâches', description: 'Consulter les tâches qui me sont affectées.' },
  { permission: 'tasks:read_team', label: "Voir les tâches de l'équipe", module: 'Tâches', description: "Consulter les tâches de l'équipe." },
  { permission: 'tasks:validate', label: 'Valider les tâches', module: 'Tâches', description: 'Valider ou refuser une tâche soumise.' },

  { permission: 'time_entries:create', label: 'Créer une saisie de temps', module: 'Temps', description: 'Créer une nouvelle saisie de temps.' },
  { permission: 'time_entries:read_own', label: 'Voir mes temps', module: 'Temps', description: 'Consulter ses propres temps saisis.' },
  { permission: 'time_entries:read_team', label: "Voir les temps de l'équipe", module: 'Temps', description: "Consulter les temps de l'équipe." },
  { permission: 'time_entries:read_all', label: 'Voir tous les temps', module: 'Temps', description: 'Consulter tous les temps saisis.' },
  { permission: 'time_entries:validate', label: 'Valider les temps', module: 'Temps', description: 'Valider les temps saisis par les collaborateurs.' },

  { permission: 'analytics:read_global', label: 'Lire les analytics globales', module: 'Analytics', description: 'Accéder aux tableaux de bord globaux.' },

  { permission: 'costs:read', label: 'Lire les coûts', module: 'Finances', description: 'Consulter les coûts et budgets.' },
  { permission: 'costs:edit', label: 'Modifier les coûts', module: 'Finances', description: 'Modifier les coûts et budgets.' },

  { permission: 'alerts:validate', label: 'Valider les alertes', module: 'Alertes', description: 'Valider ou traiter les alertes critiques.' },

  { permission: 'rh:read_all', label: 'Voir le module RH', module: 'RH', description: 'Consulter l’espace RH et offres.' },
  { permission: 'rh:create_offre', label: 'Créer une offre RH', module: 'RH', description: 'Créer une nouvelle offre d’emploi.' },
  { permission: 'rh:edit_offre', label: 'Modifier une offre RH', module: 'RH', description: 'Modifier une offre d’emploi existante.' },
  { permission: 'rh:delete_offre', label: 'Supprimer une offre RH', module: 'RH', description: 'Supprimer une offre d’emploi.' },
  { permission: 'rh:read_candidatures', label: 'Lire les candidatures', module: 'RH', description: 'Consulter les candidatures reçues.' },
  { permission: 'rh:update_candidature_status', label: 'Gérer le statut des candidatures', module: 'RH', description: 'Mettre à jour le statut d’une candidature.' },
  { permission: 'rh:read_archives', label: 'Lire les archives RH', module: 'RH', description: 'Consulter les archives RH.' },

  { permission: 'security:manage_permissions', label: 'Gérer les rôles et permissions', module: 'Sécurité', description: 'Gérer les permissions et les accès des rôles.' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<PermissionRoleKey, string[]> = {
  admin: [
    'teams:read_own',
    'users:create',
    'users:edit',
    'users:delete',
    'users:read_all',
    'security:manage_permissions',
    'teams:create',
    'teams:edit',
    'teams:delete',
    'teams:read_all',
    'teams:assign_member',
    'teams:reassign_member',
    'analytics:read_global',
    'projects:read_all',
    'projects:create',
    'projects:edit',
    'projects:delete',
    'tasks:create',
    'tasks:assign',
    'tasks:read_assigned',
    'tasks:read_team',
    'time_entries:read_all',
    'costs:read',
    'costs:edit',
    'rh:read_all',
    'rh:create_offre',
    'rh:edit_offre',
    'rh:delete_offre',
    'rh:read_candidatures',
    'rh:update_candidature_status',
    'rh:read_archives',
  ],
  dg: [
    'teams:read_own',
    'users:create',
    'users:edit',
    'users:delete',
    'users:read_all',
    'security:manage_permissions',
    'teams:create',
    'teams:edit',
    'teams:delete',
    'teams:read_all',
    'teams:assign_member',
    'teams:reassign_member',
    'analytics:read_global',
    'costs:read',
    'costs:edit',
    'projects:read_all',
    'projects:create',
    'projects:edit',
    'projects:delete',
    'tasks:create',
    'tasks:assign',
    'tasks:read_assigned',
    'tasks:read_team',
    'time_entries:read_all',
    'rh:read_all',
    'rh:create_offre',
    'rh:edit_offre',
    'rh:delete_offre',
    'rh:read_candidatures',
    'rh:update_candidature_status',
    'rh:read_archives',
  ],
  manager: [
    'teams:read_own',
    'tasks:create',
    'tasks:assign',
    'tasks:read_assigned',
    'tasks:read_team',
    'time_entries:read_team',
    'time_entries:validate',
    'time_entries:create',
    'time_entries:read_own',
    'rh:read_all',
    'rh:create_offre',
    'rh:edit_offre',
    'rh:delete_offre',
    'rh:read_candidatures',
    'rh:update_candidature_status',
    'rh:read_archives',
  ],
  collaborator: [
    'tasks:read_assigned',
    'time_entries:create',
    'time_entries:read_own',
    'projects:read_assigned',
  ],
};

const ROLE_ORDER: PermissionRoleKey[] = ['admin', 'dg', 'manager', 'collaborator'];

function normalizeRoleKey(role?: string | null): PermissionRoleKey {
  const normalized = (role || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

  if (normalized === 'admin' || normalized === 'administrateur') return 'admin';
  if (normalized === 'dg' || normalized === 'direction_generale') return 'dg';
  if (normalized === 'manager' || normalized === 'chef_projet' || normalized === 'chef_de_projet' || normalized === 'chef_equipe' || normalized === 'chef_de_equipe') return 'manager';
  if (normalized === 'collaborateur' || normalized === 'collaborator' || normalized === 'employe' || normalized === 'employee' || normalized === 'gestionnaire') return 'collaborator';
  return 'collaborator';
}

function normalizePermissionKey(permission?: string | null) {
  return (permission || '').toString().toLowerCase().trim();
}

function normalizeModuleLabel(module?: string | null, permission?: string | null) {
  const permissionKey = normalizePermissionKey(permission);
  const rawModule = (module || '').toString().trim();
  const normalizedModule = rawModule
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (permissionKey.startsWith('users:')) return 'Utilisateurs';
  if (permissionKey.startsWith('projects:')) return 'Projets';
  if (permissionKey.startsWith('missions:')) return 'Missions';
  if (permissionKey.startsWith('tasks:')) return 'Tâches';
  if (permissionKey.startsWith('teams:')) return 'Équipes';
  if (permissionKey.startsWith('costs:') || permissionKey.startsWith('time_entries:')) return 'Finance';
  if (permissionKey.startsWith('analytics:')) return 'Analytics';
  if (permissionKey.startsWith('rh:')) return 'RH & Offres';
  if (permissionKey.startsWith('alerts:')) return 'Alertes';
  if (permissionKey.startsWith('security:') || permissionKey.startsWith('roles:')) return 'Sécurité';

  if (!rawModule) return 'Général';
  if (normalizedModule.includes('finance') || normalizedModule.includes('temps') || normalizedModule.includes('time')) return 'Finance';
  if (normalizedModule.includes('rh')) return 'RH & Offres';
  if (normalizedModule.includes('equipe')) return 'Équipes';
  if (normalizedModule.includes('projet')) return 'Projets';
  if (normalizedModule.includes('tache')) return 'Tâches';
  if (normalizedModule.includes('utilisateur')) return 'Utilisateurs';
  if (normalizedModule.includes('alerte')) return 'Alertes';
  if (normalizedModule.includes('securite')) return 'Sécurité';
  if (normalizedModule.includes('analytic')) return 'Analytics';

  return rawModule;
}

export function mapAppRoleToPermissionRole(appRole?: AppRole | null): PermissionRoleKey {
  switch (appRole) {
    case 'ADMIN':
      return 'admin';
    case 'DG':
      return 'dg';
    case 'CHEF_PROJET':
      return 'manager';
    default:
      return 'collaborator';
  }
}

function lookupPermissionMeta(permission?: string | null) {
  const key = normalizePermissionKey(permission);
  return (
    PERMISSION_CATALOG.find((item) => item.permission === key) || {
      permission: key,
      label: key,
      module: normalizeModuleLabel('Général', key),
      description: 'Permission personnalisée',
    }
  );
}

function buildDefaultRowsForRole(role: PermissionRoleKey): RolePermissionRow[] {
  const now = new Date().toISOString();
  return (DEFAULT_ROLE_PERMISSIONS[role] || []).map((permission, index) => {
    const meta = lookupPermissionMeta(permission);
    return {
      id: index + 1,
      role,
      permission: meta.permission,
      module: normalizeModuleLabel(meta.module, meta.permission),
      description: meta.description,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
  });
}

function buildDefaultRows() {
  return ROLE_ORDER.flatMap((role) => buildDefaultRowsForRole(role));
}

function normalizeBooleanInput(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on', 'oui', 'actif', 'active'].includes(value.toLowerCase().trim());
  }
  return Boolean(value);
}

function buildSnapshotFromRows(rows: any[]): RolePermissionsSnapshot {
  const groupsMap: Record<PermissionRoleKey, RolePermissionRow[]> = {
    admin: [],
    dg: [],
    manager: [],
    collaborator: [],
  };

  (rows || []).forEach((row) => {
    const role = normalizeRoleKey(row.role);
    groupsMap[role].push({
      id: Number(row.id),
      role,
      permission: normalizePermissionKey(row.permission),
      module: normalizeModuleLabel(row.module || lookupPermissionMeta(row.permission).module, row.permission),
      description: row.description || lookupPermissionMeta(row.permission).description,
      is_active: normalizeBooleanInput(row.is_active),
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    });
  });

  const groups: RolePermissionGroup[] = ROLE_ORDER.map((role) => {
    const permissions = groupsMap[role].sort((a, b) => {
      const moduleCompare = String(a.module || '').localeCompare(String(b.module || ''), 'fr', {
        sensitivity: 'base',
      });
      if (moduleCompare !== 0) return moduleCompare;
      return a.permission.localeCompare(b.permission);
    });

    return {
      role,
      label: ROLE_LABELS[role],
      permissions,
      counts: {
        total: permissions.length,
        active: permissions.filter((permission) => permission.is_active).length,
        inactive: permissions.filter((permission) => !permission.is_active).length,
        modules: new Set(permissions.map((permission) => permission.module)).size,
      },
    };
  });

  const permissionsByRole = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = new Set(groupsMap[role].filter((permission) => permission.is_active).map((permission) => permission.permission));
    return acc;
  }, {} as Record<PermissionRoleKey, Set<string>>);

  return {
    loaded: true,
    loading: false,
    error: null,
    roles: groups,
    permissionsByRole,
    catalog: PERMISSION_CATALOG,
    roleLabels: ROLE_LABELS,
  };
}

let snapshot: RolePermissionsSnapshot = {
  ...buildSnapshotFromRows(buildDefaultRows()),
  loaded: false,
};
let loadPromise: Promise<RolePermissionsSnapshot> | null = null;
let refreshPromise: Promise<RolePermissionsSnapshot> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeRolePermissions(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRolePermissionsSnapshot() {
  return snapshot;
}

export function getRolePermissionsForRole(role: PermissionRoleKey) {
  return snapshot.roles.find((group) => group.role === role)?.permissions || [];
}

export function getActivePermissionSetForRole(role: PermissionRoleKey) {
  return snapshot.permissionsByRole[role] || new Set(DEFAULT_ROLE_PERMISSIONS[role] || []);
}

export function hasPermissionForRole(role: PermissionRoleKey, permission: string) {
  return getActivePermissionSetForRole(role).has(normalizePermissionKey(permission));
}

export function isRolePermissionProtected(role: PermissionRoleKey, permission: string) {
  return role === 'admin' && CRITICAL_ADMIN_PERMISSIONS.has(normalizePermissionKey(permission));
}

async function ensureLoaded() {
  if (snapshot.loaded && !loadPromise) {
    return snapshot;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await httpGet<{ roles?: RolePermissionGroup[]; catalog?: PermissionCatalogItem[]; roleLabels?: Record<PermissionRoleKey, string> }>('/api/roles');
      const data = response.data || {};
      const roles = Array.isArray(data.roles) ? data.roles : [];
      const normalized = buildSnapshotFromRows(
        roles.flatMap((group) =>
          (group.permissions || []).map((permission) => ({
            ...permission,
            role: group.role,
          }))
        )
      );

      snapshot = {
        ...normalized,
        loaded: true,
        loading: false,
        error: null,
        catalog: Array.isArray(data.catalog) && data.catalog.length ? data.catalog : PERMISSION_CATALOG,
        roleLabels: data.roleLabels || ROLE_LABELS,
      };
      emitChange();
      return snapshot;
    } catch (error) {
      snapshot = {
        ...snapshot,
        loaded: true,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de chargement des permissions',
      };
      emitChange();
      return snapshot;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function refreshRolePermissions() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    snapshot = {
      ...snapshot,
      loading: true,
      error: null,
    };
    emitChange();

    try {
      const response = await httpGet<{ roles?: RolePermissionGroup[]; catalog?: PermissionCatalogItem[]; roleLabels?: Record<PermissionRoleKey, string> }>('/api/roles');
      const data = response.data || {};
      const roles = Array.isArray(data.roles) ? data.roles : [];
      const normalized = buildSnapshotFromRows(
        roles.flatMap((group) =>
          (group.permissions || []).map((permission) => ({
            ...permission,
            role: group.role,
          }))
        )
      );

      snapshot = {
        ...normalized,
        loaded: true,
        loading: false,
        error: null,
        catalog: Array.isArray(data.catalog) && data.catalog.length ? data.catalog : PERMISSION_CATALOG,
        roleLabels: data.roleLabels || ROLE_LABELS,
      };
    } catch (error) {
      snapshot = {
        ...snapshot,
        loading: false,
        loaded: true,
        error: error instanceof Error ? error.message : 'Erreur de chargement des permissions',
      };
    }

    emitChange();
    refreshPromise = null;
    return snapshot;
  })();

  return refreshPromise;
}

export async function ensureRolePermissionsLoaded() {
  return ensureLoaded();
}

export function useRolePermissionsState(enabled = false) {
  const state = useSyncExternalStore(subscribeRolePermissions, getRolePermissionsSnapshot, getRolePermissionsSnapshot);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!state.loaded && !state.loading) {
      ensureLoaded().catch(() => undefined);
    }
  }, [enabled, state.loaded, state.loading]);

  return state;
}

export async function addRolePermission(input: {
  role: PermissionRoleKey;
  permission: string;
  module: string;
  description: string;
  is_active: boolean;
}) {
  const role = normalizeRoleKey(input.role);
  const response = await postJson(`/api/roles/${role}/permissions`, undefined, {
    permission: input.permission,
    module: input.module,
    description: input.description,
    is_active: input.is_active,
  });
  await refreshRolePermissions();
  return response.data;
}

export async function updateRolePermission(
  role: PermissionRoleKey,
  permission: string,
  patch: { module?: string; description?: string; is_active?: boolean }
) {
  const normalizedRole = normalizeRoleKey(role);
  const response = await putJson(`/api/roles/${normalizedRole}/permissions/${encodeURIComponent(permission)}`, undefined, patch);
  await refreshRolePermissions();
  return response.data;
}

export async function toggleRolePermission(
  role: PermissionRoleKey,
  permission: string,
  is_active: boolean
) {
  const normalizedRole = normalizeRoleKey(role);
  const response = await putJson(`/api/roles/${normalizedRole}/permissions/${encodeURIComponent(permission)}/toggle`, undefined, {
    is_active,
  });
  await refreshRolePermissions();
  return response.data;
}

export async function deleteRolePermission(role: PermissionRoleKey, permission: string) {
  const normalizedRole = normalizeRoleKey(role);
  const response = await delJson(`/api/roles/${normalizedRole}/permissions/${encodeURIComponent(permission)}`);
  await refreshRolePermissions();
  return response.data;
}
