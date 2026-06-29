type Role = 'admin' | 'operator' | 'viewer' | 'user';

interface RoleDefinition {
  label: string;
  permissions: string[];
}

const ROLE_PERMISSIONS: Record<Role, RoleDefinition> = {
  admin: {
    label: '超级管理员',
    permissions: ['*'],
  },
  operator: {
    label: '运营人员',
    permissions: [
      'dashboard:read',
      'account:read',
      'account:control',
      'card:*',
      'user:read',
      'user:write',
      'log:read',
      'blacklist:*',
      'announcement:*',
      'session:read',
      'session:delete',
    ],
  },
  viewer: {
    label: '只读管理员',
    permissions: [
      'dashboard:read',
      'account:read',
      'user:read',
      'log:read',
      'session:read',
    ],
  },
  user: {
    label: '普通用户',
    permissions: [],
  },
};

function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}

function getRoleLabel(role: string): string {
  if (!isValidRole(role)) return role;
  return ROLE_PERMISSIONS[role].label;
}

function getRolePermissions(role: string): string[] {
  if (!isValidRole(role)) return [];
  return ROLE_PERMISSIONS[role].permissions;
}

function getRoles(): Array<{ value: string; label: string }> {
  return Object.entries(ROLE_PERMISSIONS).map(([value, def]) => ({
    value,
    label: def.label,
  }));
}

function hasPermission(role: string, permission: string): boolean {
  if (!isValidRole(role)) return false;
  const perms = getRolePermissions(role);
  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;
  const prefix = permission.split(':')[0];
  if (perms.includes(`${prefix}:*`)) return true;
  return false;
}

function hasAnyPermission(role: string, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

module.exports = {
  ROLE_PERMISSIONS,
  isValidRole,
  getRoleLabel,
  getRolePermissions,
  getRoles,
  hasPermission,
  hasAnyPermission,
};
