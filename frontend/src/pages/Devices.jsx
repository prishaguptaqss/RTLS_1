import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import PermissionGate from '../components/PermissionGate';
import {
  fetchDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  fetchEntities,
  fetchBuildings,
  fetchFloors,
  fetchRooms
} from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import './Devices.css';
import { FiWifi, FiBluetooth, FiEdit2, FiTrash2 } from "react-icons/fi";

const Devices = () => {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState('anchors');

  // Anchors state
  const [anchors, setAnchors] = useState([]);
  const [loadingAnchors, setLoadingAnchors] = useState(true);
  const [isAnchorCreateModalOpen, setIsAnchorCreateModalOpen] = useState(false);
  const [isAnchorEditModalOpen, setIsAnchorEditModalOpen] = useState(false);
  const [isAnchorDeleteModalOpen, setIsAnchorDeleteModalOpen] = useState(false);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [anchorFormData, setAnchorFormData] = useState({ anchor_id: '', room_id: '' });

  // Tags state
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [isTagCreateModalOpen, setIsTagCreateModalOpen] = useState(false);
  const [isTagEditModalOpen, setIsTagEditModalOpen] = useState(false);
  const [isTagDeleteModalOpen, setIsTagDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagFormData, setTagFormData] = useState({ tag_id: '', name: '', assigned_entity_id: '' });

  // Shared state
  const [entities, setEntities] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [allFloors, setAllFloors] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadAllData();
    }
  }, [orgLoading, currentOrganization]);

  const loadAllData = async () => {
    try {
      setError(null);
      await Promise.all([
        loadAnchors(),
        loadTags(),
        loadEntities(),
        loadBuildingsFloorsRooms()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please check if the backend is running.');
    }
  };

  const loadAnchors = async () => {
    try {
      setLoadingAnchors(true);
      const data = await fetchDevices();
      setAnchors(data);
    } catch (err) {
      console.error('Error loading anchors:', err);
    } finally {
      setLoadingAnchors(false);
    }
  };

  const loadTags = async () => {
    try {
      setLoadingTags(true);
      const data = await fetchTags();
      setTags(data);
    } catch (err) {
      console.error('Error loading tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const loadEntities = async () => {
    try {
      const data = await fetchEntities();
      setEntities(data);
    } catch (err) {
      console.error('Error loading entities:', err);
    }
  };

  const loadBuildingsFloorsRooms = async () => {
    try {
      const [buildingsData, floorsData, roomsData] = await Promise.all([
        fetchBuildings(),
        fetchFloors(),
        fetchRooms()
      ]);
      setBuildings(buildingsData);
      setAllFloors(floorsData);
      setAllRooms(roomsData);
    } catch (err) {
      console.error('Error loading buildings/floors/rooms:', err);
    }
  };

  // Anchor handlers
  const validateAnchorForm = () => {
    const errors = {};
    if (!anchorFormData.anchor_id.trim()) {
      errors.anchor_id = 'Anchor ID is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAnchor = async (e) => {
    e.preventDefault();
    if (!validateAnchorForm()) return;

    try {
      setSubmitting(true);
      const anchorData = {
        anchor_id: anchorFormData.anchor_id.trim(),
        room_id: anchorFormData.room_id ? parseInt(anchorFormData.room_id) : null,
        status: 'active'
      };
      await createDevice(anchorData);
      await loadAnchors();
      setIsAnchorCreateModalOpen(false);
      resetAnchorForm();
    } catch (err) {
      console.error('Error creating anchor:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to create anchor';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('anchor_id') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ anchor_id: 'Anchor ID already exists. Please use a different ID.' });
      } else if (errorDetail.toLowerCase().includes('duplicate') || errorDetail.toLowerCase().includes('unique')) {
        setFormErrors({ anchor_id: 'Anchor ID already exists. Please use a different ID.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openAnchorCreateModal = () => {
    resetAnchorForm();
    setIsAnchorCreateModalOpen(true);
  };

  const openAnchorEditModal = (anchor) => {
    setSelectedAnchor(anchor);
    setAnchorFormData({ anchor_id: anchor.anchor_id });
    setFormErrors({});
    setIsAnchorEditModalOpen(true);
  };

  const openAnchorDeleteModal = (anchor) => {
    setSelectedAnchor(anchor);
    setIsAnchorDeleteModalOpen(true);
  };

  const handleUpdateAnchor = async (e) => {
    e.preventDefault();
    if (!validateAnchorForm()) return;

    try {
      setSubmitting(true);
      const anchorData = {
        anchor_id: anchorFormData.anchor_id.trim(),
        room_id: selectedAnchor.room_id,
        status: selectedAnchor.status
      };
      await updateDevice(selectedAnchor.anchor_id, anchorData);
      await loadAnchors();
      setIsAnchorEditModalOpen(false);
      resetAnchorForm();
      setSelectedAnchor(null);
    } catch (err) {
      console.error('Error updating anchor:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to update anchor';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('anchor_id') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ anchor_id: 'Anchor ID already exists. Please use a different ID.' });
      } else if (errorDetail.toLowerCase().includes('duplicate') || errorDetail.toLowerCase().includes('unique')) {
        setFormErrors({ anchor_id: 'Anchor ID already exists. Please use a different ID.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnchor = async () => {
    try {
      setSubmitting(true);
      await deleteDevice(selectedAnchor.anchor_id);
      await loadAnchors();
      setIsAnchorDeleteModalOpen(false);
      setSelectedAnchor(null);
    } catch (err) {
      console.error('Error deleting anchor:', err);
      alert(err.response?.data?.detail || 'Failed to delete anchor');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAnchorForm = () => {
    setAnchorFormData({ anchor_id: '', room_id: '' });
    setFormErrors({});
  };

  // Tag handlers
  const validateTagForm = () => {
    const errors = {};
    if (!tagFormData.tag_id.trim()) {
      errors.tag_id = 'Tag ID (MAC Address) is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!validateTagForm()) return;

    try {
      setSubmitting(true);
      const tagData = {
        tag_id: tagFormData.tag_id.trim(),
        name: tagFormData.name.trim() || null,
        assigned_user_id: null,
        assigned_entity_id: tagFormData.assigned_entity_id ? parseInt(tagFormData.assigned_entity_id) : null,
        status: 'active'
      };
      await createTag(tagData);
      await loadTags();
      await loadEntities(); // Reload entities to update assignment status
      setIsTagCreateModalOpen(false);
      resetTagForm();
    } catch (err) {
      console.error('Error creating tag:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to create tag';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('tag_id') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ tag_id: 'Tag ID already exists. Please use a different ID.' });
      } else if (errorDetail.toLowerCase().includes('name') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ name: 'Tag name already exists. Please use a different name.' });
      } else if (errorDetail.toLowerCase().includes('duplicate') || errorDetail.toLowerCase().includes('unique')) {
        setFormErrors({ tag_id: 'Tag ID already exists. Please use a different ID.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openTagCreateModal = () => {
    resetTagForm();
    setIsTagCreateModalOpen(true);
  };

  const openTagEditModal = (tag) => {
    setSelectedTag(tag);
    setTagFormData({ tag_id: tag.tag_id, name: tag.name || '' });
    setFormErrors({});
    setIsTagEditModalOpen(true);
  };

  const openTagDeleteModal = (tag) => {
    setSelectedTag(tag);
    setIsTagDeleteModalOpen(true);
  };

  const handleUpdateTag = async (e) => {
    e.preventDefault();
    if (!validateTagForm()) return;

    try {
      setSubmitting(true);
      const tagData = {
        tag_id: tagFormData.tag_id.trim(),
        name: tagFormData.name.trim() || null,
        assigned_user_id: selectedTag.assigned_user_id,
        assigned_entity_id: selectedTag.assigned_entity_id,
        status: selectedTag.status
      };
      await updateTag(selectedTag.tag_id, tagData);
      await loadTags();
      setIsTagEditModalOpen(false);
      resetTagForm();
      setSelectedTag(null);
    } catch (err) {
      console.error('Error updating tag:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to update tag';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('tag_id') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ tag_id: 'Tag ID already exists. Please use a different ID.' });
      } else if (errorDetail.toLowerCase().includes('name') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ name: 'Tag name already exists. Please use a different name.' });
      } else if (errorDetail.toLowerCase().includes('duplicate') || errorDetail.toLowerCase().includes('unique')) {
        setFormErrors({ tag_id: 'Tag ID already exists. Please use a different ID.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    try {
      setSubmitting(true);
      await deleteTag(selectedTag.tag_id);
      await loadTags();
      setIsTagDeleteModalOpen(false);
      setSelectedTag(null);
    } catch (err) {
      console.error('Error deleting tag:', err);
      alert(err.response?.data?.detail || 'Failed to delete tag');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTagForm = () => {
    setTagFormData({ tag_id: '', name: '', assigned_entity_id: '' });
    setFormErrors({});
  };

  const getAssignmentStatus = (tag) => {
    if (tag.assigned_entity_id) {
      const entity = entities.find(e => e.id === tag.assigned_entity_id);
      if (entity) {
        return {
          status: 'assigned',
          details: `${entity.name} (ID: ${entity.entity_id})`
        };
      }
      return {
        status: 'assigned',
        details: `Entity ID: ${tag.assigned_entity_id}`
      };
    }
    return {
      status: 'unassigned',
      details: '-'
    };
  };

  const getRoomLocationText = (roomId) => {
    if (!roomId) return 'Not assigned to any room';

    const room = allRooms.find(r => r.id === roomId);
    if (!room) return 'Unknown Location';

    const floor = allFloors.find(f => f.id === room.floor_id);
    if (!floor) return room.room_name;

    const building = buildings.find(b => b.id === floor.building_id);
    if (!building) return `Floor ${floor.floor_number} > ${room.room_name}`;

    return `${building.name} > Floor ${floor.floor_number} > ${room.room_name}`;
  };

  // Get available rooms (not assigned to any anchor)
  const getAvailableRooms = () => {
    const assignedRoomIds = anchors
      .filter(a => a.room_id !== null)
      .map(a => a.room_id);
    return allRooms.filter(room => !assignedRoomIds.includes(room.id));
  };

  // Get unassigned entities (no tag assigned)
  const getUnassignedEntities = () => {
    return entities.filter(entity => !entity.assigned_tag_id);
  };

  if (orgLoading || (loadingAnchors && loadingTags && !currentOrganization)) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">Manage anchors and BLE tags</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">
              {orgLoading ? 'Loading organization...' : 'Loading devices...'}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">Manage anchors and BLE tags</p>
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
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">Manage anchors and BLE tags</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadAllData} className="btn btn-primary">
                Retry
              </button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container devices-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">Manage anchors and BLE tags</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'anchors' ? 'active' : ''}`}
          onClick={() => setActiveTab('anchors')}
        >
          <FiWifi size={18} />
          Anchors
        </button>
        <button
          className={`tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <FiBluetooth size={18} />
          Tags
        </button>
      </div>

      {/* Anchors Tab */}
      {activeTab === 'anchors' && (
        <Card className="devices-section">
          <Card.Header>
            <div className="section-header">
              <div>
                <div className="section-title">
                  <FiWifi size={20} />
                  <h2>Anchors (Devices)</h2>
                </div>
                <p className="section-subtitle">{anchors.length} anchors configured</p>
              </div>
              <PermissionGate permission="DEVICE_CREATE">
                <button onClick={openAnchorCreateModal} className="btn btn-primary">
                  + Add Anchor
                </button>
              </PermissionGate>
            </div>
          </Card.Header>
          <Card.Content>
            {loadingAnchors ? (
              <div className="loading-state">Loading anchors...</div>
            ) : anchors.length === 0 ? (
              <div className="empty-state">
                <p style={{marginBottom:"20px"}}>No anchors found. Add your first anchor to get started.</p>
                <PermissionGate permission="DEVICE_CREATE">
                  <button onClick={openAnchorCreateModal} className="btn btn-primary">
                    + Add Anchor
                  </button>
                </PermissionGate>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Anchor ID</Table.Head>
                    <Table.Head>Location</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {anchors.map((anchor) => {
                    const isActive = anchor.room_id !== null;
                    const statusText = isActive ? 'active' : 'inactive';
                    return (
                      <Table.Row key={anchor.anchor_id}>
                        <Table.Cell><code>{anchor.anchor_id}</code></Table.Cell>
                        <Table.Cell>
                          {isActive ? getRoomLocationText(anchor.room_id) : '-'}
                        </Table.Cell>
                        <Table.Cell>
                          <span className={`status-badge status-${statusText}`}>
                            {statusText}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="action-buttons">
                            <PermissionGate permission="DEVICE_EDIT">
                              <button
                                onClick={() => openAnchorEditModal(anchor)}
                                className="btn-icon btn-edit"
                                title="Edit anchor"
                              >
                                <FiEdit2 size={16} />
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="DEVICE_DELETE">
                              <button
                                onClick={() => openAnchorDeleteModal(anchor)}
                                className="btn-icon btn-delete"
                                title="Delete anchor"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </PermissionGate>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <Card className="devices-section">
          <Card.Header>
            <div className="section-header">
              <div>
                <div className="section-title">
                  <FiBluetooth size={20} />
                  <h2>Tags (BLE Beacons)</h2>
                </div>
                <p className="section-subtitle">{tags.length} tags configured</p>
              </div>
              <PermissionGate permission="DEVICE_CREATE">
                <button onClick={openTagCreateModal} className="btn btn-primary">
                  + Add Tag
                </button>
              </PermissionGate>
            </div>
          </Card.Header>
          <Card.Content>
            {loadingTags ? (
              <div className="loading-state">Loading tags...</div>
            ) : tags.length === 0 ? (
              <div className="empty-state">
                <p style={{marginBottom:"20px"}}>No tags found. Add your first tag to get started.</p>
                <PermissionGate permission="DEVICE_CREATE">
                  <button onClick={openTagCreateModal} className="btn btn-primary">
                    + Add Tag
                  </button>
                </PermissionGate>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Tag ID</Table.Head>
                    <Table.Head>Name</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Assigned To</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tags.map((tag) => {
                    const assignment = getAssignmentStatus(tag);
                    return (
                      <Table.Row key={tag.tag_id}>
                        <Table.Cell><code>{tag.tag_id}</code></Table.Cell>
                        <Table.Cell>{tag.name || <span className="text-muted">-</span>}</Table.Cell>
                        <Table.Cell>
                          <span className={`status-badge status-${assignment.status}`}>
                            {assignment.status}
                          </span>
                        </Table.Cell>
                        <Table.Cell>{assignment.details}</Table.Cell>
                        <Table.Cell>
                          <div className="action-buttons">
                            <PermissionGate permission="DEVICE_EDIT">
                              <button
                                onClick={() => openTagEditModal(tag)}
                                className="btn-icon btn-edit"
                                title="Edit tag"
                              >
                                <FiEdit2 size={16} />
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="DEVICE_DELETE">
                              <button
                                onClick={() => openTagDeleteModal(tag)}
                                className="btn-icon btn-delete"
                                title="Delete tag"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </PermissionGate>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Anchor Create Modal */}
      <Modal isOpen={isAnchorCreateModalOpen} onClose={() => setIsAnchorCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsAnchorCreateModalOpen(false)}>
          Add New Anchor
        </Modal.Header>
        <form onSubmit={handleCreateAnchor}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="anchor_id">
                Anchor ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="anchor_id"
                name="anchor_id"
                value={anchorFormData.anchor_id}
                onChange={(e) => setAnchorFormData({ ...anchorFormData, anchor_id: e.target.value })}
                placeholder="e.g. ANCHOR-A1, Room 101"
                required
              />
              {formErrors.anchor_id && (
                <small className="error-text">{formErrors.anchor_id}</small>
              )}
              <small>Unique identifier for this anchor device.</small>
            </div>

            <div className="form-group">
              <label htmlFor="room_id">Assign to Room (Optional)</label>
              <select
                id="room_id"
                name="room_id"
                value={anchorFormData.room_id}
                onChange={(e) => setAnchorFormData({ ...anchorFormData, room_id: e.target.value })}
              >
                <option value="">No room assigned</option>
                {getAvailableRooms().map((room) => {
                  const floor = allFloors.find(f => f.id === room.floor_id);
                  const building = buildings.find(b => b.id === floor?.building_id);
                  const locationText = building && floor
                    ? `${building.name} > Floor ${floor.floor_number} > ${room.room_name}`
                    : room.room_name;
                  return (
                    <option key={room.id} value={room.id}>
                      {locationText}
                    </option>
                  );
                })}
              </select>
              <small>Select which room this anchor will be placed in. Only unassigned rooms are shown.</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsAnchorCreateModalOpen(false)}
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
              {submitting ? 'Adding...' : 'Add Anchor'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Tag Create Modal */}
      <Modal isOpen={isTagCreateModalOpen} onClose={() => setIsTagCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsTagCreateModalOpen(false)}>
          Add New Tag
        </Modal.Header>
        <form onSubmit={handleCreateTag}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="tag_id">
                Tag ID (MAC Address) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="tag_id"
                name="tag_id"
                value={tagFormData.tag_id}
                onChange={(e) => setTagFormData({ ...tagFormData, tag_id: e.target.value })}
                placeholder="e.g., E0:C0:74:C6:AD:C8"
                required
              />
              {formErrors.tag_id && (
                <small className="error-text">{formErrors.tag_id}</small>
              )}
              <small>BLE MAC address of the tag.</small>
            </div>

            <div className="form-group">
              <label htmlFor="tag_name">Tag Name (Optional)</label>
              <input
                type="text"
                id="tag_name"
                name="name"
                value={tagFormData.name}
                onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                placeholder="e.g., Tag A, Tag 1"
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
              <small>Optional unique name for easy identification of the tag.</small>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_entity_id">Assign to Entity (Optional)</label>
              <select
                id="assigned_entity_id"
                name="assigned_entity_id"
                value={tagFormData.assigned_entity_id}
                onChange={(e) => setTagFormData({ ...tagFormData, assigned_entity_id: e.target.value })}
              >
                <option value="">No entity assigned</option>
                {getUnassignedEntities().map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} (ID: {entity.entity_id})
                  </option>
                ))}
              </select>
              <small>Select which entity this tag will be assigned to. Only unassigned active entities are shown.</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsTagCreateModalOpen(false)}
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
              {submitting ? 'Adding...' : 'Add Tag'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Tag Edit Modal */}
      <Modal isOpen={isTagEditModalOpen} onClose={() => setIsTagEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsTagEditModalOpen(false)}>
          Edit Tag
        </Modal.Header>
        <form onSubmit={handleUpdateTag}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit_tag_id">
                Tag ID (MAC Address) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="edit_tag_id"
                name="tag_id"
                value={tagFormData.tag_id}
                onChange={(e) => setTagFormData({ ...tagFormData, tag_id: e.target.value })}
                placeholder="e.g., E0:C0:74:C6:AD:C8"
                required
              />
              {formErrors.tag_id && (
                <small className="error-text">{formErrors.tag_id}</small>
              )}
              <small>BLE MAC address of the tag.</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit_tag_name">Tag Name (Optional)</label>
              <input
                type="text"
                id="edit_tag_name"
                name="name"
                value={tagFormData.name}
                onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                placeholder="e.g., Tag A, Tag 1"
              />
              {formErrors.name && (
                <small className="error-text">{formErrors.name}</small>
              )}
              <small>Optional unique name for easy identification of the tag.</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsTagEditModalOpen(false)}
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
              {submitting ? 'Updating...' : 'Update Tag'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Tag Delete Modal */}
      <Modal isOpen={isTagDeleteModalOpen} onClose={() => setIsTagDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsTagDeleteModalOpen(false)}>
          Delete Tag
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this tag?</p>
          {selectedTag && (
            <div className="delete-confirmation">
              <strong>Tag ID:</strong> <code>{selectedTag.tag_id}</code>
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setIsTagDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteTag}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Tag'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Anchor Edit Modal */}
      <Modal isOpen={isAnchorEditModalOpen} onClose={() => setIsAnchorEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsAnchorEditModalOpen(false)}>
          Edit Anchor
        </Modal.Header>
        <form onSubmit={handleUpdateAnchor}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}

            <div className="form-group">
              <label htmlFor="edit_anchor_id">
                Anchor ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="edit_anchor_id"
                name="anchor_id"
                value={anchorFormData.anchor_id}
                onChange={(e) => setAnchorFormData({ anchor_id: e.target.value })}
                placeholder="e.g. ANCHOR-A1"
                required
              />
              {formErrors.anchor_id && (
                <small className="error-text">{formErrors.anchor_id}</small>
              )}
              <small>Unique identifier for this anchor device.</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsAnchorEditModalOpen(false)}
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
              {submitting ? 'Updating...' : 'Update Anchor'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Anchor Delete Modal */}
      <Modal isOpen={isAnchorDeleteModalOpen} onClose={() => setIsAnchorDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsAnchorDeleteModalOpen(false)}>
          Delete Anchor
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this anchor?</p>
          {selectedAnchor && (
            <div className="delete-confirmation">
              <strong>Anchor ID:</strong> <code>{selectedAnchor.anchor_id}</code>
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setIsAnchorDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteAnchor}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Anchor'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Devices;
