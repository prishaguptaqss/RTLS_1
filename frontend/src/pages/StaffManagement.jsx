import React, { useState, useEffect } from 'react';
import { fetchStaff, createStaff, updateStaff, deleteStaff, fetchRoles } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PermissionGate from '../components/PermissionGate';
import { Eye, EyeOff, Copy } from 'lucide-react';
import './StaffManagement.css';

const StaffManagement = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    staff_id: '',
    name: '',
    email: '',
    phone: '',
    role_ids: [],
    is_admin: false
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load staff data (required)
      const staffData = await fetchStaff();
      setStaff(staffData.staff || []);

      // Try to load roles data (optional - user might not have ROLE_VIEW permission)
      try {
        const rolesData = await fetchRoles();
        setRoles(rolesData.roles || []);
      } catch (rolesError) {
        // If user doesn't have ROLE_VIEW permission, just set empty roles
        console.warn('Unable to load roles (permission denied):', rolesError.response?.status);
        setRoles([]);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        staff_id: staffMember.staff_id,
        name: staffMember.name,
        email: staffMember.email,
        phone: staffMember.phone || '',
        role_ids: staffMember.roles?.map(r => r.id) || [],
        is_admin: staffMember.is_admin
      });
    } else {
      setEditingStaff(null);
      setFormData({
        staff_id: '',
        name: '',
        email: '',
        phone: '',
        role_ids: [],
        is_admin: false
      });
      setGeneratedPassword('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setGeneratedPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await updateStaff(editingStaff.id, formData);
      } else {
        const result = await createStaff(formData);
        if (result.temporary_password) {
          setGeneratedPassword(result.temporary_password);
          alert(`Staff created! Temporary password: ${result.temporary_password}\nPlease save this password.`);
        }
      }
      await loadData();
      if (!generatedPassword) {
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      alert(error.response?.data?.detail || 'Failed to save staff member');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteStaff(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert(error.response?.data?.detail || 'Failed to delete staff member');
      }
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    alert('Password copied to clipboard!');
  };

  const isMainAdmin = (staffMember) => {
    return staffMember?.email === 'admin@rtls.com' && staffMember?.is_admin;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="staff-management">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage system users and their access</p>
        </div>
        <PermissionGate permission="STAFF_CREATE">
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            + New User
          </button>
        </PermissionGate>
      </div>

      <div className="stats-card">
        <div className="stat-item">
          <span className="stat-label">Total User</span>
          <span className="stat-value">{staff.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active</span>
          <span className="stat-value">{staff.filter(s => s.is_active).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Admins</span>
          <span className="stat-value">{staff.filter(s => s.is_admin).length}</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role(s)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="staff-name">
                    {member.name}
                    {member.is_admin && <span className="admin-badge">Admin</span>}
                  </div>
                </td>
                <td>{member.email}</td>
                <td>{member.phone || '-'}</td>
                <td>
                  <div className="roles-list">
                    {member.roles?.map(role => (
                      <span key={role.id} className="role-badge">{role.name}</span>
                    )) || '-'}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <PermissionGate permission="STAFF_EDIT">
                      <button
                        className="btn-edit"
                        onClick={() => handleOpenModal(member)}
                      >
                        Edit
                      </button>
                    </PermissionGate>
                    <PermissionGate permission="STAFF_DELETE">
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(member.id, member.name)}
                        disabled={member.id === user?.id}
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStaff ? 'Edit User Member' : 'Create New User'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>User ID *</label>
                  <input
                    type="text"
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    required
                    disabled={!!editingStaff}
                  />
                </div>

                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <PermissionGate permission="ROLE_VIEW">
                <div className="form-group">
                  <label>Roles</label>
                  <div className="role-multiselect">
                    <div className="role-selected-tags">
                      {formData.role_ids.length === 0 ? (
                        <span className="role-placeholder">Select roles...</span>
                      ) : (
                        formData.role_ids.map(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          return role ? (
                            <span key={roleId} className="role-tag">
                              {role.name}
                              <button
                                type="button"
                                className="role-tag-remove"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    role_ids: prev.role_ids.filter(id => id !== roleId)
                                  }));
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })
                      )}
                    </div>
                    <select
                      className="role-dropdown"
                      onChange={(e) => {
                        const roleId = parseInt(e.target.value);
                        if (roleId && !formData.role_ids.includes(roleId)) {
                          setFormData(prev => ({
                            ...prev,
                            role_ids: [...prev.role_ids, roleId]
                          }));
                        }
                        e.target.value = '';
                      }}
                      value=""
                    >
                      <option value="">+ Add role</option>
                      {roles
                        .filter(role => !formData.role_ids.includes(role.id))
                        .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
              </PermissionGate>

              {user?.is_admin && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                      disabled={editingStaff && isMainAdmin(editingStaff)}
                      title={editingStaff && isMainAdmin(editingStaff) ? "Cannot modify main administrator status" : ""} style={{marginTop:"20px"}}
                    />
                    Administrator
                    {editingStaff && isMainAdmin(editingStaff) && <span className="readonly-badge">Read-only</span>}
                  </label>
                </div>
              )}

              {generatedPassword && (
                <div className="password-alert">
                  <strong>Generated Password:</strong>
                  <div className="password-display">
                    <code className="password-code">
                      {showGeneratedPassword ? generatedPassword : '••••••••••••'}
                    </code>
                    <button
                      type="button"
                      className="password-action-btn"
                      onClick={() => setShowGeneratedPassword(!showGeneratedPassword)}
                      title={showGeneratedPassword ? "Hide password" : "Show password"}
                    >
                      {showGeneratedPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      type="button"
                      className="password-action-btn"
                      onClick={copyPassword}
                      title="Copy to clipboard"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <p>Please save this password. It won't be shown again.</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingStaff ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
