import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Filter,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Switch } from '../../components/ui/switch';
import {
  addRolePermission,
  CRITICAL_ADMIN_PERMISSIONS,
  deleteRolePermission,
  ROLE_LABELS,
  refreshRolePermissions,
  toggleRolePermission,
  type PermissionCatalogItem,
  type PermissionRoleKey,
  type RolePermissionGroup,
  type RolePermissionRow,
  useRolePermissionsState,
} from '../../lib/rolePermissions';

const ROLE_ORDER: PermissionRoleKey[] = ['admin', 'dg', 'manager', 'collaborator'];
const ROLE_SHORT_LABELS: Record<PermissionRoleKey, string> = {
  admin: 'Administrateur',
  dg: 'DG',
  manager: 'Manager',
  collaborator: 'Collaborateur',
};

const MODULE_FILTER_OPTIONS = [
  'Tous les modules',
  'Utilisateurs',
  'Projets',
  'Missions',
  'Tâches',
  'Équipes',
  'Finance',
  'Analytics',
  'RH & Offres',
  'Alertes',
  'Sécurité',
] as const;

const MODULE_ORDER = new Map<string, number>(MODULE_FILTER_OPTIONS.map((module, index) => [module, index]));

const ROLE_META: Record<PermissionRoleKey, { accent: string; hint: string; ring: string }> = {
  admin: {
    accent: 'from-slate-900 via-slate-800 to-slate-700',
    hint: 'Paramétrage complet et sécurisé',
    ring: 'border-slate-200 bg-slate-50/90',
  },
  dg: {
    accent: 'from-indigo-600 via-violet-600 to-fuchsia-600',
    hint: 'Pilotage stratégique',
    ring: 'border-indigo-200 bg-indigo-50/80',
  },
  manager: {
    accent: 'from-cyan-600 via-sky-600 to-blue-600',
    hint: 'Gestion opérationnelle',
    ring: 'border-cyan-200 bg-cyan-50/80',
  },
  collaborator: {
    accent: 'from-emerald-600 via-teal-600 to-lime-600',
    hint: 'Exécution et suivi',
    ring: 'border-emerald-200 bg-emerald-50/80',
  },
};

