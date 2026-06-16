// ==============================================
// Fichier : components/layout/ProtectedRoute.tsx
// Guard de route : vérifie token + rôle autorisé.
// ==============================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { AppRole } from '../../lib/roles';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Rôles autorisés. Si vide, seul le token est vérifié. */
  allowedRoles?: AppRole[];
  /** Permission unique requise */
  permission?: string;
}

export default function ProtectedRoute({ children, allowedRoles, permission }: ProtectedRouteProps) {
  const { isAuthenticated, user, token, appRole } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const mustChangePassword =
    typeof window !== 'undefined' && localStorage.getItem('mustChangePassword') === 'true';

  // Pas de token → login
  if (!token || !user || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Rôle non autorisé → dashboard personnel
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(appRole)) {
    return <Navigate to="/403" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/403" replace />;
  }

  if (mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile?forcePasswordChange=1" replace />;
  }

  return <>{children}</>;
}
