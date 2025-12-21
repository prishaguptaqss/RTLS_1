import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Buildings from './Buildings'; // Reuse existing Buildings component
import PermissionGate from '../components/PermissionGate';
import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization
} from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import './Organizations.css';

const Organizations = () => {
  const { reloadOrganizations } = useOrganization();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    org_id: '',
    name: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError('Failed to load organizations. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (isCreate = false) => {
    const errors = {};

    if (isCreate && !formData.org_id.trim()) {
      errors.org_id = 'Organization ID is required';
    } else if (isCreate && !/^[A-Za-z0-9_-]+$/.test(formData.org_id)) {
      errors.org_id = 'Organization ID can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    try {
      setSubmitting(true);
      await createOrganization({
        org_id: formData.org_id.trim(),
        name: formData.name.trim()
      });
      await loadOrganizations();
      await reloadOrganizations(); // Update the global organization context
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating organization:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to create organization';
      if (errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ org_id: 'Organization ID already exists. Please use a different ID.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    try {
      setSubmitting(true);
      await updateOrganization(selectedOrg.id, {
        name: formData.name.trim()
      });
      await loadOrganizations();
      await reloadOrganizations(); // Update the global organization context
      setIsEditModalOpen(false);
      resetForm();
      setSelectedOrg(null);
    } catch (err) {
      console.error('Error updating organization:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update organization' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      setSubmitting(true);
      await deleteOrganization(selectedOrg.id);
      await loadOrganizations();
      await reloadOrganizations(); // Update the global organization context
      setIsDeleteModalOpen(false);
      if (selectedOrg?.id === selectedOrg?.id) {
        setSelectedOrg(null); // Deselect if deleted
      }
      setSelectedOrg(null);
    } catch (err) {
      console.error('Error deleting organization:', err);
      alert(err.response?.data?.detail || 'Failed to delete organization');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (org) => {
    setSelectedOrg(org);
    setFormData({
      org_id: org.org_id,
      name: org.name
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (org) => {
    setSelectedOrg(org);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      org_id: '',
      name: ''
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

  const handleSelectOrganization = (org) => {
    setSelectedOrg(selectedOrg?.id === org.id ? null : org);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage organizations and their buildings</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">Loading organizations...</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage organizations and their buildings</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadOrganizations} className="btn btn-primary">
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
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage organizations and their buildings</p>
        </div>
        <PermissionGate permission="ORGANIZATION_CREATE">
          <button onClick={openCreateModal} className="btn btn-primary">
            + Create Organization
          </button>
        </PermissionGate>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <Card.Content>
            <div className="empty-state">
              <p>No organizations found. Create your first organization to get started.</p>
              <PermissionGate permission="ORGANIZATION_CREATE">
                <button onClick={openCreateModal} className="btn btn-primary" style={{marginTop:"20px"}}>
                  + Create Organization
                </button>
              </PermissionGate>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <>
          <div className="organizations-grid">
            {organizations.map((org) => (
              <div
                key={org.id}
                className={`organization-card ${selectedOrg?.id === org.id ? 'selected' : ''}`}
                onClick={() => handleSelectOrganization(org)}
              >
                <div className="org-card-header">
                  <div>
                    <h3 className="org-card-title">{org.name}</h3>
                    <p className="org-card-id">ID: {org.org_id}</p>
                  </div>
                  {selectedOrg?.id === org.id && (
                    <FiCheckCircle className="selected-icon" size={24} />
                  )}
                </div>
                <div className="org-card-actions" onClick={(e) => e.stopPropagation()}>
                  <PermissionGate permission="ORGANIZATION_EDIT">
                    <button
                      onClick={() => openEditModal(org)}
                      className="btn-icon btn-edit"
                      title="Edit organization"
                    >
                      <FiEdit2 size={16} />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="ORGANIZATION_DELETE">
                    <button
                      onClick={() => openDeleteModal(org)}
                      className="btn-icon btn-delete"
                      title="Delete organization"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>

          {selectedOrg && (
            <div className="buildings-section">
              <h2 className="section-title">Buildings for {selectedOrg.name}</h2>
              <Buildings organizationId={selectedOrg.id} />
            </div>
          )}
        </>
      )}

      {/* Create Organization Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsCreateModalOpen(false)}>
          Create New Organization
        </Modal.Header>
        <form onSubmit={handleCreateOrganization}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="org_id">
                Organization ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="org_id"
                name="org_id"
                value={formData.org_id}
                onChange={handleInputChange}
                placeholder="e.g., ORG-001, COMPANY-A"
                className={formErrors.org_id ? 'input-error' : ''}
                required
              />
              {formErrors.org_id && (
                <small className="error-text">{formErrors.org_id}</small>
              )}
              <small>Unique identifier for this organization</small>
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
                placeholder="Enter organization name"
                className={formErrors.name ? 'input-error' : ''}
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
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
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsEditModalOpen(false)}>
          Edit Organization
        </Modal.Header>
        <form onSubmit={handleUpdateOrganization}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit-org_id">Organization ID</label>
              <input
                type="text"
                id="edit-org_id"
                name="org_id"
                value={formData.org_id}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>Organization ID cannot be changed after creation</small>
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
                placeholder="Enter organization name"
                className={formErrors.name ? 'input-error' : ''}
                required
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
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
              {submitting ? 'Updating...' : 'Update Organization'}
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
          <p>Are you sure you want to delete this organization?</p>
          {selectedOrg && (
            <div className="delete-org-info">
              <strong>{selectedOrg.name}</strong> ({selectedOrg.org_id})
            </div>
          )}
          <p className="warning-text">
            This will also delete all buildings, floors, and rooms within this organization. This action cannot be undone.
          </p>
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
            onClick={handleDeleteOrganization}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Organization'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Organizations;
