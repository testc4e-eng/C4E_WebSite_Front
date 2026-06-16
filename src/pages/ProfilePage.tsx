import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Calendar, Clock, KeyRound, Mail, Shield, User } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS, getUserRoleLabel } from '../lib/roles';
import { httpGet, putJson } from '../lib/api';
import { formatDateForDisplay } from '../lib/date';

interface UserProfile {
  id: number;
  nom: string;
  email: string;
  role: string;
  type: string;
  statut: string;
  date_creation?: string;
  dernier_connexion?: string;
  force_password_change?: boolean;
}

function readMustChangePassword(profile?: UserProfile | null, forceQuery = false) {
  if (profile?.force_password_change) return true;
  if (forceQuery) return true;
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('mustChangePassword') === 'true';
}

export default function ProfilePage() {
  const { user, appRole, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const forceChangeFromQuery = searchParams.get('forcePasswordChange') === '1';
  const mustChangePassword = readMustChangePassword(profile, forceChangeFromQuery);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data } = await httpGet<{ user: UserProfile }>('/api/auth/me');
        const fetched = (data as any)?.user || data;
        setProfile(fetched);

        if (typeof window !== 'undefined') {
          if (fetched?.force_password_change) {
            localStorage.setItem('mustChangePassword', 'true');
          } else if (!forceChangeFromQuery) {
            localStorage.removeItem('mustChangePassword');
          }
        }
      } catch {
        if (user) {
          const fallbackProfile: UserProfile = {
            id: user.id,
            nom: user.nom || '',
            email: user.email,
            role: user.role,
            type: user.type,
            statut: 'actif',
            force_password_change: typeof window !== 'undefined' && localStorage.getItem('mustChangePassword') === 'true',
          };
          setProfile(fallbackProfile);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [forceChangeFromQuery, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mustChangePassword) {
      localStorage.setItem('mustChangePassword', 'true');
    }
  }, [mustChangePassword]);

  const initials = (profile?.nom || profile?.email || '?')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const currentPassword = form.currentPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tous les champs sont obligatoires.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await putJson('/api/auth/change-password', null, {
        currentPassword,
        newPassword,
      });

      if (typeof window !== 'undefined') {
        localStorage.removeItem('mustChangePassword');
      }

      setPasswordSuccess('Mot de passe change avec succes. Reconnexion en cours...');
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      window.setTimeout(() => {
        logout();
      }, 1200);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Erreur lors du changement du mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Mon Profil"
        description="Vos informations personnelles et la sécurité de votre compte."
      />

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Chargement...</div>
      ) : profile ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 text-center shadow-sm shadow-slate-200/50 backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-md">
                {initials}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{profile.nom}</h2>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {ROLE_LABELS[appRole]}
              </span>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Informations</h3>
              <div className="space-y-3">
                <InfoRow icon={<User className="h-4 w-4" />} label="Nom complet" value={profile.nom} />
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
                <InfoRow icon={<Shield className="h-4 w-4" />} label="Rôle" value={getUserRoleLabel(profile.role)} />
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Membre depuis"
                  value={formatDateForDisplay(profile.date_creation) || 'N/A'}
                />
                <InfoRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Dernière connexion"
                  value={formatDateForDisplay(profile.dernier_connexion) || 'N/A'}
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sécurité du compte</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Changer mon mot de passe</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    La validation peut vous déconnecter pour sécuriser votre session.
                  </p>
                </div>
                {mustChangePassword && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Changement requis
                  </div>
                )}
              </div>

              {mustChangePassword && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Votre mot de passe doit être changé à la prochaine connexion.
                </div>
              )}

              {passwordError && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {passwordSuccess}
                </div>
              )}

              <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handlePasswordSubmit}>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm((current) => ({ ...current, currentPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    placeholder="Votre mot de passe actuel"
                    autoComplete="current-password"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm((current) => ({ ...current, newPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    placeholder="Au moins 8 caractères"
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    placeholder="Confirmez le mot de passe"
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
                  <div className="text-sm text-slate-500">
                    Vous serez invité à vous reconnecter après la mise à jour.
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    {saving ? 'Mise à jour...' : 'Changer mon mot de passe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-slate-500">Impossible de charger le profil.</div>
      )}
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <span className="text-slate-400">{icon}</span>
      <span className="w-40 text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
