import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { httpGet, httpJson } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';

interface Team {
  id: number;
  team_name: string;
  manager_id: number | null;
  manager_name: string | null;
  member_count: number;
}

interface UserItem {
  id: number;
  nom: string;
  email: string;
  role: string;
  statut: string;
  team_id?: number | null;
}

interface TaskCategory {
  id: number;
  name: string;
  description?: string | null;
  is_billable: boolean;
  team_id?: number | null;
  team_name?: string | null;
}

export default function GestionEquipes() {
  const { can, canAny } = usePermissions();
  const canManageTeams = canAny(['teams:create', 'teams:edit', 'teams:delete', 'teams:assign_member']);
  const canReadAllTeams = can('teams:read_all');
  const canManageMembers = canReadAllTeams || can('teams:read_own');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<UserItem[]>([]);
  const [unassigned, setUnassigned] = useState<UserItem[]>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<UserItem | null>(null);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', team_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setError('');
    try {
      const [teamsRes, unassignedRes] = await Promise.all([
        httpGet<Team[]>('/api/teams'),
        canReadAllTeams ? httpGet<UserItem[]>('/api/teams/unassigned') : Promise.resolve({ data: [] as UserItem[] } as any),
      ]);
      setTeams(teamsRes.data || []);
      setUnassigned(unassignedRes.data || []);
      if (canReadAllTeams) {
        const categoriesRes = await httpGet<TaskCategory[]>('/api/categories');
        setCategories(categoriesRes.data || []);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur chargement equipes');
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedTeam) {
        setMembers([]);
        return;
      }
      try {
        const res = await httpGet<UserItem[]>(`/api/teams/${selectedTeam.id}/members`);
        setMembers(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Erreur chargement membres');
      }
    };
    fetchMembers();
  }, [selectedTeam?.id]);

  const title = useMemo(() => selectedTeam ? selectedTeam.team_name : 'Selectionne une equipe', [selectedTeam]);

  const assignMember = async (teamId: number, userId: number) => {
    setLoading(true);
    setError('');
    try {
      await httpJson(`/api/teams/${teamId}/members/${userId}`, 'PUT');
      await reload();
      if (selectedTeam?.id === teamId) {
        const res = await httpGet<UserItem[]>(`/api/teams/${teamId}/members`);
        setMembers(res.data || []);
      }
    } catch (e: any) {
      setError(e.message || 'Affectation impossible');
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId: number) => {
    if (!window.confirm("Supprimer cette equipe ? Les membres passeront sans equipe.")) return;
    setError('');
    try {
      await httpJson(`/api/teams/${teamId}`, 'DELETE');
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
        setMembers([]);
      }
      await reload();
    } catch (e: any) {
      setError(e.message || 'Suppression equipe impossible');
    }
  };

  const deleteMember = async (teamId: number, userId: number, displayName: string) => {
    if (!window.confirm(`Supprimer ${displayName} de cette equipe ?`)) return;
    setError('');
    try {
      await httpJson(`/api/teams/${teamId}/users/${userId}`, 'DELETE');
      if (selectedTeam?.id === teamId) {
        const res = await httpGet<UserItem[]>(`/api/teams/${teamId}/members`);
        setMembers(res.data || []);
      }
      await reload();
    } catch (e: any) {
      setError(e.message || 'Suppression membre impossible');
    }
  };

  const createCategory = async () => {
    if (!newCategory.name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await httpJson('/api/categories', 'POST', null, {
        name: newCategory.name.trim(),
        team_id: newCategory.team_id ? Number(newCategory.team_id) : null,
      });
      setNewCategory({ name: '', team_id: '' });
      await reload();
    } catch (e: any) {
      setError(e.message || 'Creation du domaine impossible');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (category: TaskCategory) => {
    if (!window.confirm(`Supprimer le domaine ${category.name} ?`)) return;
    setLoading(true);
    setError('');
    try {
      await httpJson(`/api/categories/${category.id}`, 'DELETE');
      await reload();
    } catch (e: any) {
      setError(e.message || 'Suppression du domaine impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Gestion des Equipes" description="Organisation des collaborateurs par equipe" />

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {canReadAllTeams && (
        <div className="mb-5 flex flex-wrap gap-3">
          <button onClick={() => setShowAddUser(true)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            + Ajouter un utilisateur
          </button>
          <button onClick={() => setShowCreateTeam(true)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            + Creer une equipe
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-1 space-y-3">
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className={`w-full text-left rounded-xl border p-4 bg-white hover:shadow-sm cursor-pointer ${selectedTeam?.id === team.id ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900">{team.team_name}</div>
                  <div className="text-sm text-gray-600 mt-1">Manager: {team.manager_name || '-'}</div>
                  <div className="text-xs text-gray-500 mt-2">{team.member_count} membre(s)</div>
                </div>
                {canManageTeams && <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTeam(team);
                      setShowEditTeam(true);
                    }}
                    className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTeam(team.id);
                    }}
                    className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Supprimer
                  </button>
                </div>}
              </div>
            </div>
          ))}

          {canReadAllTeams && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="font-semibold text-amber-800">Sans equipe</div>
            <div className="text-sm text-amber-700 mt-1">{unassigned.length} collaborateur(s)</div>
            <div className="mt-3 space-y-2 max-h-56 overflow-auto">
              {unassigned.map((u) => (
                <div key={u.id} className="text-xs bg-white border border-amber-200 rounded px-2 py-1">{u.nom} - {u.email}</div>
              ))}
            </div>
          </div>}
        </section>

        <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          {!selectedTeam && <p className="text-sm text-gray-500 mt-3">Choisis une equipe a gauche pour voir le detail.</p>}

          {selectedTeam && (
            <>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm text-gray-600">Manager: {selectedTeam.manager_name || '-'}</p>
                {canManageTeams && <div className="flex gap-2">
                  <button onClick={() => setShowEditTeam(true)} className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50">Modifier equipe</button>
                  <button onClick={() => deleteTeam(selectedTeam.id)} className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100">Supprimer equipe</button>
                </div>}
              </div>
              <div className="mt-4 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Nom</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Statut</th>
                      {canManageMembers && <th className="py-2">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b last:border-b-0">
                        <td className="py-2">{m.nom}</td>
                        <td className="py-2">{m.email}</td>
                        <td className="py-2">{m.statut}</td>
                        {canManageMembers && <td className="py-2">
                          <button
                            onClick={() => setEditingMember(m)}
                            className="mr-2 px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => deleteMember(selectedTeam.id, m.id, m.nom)}
                            className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            Supprimer
                          </button>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canReadAllTeams && unassigned.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-800 mb-2">Affecter un collaborateur sans equipe</div>
                  <div className="flex flex-wrap gap-2">
                    {unassigned.map((u) => (
                      <button
                        key={u.id}
                        disabled={loading}
                        onClick={() => assignMember(selectedTeam.id, u.id)}
                        className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-50 hover:bg-gray-100"
                      >
                        Affecter {u.nom}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {canManageMembers && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    + Ajouter membre
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {canReadAllTeams && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Domaines de taches par equipe</h2>
            <p className="mt-1 text-sm text-gray-600">
              Definissez les categories visibles dans la saisie de temps pour chaque equipe.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-[2fr,1.5fr,auto]">
            <input
              placeholder="Nom du domaine (ex: Cartographie, SIG, Analyse...)"
              value={newCategory.name}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            />
            <select
              value={newCategory.team_id}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, team_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">Global (toutes les equipes)</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_name}
                </option>
              ))}
            </select>
            <button
              onClick={createCategory}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              + Ajouter le domaine
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">Global</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.filter((category) => !category.team_id).length === 0 && (
                  <span className="text-sm text-gray-500">Aucun domaine global.</span>
                )}
                {categories.filter((category) => !category.team_id).map((category) => (
                  <CategoryTag key={category.id} category={category} onDelete={deleteCategory} />
                ))}
              </div>
            </div>

            {teams.map((team) => (
              <div key={team.id} className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">{team.team_name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.filter((category) => category.team_id === team.id).length === 0 && (
                    <span className="text-sm text-gray-500">Aucun domaine specifique.</span>
                  )}
                  {categories
                    .filter((category) => category.team_id === team.id)
                    .map((category) => (
                      <CategoryTag key={category.id} category={category} onDelete={deleteCategory} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showCreateTeam && canReadAllTeams && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onSuccess={reload} />}
      {showEditTeam && selectedTeam && (
        <EditTeamModal
          team={selectedTeam}
          onClose={() => setShowEditTeam(false)}
          onSuccess={async () => {
            await reload();
            setShowEditTeam(false);
          }}
        />
      )}
      {showAddUser && canReadAllTeams && <AddUserModal onClose={() => setShowAddUser(false)} onSuccess={reload} teams={teams} />}
      {showAddMember && selectedTeam && (
        <AddMemberModal
          team={selectedTeam}
          onClose={() => setShowAddMember(false)}
          onSuccess={async () => {
            setShowAddMember(false);
            const res = await httpGet<UserItem[]>(`/api/teams/${selectedTeam.id}/members`);
            setMembers(res.data || []);
            await reload();
          }}
        />
      )}
      {editingMember && selectedTeam && (
        <EditMemberModal
          team={selectedTeam}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={async () => {
            setEditingMember(null);
            const res = await httpGet<UserItem[]>(`/api/teams/${selectedTeam.id}/members`);
            setMembers(res.data || []);
            await reload();
          }}
        />
      )}
    </>
  );
}

function CategoryTag({ category, onDelete }: { category: TaskCategory; onDelete: (category: TaskCategory) => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800">
      <span>{category.name}</span>
      <button
        onClick={() => onDelete(category)}
        className="rounded-full px-1 text-red-600 hover:bg-red-100"
        title={`Supprimer ${category.name}`}
      >
        x
      </button>
    </span>
  );
}

function CreateTeamModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', manager_id: '' });
  const [managers, setManagers] = useState<UserItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    httpGet<UserItem[]>('/api/users/managers')
      .then((r) => setManagers(r.data || []))
      .catch((e) => setError(e.message || 'Erreur chargement managers'));
  }, []);

  const submit = async () => {
    try {
      if (!form.name || !form.manager_id) return;
      await httpJson('/api/teams', 'POST', null, {
        name: form.name,
        manager_id: Number(form.manager_id),
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erreur creation equipe');
    }
  };

  return (
    <ModalShell title="Creer une equipe" onClose={onClose}>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <label className="text-sm text-gray-700">Nom de l'equipe *</label>
      <input className="mt-1 mb-3 w-full border rounded-lg px-3 py-2" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      <label className="text-sm text-gray-700">Chef d'equipe *</label>
      <select className="mt-1 w-full border rounded-lg px-3 py-2" value={form.manager_id} onChange={(e) => setForm((p) => ({ ...p, manager_id: e.target.value }))}>
        <option value="">-- Selectionner un manager --</option>
        {managers.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
      </select>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300">Annuler</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Creer l'equipe</button>
      </div>
    </ModalShell>
  );
}

function EditTeamModal({ team, onClose, onSuccess }: { team: Team; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: team.team_name, manager_id: String(team.manager_id || '') });
  const [managers, setManagers] = useState<UserItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    httpGet<UserItem[]>('/api/users/managers')
      .then((r) => setManagers(r.data || []))
      .catch((e) => setError(e.message || 'Erreur chargement managers'));
  }, []);

  const submit = async () => {
    try {
      if (!form.name || !form.manager_id) return;
      await httpJson(`/api/teams/${team.id}`, 'PUT', null, {
        name: form.name,
        manager_id: Number(form.manager_id),
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur modification equipe');
    }
  };

  return (
    <ModalShell title="Modifier equipe" onClose={onClose}>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <label className="text-sm text-gray-700">Nom de l'equipe *</label>
      <input className="mt-1 mb-3 w-full border rounded-lg px-3 py-2" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      <label className="text-sm text-gray-700">Chef d'equipe *</label>
      <select className="mt-1 w-full border rounded-lg px-3 py-2" value={form.manager_id} onChange={(e) => setForm((p) => ({ ...p, manager_id: e.target.value }))}>
        <option value="">-- Selectionner un manager --</option>
        {managers.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
      </select>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300">Annuler</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Enregistrer</button>
      </div>
    </ModalShell>
  );
}

function AddUserModal({ onClose, onSuccess, teams }: { onClose: () => void; onSuccess: () => void; teams: Team[] }) {
  const [form, setForm] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    role: 'collaborator',
    team_id: '',
    create_team: false,
    team_name: '',
  });
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      if (!form.nom || !form.email || !form.motDePasse) return;
      const createUserRes = await httpJson<any>('/api/admin/utilisateurs', 'POST', null, {
        nom: form.nom,
        email: form.email,
        motDePasse: form.motDePasse,
        role: form.role,
      });
      const created = createUserRes.data?.user;

      if (form.role === 'manager' && form.create_team && form.team_name && created?.id) {
        await httpJson('/api/teams', 'POST', null, {
          name: form.team_name,
          manager_id: created.id,
        });
      }

      if (form.role === 'collaborator' && form.team_id && created?.id) {
        await httpJson(`/api/teams/${form.team_id}/members/${created.id}`, 'PUT');
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erreur ajout utilisateur');
    }
  };

  return (
    <ModalShell title="Ajouter un utilisateur" onClose={onClose}>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <label className="text-sm">Nom complet *</label>
      <input className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} />
      <label className="text-sm">Email *</label>
      <input className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
      <label className="text-sm">Mot de passe *</label>
      <input type="password" className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.motDePasse} onChange={(e) => setForm((p) => ({ ...p, motDePasse: e.target.value }))} />
      <label className="text-sm">Role *</label>
      <select className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value, team_id: '' }))}>
        <option value="collaborator">Collaborateur</option>
        <option value="manager">Chef d'equipe</option>
      </select>

      {form.role === 'collaborator' && (
        <>
          <label className="text-sm">Affecter a une equipe *</label>
          <select className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.team_id} onChange={(e) => setForm((p) => ({ ...p, team_id: e.target.value }))}>
            <option value="">-- Selectionner une equipe --</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.team_name} - Manager: {t.manager_name || '-'}</option>)}
          </select>
        </>
      )}

      {form.role === 'manager' && (
        <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.create_team} onChange={(e) => setForm((p) => ({ ...p, create_team: e.target.checked }))} />
            Creer son equipe maintenant
          </label>
          {form.create_team && (
            <input className="mt-2 w-full border rounded-lg px-3 py-2 bg-white" placeholder="Nom de l'equipe" value={form.team_name} onChange={(e) => setForm((p) => ({ ...p, team_name: e.target.value }))} />
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300">Annuler</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Creer utilisateur</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500">x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddMemberModal({ team, onClose, onSuccess }: { team: Team; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ nom: '', email: '', motDePasse: '' });
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      if (!form.nom || !form.email || !form.motDePasse) return;
      await httpJson(`/api/teams/${team.id}/users`, 'POST', null, form);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur ajout membre');
    }
  };

  return (
    <ModalShell title="Ajouter un membre" onClose={onClose}>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <label className="text-sm">Nom complet *</label>
      <input className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} />
      <label className="text-sm">Email *</label>
      <input className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
      <label className="text-sm">Mot de passe *</label>
      <input type="password" className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.motDePasse} onChange={(e) => setForm((p) => ({ ...p, motDePasse: e.target.value }))} />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300">Annuler</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Ajouter</button>
      </div>
    </ModalShell>
  );
}

function EditMemberModal({ team, member, onClose, onSuccess }: { team: Team; member: UserItem; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ nom: member.nom, email: member.email, statut: member.statut || 'actif' });
  const [error, setError] = useState('');

  const submit = async () => {
    try {
      await httpJson(`/api/teams/${team.id}/users/${member.id}`, 'PUT', null, form);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur modification membre');
    }
  };

  return (
    <ModalShell title="Modifier membre" onClose={onClose}>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <label className="text-sm">Nom complet *</label>
      <input className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} />
      <label className="text-sm">Email *</label>
      <input className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
      <label className="text-sm">Statut</label>
      <select className="mt-1 mb-2 w-full border rounded-lg px-3 py-2" value={form.statut} onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value }))}>
        <option value="actif">actif</option>
        <option value="inactif">inactif</option>
      </select>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300">Annuler</button>
        <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Enregistrer</button>
      </div>
    </ModalShell>
  );
}
