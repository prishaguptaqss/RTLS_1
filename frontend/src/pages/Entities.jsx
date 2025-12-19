import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import {
  fetchEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  fetchEntityLocationHistory,
  fetchAvailableTags
} from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import './Entities.css';
import { FiEdit2, FiTrash2, FiClock, FiUserX } from "react-icons/fi";

const Entities = () => {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [entities, setEntities] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUntrackModalOpen, setIsUntrackModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState({
    entity_id: '',
    type: 'person',
    name: '',
    assigned_tag_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Only load entities when organization is loaded
    if (!orgLoading && currentOrganization) {
      loadEntities();
    }
  }, [typeFilter, orgLoading, currentOrganization]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEntities(typeFilter || null);
      setEntities(data);
    } catch (err) {
      console.error('Error loading entities:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load entities';
      setError(`Failed to load entities: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const data = await fetchAvailableTags();
      setAvailableTags(data);
    } catch (err) {
      console.error('Error loading available tags:', err);
      setAvailableTags([]);
    }
  };

  const validateForm = (isCreate = false) => {
    const errors = {};

    if (isCreate) {
      if (!formData.entity_id.trim()) {
        errors.entity_id = 'Entity ID is required';
      } else if (!/^[A-Za-z0-9_-]+$/.test(formData.entity_id)) {
        errors.entity_id = 'Entity ID can only contain letters, numbers, hyphens, and underscores';
      }
    }

    if (!formData.type) {
      errors.type = 'Entity type is required';
    }

    // Name is optional

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    // Ensure organization is loaded
    if (!currentOrganization) {
      setFormErrors({ submit: 'Please wait for organization to load...' });
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({}); // Clear previous errors
      const entityData = {
        entity_id: formData.entity_id.trim(),
        type: formData.type,
        name: formData.name.trim() || null,
        assigned_tag_id: formData.assigned_tag_id || null
      };
      await createEntity(entityData);
      await loadEntities();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating entity:', err);
      const errorDetail = err.response?.data?.detail || err.message || 'Failed to create entity';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('entity_id') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ entity_id: 'Entity ID already exists in this organization.' });
      } else if (errorDetail.toLowerCase().includes('organization')) {
        setFormErrors({ submit: 'Organization error: ' + errorDetail });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEntity = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    try {
      setSubmitting(true);
      const entityData = {
        name: formData.name.trim() || null,
        type: formData.type,
        assigned_tag_id: formData.assigned_tag_id || null
      };
      await updateEntity(selectedEntity.entity_id, entityData);
      await loadEntities();
      setIsEditModalOpen(false);
      resetForm();
      setSelectedEntity(null);
    } catch (err) {
      console.error('Error updating entity:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to update entity';
      setFormErrors({ submit: errorDetail });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntity = async () => {
    try {
      setSubmitting(true);
      await deleteEntity(selectedEntity.entity_id);
      await loadEntities();
      setIsDeleteModalOpen(false);
      setSelectedEntity(null);
    } catch (err) {
      console.error('Error deleting entity:', err);
      alert('Failed to delete entity');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = async () => {
    resetForm();
    await loadAvailableTags();
    setIsCreateModalOpen(true);
  };

  const openEditModal = async (entity) => {
    setSelectedEntity(entity);
    await loadAvailableTags();
    // Include currently assigned tag in available tags for edit
    setFormData({
      entity_id: entity.entity_id,
      name: entity.name || '',
      type: entity.type,
      assigned_tag_id: entity.assigned_tag_id || ''
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (entity) => {
    setSelectedEntity(entity);
    setIsDeleteModalOpen(true);
  };

  const openHistoryModal = async (entity) => {
    setSelectedEntity(entity);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await fetchEntityLocationHistory(entity.entity_id);
      setLocationHistory(data.history);
    } catch (err) {
      console.error('Error loading location history:', err);
      setLocationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openUntrackModal = (entity) => {
    setSelectedEntity(entity);
    setIsUntrackModalOpen(true);
  };

  const handleUntrackEntity = async () => {
    try {
      setSubmitting(true);
      // Update entity with assigned_tag_id set to null to unassign the tag
      const entityData = {
        name: selectedEntity.name,
        type: selectedEntity.type,
        assigned_tag_id: null
      };
      await updateEntity(selectedEntity.entity_id, entityData);
      await loadEntities();
      setIsUntrackModalOpen(false);
      setSelectedEntity(null);
    } catch (err) {
      console.error('Error untracking entity:', err);
      alert('Failed to untrack entity');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      entity_id: '',
      name: '',
      type: 'person',
      assigned_tag_id: ''
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

  const getTypeBadge = (type) => {
    const typeStyles = {
      person: 'badge-blue',
      material: 'badge-green'
    };
    return (
      <span className={`entity-type-badge ${typeStyles[type] || 'badge-gray'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getTrackingStatusBadge = (trackingStatus) => {
    return (
      <span className={`status-badge status-${trackingStatus === 'tracked' ? 'tracked' : 'untracked'}`}>
        {trackingStatus || 'not tracking'}
      </span>
    );
  };

  // Show loading state while organization or entities are loading
  if (orgLoading || (loading && !currentOrganization)) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Entities</h1>
          <p className="page-subtitle">Track persons and materials</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">
              {orgLoading ? 'Loading organization...' : 'Loading entities...'}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  // Show message if no organization selected
  if (!currentOrganization) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Entities</h1>
          <p className="page-subtitle">Track persons and materials</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>No organization selected. Please select an organization from the sidebar.</p>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Entities</h1>
          <p className="page-subtitle">Track persons and materials</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadEntities} className="btn btn-primary">
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
          <h1 className="page-title">Entities</h1>
          <p className="page-subtitle">Track persons and materials</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="person">Person</option>
              <option value="material">Material</option>
            </select>
          </div>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Add Entity
          </button>
        </div>
      </div>

      <Card>
        <Card.Content>
          {entities.length === 0 ? (
            <div className="empty-state">
              <p>No entities found. Add your first entity to get started.</p>
              <button onClick={openCreateModal} className="btn btn-primary">
                + Add Entity
              </button>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>ID</Table.Head>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Tag</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Current Location</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {entities.map((entity) => (
                  <Table.Row key={entity.entity_id}>
                    <Table.Cell><strong>{entity.entity_id}</strong></Table.Cell>
                    <Table.Cell>{entity.name || '-'}</Table.Cell>
                    <Table.Cell>{getTypeBadge(entity.type)}</Table.Cell>
                    <Table.Cell>
                      {entity.tag_name ? (
                        <code>{entity.tag_name}</code>
                      ) : (
                        <span className="text-muted">Not assigned</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>{getTrackingStatusBadge(entity.tracking_status)}</Table.Cell>
                    <Table.Cell>
                      {entity.current_location || '-'}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        {entity.assigned_tag_id && 
                        (<button
                          onClick={() => openHistoryModal(entity)}
                          className="btn-icon btn-info"
                          title="View location history"
                        >
                          <FiClock size={16} />
                        </button>)}
                        {entity.assigned_tag_id && (
                          <button
                            onClick={() => openUntrackModal(entity)}
                            className="btn-icon btn-warning"
                            title="Untrack entity (unassign tag)"
                          >
                            <FiUserX size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(entity)}
                          className="btn-icon btn-edit"
                          title="Edit entity"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(entity)}
                          className="btn-icon btn-delete"
                          title="Delete entity"
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

      {/* Create Entity Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsCreateModalOpen(false)}>
          Add New Entity
        </Modal.Header>
        <form onSubmit={handleCreateEntity}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="entity_id">
                Entity ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="entity_id"
                name="entity_id"
                value={formData.entity_id}
                onChange={handleInputChange}
                placeholder="e.g., ENT-001, MAT-123"
                className={formErrors.entity_id ? 'input-error' : ''}
                required
              />
              {formErrors.entity_id && (
                <small className="error-text">{formErrors.entity_id}</small>
              )}
              <small>Unique identifier for this entity</small>
            </div>

            <div className="form-group">
              <label htmlFor="type">
                Type <span className="required">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={formErrors.type ? 'input-error' : ''}
                required
              >
                <option value="person">Person</option>
                <option value="material">Material</option>
              </select>
              {formErrors.type && (
                <small className="error-text">{formErrors.type}</small>
              )}
              <small>Select entity type</small>
            </div>

            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter entity name (optional)"
                className={formErrors.name ? 'input-error' : ''}
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
              <small>Optional - Descriptive name for this entity</small>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_tag_id">Assign Tracking Tag</label>
              <select
                id="assigned_tag_id"
                name="assigned_tag_id"
                value={formData.assigned_tag_id}
                onChange={handleInputChange}
              >
                <option value="">No tag assigned</option>
                {availableTags.map((tag) => (
                  <option key={tag.tag_id} value={tag.tag_id}>
                    {tag.name || tag.tag_id}
                  </option>
                ))}
              </select>
              <small>Optional - Assign a BLE tag for location tracking</small>
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
              {submitting ? 'Creating...' : 'Create Entity'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Edit Entity Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsEditModalOpen(false)}>
          Edit Entity
        </Modal.Header>
        <form onSubmit={handleUpdateEntity}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit-entity_id">Entity ID</label>
              <input
                type="text"
                id="edit-entity_id"
                name="entity_id"
                value={formData.entity_id}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>Entity ID cannot be changed after creation</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit-type">
                Type <span className="required">*</span>
              </label>
              <select
                id="edit-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={formErrors.type ? 'input-error' : ''}
                required
              >
                <option value="person">Person</option>
                <option value="material">Material</option>
              </select>
              {formErrors.type && (
                <small className="error-text">{formErrors.type}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-name">Name</label>
              <input
                type="text"
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter entity name (optional)"
                className={formErrors.name ? 'input-error' : ''}
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
              <small>Optional - Descriptive name for this entity</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit-assigned_tag_id">Assign Tracking Tag</label>
              <select
                id="edit-assigned_tag_id"
                name="assigned_tag_id"
                value={formData.assigned_tag_id}
                onChange={handleInputChange}
              >
                <option value="">No tag assigned</option>
                {/* Show currently assigned tag even if not in available list */}
                {selectedEntity?.assigned_tag_id && !availableTags.find(t => t.tag_id === selectedEntity.assigned_tag_id) && (
                  <option value={selectedEntity.assigned_tag_id}>
                    {selectedEntity.tag_name || selectedEntity.assigned_tag_id} (Currently assigned)
                  </option>
                )}
                {availableTags.map((tag) => (
                  <option key={tag.tag_id} value={tag.tag_id}>
                    {tag.name || tag.tag_id}
                  </option>
                ))}
              </select>
              <small>Optional - Change or remove tag assignment</small>
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
              {submitting ? 'Updating...' : 'Update Entity'}
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
          <p>Are you sure you want to delete this entity?</p>
          {selectedEntity && (
            <div className="delete-entity-info">
              <strong>{selectedEntity.name || selectedEntity.entity_id}</strong> ({selectedEntity.entity_id})
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
            onClick={handleDeleteEntity}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Entity'}
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
          {selectedEntity && (
            <div style={{ fontSize: '0.9rem', fontWeight: 'normal', marginTop: '0.5rem', color: '#666' }}>
              {selectedEntity.name || selectedEntity.entity_id} ({selectedEntity.entity_id})
            </div>
          )}
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="loading-state">Loading location history...</div>
          ) : locationHistory.length === 0 ? (
            <div className="empty-state">
              <p>No location history found for this entity.</p>
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
                        <span className="status-badge status-admitted">Currently here</span>
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

      {/* Untrack Entity Modal */}
      <Modal isOpen={isUntrackModalOpen} onClose={() => setIsUntrackModalOpen(false)}>
        <Modal.Header onClose={() => setIsUntrackModalOpen(false)}>
          Unassign tag from Entity
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to stop tracking this entity?</p>
          {selectedEntity && (
            <div className="delete-entity-info">
              <strong>{selectedEntity.name || selectedEntity.entity_id}</strong> ({selectedEntity.entity_id})
              {selectedEntity.tag_name && (
                <div style={{ marginTop: '0.5rem' }}>
                  Currently tracked with tag: <code>{selectedEntity.tag_name || selectedEntity.assigned_tag_id}</code>
                </div>
              )}
            </div>
          )}
          <p className="warning-text" style={{ marginTop: '1rem' }}>
            This will unassign the tag from this entity. The tag will become available for assignment to other entities.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsUntrackModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleUntrackEntity}
            className="btn btn-warning"
            disabled={submitting}
          >
            {submitting ? 'Unassigning...' : 'Unassign tag'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Entities;
