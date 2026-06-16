import { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export default function PermissionGate({
  permission,
  permissions,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny } = usePermissions();
  const hasAccess = permission ? can(permission) : canAny(permissions || []);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
