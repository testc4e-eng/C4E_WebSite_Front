// ==============================================
// Fichier : src/lib/roles.ts
// Rôle    : Mapping des rôles DB vers des groupes logiques
// Ne modifie PAS la base de données.
// ==============================================

/**
 * Groupes logiques de rôles utilisés dans l'application.
 * Mappés depuis les colonnes `role` et `type` de la table `utilisateurs`.
 */
export type AppRole = 'ADMIN' | 'DG' | 'CHEF_PROJET' | 'EMPLOYE';

/**
 * Détermine le rôle applicatif à partir des champs DB.
 * Compatibilité totale avec les données existantes :
 *   role=admin, type=administrateur  → ADMIN
 *   role=gestionnaire                  → DG (compatibilité legacy)
 *   role=manager, role=chef_projet, role=chef_equipe → CHEF_PROJET (Manager)
 *   tout autre                        → EMPLOYE
 */
export function resolveAppRole(dbRole?: string | null, dbType?: string | null): AppRole {
  const role = (dbRole || '').toLowerCase().trim();
  const type = (dbType || '').toLowerCase().trim();

  if (role === 'admin' || role === 'administrateur' || type === 'administrateur') return 'ADMIN';
  if (role === 'dg' || role === 'gestionnaire') return 'DG';
  if (role === 'manager' || role === 'chef_projet' || role === 'chef_equipe') return 'CHEF_PROJET';
  if (role === 'collaborateur' || role === 'collaborator' || role === 'employe') return 'EMPLOYE';
  if (!role && type === 'gestionnaire') return 'EMPLOYE';
  return 'EMPLOYE';
}

/**
 * Hiérarchie des rôles (du plus élevé au plus bas).
 * Utilisé pour les vérifications de type "au moins ce niveau".
 */
const ROLE_HIERARCHY: Record<AppRole, number> = {
  ADMIN: 100,
  DG: 80,
  CHEF_PROJET: 60,
  EMPLOYE: 10,
};

/** Vérifie si `userRole` a au moins le niveau de `requiredRole`. */
export function hasMinRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Vérifie si `userRole` est dans la liste autorisée. */
export function isRoleAllowed(userRole: AppRole, allowedRoles: AppRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/** Labels d'affichage pour chaque rôle. */
export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrateur',
  DG: 'DG',
  CHEF_PROJET: 'Manager',
  EMPLOYE: 'Collaborateur',
};

export function getUserRoleLabel(dbRole?: string | null): string {
  const role = (dbRole || '').toLowerCase().trim();
  if (role === 'admin' || role === 'administrateur') return 'Administrateur';
  if (role === 'dg') return 'DG';
  if (role === 'manager' || role === 'chef_projet' || role === 'chef_equipe') return 'Manager';
  return 'Collaborateur';
}
