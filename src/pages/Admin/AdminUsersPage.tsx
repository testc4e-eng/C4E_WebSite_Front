import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import PageHeader from '../../components/layout/PageHeader';
import { delJson, httpGet, postJson, putJson } from '../../lib/api';
import { Plus, Pencil, KeyRound, Power, Trash2, Search } from 'lucide-react';
import { formatDateForDisplay } from '../../lib/date';

interface AuditUser {
  id: number;
  nom: string;
  email: string;
  role: string | null;
  type: string | null;
  statut: string;
  date_creation?: string;
  dernier_connexion?: string;
  team_id?: number | null;
  team_name?: string | null;
}

interface AuditResponse {
  total: number;
  users: AuditUser[];
}

interface TeamItem {
  id: number;
  team_name: string;
  name?: string;
}

type RoleValue = 'admin' | 'dg' | 'manager' | 'collaborateur';

interface FormState {
  nom: string;
  email: string;
  motDePasse: string;
  role: RoleValue;
  statut: 'actif' | 'inactif';
  team_id: string;
}

const DEFAULT_FORM: FormState = {
  nom: '',
  email: '',
  motDePasse: '',
  role: 'collaborateur',
  statut: 'actif',
  team_id: '',
};

const ROLE_LABELS: Record<RoleValue, string> = {
  admin: 'Administrateur',
  dg: 'DG',
  manager: 'Manager',
  collaborateur: 'Collaborateur',
};

function roleFromUser(user: AuditUser): RoleValue {
  const role = (user.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const type = (user.type || '').toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'dg') return 'dg';
  if (role === 'gestionnaire') return 'dg';
  if (role === 'manager' || role === 'chef_projet' || role === 'chef_equipe') return 'manager';
  if (role === 'collaborateur') return 'collaborateur';
  if (type === 'administrateur') return 'admin';
  if (type === 'gestionnaire') return 'collaborateur';
  return 'collaborateur';
}

function roleToApiValue(role: RoleValue | string): string {
  const normalized = (role || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'administrateur' || normalized === 'admin') return 'administrateur';
  if (normalized === 'dg') return 'dg';
  if (normalized === 'manager') return 'manager';
  if (normalized === 'chef_projet' || normalized === 'chef_de_projet') return 'manager';
  if (normalized === 'chef_equipe' || normalized === 'chef_d_equipe') return 'manager';
  return 'collaborateur';
}

function typeFromRole(role: string): 'administrateur' | 'gestionnaire' {
  return role === 'administrateur' ? 'administrateur' : 'gestionnaire';
}

