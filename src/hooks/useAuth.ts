// ==============================================
// Fichier : src/hooks/useAuth.ts
// Rôle    : Hook centralisé pour l'authentification et les rôles
// ==============================================

import { useMemo } from 'react';
import { resolveAppRole, hasMinRole, isRoleAllowed, type AppRole } from '../lib/roles';

export interface AuthUser {
  id: number;
  email: string;
  nom?: string;
  role: string;   // rôle DB brut
  type: string;   // type DB brut
}

interface JwtPayload {
  id?: number;
  email?: string;
  nom?: string;
  role?: string;
  type?: string;
  exp?: number;
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('userType');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userData');
  localStorage.removeItem('mustChangePassword');
  localStorage.removeItem('forcePasswordChange');
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

/**
 * Décode le payload JWT (sans vérification de signature — c'est le backend qui vérifie).
 */
function decodeToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.id || !payload?.email) return null;

  return {
    id: payload.id,
    email: payload.email,
    nom: payload.nom || '',
    role: payload.role || '',
    type: payload.type || '',
  };
}

function getValidUserFromStorage(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return { token: null, user: null };
  }

  if (isTokenExpired(token)) {
    clearAuthStorage();
    return { token: null, user: null };
  }

  const user = decodeToken(token);
  if (!user) {
    clearAuthStorage();
    return { token: null, user: null };
  }

  return { token, user };
}

/**
 * Hook principal d'authentification.
 * Lit le token depuis localStorage et expose des helpers typés.
 */
export function useAuth() {
  const authState = useMemo(() => getValidUserFromStorage(), []);
  const token = authState.token;
  const user = authState.user;

  const appRole = useMemo<AppRole>(() => {
    if (!user) return 'EMPLOYE';
    return resolveAppRole(user.role, user.type);
  }, [user]);

  return {
    token,
    user,
    appRole,
    isAuthenticated: !!token && !!user,

    // Helpers de rôle
    isAdmin:      appRole === 'ADMIN',
    isDG:         appRole === 'DG' || appRole === 'ADMIN',
    isChefProjet: appRole === 'CHEF_PROJET' || appRole === 'DG' || appRole === 'ADMIN',
    isEmploye:    true, // Tous les utilisateurs sont au moins employé

    // Vérifications avancées
    hasMinRole: (required: AppRole) => hasMinRole(appRole, required),
    isRoleAllowed: (allowed: AppRole[]) => isRoleAllowed(appRole, allowed),

    // Logout
    logout: () => {
      clearAuthStorage();
      window.location.href = '/login';
    },
  };
}

/**
 * Version non-hook pour les contextes non-React (guards de route, etc.).
 */
export function getAuthSync() {
  const { token, user } = getValidUserFromStorage();
  if (!token || !user) return { user: null, appRole: 'EMPLOYE' as AppRole, isAuthenticated: false };
  const appRole = resolveAppRole(user.role, user.type);
  return { user, appRole, isAuthenticated: true };
}
