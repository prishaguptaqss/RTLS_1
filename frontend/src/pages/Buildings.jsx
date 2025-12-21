import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import PermissionGate from '../components/PermissionGate';
import { FiEdit2 } from "react-icons/fi";
import { FiTrash2 } from "react-icons/fi";

import {
  fetchBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  fetchFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  fetchRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  fetchUnassignedDevices
} from '../services/api';
import './Buildings.css';

const Buildings = ({ organizationId }) => {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [allFloors, setAllFloors] = useState([]); // All floors from all buildings
  const [rooms, setRooms] = useState([]);
  const [unassignedAnchors, setUnassignedAnchors] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [floorsLoading, setFloorsLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Building modals
  const [isBuildingCreateModalOpen, setIsBuildingCreateModalOpen] = useState(false);
  const [isBuildingEditModalOpen, setIsBuildingEditModalOpen] = useState(false);
  const [isBuildingDeleteModalOpen, setIsBuildingDeleteModalOpen] = useState(false);
  const [selectedBuildingForEdit, setSelectedBuildingForEdit] = useState(null);

  // Floor modals
  const [isFloorCreateModalOpen, setIsFloorCreateModalOpen] = useState(false);
  const [isFloorEditModalOpen, setIsFloorEditModalOpen] = useState(false);
  const [isFloorDeleteModalOpen, setIsFloorDeleteModalOpen] = useState(false);
  const [selectedFloorForModal, setSelectedFloorForModal] = useState(null);

  // Room modals
  const [isRoomCreateModalOpen, setIsRoomCreateModalOpen] = useState(false);
  const [isRoomEditModalOpen, setIsRoomEditModalOpen] = useState(false);
  const [isRoomDeleteModalOpen, setIsRoomDeleteModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [buildingFormData, setBuildingFormData] = useState({ name: '' });
  const [floorFormData, setFloorFormData] = useState({ floor_number: '', building_id: '' });
  const [roomFormData, setRoomFormData] = useState({ room_name: '', room_type: '', floor_id: '', building_id: '', anchor_id: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadBuildings();
      loadUnassignedAnchors();
    }
  }, [organizationId]);

  useEffect(() => {
    if (selectedBuilding) {
      loadFloors(selectedBuilding.id);
      // Clear selected floor when building changes
      setSelectedFloor(null);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedFloor) {
      loadRooms(selectedFloor.id);
    } else {
      setRooms([]);
    }
  }, [selectedFloor]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBuildings(organizationId);
      setBuildings(data);

      // Load all floors for all buildings (needed for room creation modal)
      const allFloorsData = await fetchFloors(); // Fetch all floors without building filter
      setAllFloors(allFloorsData);

      if (data.length > 0 && !selectedBuilding) {
        setSelectedBuilding(data[0]);
      }
    } catch (err) {
      console.error('Error loading buildings:', err);
      setError('Failed to load buildings. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadFloors = async (buildingId) => {
    try {
      setFloorsLoading(true);
      const data = await fetchFloors(buildingId);
      setFloors(data);
    } catch (err) {
      console.error('Error loading floors:', err);
    } finally {
      setFloorsLoading(false);
    }
  };

  const loadRooms = async (floorId) => {
    try {
      setRoomsLoading(true);
      const data = await fetchRooms(floorId);
      setRooms(data);
    } catch (err) {
      console.error('Error loading rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  const loadUnassignedAnchors = async () => {
    try {
      const data = await fetchUnassignedDevices();
      setUnassignedAnchors(data);
    } catch (err) {
      console.error('Error loading unassigned anchors:', err);
    }
  };

  // Building CRUD handlers
  const validateBuildingForm = () => {
    const errors = {};
    if (!buildingFormData.name.trim()) {
      errors.name = 'Building name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    if (!validateBuildingForm()) return;

    try {
      setSubmitting(true);
      await createBuilding({
        name: buildingFormData.name.trim(),
        organization_id: organizationId
      });
      await loadBuildings();
      setIsBuildingCreateModalOpen(false);
      resetBuildingForm();
    } catch (err) {
      console.error('Error creating building:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to create building' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBuilding = async (e) => {
    e.preventDefault();
    if (!validateBuildingForm()) return;

    try {
      setSubmitting(true);
      await updateBuilding(selectedBuildingForEdit.id, {
        name: buildingFormData.name.trim(),
        organization_id: organizationId
      });
      await loadBuildings();
      setIsBuildingEditModalOpen(false);
      resetBuildingForm();
      setSelectedBuildingForEdit(null);
    } catch (err) {
      console.error('Error updating building:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update building' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBuilding = async () => {
    try {
      setSubmitting(true);
      await deleteBuilding(selectedBuildingForEdit.id);
      if (selectedBuilding?.id === selectedBuildingForEdit.id) {
        setSelectedBuilding(null);
        setFloors([]);
      }
      await loadBuildings();
      setIsBuildingDeleteModalOpen(false);
      setSelectedBuildingForEdit(null);
    } catch (err) {
      console.error('Error deleting building:', err);
      alert('Failed to delete building');
    } finally {
      setSubmitting(false);
    }
  };

  // Floor CRUD handlers
  const validateFloorForm = () => {
    const errors = {};
    if (!floorFormData.floor_number || floorFormData.floor_number === '') {
      errors.floor_number = 'Floor number is required';
    }
    if (!floorFormData.building_id) {
      errors.building_id = 'Building is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    if (!validateFloorForm()) return;

    try {
      setSubmitting(true);
      await createFloor({
        building_id: parseInt(floorFormData.building_id),
        floor_number: parseInt(floorFormData.floor_number)
      });
      // Reload all floors to keep allFloors updated
      const allFloorsData = await fetchFloors();
      setAllFloors(allFloorsData);
      // Reload floors for the currently selected building
      if (selectedBuilding) {
        await loadFloors(selectedBuilding.id);
      }
      setIsFloorCreateModalOpen(false);
      resetFloorForm();
    } catch (err) {
      console.error('Error creating floor:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to create floor' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFloor = async (e) => {
    e.preventDefault();
    if (!validateFloorForm()) return;

    try {
      setSubmitting(true);
      await updateFloor(selectedFloorForModal.id, {
        building_id: parseInt(floorFormData.building_id),
        floor_number: parseInt(floorFormData.floor_number)
      });
      // Reload all floors to keep allFloors updated
      const allFloorsData = await fetchFloors();
      setAllFloors(allFloorsData);
      // Reload floors for the currently selected building
      if (selectedBuilding) {
        await loadFloors(selectedBuilding.id);
      }
      setIsFloorEditModalOpen(false);
      resetFloorForm();
      setSelectedFloorForModal(null);
    } catch (err) {
      console.error('Error updating floor:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to update floor' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFloor = async () => {
    try {
      setSubmitting(true);
      await deleteFloor(selectedFloorForModal.id);
      // Reload all floors to keep allFloors updated
      const allFloorsData = await fetchFloors();
      setAllFloors(allFloorsData);
      await loadFloors(selectedBuilding.id);
      setIsFloorDeleteModalOpen(false);
      setSelectedFloorForModal(null);
    } catch (err) {
      console.error('Error deleting floor:', err);
      alert('Failed to delete floor');
    } finally {
      setSubmitting(false);
    }
  };

  // Modal handlers
  const openBuildingCreateModal = () => {
    resetBuildingForm();
    setIsBuildingCreateModalOpen(true);
  };

  const openBuildingEditModal = (building) => {
    setSelectedBuildingForEdit(building);
    setBuildingFormData({ name: building.name });
    setFormErrors({});
    setIsBuildingEditModalOpen(true);
  };

  const openBuildingDeleteModal = (building) => {
    setSelectedBuildingForEdit(building);
    setIsBuildingDeleteModalOpen(true);
  };

  const openFloorCreateModal = () => {
    resetFloorForm();
    // Pre-select the currently selected building if available
    if (selectedBuilding) {
      setFloorFormData(prev => ({ ...prev, building_id: selectedBuilding.id.toString() }));
    }
    setIsFloorCreateModalOpen(true);
  };

  const openFloorEditModal = (floor) => {
    setSelectedFloorForModal(floor);
    setFloorFormData({
      floor_number: floor.floor_number.toString(),
      building_id: floor.building_id.toString()
    });
    setFormErrors({});
    setIsFloorEditModalOpen(true);
  };

  const openFloorDeleteModal = (floor) => {
    setSelectedFloorForModal(floor);
    setIsFloorDeleteModalOpen(true);
  };

  // Room CRUD handlers
  const validateRoomForm = () => {
    const errors = {};
    if (!roomFormData.room_name.trim()) {
      errors.room_name = 'Room name is required';
    }
    if (!roomFormData.building_id) {
      errors.building_id = 'Building is required';
    }
    if (!roomFormData.floor_id) {
      errors.floor_id = 'Floor is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!validateRoomForm()) return;

    try {
      setSubmitting(true);
      await createRoom({
        floor_id: parseInt(roomFormData.floor_id),
        room_name: roomFormData.room_name.trim(),
        room_type: roomFormData.room_type.trim() || null,
        anchor_id: roomFormData.anchor_id || null
      });
      // Reload rooms for the currently selected floor
      if (selectedFloor) {
        await loadRooms(selectedFloor.id);
      }
      // Reload unassigned anchors since one may have been assigned
      await loadUnassignedAnchors();
      setIsRoomCreateModalOpen(false);
      resetRoomForm();
    } catch (err) {
      console.error('Error creating room:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to create room';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('room') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ room_name: 'Room name already exists on this floor. Please use a different name.' });
      } else if (errorDetail.toLowerCase().includes('duplicate') || errorDetail.toLowerCase().includes('unique')) {
        setFormErrors({ room_name: 'Room name already exists. Please use a different name.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    if (!validateRoomForm()) return;

    try {
      setSubmitting(true);
      await updateRoom(selectedRoom.id, {
        floor_id: parseInt(roomFormData.floor_id),
        room_name: roomFormData.room_name.trim(),
        room_type: roomFormData.room_type.trim() || null
      });
      // Reload rooms for the currently selected floor
      if (selectedFloor) {
        await loadRooms(selectedFloor.id);
      }
      setIsRoomEditModalOpen(false);
      resetRoomForm();
      setSelectedRoom(null);
    } catch (err) {
      console.error('Error updating room:', err);
      const errorDetail = err.response?.data?.detail || 'Failed to update room';

      // Handle specific uniqueness errors
      if (errorDetail.toLowerCase().includes('room') && errorDetail.toLowerCase().includes('already exists')) {
        setFormErrors({ room_name: 'Room name already exists on this floor. Please use a different name.' });
      } else if (errorDetail.toLowerCase().includes('duplicate') || errorDetail.toLowerCase().includes('unique')) {
        setFormErrors({ room_name: 'Room name already exists. Please use a different name.' });
      } else {
        setFormErrors({ submit: errorDetail });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async () => {
    try {
      setSubmitting(true);
      await deleteRoom(selectedRoom.id);
      if (selectedFloor) {
        await loadRooms(selectedFloor.id);
      }
      setIsRoomDeleteModalOpen(false);
      setSelectedRoom(null);
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Failed to delete room');
    } finally {
      setSubmitting(false);
    }
  };

  // Room modal handlers
  const openRoomCreateModal = () => {
    resetRoomForm();
    // Pre-select the currently selected building and floor if available
    if (selectedBuilding && selectedFloor) {
      setRoomFormData(prev => ({
        ...prev,
        building_id: selectedBuilding.id.toString(),
        floor_id: selectedFloor.id.toString()
      }));
    }
    setIsRoomCreateModalOpen(true);
  };

  const openRoomEditModal = (room) => {
    setSelectedRoom(room);
    setRoomFormData({
      room_name: room.room_name,
      room_type: room.room_type || '',
      floor_id: room.floor_id.toString(),
      building_id: room.building_id ? room.building_id.toString() : selectedBuilding?.id.toString() || '',
      anchor_id: room.anchor_id || ''
    });
    setFormErrors({});
    setIsRoomEditModalOpen(true);
  };

  const openRoomDeleteModal = (room) => {
    setSelectedRoom(room);
    setIsRoomDeleteModalOpen(true);
  };

  const resetBuildingForm = () => {
    setBuildingFormData({ name: '' });
    setFormErrors({});
  };

  const resetFloorForm = () => {
    setFloorFormData({ floor_number: '', building_id: '' });
    setFormErrors({});
  };

  const resetRoomForm = () => {
    setRoomFormData({ room_name: '', room_type: '', floor_id: '', building_id: '', anchor_id: '' });
    setFormErrors({});
  };

  const handleBuildingInputChange = (e) => {
    const { name, value } = e.target;
    setBuildingFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFloorInputChange = (e) => {
    const { name, value } = e.target;
    setFloorFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoomInputChange = (e) => {
    const { name, value } = e.target;
    setRoomFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    // When building changes, reset floor selection and update available floors
    if (name === 'building_id') {
      setRoomFormData(prev => ({ ...prev, floor_id: '' }));
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Buildings</h1>
          <p className="page-subtitle">Manage your buildings and floors</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">Loading buildings...</div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Buildings</h1>
          <p className="page-subtitle">Manage your buildings and floors</p>
        </div>
        <Card>
          <Card.Content>
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadBuildings} className="btn btn-primary">
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
          <h1 className="page-title">Buildings</h1>
          <p className="page-subtitle">Manage your buildings and floors</p>
        </div>
        <PermissionGate permission="BUILDING_CREATE">
          <button onClick={openBuildingCreateModal} className="btn btn-primary">
            + Add Building
          </button>
        </PermissionGate>
      </div>

      {/* Buildings Section */}
      <Card>
        <Card.Content>
          <div className="section-header">
            <h2>Buildings</h2>
          </div>
          {buildings.length === 0 ? (
            <div className="empty-state">
              <p style={{marginBottom:"20px"}}>No buildings found. Create your first building to get started.</p>
              <PermissionGate permission="BUILDING_CREATE">
                <button onClick={openBuildingCreateModal} className="btn btn-primary">
                  + Add Building
                </button>
              </PermissionGate>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {buildings.map((building) => (
                  <Table.Row
                    key={building.id}
                    className={selectedBuilding?.id === building.id ? 'selected-row' : ''}
                  >
                    <Table.Cell>
                      <button
                        className="building-name-btn"
                        onClick={() => setSelectedBuilding(building)}
                      >
                        {building.name}
                      </button>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="action-buttons">
                        <PermissionGate permission="BUILDING_EDIT">
                          <button
                            onClick={() => openBuildingEditModal(building)}
                            className="btn-icon btn-edit"
                            title="Edit building"
                          >
                             <FiEdit2 size={16} />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="BUILDING_DELETE">
                          <button
                            onClick={() => openBuildingDeleteModal(building)}
                            className="btn-icon btn-delete"
                            title="Delete building"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </PermissionGate>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Floors Section */}
      {selectedBuilding && (
        <Card>
          <Card.Content>
            <div className="section-header">
              <h2>Floors in {selectedBuilding.name}</h2>
              <div className="header-actions">
                <PermissionGate permission="FLOOR_CREATE">
                  <button onClick={openFloorCreateModal} className="btn btn-secondary">
                    + Add Floor
                  </button>
                </PermissionGate>
              </div>
            </div>
            {floorsLoading ? (
              <div className="loading-state">Loading floors...</div>
            ) : floors.length === 0 ? (
              <div className="empty-state">
                <p>No floors found in this building. Add a floor to get started.</p>
                <div className="header-actions">
                  <PermissionGate permission="FLOOR_CREATE">
                    <button onClick={openFloorCreateModal} className="btn btn-secondary">
                      + Add Floor
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Floor Number</Table.Head>
                    <Table.Head>Rooms</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {floors.map((floor) => (
                    <Table.Row
                      key={floor.id}
                      className={selectedFloor?.id === floor.id ? 'selected-row' : ''}
                    >
                      <Table.Cell>
                        <button
                          className="building-name-btn"
                          onClick={() => setSelectedFloor(selectedFloor?.id === floor.id ? null : floor)}
                        >
                          Floor {floor.floor_number}
                        </button>
                      </Table.Cell>
                      <Table.Cell>
                        <button
                          className="building-name-btn"
                          onClick={() => setSelectedFloor(selectedFloor?.id === floor.id ? null : floor)}
                          style={{ fontSize: '0.875rem' }}
                        >
                          {selectedFloor?.id === floor.id ? 'Hide rooms ▲' : 'View rooms ▼'}
                        </button>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="action-buttons">
                          <PermissionGate permission="FLOOR_EDIT">
                            <button
                              onClick={() => openFloorEditModal(floor)}
                              className="btn-icon btn-edit"
                              title="Edit floor"
                            >
                               <FiEdit2 size={16} />
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="FLOOR_DELETE">
                            <button
                              onClick={() => openFloorDeleteModal(floor)}
                              className="btn-icon btn-delete"
                              title="Delete floor"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </PermissionGate>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Rooms Section */}
      {selectedFloor && (
        <Card>
          <Card.Content>
            <div className="section-header">
              <h2>Rooms on Floor {selectedFloor.floor_number} - {selectedBuilding?.name}</h2>
              <PermissionGate permission="ROOM_CREATE">
                <button onClick={openRoomCreateModal} className="btn btn-secondary">
                  + Add Room
                </button>
              </PermissionGate>
            </div>
            {roomsLoading ? (
              <div className="loading-state">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="empty-state">
                <p style={{marginBottom:"20px"}}>No rooms found on this floor. Add a room to get started.</p>
                <PermissionGate permission="ROOM_CREATE">
                  <button onClick={openRoomCreateModal} className="btn btn-secondary">
                    + Add Room
                  </button>
                </PermissionGate>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Room Name</Table.Head>
                    <Table.Head>Room Type</Table.Head>
                    <Table.Head>Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rooms.map((room) => (
                    <Table.Row key={room.id}>
                      <Table.Cell>{room.room_name}</Table.Cell>
                      <Table.Cell>{room.room_type || '-'}</Table.Cell>
                      <Table.Cell>
                        <div className="action-buttons">
                          <PermissionGate permission="ROOM_EDIT">
                            <button
                              onClick={() => openRoomEditModal(room)}
                              className="btn-icon btn-edit"
                              title="Edit room"
                            >
                               <FiEdit2 size={16} />
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="ROOM_DELETE">
                            <button
                              onClick={() => openRoomDeleteModal(room)}
                              className="btn-icon btn-delete"
                              title="Delete room"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </PermissionGate>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Building Create Modal */}
      <Modal isOpen={isBuildingCreateModalOpen} onClose={() => setIsBuildingCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsBuildingCreateModalOpen(false)}>
          Add New Building
        </Modal.Header>
        <form onSubmit={handleCreateBuilding}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="name">
                Building Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={buildingFormData.name}
                onChange={handleBuildingInputChange}
                placeholder="e.g., Main Hospital, Emergency Wing"
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
              onClick={() => setIsBuildingCreateModalOpen(false)}
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
              {submitting ? 'Creating...' : 'Create Building'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Building Edit Modal */}
      <Modal isOpen={isBuildingEditModalOpen} onClose={() => setIsBuildingEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsBuildingEditModalOpen(false)}>
          Edit Building
        </Modal.Header>
        <form onSubmit={handleUpdateBuilding}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="edit-name">
                Building Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="edit-name"
                name="name"
                value={buildingFormData.name}
                onChange={handleBuildingInputChange}
                placeholder="e.g., Main Hospital, Emergency Wing"
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
              onClick={() => setIsBuildingEditModalOpen(false)}
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
              {submitting ? 'Updating...' : 'Update Building'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Building Delete Modal */}
      <Modal isOpen={isBuildingDeleteModalOpen} onClose={() => setIsBuildingDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsBuildingDeleteModalOpen(false)}>
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this building?</p>
          {selectedBuildingForEdit && (
            <div className="delete-info">
              <strong>{selectedBuildingForEdit.name}</strong>
            </div>
          )}
          <p className="warning-text">This will also delete all floors and rooms in this building. This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsBuildingDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteBuilding}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Building'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Floor Create Modal */}
      <Modal isOpen={isFloorCreateModalOpen} onClose={() => setIsFloorCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsFloorCreateModalOpen(false)}>
          Add New Floor
        </Modal.Header>
        <form onSubmit={handleCreateFloor}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="building_id">
                Building <span className="required">*</span>
              </label>
              <select
                id="building_id"
                name="building_id"
                value={floorFormData.building_id}
                onChange={handleFloorInputChange}
                required
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              {formErrors.building_id && (
                <small className="error-text">{formErrors.building_id}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="floor_number">
                Floor Number <span className="required">*</span>
              </label>
              <input
                type="number"
                id="floor_number"
                name="floor_number"
                value={floorFormData.floor_number}
                onChange={handleFloorInputChange}
                placeholder="e.g., 1, 2, 3"
                required
              />
              {formErrors.floor_number && (
                <small className="error-text">{formErrors.floor_number}</small>
              )}
              <small>Enter the floor number (can be negative for basement levels)</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsFloorCreateModalOpen(false)}
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
              {submitting ? 'Creating...' : 'Create Floor'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Floor Edit Modal */}
      <Modal isOpen={isFloorEditModalOpen} onClose={() => setIsFloorEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsFloorEditModalOpen(false)}>
          Edit Floor
        </Modal.Header>
        <form onSubmit={handleUpdateFloor}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="edit-building_id">
                Building <span className="required">*</span>
              </label>
              <select
                id="edit-building_id"
                name="building_id"
                value={floorFormData.building_id}
                onChange={handleFloorInputChange}
                required
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              {formErrors.building_id && (
                <small className="error-text">{formErrors.building_id}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="edit-floor_number">
                Floor Number <span className="required">*</span>
              </label>
              <input
                type="number"
                id="edit-floor_number"
                name="floor_number"
                value={floorFormData.floor_number}
                onChange={handleFloorInputChange}
                placeholder="e.g., 1, 2, 3"
                required
              />
              {formErrors.floor_number && (
                <small className="error-text">{formErrors.floor_number}</small>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsFloorEditModalOpen(false)}
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
              {submitting ? 'Updating...' : 'Update Floor'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Floor Delete Modal */}
      <Modal isOpen={isFloorDeleteModalOpen} onClose={() => setIsFloorDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsFloorDeleteModalOpen(false)}>
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this floor?</p>
          {selectedFloorForModal && (
            <div className="delete-info">
              <strong>Floor {selectedFloorForModal.floor_number}</strong>
            </div>
          )}
          <p className="warning-text">This will also delete all rooms on this floor. This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsFloorDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteFloor}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Floor'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Room Create Modal */}
      <Modal isOpen={isRoomCreateModalOpen} onClose={() => setIsRoomCreateModalOpen(false)}>
        <Modal.Header onClose={() => setIsRoomCreateModalOpen(false)}>
          Add New Room
        </Modal.Header>
        <form onSubmit={handleCreateRoom}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="room-building_id">
                Building <span className="required">*</span>
              </label>
              <select
                id="room-building_id"
                name="building_id"
                value={roomFormData.building_id}
                onChange={handleRoomInputChange}
                required
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              {formErrors.building_id && (
                <small className="error-text">{formErrors.building_id}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="room-floor_id">
                Floor <span className="required">*</span>
              </label>
              <select
                id="room-floor_id"
                name="floor_id"
                value={roomFormData.floor_id}
                onChange={handleRoomInputChange}
                required
                disabled={!roomFormData.building_id}
              >
                <option value="">Select a floor</option>
                {allFloors
                  .filter(f => f.building_id === parseInt(roomFormData.building_id))
                  .map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      Floor {floor.floor_number}
                    </option>
                  ))}
              </select>
              {formErrors.floor_id && (
                <small className="error-text">{formErrors.floor_id}</small>
              )}
              {!roomFormData.building_id && (
                <small>Please select a building first</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="room_name">
                Room Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="room_name"
                name="room_name"
                value={roomFormData.room_name}
                onChange={handleRoomInputChange}
                placeholder="e.g., Room 101, ICU-A"
                required
              />
              {formErrors.room_name && (
                <small className="error-text">{formErrors.room_name}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="room_type">
                Room Type
              </label>
              <input
                type="text"
                id="room_type"
                name="room_type"
                value={roomFormData.room_type}
                onChange={handleRoomInputChange}
                placeholder="e.g., ICU, Ward, ER, Operating Room"
              />
              <small>Optional: Specify the type of room</small>
            </div>
            <div className="form-group">
              <label htmlFor="anchor_id">
                Assign Anchor
              </label>
              <select
                id="anchor_id"
                name="anchor_id"
                value={roomFormData.anchor_id}
                onChange={handleRoomInputChange}
              >
                <option value="">No anchor (can assign later)</option>
                {unassignedAnchors.map((anchor) => (
                  <option key={anchor.anchor_id} value={anchor.anchor_id}>
                    {anchor.anchor_id}
                  </option>
                ))}
              </select>
              <small>Optional: Assign an available anchor to this room</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsRoomCreateModalOpen(false)}
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
              {submitting ? 'Creating...' : 'Create Room'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Room Edit Modal */}
      <Modal isOpen={isRoomEditModalOpen} onClose={() => setIsRoomEditModalOpen(false)}>
        <Modal.Header onClose={() => setIsRoomEditModalOpen(false)}>
          Edit Room
        </Modal.Header>
        <form onSubmit={handleUpdateRoom}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="edit-room-building_id">
                Building <span className="required">*</span>
              </label>
              <select
                id="edit-room-building_id"
                name="building_id"
                value={roomFormData.building_id}
                onChange={handleRoomInputChange}
                required
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              {formErrors.building_id && (
                <small className="error-text">{formErrors.building_id}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="edit-room-floor_id">
                Floor <span className="required">*</span>
              </label>
              <select
                id="edit-room-floor_id"
                name="floor_id"
                value={roomFormData.floor_id}
                onChange={handleRoomInputChange}
                required
                disabled={!roomFormData.building_id}
              >
                <option value="">Select a floor</option>
                {allFloors
                  .filter(f => f.building_id === parseInt(roomFormData.building_id))
                  .map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      Floor {floor.floor_number}
                    </option>
                  ))}
              </select>
              {formErrors.floor_id && (
                <small className="error-text">{formErrors.floor_id}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="edit-room_name">
                Room Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="edit-room_name"
                name="room_name"
                value={roomFormData.room_name}
                onChange={handleRoomInputChange}
                placeholder="e.g., Room 101, ICU-A"
                required
              />
              {formErrors.room_name && (
                <small className="error-text">{formErrors.room_name}</small>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="edit-room_type">
                Room Type
              </label>
              <input
                type="text"
                id="edit-room_type"
                name="room_type"
                value={roomFormData.room_type}
                onChange={handleRoomInputChange}
                placeholder="e.g., ICU, Ward, ER, Operating Room"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsRoomEditModalOpen(false)}
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
              {submitting ? 'Updating...' : 'Update Room'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Room Delete Modal */}
      <Modal isOpen={isRoomDeleteModalOpen} onClose={() => setIsRoomDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsRoomDeleteModalOpen(false)}>
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this room?</p>
          {selectedRoom && (
            <div className="delete-info">
              <strong>{selectedRoom.room_name}</strong>
              {selectedRoom.room_type && <span> ({selectedRoom.room_type})</span>}
            </div>
          )}
          <p className="warning-text">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setIsRoomDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteRoom}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete Room'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Buildings;
