import React, { useState, useEffect } from 'react';
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissionsGrouped
} from '../services/api';
import PermissionGate from '../components/PermissionGate';
import './RoleManagement.css';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: []
  });

  // Module parent-child structure
  const moduleHierarchy = {
    dashboard: { parent: 'DASHBOARD_VIEW', children: [] },
    building: {
      parent: 'BUILDING_VIEW',
      children: [
        'BUILDING_CREATE', 'BUILDING_EDIT', 'BUILDING_DELETE',
        'FLOOR_CREATE', 'FLOOR_EDIT', 'FLOOR_DELETE',
        'ROOM_CREATE', 'ROOM_EDIT', 'ROOM_DELETE'
      ]
    },
    entity: {
      parent: 'ENTITY_VIEW',
      children: ['ENTITY_ADMIT', 'ENTITY_EDIT', 'ENTITY_DISCHARGE', 'ENTITY_DELETE']
    },
    device: {
      parent: 'DEVICE_VIEW',
      children: ['DEVICE_CREATE', 'DEVICE_EDIT', 'DEVICE_DELETE']
    },
    live_position: { parent: 'LIVE_POSITION_VIEW', children: [] },
    organization: {
      parent: 'ORGANIZATION_VIEW',
      children: ['ORGANIZATION_CREATE', 'ORGANIZATION_EDIT', 'ORGANIZATION_DELETE']
    },
    staff: {
      parent: 'STAFF_VIEW',
      children: ['STAFF_CREATE', 'STAFF_EDIT', 'STAFF_DELETE']
    },
    role: {
      parent: 'ROLE_VIEW',
      children: ['ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE']
    },
    settings: { parent: 'SETTINGS_VIEW', children: [] }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesData, permsData] = await Promise.all([
        fetchRoles(),
        fetchPermissionsGrouped()
      ]);
      setRoles(rolesData.roles || []);
      setPermissionsGrouped(permsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permission_ids: role.permissions?.map(p => p.id) || []
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', permission_ids: [] });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
      } else {
        await createRole(formData);
      }
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving role:', error);
      alert(error.response?.data?.detail || 'Failed to save role');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the role "${name}"?`)) {
      try {
        await deleteRole(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting role:', error);
        alert(error.response?.data?.detail || 'Failed to delete role');
      }
    }
  };

  const handlePermissionToggle = (permissionId, permissionCode, moduleData) => {
    const hierarchy = moduleHierarchy[moduleData.module];

    setFormData(prev => {
      let newPermissions = [...prev.permission_ids];

      if (hierarchy && permissionCode === hierarchy.parent) {
        // Toggling parent checkbox
        const parentId = permissionId;
        const childCodes = hierarchy.children;
        const childIds = permissionsGrouped
          .find(g => g.module === moduleData.module)
          ?.permissions.filter(p => childCodes.includes(p.code))
          .map(p => p.id) || [];

        if (newPermissions.includes(parentId)) {
          // Uncheck parent and all children
          newPermissions = newPermissions.filter(
            id => id !== parentId && !childIds.includes(id)
          );
        } else {
          // Check parent (children stay as is)
          newPermissions.push(parentId);
        }
      } else {
        // Toggling child checkbox
        if (newPermissions.includes(permissionId)) {
          newPermissions = newPermissions.filter(id => id !== permissionId);
        } else {
          newPermissions.push(permissionId);
        }
      }

      return { ...prev, permission_ids: newPermissions };
    });
  };

  const isParentChecked = (module) => {
    const hierarchy = moduleHierarchy[module];
    if (!hierarchy) return false;

    const parentPerm = permissionsGrouped
      .find(g => g.module === module)
      ?.permissions.find(p => p.code === hierarchy.parent);

    return parentPerm && formData.permission_ids.includes(parentPerm.id);
  };

  const getModuleDisplayName = (module) => {
    const names = {
      dashboard: 'Dashboard',
      building: 'Buildings',
      entity: 'Entities',
      device: 'Devices',
      live_position: 'Live Positions',
      organization: 'Organizations',
      staff: 'Staff Management',
      role: 'Role Management',
      settings: 'Settings'
    };
    return names[module] || module;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="role-management">
      <div className="page-header">
        <div>
          <h1>Role Management</h1>
          <p>Configure roles and permissions</p>
        </div>
        <PermissionGate permission="ROLE_CREATE">
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            + Create Role
          </button>
        </PermissionGate>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Description</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td><strong>{role.name}</strong></td>
                <td>{role.description || '-'}</td>
                <td>
                  <span className="permission-count">
                    {role.permissions?.length || 0} permissions
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <PermissionGate permission="ROLE_VIEW">
                      <button
                        className="btn-view"
                        onClick={() => handleOpenModal(role)}
                      >
                        View
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="ROLE_EDIT">
                      <button
                        className="btn-edit"
                        onClick={() => handleOpenModal(role)}
                      >
                        Edit
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="ROLE_DELETE">
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(role.id, role.name)}
                      >
                        Delete
                      </button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="form-group">
                  <label>Role Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., User, Super User, Team Lead"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this role"
                    rows="2"
                  />
                </div>
              </div>

              <div className="permissions-section">
                <h3>Permissions</h3>
                <p className="section-description">
                  Select permissions for this role. Parent permissions must be checked to enable child permissions.
                </p>

                <div className="permissions-matrix">
                  {permissionsGrouped.map((group) => {
                    const hierarchy = moduleHierarchy[group.module];
                    const parentPerm = hierarchy
                      ? group.permissions.find(p => p.code === hierarchy.parent)
                      : null;
                    const childPerms = hierarchy && hierarchy.children.length > 0
                      ? group.permissions.filter(p => hierarchy.children.includes(p.code))
                      : [];
                    const isParentSelected = parentPerm && isParentChecked(group.module);

                    return (
                      <div key={group.module} className="permission-group">
                        {parentPerm && (
                          <label className="permission-parent">
                            <input
                              type="checkbox"
                              checked={formData.permission_ids.includes(parentPerm.id)}
                              onChange={() => handlePermissionToggle(
                                parentPerm.id,
                                parentPerm.code,
                                group
                              )}
                            />
                            <span className="permission-label">
                              {getModuleDisplayName(group.module)}
                            </span>
                          </label>
                        )}

                        {childPerms.length > 0 && (
                          <div className={`permission-children ${!isParentSelected ? 'disabled' : ''}`}>
                            {childPerms.map((perm) => (
                              <label key={perm.id} className="permission-child">
                                <input
                                  type="checkbox"
                                  checked={formData.permission_ids.includes(perm.id)}
                                  onChange={() => handlePermissionToggle(
                                    perm.id,
                                    perm.code,
                                    group
                                  )}
                                  disabled={!isParentSelected}
                                />
                                <span className="permission-label">{perm.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