function roleGroupFromUser(user: AuditUser): 'admin' | 'dg' | 'manager' | 'collaborateur' {
  const role = (user.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const type = (user.type || '').toLowerCase();

  if (role === 'admin' || type === 'administrateur') return 'admin';
  if (role === 'dg') return 'dg';
  if (role === 'gestionnaire') return 'dg';
  if (role === 'manager' || role === 'chef_projet' || role === 'chef_equipe') return 'manager';
  return 'collaborateur';
}

function formatDate(value?: string) {
  return value ? formatDateForDisplay(value) : 'Jamais';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleValue>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuditUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AuditUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordForceChange, setPasswordForceChange] = useState(true);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const savingRef = useRef(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [audit, teamsRes] = await Promise.all([
        httpGet<AuditResponse>('/api/users/audit'),
        httpGet<TeamItem[]>('/api/teams'),
      ]);
      setUsers(audit.data.users || []);
      setTeams(teamsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !q ||
        user.nom?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        (user.team_name || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || roleGroupFromUser(user) === roleFilter;
      const matchesStatus = statusFilter === 'all' || (user.statut || '').toLowerCase() === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const openCreate = () => {
    setActionError('');
    setActionSuccess('');
    setEditingUser(null);
    setForm({ ...DEFAULT_FORM });
    setFormOpen(true);
  };

  const openEdit = (user: AuditUser) => {
    setActionError('');
    setActionSuccess('');
    setEditingUser(user);
    setForm({
      nom: user.nom || '',
      email: user.email || '',
      motDePasse: '',
      role: roleFromUser(user),
      statut: (user.statut as 'actif' | 'inactif') || 'actif',
      team_id: user.team_id ? String(user.team_id) : '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
    setSaving(false);
    savingRef.current = false;
    setActionError('');
  };

  const saveUser = async () => {
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setActionError('');
    setActionSuccess('');

    try {
      if (!form.nom.trim() || !form.email.trim()) {
        throw new Error('Nom et email sont requis');
      }

      if (!editingUser && form.motDePasse.trim().length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      if (editingUser) {
        const normalizedRole = roleToApiValue(form.role);
        const payload = {
          nom: form.nom.trim(),
          email: form.email.trim(),
          role: normalizedRole,
          type: typeFromRole(normalizedRole),
          statut: form.statut,
          equipe: normalizedRole === 'administrateur' ? null : (form.team_id ? Number(form.team_id) : null),
          equipe_id: form.team_id ? Number(form.team_id) : null,
        };

        const response = await putJson<{ success?: boolean; message?: string; user?: AuditUser }>(`/api/users/${editingUser.id}`, null, payload);

        const updatedUser = response.data?.user;
        if (updatedUser) {
          setUsers((current) =>
            current.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user))
          );
        }
        setActionSuccess(response.data?.message || 'Utilisateur mis a jour avec succes');
      } else {
        const normalizedRole = roleToApiValue(form.role);
        const payload = {
          nom: form.nom.trim(),
          email: form.email.trim(),
          motDePasse: form.motDePasse,
          role: normalizedRole,
          type: typeFromRole(normalizedRole),
          statut: form.statut,
          equipe: normalizedRole === 'administrateur' ? null : (form.team_id ? Number(form.team_id) : null),
          equipe_id: normalizedRole === 'administrateur' ? null : (form.team_id ? Number(form.team_id) : null),
        };

        const created = await postJson<{ success?: boolean; message?: string; user?: { id: number } }>('/api/admin/utilisateurs', null, payload);

        if (!created.data?.user?.id) {
          throw new Error('Creation utilisateur invalide: identifiant manquant');
        }
        setActionSuccess('Utilisateur créé avec succès');
      }

      closeForm();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de l enregistrement');
      setSaving(false);
      savingRef.current = false;
    }
  };

  const toggleStatus = async (user: AuditUser) => {
    const nextStatus = (user.statut || '').toLowerCase() === 'actif' ? 'inactif' : 'actif';
    setActionError('');
    setActionSuccess('');
    try {
      await putJson(`/api/users/${user.id}/status`, null, { statut: nextStatus });
      await load();
      setActionSuccess(`Statut mis a jour pour ${user.nom || user.email}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
    }
  };

  const openPassword = (user: AuditUser) => {
    setActionError('');
    setActionSuccess('');
    setPasswordUser(user);
    setPasswordValue('');
    setPasswordConfirm('');
    setPasswordForceChange(true);
  };

  const closePassword = () => {
    setPasswordUser(null);
    setPasswordValue('');
    setPasswordConfirm('');
    setPasswordForceChange(true);
  };

  const savePassword = async () => {
    if (!passwordUser) return;
    const manualPassword = passwordValue.trim();
    if (manualPassword && manualPassword.length < 8) {
      setActionError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (manualPassword && manualPassword !== passwordConfirm) {
      setActionError('Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    setActionError('');
    setActionSuccess('');
    try {
      const payload: { newPassword?: string; forceChange: boolean } = {
        forceChange: passwordForceChange,
      };
      if (manualPassword) {
        payload.newPassword = manualPassword;
      }

      const response = await putJson<{ success?: boolean; message?: string; temporaryPassword?: string }>(
        `/api/admin/users/${passwordUser.id}/reset-password`,
        null,
        payload
      );
      closePassword();
      const temporaryPassword = response.data?.temporaryPassword;
      const message = response.data?.message || 'Mot de passe mis a jour avec succes';
      setActionSuccess(
        temporaryPassword
          ? `${message} Mot de passe temporaire: ${temporaryPassword}`
          : message
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: AuditUser) => {
    if (!window.confirm(`Supprimer le compte ${user.nom || user.email} ?`)) return;
    setActionError('');
    setActionSuccess('');
    try {
      await delJson(`/api/users/${user.id}`);
      await load();
      setActionSuccess(`Compte supprime: ${user.nom || user.email}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des utilisateurs"
        description="Créer, modifier, activer, désactiver et réinitialiser les comptes de la plateforme."
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm shadow-slate-200/50 backdrop-blur-xl md:grid-cols-3">
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recherche</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, email, équipe" className="h-11 rounded-xl border-slate-200 bg-white pl-10" />
          </div>
        </div>
        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rôle</Label>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="admin">Administrateur</SelectItem>
              <SelectItem value="dg">DG</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="collaborateur">Collaborateur</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Statut</Label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {actionError && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{actionError}</div>}
      {actionSuccess && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionSuccess}</div>}

      <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Comptes utilisateurs</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Nom</th>
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Rôle</th>
                  <th className="px-6 py-3 text-left font-medium">Équipe</th>
                  <th className="px-6 py-3 text-left font-medium">Statut</th>
                  <th className="px-6 py-3 text-left font-medium">Dernière connexion</th>
                  <th className="px-6 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const role = roleFromUser(user);
                  const isActive = (user.statut || '').toLowerCase() === 'actif';
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-medium text-slate-900">{user.nom || 'Sans nom'}</td>
                      <td className="px-6 py-4 text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-slate-600">{ROLE_LABELS[role]}</td>
                      <td className="px-6 py-4 text-slate-600">{user.team_name || 'Sans équipe'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                          {isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDate(user.dernier_connexion)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => openEdit(user)} className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </button>
                          <button onClick={() => toggleStatus(user)} className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                            <Power className="h-3.5 w-3.5" />
                            {isActive ? 'Désactiver' : 'Réactiver'}
                          </button>
                          <button onClick={() => openPassword(user)} className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                            <KeyRound className="h-3.5 w-3.5" />
                            Réinitialiser mot de passe
                          </button>
                          <button onClick={() => deleteUser(user)} className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingUser ? 'Modifier le compte' : 'Créer un utilisateur'}</DialogTitle>
            <DialogDescription>Gestion des accès, du rôle et de l équipe affectée.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Nom</Label>
              <Input className="mt-2" value={form.nom} onChange={(e) => setForm((current) => ({ ...current, nom: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-2" type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            </div>
            {!editingUser && (
              <div>
                <Label>Mot de passe initial</Label>
                <Input className="mt-2" type="password" value={form.motDePasse} onChange={(e) => setForm((current) => ({ ...current, motDePasse: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as RoleValue }))}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="dg">DG</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="collaborateur">Collaborateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Équipe</Label>
              <Select value={form.team_id || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, team_id: value === 'none' ? '' : value }))}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sans équipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans équipe</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      {team.team_name || team.name || `Équipe ${team.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(value) => setForm((current) => ({ ...current, statut: value as 'actif' | 'inactif' }))}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Annuler</button>
            <button type="button" onClick={saveUser} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordUser)} onOpenChange={(open) => !open && closePassword()}>
        <DialogContent className="max-w-xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl">Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              {passwordUser?.nom || passwordUser?.email}
              <span className="mt-1 block">Laissez le mot de passe vide pour en générer un automatiquement.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nouveau mot de passe temporaire</Label>
              <Input className="mt-2" type="password" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} />
            </div>
            <div>
              <Label>Confirmation</Label>
              <Input className="mt-2" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={passwordForceChange}
                onChange={(e) => setPasswordForceChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Forcer le changement à la prochaine connexion
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closePassword} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Annuler</button>
            <button type="button" onClick={savePassword} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
