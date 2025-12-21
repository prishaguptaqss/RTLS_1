import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * PermissionGate component - conditionally renders children based on permissions
 *
 * @param {string} permission - Single permission code required
 * @param {array} anyPermission - Render if user has ANY of these permissions
 * @param {array} allPermissions - Render if user has ALL of these permissions
 * @param {boolean} requireAdmin - Render only if user is admin
 * @param {node} fallback - Optional fallback component to render if permission check fails
 */
const PermissionGate = ({
  children,
  permission = null,
  anyPermission = null,
  allPermissions = null,
  requireAdmin = false,
  fallback = null
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = useAuth();

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return fallback;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Check any permission
  if (anyPermission && !hasAnyPermission(anyPermission)) {
    return fallback;
  }

  // Check all permissions
  if (allPermissions && !hasAllPermissions(allPermissions)) {
    return fallback;
  }

  return children;
};

export default PermissionGate;
