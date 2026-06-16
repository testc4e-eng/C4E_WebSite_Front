import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { API_BASE_URL, delJson, httpGet, putJson } from '../lib/api';
import { ROLE_LABELS, type AppRole } from '../lib/roles';
import { usePermissions } from '../hooks/usePermissions';
import {
  AlertTriangle,
  Users,
  ShieldAlert,
  BadgeCheck,
  BadgeX,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

interface AuditUser {
  id: number;
  nom: string;
  email: string;
  role: string | null;
  type: string | null;
  statut: string;
  date_creation?: string;
  dernier_connexion?: string;
  appRole: AppRole;
  isValid: boolean;
  team_id?: number | null;
  manager_id?: number | null;
  team_name?: string | null;
}

interface InvalidUser {
  id: number;
  nom: string;
  email: string;
  role: string | null;
  type: string | null;
  appRole: AppRole;
  statut: string;
  reason: string;
}

interface AuditResponse {
  total: number;
  byRole: Record<AppRole, number>;
  invalidUsers: InvalidUser[];
  users: AuditUser[];
}

interface TeamItem {
  id: number;
  team_name: string;
  manager_id: number | null;
  manager_name: string | null;
  member_count: number;
}

interface EditFormState {
  nom: string;
  email: string;
  statut: string;
  team_id: string;
}

const EMPTY_STATS: Record<AppRole, number> = {
  ADMIN: 0,
  DG: 0,
  CHEF_PROJET: 0,
  EMPLOYE: 0,
};

export default function UsersAuditPage() {
  const { canAny } = usePermissions();
  const canManageUsers = canAny(['users:edit', 'users:delete', 'teams:reassign_member']);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<AuditUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    nom: '',
    email: '',
    statut: 'actif',
    team_id: '',
  });

  const loadAudit = async () => {
    const { data } = await httpGet<AuditResponse>('/api/users/audit');
    setData(data);
  };

  const loadTeams = async () => {
    const { data } = await httpGet<TeamItem[]>('/api/teams');
    setTeams(data || []);
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([loadAudit(), canManageUsers ? loadTeams() : Promise.resolve()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue lors de l audit');
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [canManageUsers]);

  const byRole = data?.byRole || EMPTY_STATS;
  const invalidCount = data?.invalidUsers.length || 0;

  const statsCards = useMemo(
    () => [
      { label: 'Total utilisateurs', value: data?.total || 0, color: 'from-blue-500 to-indigo-600' },
      { label: 'Administrateurs', value: byRole.ADMIN, color: 'from-slate-700 to-slate-900' },
      { label: 'Direction / Gestionnaires', value: byRole.DG, color: 'from-emerald-500 to-teal-600' },
      { label: 'Chefs de projet', value: byRole.CHEF_PROJET, color: 'from-amber-500 to-orange-500' },
      { label: 'Collaborateurs', value: byRole.EMPLOYE, color: 'from-purple-500 to-fuchsia-600' },
      { label: 'Comptes invalides', value: invalidCount, color: 'from-rose-500 to-red-600' },
    ],
    [byRole.ADMIN, byRole.CHEF_PROJET, byRole.DG, byRole.EMPLOYE, data?.total, invalidCount]
  );

  const startEdit = (user: AuditUser) => {
    setActionError('');
    setEditingUser(user);
    setEditForm({
      nom: user.nom || '',
      email: user.email || '',
      statut: user.statut || 'actif',
      team_id: user.team_id ? String(user.team_id) : '',
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setActionError('');
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingUser) return;

    setSaving(true);
    setActionError('');
    try {
      await putJson(`/api/users/${editingUser.id}`, null, {
        nom: editForm.nom,
        email: editForm.email,
        statut: editForm.statut,
        team_id: editForm.team_id ? Number(editForm.team_id) : null,
      });
      await loadAudit();
      closeEdit();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
      setSaving(false);
    }
  };

  const deleteUser = async (user: AuditUser) => {
    if (!window.confirm(`Supprimer l utilisateur ${user.nom || user.email} ?`)) return;

    setDeletingId(user.id);
    setActionError('');
    try {
      await delJson(`/api/users/${user.id}`);
      await loadAudit();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Audit Utilisateurs"
        description="Verification des comptes, roles et coherence des acces"
      />

      {loading ? (
        <div className="py-12 text-center text-gray-500">Chargement de l audit...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {actionError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statsCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r ${card.color} text-white shadow-sm`}>
                  <Users className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>

          {invalidCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Comptes a verifier
              </div>
              <p className="text-sm text-amber-900">
                {invalidCount} utilisateur(s) ont un role absent ou non reconnu.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Liste complete des utilisateurs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Nom</th>
                    <th className="px-5 py-3 text-left font-medium">Email</th>
                    <th className="px-5 py-3 text-left font-medium">Role DB</th>
                    <th className="px-5 py-3 text-left font-medium">Type DB</th>
                    <th className="px-5 py-3 text-left font-medium">Role app</th>
                    <th className="px-5 py-3 text-left font-medium">Equipe</th>
                    <th className="px-5 py-3 text-left font-medium">Statut</th>
                    <th className="px-5 py-3 text-left font-medium">Audit</th>
                    {canManageUsers && (
                      <th className="px-5 py-3 text-left font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium text-gray-900">{user.nom || 'Sans nom'}</td>
                      <td className="px-5 py-3 text-gray-600">{user.email}</td>
                      <td className="px-5 py-3 text-gray-600">{user.role || '-'}</td>
                      <td className="px-5 py-3 text-gray-600">{user.type || '-'}</td>
                      <td className="px-5 py-3 text-gray-600">{ROLE_LABELS[user.appRole]}</td>
                      <td className="px-5 py-3 text-gray-600">{user.team_name || 'Sans equipe'}</td>
                      <td className="px-5 py-3 text-gray-600">{user.statut}</td>
                      <td className="px-5 py-3">
                        {user.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                            <BadgeCheck className="h-4 w-4" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                            <BadgeX className="h-4 w-4" />
                            Invalide
                          </span>
                        )}
                      </td>
                      {canManageUsers && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(user)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100"
                            >
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              disabled={deletingId === user.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === user.id ? 'Suppression...' : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Utilisateurs a corriger</h2>
            </div>
            {invalidCount === 0 ? (
              <div className="p-5 text-sm text-gray-500">Aucune incoherence detectee.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Nom</th>
                      <th className="px-5 py-3 text-left font-medium">Email</th>
                      <th className="px-5 py-3 text-left font-medium">Role detecte</th>
                      <th className="px-5 py-3 text-left font-medium">Raison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.invalidUsers.map((user) => (
                      <tr key={user.id} className="border-t border-gray-100">
                        <td className="px-5 py-3 font-medium text-gray-900">{user.nom || 'Sans nom'}</td>
                        <td className="px-5 py-3 text-gray-600">{user.email}</td>
                        <td className="px-5 py-3 text-gray-600">{ROLE_LABELS[user.appRole]}</td>
                        <td className="px-5 py-3 text-gray-600">{user.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldAlert className="h-4 w-4" />
            Source API: {API_BASE_URL}/api/users/audit
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Modifier l utilisateur</h3>
                <p className="text-sm text-gray-500">{editingUser.email}</p>
              </div>
              <button onClick={closeEdit} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Nom</label>
                  <input
                    type="text"
                    value={editForm.nom}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Statut</label>
                  <select
                    value={editForm.statut}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, statut: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Equipe</label>
                  <select
                    value={editForm.team_id}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, team_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Sans equipe</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.team_name}
                        {team.manager_name ? ` - ${team.manager_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeEdit}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
