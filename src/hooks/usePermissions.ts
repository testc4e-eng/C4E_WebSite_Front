import { useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  DEFAULT_ROLE_PERMISSIONS,
  hasPermissionForRole,
  mapAppRoleToPermissionRole,
  useRolePermissionsState,
  type PermissionRoleKey,
} from '../lib/rolePermissions';

export const PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

export const usePermissions = () => {
  const { user, appRole } = useAuth();
  const role = mapAppRoleToPermissionRole(appRole);
  const permissionsState = useRolePermissionsState(role === 'admin');

  const can = useMemo(() => {
    return (permission: string) => {
      if (!permission) return true;

      const loadedPermissions = permissionsState.permissionsByRole?.[role];
      if (loadedPermissions) {
        return loadedPermissions.has(permission);
      }

      return hasPermissionForRole(role, permission);
    };
  }, [permissionsState.permissionsByRole, role]);

  const canAny = (permissions: string[] = []) => permissions.some(can);
  const canAll = (permissions: string[] = []) => permissions.every(can);

  return {
    can,
    canAny,
    canAll,
    role,
    user,
    permissionsLoading: permissionsState.loading,
    permissionsError: permissionsState.error,
    permissionsCatalog: permissionsState.catalog,
    permissionsRoles: permissionsState.roles,
    isPermissionRole: (value: unknown): value is PermissionRoleKey =>
      ['admin', 'dg', 'manager', 'collaborator'].includes(String(value || '')),
  };
};
