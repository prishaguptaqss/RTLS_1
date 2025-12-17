import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import {
  fetchDevices, createDevice, updateDevice, deleteDevice,
  fetchTags, createTag, updateTag, deleteTag,
  fetchUsers, fetchBuildings, fetchFloors, fetchRooms
} from '../services/api';
import './Devices.css';
import { FiEdit2, FiTrash2, FiWifi, FiBluetooth } from "react-icons/fi";

const Devices = () => {
  // Anchors state
  const [anchors, setAnchors] = useState([]);
  const [loadingAnchors, setLoadingAnchors] = useState(true);
  const [isAnchorCreateModalOpen, setIsAnchorCreateModalOpen] = useState(false);
  const [isAnchorEditModalOpen, setIsAnchorEditModalOpen] = useState(false);
  const [isAnchorDeleteModalOpen, setIsAnchorDeleteModalOpen] = useState(false);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [anchorFormData, setAnchorFormData] = useState({
    anchor_id: '',
    room_id: null,
    status: 'active'
  });

  // Tags state
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [isTagCreateModalOpen, setIsTagCreateModalOpen] = useState(false);
  const [isTagEditModalOpen, setIsTagEditModalOpen] = useState(false);
  const [isTagDeleteModalOpen, setIsTagDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagFormData, setTagFormData] = useState({
    tag_id: '',
    assigned_user_id: null,
    status: 'active'
  });

  // Shared state
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [allFloors, setAllFloors] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [filteredFloors, setFilteredFloors] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    // Filter floors when building changes
    if (selectedBuilding) {
      const floors = allFloors.filter(f => f.building_id === parseInt(selectedBuilding));
      setFilteredFloors(floors);
    } else {
      setFilteredFloors([]);
    }
    setSelectedFloor('');
    setFilteredRooms([]);
  }, [selectedBuilding, allFloors]);

  useEffect(() => {
    // Filter rooms when floor changes
    if (selectedFloor) {
      const rooms = allRooms.filter(r => r.floor_id === parseInt(selectedFloor));
      setFilteredRooms(rooms);
    } else {
      setFilteredRooms([]);
    }
  }, [selectedFloor, allRooms]);

  const loadAllData = async () => {
    try {
      setError(null);
      await Promise.all([
        loadAnchors(),
        loadTags(),
        loadUsers(),
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

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
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
  const validateAnchorForm = (isCreate = false) => {
    const errors = {};
    if (isCreate && !anchorFormData.anchor_id.trim()) {
      errors.anchor_id = 'Anchor ID is required';
    }
    if (!anchorFormData.room_id) {
      errors.room_id = 'Please select a room location';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAnchor = async (e) => {
    e.preventDefault();
    if (!validateAnchorForm(true)) return;

    try {
      setSubmitting(true);
      const anchorData = {
        anchor_id: anchorFormData.anchor_id.trim(),
        room_id: parseInt(anchorFormData.room_id),
        status: anchorFormData.status
      };
      await createDevice(anchorData);
      await loadAnchors();
      setIsAnchorCreateModalOpen(false);
      resetAnchorForm();
    } catch (err) {
      console.error('Error creating anchor:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to create anchor' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAnchor = async (e) => {
    e.preventDefault();
    if (!validateAnchorForm(false)) return;

    try {
      setSubmitting(true);
      const anchorData = {
        room_id: parseInt(anchorFormData.room_id),
        status: anchorFormData.status
      };
      await updateDevice(selectedAnchor.anchor_id, anchorData);
      await loadAnchors();
      setIsAnchorEditModalOpen(false);
      resetAnchorForm();
      setSelectedAnchor(null);
    } catch (err) {
      console.error('Error updating anchor:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update anchor' });
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
      alert('Failed to delete anchor');
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
    // Find the room's floor and building to preset the dropdowns
    const room = allRooms.find(r => r.id === anchor.room_id);
    if (room) {
      const floor = allFloors.find(f => f.id === room.floor_id);
      if (floor) {
        setSelectedBuilding(floor.building_id.toString());
        setSelectedFloor(floor.id.toString());
      }
    }
    setAnchorFormData({
      anchor_id: anchor.anchor_id,
      room_id: anchor.room_id,
      status: anchor.status
    });
    setFormErrors({});
    setIsAnchorEditModalOpen(true);
  };

  const openAnchorDeleteModal = (anchor) => {
    setSelectedAnchor(anchor);
    setIsAnchorDeleteModalOpen(true);
  };

  const resetAnchorForm = () => {
    setAnchorFormData({
      anchor_id: '',
      room_id: null,
      status: 'active'
    });
    setSelectedBuilding('');
    setSelectedFloor('');
    setFilteredFloors([]);
    setFilteredRooms([]);
    setFormErrors({});
  };

  // Tag handlers
  const validateTagForm = (isCreate = false) => {
    const errors = {};
    if (isCreate && !tagFormData.tag_id.trim()) {
      errors.tag_id = 'Tag ID is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!validateTagForm(true)) return;

    try {
      setSubmitting(true);
      const tagData = {
        tag_id: tagFormData.tag_id.trim(),
        assigned_user_id: tagFormData.assigned_user_id || null,
        status: tagFormData.status
      };
      await createTag(tagData);
      await loadTags();
      setIsTagCreateModalOpen(false);
      resetTagForm();
    } catch (err) {
      console.error('Error creating tag:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to create tag' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTag = async (e) => {
    e.preventDefault();
    if (!validateTagForm(false)) return;

    try {
      setSubmitting(true);
      const tagData = {
        assigned_user_id: tagFormData.assigned_user_id || null,
        status: tagFormData.status
      };
      await updateTag(selectedTag.tag_id, tagData);
      await loadTags();
      setIsTagEditModalOpen(false);
      resetTagForm();
      setSelectedTag(null);
    } catch (err) {
      console.error('Error updating tag:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update tag' });
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
      alert('Failed to delete tag');
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
    setTagFormData({
      tag_id: tag.tag_id,
      assigned_user_id: tag.assigned_user_id || '',
      status: tag.status
    });
    setFormErrors({});
    setIsTagEditModalOpen(true);
  };

  const openTagDeleteModal = (tag) => {
    setSelectedTag(tag);
    setIsTagDeleteModalOpen(true);
  };

  const resetTagForm = () => {
    setTagFormData({
      tag_id: '',
      assigned_user_id: null,
      status: 'active'
    });
    setFormErrors({});
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`status-badge status-${status}`}>
        {status}
      </span>
    );
  };

  const getRoomLocationText = (roomId) => {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) return 'Unknown Location';

    const floor = allFloors.find(f => f.id === room.floor_id);
    if (!floor) return room.room_name;

    const building = buildings.find(b => b.id === floor.building_id);
    if (!building) return `Floor ${floor.floor_number} > ${room.room_name}`;

    return `${building.name} > Floor ${floor.floor_number} > ${room.room_name}`;
  };

  const getUserDisplayText = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.user_id === userId);
    return user ? `${user.user_id} - ${user.name}` : userId;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">Manage anchors and tags</p>
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
          <p className="page-subtitle">Manage ESP32 anchors and BLE tags</p>
        </div>
      </div>

      {/* Anchors Section */}
      <Card className="devices-section">
        <Card.Header>
          <div className="section-header">
            <div>
              <div className="section-title">
                <FiWifi size={20} />
                <h2>Anchors (ESP32 Devices)</h2>
              </div>
              <p className="section-subtitle">{anchors.length} anchors configured</p>
            </div>
            <button onClick={openAnchorCreateModal} className="btn btn-primary">
              + Add Anchor
            </button>
          </div>
        </Card.Header>
        <Card.Content>
          {loadingAnchors ? (
            <div className="loading-state">Loading anchors...</div>
          ) : anchors.length === 0 ? (
            <div className="empty-state">
              <p>No anchors found. Add your first anchor to get started.</p>
              <button onClick={openAnchorCreateModal} className="btn btn-primary">
                + Add Anchor
              </button>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Anchor ID</Table.Head>
                  <Table.Head>Location</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Last Seen</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {anchors.map((anchor) => (
                  <Table.Row key={anchor.anchor_id}>
                    <Table.Cell><code>{anchor.anchor_id}</code></Table.Cell>
                    <Table.Cell>{getRoomLocationText(anchor.room_id)}</Table.Cell>
                    <Table.Cell>{getStatusBadge(anchor.status)}</Table.Cell>
                    <Table.Cell>{formatDate(anchor.last_seen)}</Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        <button
                          onClick={() => openAnchorEditModal(anchor)}
                          className="btn-icon btn-edit"
                          title="Edit anchor"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => openAnchorDeleteModal(anchor)}
                          className="btn-icon btn-delete"
                          title="Delete anchor"
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

      {/* Tags Section */}
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
            <button onClick={openTagCreateModal} className="btn btn-primary">
              + Add Tag
            </button>
          </div>
        </Card.Header>
        <Card.Content>
          {loadingTags ? (
            <div className="loading-state">Loading tags...</div>
          ) : tags.length === 0 ? (
            <div className="empty-state">
              <p>No tags found. Add your first tag to get started.</p>
              <button onClick={openTagCreateModal} className="btn btn-primary">
                + Add Tag
              </button>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Tag ID</Table.Head>
                  <Table.Head>Assigned User</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Last Seen</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {tags.map((tag) => (
                  <Table.Row key={tag.tag_id}>
                    <Table.Cell><code>{tag.tag_id}</code></Table.Cell>
                    <Table.Cell>{getUserDisplayText(tag.assigned_user_id)}</Table.Cell>
                    <Table.Cell>{getStatusBadge(tag.status)}</Table.Cell>
                    <Table.Cell>{formatDate(tag.last_seen)}</Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        <button
                          onClick={() => openTagEditModal(tag)}
                          className="btn-icon btn-edit"
                          title="Edit tag"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => openTagDeleteModal(tag)}
                          className="btn-icon btn-delete"
                          title="Delete tag"
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
                onChange={(e) => setAnchorFormData(prev => ({ ...prev, anchor_id: e.target.value }))}
                placeholder="e.g., ESP32-001"
                required
              />
              {formErrors.anchor_id && (
                <small className="error-text">{formErrors.anchor_id}</small>
              )}
              <small>Unique identifier for this anchor device</small>
            </div>

            <div className="form-group">
              <label htmlFor="building">
                Building <span className="required">*</span>
              </label>
              <select
                id="building"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                required
              >
                <option value="">Select Building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              <small>Select the building where this anchor is located</small>
            </div>

            <div className="form-group">
              <label htmlFor="floor">
                Floor <span className="required">*</span>
              </label>
              <select
                id="floor"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                disabled={!selectedBuilding}
                required
              >
                <option value="">Select Floor</option>
                {filteredFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Floor {floor.floor_number}
                  </option>
                ))}
              </select>
              <small>Select the floor on the chosen building</small>
            </div>

            <div className="form-group">
              <label htmlFor="room">
                Room <span className="required">*</span>
              </label>
              <select
                id="room"
                value={anchorFormData.room_id || ''}
                onChange={(e) => setAnchorFormData(prev => ({ ...prev, room_id: parseInt(e.target.value) }))}
                disabled={!selectedFloor}
                required
              >
                <option value="">Select Room</option>
                {filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_name}
                  </option>
                ))}
              </select>
              {formErrors.room_id && (
                <small className="error-text">{formErrors.room_id}</small>
              )}
              <small>Select the specific room for this anchor</small>
            </div>

            <div className="form-group">
              <label htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={anchorFormData.status}
                onChange={(e) => setAnchorFormData(prev => ({ ...prev, status: e.target.value }))}
                required
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
              </select>
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
              {submitting ? 'Creating...' : 'Create Anchor'}
            </button>
          </Modal.Footer>
        </form>
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
              <label htmlFor="edit-anchor_id">Anchor ID</label>
              <input
                type="text"
                id="edit-anchor_id"
                value={anchorFormData.anchor_id}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>Anchor ID cannot be changed</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit-building">
                Building <span className="required">*</span>
              </label>
              <select
                id="edit-building"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                required
              >
                <option value="">Select Building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-floor">
                Floor <span className="required">*</span>
              </label>
              <select
                id="edit-floor"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                disabled={!selectedBuilding}
                required
              >
                <option value="">Select Floor</option>
                {filteredFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Floor {floor.floor_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-room">
                Room <span className="required">*</span>
              </label>
              <select
                id="edit-room"
                value={anchorFormData.room_id || ''}
                onChange={(e) => setAnchorFormData(prev => ({ ...prev, room_id: parseInt(e.target.value) }))}
                disabled={!selectedFloor}
                required
              >
                <option value="">Select Room</option>
                {filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_name}
                  </option>
                ))}
              </select>
              {formErrors.room_id && (
                <small className="error-text">{formErrors.room_id}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-status">
                Status <span className="required">*</span>
              </label>
              <select
                id="edit-status"
                value={anchorFormData.status}
                onChange={(e) => setAnchorFormData(prev => ({ ...prev, status: e.target.value }))}
                required
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
              </select>
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
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this anchor?</p>
          {selectedAnchor && (
            <div className="delete-info">
              <strong>{selectedAnchor.anchor_id}</strong>
              <div>{getRoomLocationText(selectedAnchor.room_id)}</div>
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsAnchorDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAnchor}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Anchor'}
          </button>
        </Modal.Footer>
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
                Tag ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="tag_id"
                name="tag_id"
                value={tagFormData.tag_id}
                onChange={(e) => setTagFormData(prev => ({ ...prev, tag_id: e.target.value }))}
                placeholder="e.g., E0:C0:74:C6:AD:C8"
                required
              />
              {formErrors.tag_id && (
                <small className="error-text">{formErrors.tag_id}</small>
              )}
              <small>BLE MAC address of the tag</small>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_user">Assigned User</label>
              <select
                id="assigned_user"
                value={tagFormData.assigned_user_id || ''}
                onChange={(e) => setTagFormData(prev => ({ ...prev, assigned_user_id: e.target.value || null }))}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_id} - {user.name}
                  </option>
                ))}
              </select>
              <small>Optional - Assign this tag to a user</small>
            </div>

            <div className="form-group">
              <label htmlFor="tag-status">
                Status <span className="required">*</span>
              </label>
              <select
                id="tag-status"
                value={tagFormData.status}
                onChange={(e) => setTagFormData(prev => ({ ...prev, status: e.target.value }))}
                required
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
              </select>
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
              {submitting ? 'Creating...' : 'Create Tag'}
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
              <label htmlFor="edit-tag_id">Tag ID</label>
              <input
                type="text"
                id="edit-tag_id"
                value={tagFormData.tag_id}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>Tag ID cannot be changed</small>
            </div>

            <div className="form-group">
              <label htmlFor="edit-assigned_user">Assigned User</label>
              <select
                id="edit-assigned_user"
                value={tagFormData.assigned_user_id || ''}
                onChange={(e) => setTagFormData(prev => ({ ...prev, assigned_user_id: e.target.value || null }))}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_id} - {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-tag-status">
                Status <span className="required">*</span>
              </label>
              <select
                id="edit-tag-status"
                value={tagFormData.status}
                onChange={(e) => setTagFormData(prev => ({ ...prev, status: e.target.value }))}
                required
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
              </select>
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
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this tag?</p>
          {selectedTag && (
            <div className="delete-info">
              <strong>{selectedTag.tag_id}</strong>
              <div>Assigned to: {getUserDisplayText(selectedTag.assigned_user_id)}</div>
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsTagDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteTag}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Tag'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Devices;
