import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/api';
import './Users.css';
import { FiEdit2 } from "react-icons/fi";
import { FiTrash2 } from "react-icons/fi";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
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

  const validateForm = () => {
    const errors = {};
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
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const userData = {
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
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        role: formData.role.trim() || null,
        status: formData.status
      };
      await updateUser(selectedUser.id, userData);
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
      await deleteUser(selectedUser.id);
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

  const resetForm = () => {
    setFormData({
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
                  {/* <Table.Head>ID</Table.Head> */}
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
                  <Table.Row key={user.id}>
                    {/* <Table.Cell>{user.id}</Table.Cell> */}
                    <Table.Cell>{user.name}</Table.Cell>
                    <Table.Cell>{user.email || '-'}</Table.Cell>
                    <Table.Cell>{user.role || '-'}</Table.Cell>
                    <Table.Cell>{getStatusBadge(user.status)}</Table.Cell>
                    <Table.Cell>{formatDate(user.created_at)}</Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        <button
                          onClick={() => openEditModal(user)}
                          className="btn-icon btn-edit"
                          title="Edit user"
                        >
                           <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="btn-icon btn-delete"
                          title="Delete user"
                        >
                          <FiTrash2 size={16} />
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
              <input
                type="text"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="e.g., Doctor, Nurse, Patient"
              />
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
              <input
                type="text"
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="e.g., Doctor, Nurse, Patient"
              />
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
    </div>
  );
};

export default Users;
