import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { fetchUsers, createUser, updateUser, deleteUser, fetchUserLocationHistory } from '../services/api';
import './Users.css';
import { Edit2, Trash2, Clock } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    role: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (isCreate = false) => {
    const errors = {};

    if (isCreate) {
      // Validate user_id only during creation
      if (!formData.user_id.trim()) {
        errors.user_id = 'User ID is required';
      } else if (!/^[A-Za-z0-9_-]+$/.test(formData.user_id)) {
        errors.user_id = 'User ID can only contain letters, numbers, hyphens, and underscores';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    try {
      setSubmitting(true);
      const userData = {
        user_id: formData.user_id.trim(),
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        role: formData.role.trim() || null,
        status: formData.status
      };
      await createUser(userData);
      await loadUsers();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating user:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    try {
      setSubmitting(true);
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        role: formData.role.trim() || null,
        status: formData.status
      };
      await updateUser(selectedUser.user_id, userData);
      await loadUsers();
      setIsEditModalOpen(false);
      resetForm();
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setSubmitting(true);
      await deleteUser(selectedUser.user_id);
      await loadUsers();
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      user_id: user.user_id,
      name: user.name,
      email: user.email || '',
      role: user.role || '',
      status: user.status
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const openHistoryModal = async (user) => {
    setSelectedUser(user);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await fetchUserLocationHistory(user.user_id);
      setLocationHistory(data.history);
    } catch (err) {
      console.error('Error loading location history:', err);
      setLocationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      name: '',
      email: '',
      role: '',
      status: 'active'
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatHistoryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`status-badge status-${status}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage tracked users</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">Loading users...</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage tracked users</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadUsers} className="btn btn-primary">
                Retry
              </button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage tracked users</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          + Add User
        </button>
      </div>

      <Card>
        <Card.Content>
          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users found. Create your first user to get started.</p>
              <button onClick={openCreateModal} className="btn btn-primary">
                + Add User
              </button>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>User ID</Table.Head>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Email</Table.Head>
                  <Table.Head>Role</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Created At</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((user) => (
                  <Table.Row key={user.user_id}>
                    <Table.Cell><strong>{user.user_id}</strong></Table.Cell>
                    <Table.Cell>{user.name}</Table.Cell>
                    <Table.Cell>{user.email || '-'}</Table.Cell>
                    <Table.Cell>{user.role || '-'}</Table.Cell>
                    <Table.Cell>{getStatusBadge(user.status)}</Table.Cell>
                    <Table.Cell>{formatDate(user.created_at)}</Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        <button
                          onClick={() => openHistoryModal(user)}
                          className="btn-icon btn-info"
                          title="View location history"
                        >
                          <Clock size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="btn-icon btn-edit"
                          title="Edit user"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="btn-icon btn-delete"
                          title="Delete user"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsCreateModalOpen(false)}>
          Add New User
        </Modal.Header>
        <form onSubmit={handleCreateUser}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="user_id">
                User ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="user_id"
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                placeholder="e.g., EMP-001, DOC-123"
                required
              />
              {formErrors.user_id && (
                <small className="error-text">{formErrors.user_id}</small>
              )}
              <small>Unique identifier for this user (cannot be changed later)</small>
            </div>

            <div className="form-group">
              <label htmlFor="name">
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter user name"
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
              />
              {formErrors.email && (
                <small className="error-text">{formErrors.email}</small>
              )}
              <small>Optional - Email address for notifications</small>
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="">Select role (optional)</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
              <small>Optional - User role in the system</small>
            </div>

            <div className="form-group">
              <label htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsEditModalOpen(false)}>
          Edit User
        </Modal.Header>
        <form onSubmit={handleUpdateUser}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit-user_id">User ID</label>
              <input
                type="text"
                id="edit-user_id"
                name="user_id"
                value={formData.user_id}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>User ID cannot be changed after creation</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit-name">
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter user name"
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-email">Email</label>
              <input
                type="email"
                id="edit-email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
              />
              {formErrors.email && (
                <small className="error-text">{formErrors.email}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="">Select role (optional)</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-status">
                Status <span className="required">*</span>
              </label>
              <select
                id="edit-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update User'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsDeleteModalOpen(false)}>
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this user?</p>
          {selectedUser && (
            <div className="delete-user-info">
              <strong>{selectedUser.name}</strong>
              {selectedUser.email && <div>{selectedUser.email}</div>}
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteUser}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete User'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Location History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        size="large"
      >
        <Modal.Header onClose={() => setIsHistoryModalOpen(false)}>
          Location History
          {selectedUser && (
            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginTop: '0.5rem', color: '#666' }}>
              {selectedUser.name} ({selectedUser.user_id})
            </div>
          )}
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="loading-state">Loading location history...</div>
          ) : locationHistory.length === 0 ? (
            <div className="empty-state">
              <p>No location history found for this user.</p>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Location</Table.Head>
                  <Table.Head>Entered At</Table.Head>
                  <Table.Head>Exited At</Table.Head>
                  <Table.Head>Duration</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {locationHistory.map((record) => (
                  <Table.Row key={record.id}>
                    <Table.Cell>
                      <strong>{record.building_name}</strong> &gt; Floor {record.floor_number} &gt; {record.room_name}
                    </Table.Cell>
                    <Table.Cell>{formatHistoryDate(record.entered_at)}</Table.Cell>
                    <Table.Cell>
                      {record.exited_at ? formatHistoryDate(record.exited_at) : (
                        <span className="status-badge status-active">Still here</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {record.duration_minutes !== null ? (
                        `${record.duration_minutes} min`
                      ) : (
                        '-'
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsHistoryModalOpen(false)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Users;