function normalizeModuleLabel(module?: string | null, permission?: string | null) {
  const permissionKey = (permission || '').toString().toLowerCase().trim();
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

function getModuleOrderIndex(module: string) {
  return MODULE_ORDER.get(module) ?? 999;
}

function sortCatalog(items: PermissionCatalogItem[]) {
  return [...items].sort((a, b) => {
    const moduleA = normalizeModuleLabel(a.module, a.permission);
    const moduleB = normalizeModuleLabel(b.module, b.permission);
    const moduleCompare = getModuleOrderIndex(moduleA) - getModuleOrderIndex(moduleB);
    if (moduleCompare !== 0) return moduleCompare;
    const labelCompare = a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
    if (labelCompare !== 0) return labelCompare;
    return a.permission.localeCompare(b.permission);
  });
}

function sortPermissions(items: RolePermissionRow[]) {
  return [...items].sort((a, b) => {
    const moduleA = normalizeModuleLabel(a.module, a.permission);
    const moduleB = normalizeModuleLabel(b.module, b.permission);
    const moduleCompare = getModuleOrderIndex(moduleA) - getModuleOrderIndex(moduleB);
    if (moduleCompare !== 0) return moduleCompare;
    return a.permission.localeCompare(b.permission, 'fr', { sensitivity: 'base' });
  });
}

function getEmptyGroup(role: PermissionRoleKey): RolePermissionGroup {
  return {
    role,
    label: ROLE_LABELS[role] || ROLE_SHORT_LABELS[role],
    permissions: [],
    counts: { total: 0, active: 0, inactive: 0, modules: 0 },
  };
}

function getRoleLabel(role: PermissionRoleKey) {
  return ROLE_SHORT_LABELS[role] || ROLE_LABELS[role] || role;
}

function getCatalogForModule(catalog: PermissionCatalogItem[], module: string) {
  return sortCatalog(
    catalog.filter((item) => normalizeModuleLabel(item.module, item.permission) === module)
  );
}

export default function RolesPermissionsPage() {
  const { roles, catalog, loading, error } = useRolePermissionsState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<PermissionRoleKey>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<(typeof MODULE_FILTER_OPTIONS)[number]>('Tous les modules');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<PermissionRoleKey>('admin');
  const [modalModule, setModalModule] = useState<string>('Utilisateurs');
  const [modalPermission, setModalPermission] = useState<string>('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalIsActive, setModalIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const catalogByPermission = useMemo(() => {
    return new Map(catalog.map((item) => [item.permission, item]));
  }, [catalog]);

  const visibleRoleGroups = useMemo(() => {
    return ROLE_ORDER.map((role) => roles.find((group) => group.role === role) || getEmptyGroup(role));
  }, [roles]);

  const selectedRoleGroup = useMemo(() => {
    return visibleRoleGroups.find((group) => group.role === selectedRole) || getEmptyGroup(selectedRole);
  }, [visibleRoleGroups, selectedRole]);

  const modalRoleGroup = useMemo(() => {
    return visibleRoleGroups.find((group) => group.role === modalRole) || getEmptyGroup(modalRole);
  }, [visibleRoleGroups, modalRole]);

  const selectedRolePermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sortPermissions(
      selectedRoleGroup.permissions.filter((permission) => {
        const normalizedModule = normalizeModuleLabel(permission.module, permission.permission);
        const catalogItem = catalogByPermission.get(permission.permission);
        const label = catalogItem?.label || permission.permission;

        if (moduleFilter !== 'Tous les modules' && normalizedModule !== moduleFilter) {
          return false;
        }

        if (!query) return true;

        return [
          permission.permission,
          label,
          permission.description,
          normalizedModule,
        ].some((value) => value.toLowerCase().includes(query));
      })
    );
  }, [catalogByPermission, moduleFilter, searchQuery, selectedRoleGroup.permissions]);

  const groupedByModule = useMemo(() => {
    const map = new Map<string, RolePermissionRow[]>();

    selectedRolePermissions.forEach((permission) => {
      const moduleName = normalizeModuleLabel(permission.module, permission.permission);
      const existing = map.get(moduleName) || [];
      existing.push(permission);
      map.set(moduleName, existing);
    });

    return Array.from(map.entries()).sort(
      (a, b) => getModuleOrderIndex(a[0]) - getModuleOrderIndex(b[0])
    );
  }, [selectedRolePermissions]);

  const modalCatalogItems = useMemo(() => {
    if (!modalModule) return [];
    return getCatalogForModule(catalog, modalModule);
  }, [catalog, modalModule]);

  const visibleCatalogModules = useMemo(() => {
    return MODULE_FILTER_OPTIONS.filter((module) => module !== 'Tous les modules');
  }, []);

  const openModal = () => {
    const firstPermission = selectedRoleGroup.permissions[0];
    const firstCatalogItem = firstPermission ? catalogByPermission.get(firstPermission.permission) : catalog[0];
    const initialModule = moduleFilter !== 'Tous les modules'
      ? moduleFilter
      : normalizeModuleLabel(firstCatalogItem?.module, firstCatalogItem?.permission) || 'Utilisateurs';
    const moduleItems = getCatalogForModule(catalog, initialModule);
    const initialItem = moduleItems[0] || firstCatalogItem || catalog[0];

    setModalRole(selectedRole);
    setModalModule(initialModule);
    setModalPermission(initialItem?.permission || '');
    setModalDescription(initialItem?.description || '');
    setModalIsActive(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const showMessage = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleStatus = async (role: PermissionRoleKey, permission: string, nextActive: boolean) => {
    const key = `${role}:${permission}`;
    setBusyKey(key);

    try {
      await toggleRolePermission(role, permission, nextActive);
      showMessage('success', nextActive ? 'Permission activée.' : 'Permission désactivée.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de mettre à jour cette permission.');
    } finally {
      setBusyKey((current) => (current === key ? null : current));
    }
  };

  const handleDelete = async (role: PermissionRoleKey, permission: string) => {
    const key = `${role}:${permission}`;
    const protectedPermission = CRITICAL_ADMIN_PERMISSIONS.has(permission) && role === 'admin';

    if (protectedPermission) {
      showMessage('error', 'Cette permission admin est protégée.');
      return;
    }

    if (!window.confirm(`Supprimer la permission "${permission}" du rôle ${getRoleLabel(role)} ?`)) {
      return;
    }

    setBusyKey(key);

    try {
      await deleteRolePermission(role, permission);
      showMessage('success', 'Permission supprimée.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible de supprimer cette permission.');
    } finally {
      setBusyKey((current) => (current === key ? null : current));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modalPermission || !modalRole) return;

    setSaving(true);
    try {
      await addRolePermission({
        role: modalRole,
        permission: modalPermission,
        module: modalModule,
        description: modalDescription.trim(),
        is_active: modalIsActive,
      });
      closeModal();
      showMessage('success', 'Permission enregistrée avec succès.');
    } catch (err: any) {
      showMessage('error', err?.message || 'Impossible d’ajouter cette permission.');
    } finally {
      setSaving(false);
    }
  };

  const handleModalModuleChange = (module: string) => {
    setModalModule(module);
    const nextItem = getCatalogForModule(catalog, module)[0];
    if (nextItem) {
      setModalPermission(nextItem.permission);
      setModalDescription(nextItem.description);
      return;
    }
    setModalPermission('');
    setModalDescription('');
  };

  const handleModalPermissionChange = (permission: string) => {
    setModalPermission(permission);
    const item = catalogByPermission.get(permission);
    if (item) {
      setModalDescription(item.description);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles & Permissions"
        description="Gérez les accès et permissions par rôle utilisateur."
      />

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Paramétrage
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Gestion interactive des droits</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Une seule vue à la fois, claire et aérée. Sélectionnez un rôle, recherchez une permission et activez-la avec un switch ON/OFF.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refreshRolePermissions().catch(() => undefined)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter une permission
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleRoleGroups.map((group) => {
            const isActive = group.role === selectedRole;
            const meta = ROLE_META[group.role];
            return (
              <button
                key={group.role}
                type="button"
                onClick={() => setSelectedRole(group.role)}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  isActive
                    ? `${meta.ring} ring-2 ring-indigo-300 shadow-lg shadow-indigo-100/60`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Rôle
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{getRoleLabel(group.role)}</h3>
                    <p className="mt-1 text-sm text-slate-500">{meta.hint}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-white shadow-sm`}>
                    <Shield className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">Permissions</div>
                  <div className="text-2xl font-semibold text-slate-900">{group.counts.total}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {group.counts.active} actives
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {group.counts.inactive} inactives
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr_auto]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Recherche</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher une permission..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Filtre par module</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value as (typeof MODULE_FILTER_OPTIONS)[number])}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                >
                  {MODULE_FILTER_OPTIONS.map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="flex items-end">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                {selectedRoleGroup.permissions.length} permission(s) pour {getRoleLabel(selectedRole)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                {getRoleLabel(selectedRole)}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Permissions du rôle sélectionné</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
              {selectedRolePermissions.length} affichée(s)
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {groupedByModule.length > 0 ? (
              groupedByModule.map(([module, permissions]) => {
                const activeCount = permissions.filter((item) => item.is_active).length;
                return (
                  <section key={module} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">{module}</h4>
                        <p className="mt-1 text-sm text-slate-500">{permissions.length} permission(s)</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {activeCount}/{permissions.length} actives
                      </span>
                    </div>

                    <div className="space-y-3 p-5">
                      {permissions.map((permission) => {
                        const catalogItem = catalogByPermission.get(permission.permission);
                        const label = catalogItem?.label || permission.permission;
                        const protectedPermission = CRITICAL_ADMIN_PERMISSIONS.has(permission.permission) && selectedRole === 'admin';
                        const rowBusy = busyKey === `${selectedRole}:${permission.permission}`;

                        return (
                          <div
                            key={`${selectedRole}-${permission.permission}`}
                            className={`rounded-2xl border p-4 transition ${
                              permission.is_active
                                ? 'border-emerald-100 bg-emerald-50/40'
                                : 'border-slate-200 bg-slate-50/70'
                            }`}
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="truncate text-base font-semibold text-slate-900">{label}</h5>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                    {permission.permission}
                                  </span>
                                  {protectedPermission && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                      <Lock className="h-3 w-3" />
                                      Protégée
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{permission.description}</p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${permission.is_active ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white'}`}>
                                  <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${permission.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {permission.is_active ? 'ON' : 'OFF'}
                                  </span>
                                  <Switch
                                    checked={permission.is_active}
                                    onCheckedChange={(checked) => handleToggleStatus(selectedRole, permission.permission, checked)}
                                    disabled={protectedPermission || rowBusy}
                                  />
                                </div>

                                <button
                                  type="button"
                                  disabled={protectedPermission || rowBusy}
                                  onClick={() => handleDelete(selectedRole, permission.permission)}
                                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 ${
                                    protectedPermission || rowBusy ? 'cursor-not-allowed opacity-40' : ''
                                  }`}
                                  title="Supprimer la permission"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Aucune permission trouvée</h4>
                <p className="mt-2 text-sm text-slate-500">
                  Essayez un autre mot-clé ou changez le filtre de module pour retrouver les accès du rôle sélectionné.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">Ajouter une permission</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Choisissez le rôle, le module, la permission et son statut.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Rôle</label>
                  <select
                    value={modalRole}
                    onChange={(event) => setModalRole(event.target.value as PermissionRoleKey)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    {ROLE_ORDER.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Statut</label>
                  <select
                    value={modalIsActive ? 'active' : 'inactive'}
                    onChange={(event) => setModalIsActive(event.target.value === 'active')}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="active">Activée</option>
                    <option value="inactive">Désactivée</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Module</label>
                  <select
                    value={modalModule}
                    onChange={(event) => handleModalModuleChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    {visibleCatalogModules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Permission</label>
                  <select
                    value={modalPermission}
                    onChange={(event) => handleModalPermissionChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    disabled={modalCatalogItems.length === 0}
                  >
                    {modalCatalogItems.length === 0 ? (
                      <option value="">Aucune permission disponible</option>
                    ) : (
                      modalCatalogItems.map((item) => (
                        <option key={item.permission} value={item.permission}>
                          {item.permission} - {item.label}
                        </option>
                      ))
                    )}
                  </select>
                  {modalCatalogItems.length === 0 && (
                    <p className="text-xs text-slate-500">
                      Aucun catalogue de permission n’est encore disponible pour ce module.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={modalDescription}
                  onChange={(event) => setModalDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  placeholder="Décrivez le droit d’accès"
                />
              </div>

              {modalRoleGroup.permissions.some((row) => row.permission === modalPermission) && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Cette permission existe déjà pour ce rôle. L’enregistrement mettra à jour son statut et ses informations.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-6 right-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-lg">
          Chargement des permissions...
        </div>
      )}

      {error && !feedback && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
