import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
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
  deleteRoom
} from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { FiLayers, FiHome, FiEdit2, FiTrash2, FiPlus, FiUpload } from 'react-icons/fi';
import { Building2 } from 'lucide-react';
import './Locations.css';

const Locations = () => {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected items
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  // Form data
  const [buildingForm, setBuildingForm] = useState({ name: '' });
  const [floorForm, setFloorForm] = useState({ building_id: '', floor_number: '' });
  const [roomForm, setRoomForm] = useState({ floor_id: '', room_name: '', room_type: '' });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // View state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadAllData();
    }
  }, [orgLoading, currentOrganization]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [buildingsData, floorsData, roomsData] = await Promise.all([
        fetchBuildings(), // Organization is in header, no need to pass ID
        fetchFloors(),
        fetchRooms()
      ]);
      setBuildings(buildingsData);
      setFloors(floorsData);
      setRooms(roomsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load locations data');
    } finally {
      setLoading(false);
    }
  };

  // Building handlers
  const openBuildingModal = (building = null) => {
    if (building) {
      setSelectedBuilding(building);
      setBuildingForm({ name: building.name });
    } else {
      setSelectedBuilding(null);
      setBuildingForm({ name: '' });
    }
    setFormErrors({});
    setIsBuildingModalOpen(true);
  };

  const handleBuildingSubmit = async (e) => {
    e.preventDefault();
    if (!buildingForm.name.trim()) {
      setFormErrors({ name: 'Building name is required' });
      return;
    }

    if (!currentOrganization) {
      setFormErrors({ submit: 'No organization selected' });
      return;
    }

    try {
      setSubmitting(true);
      const buildingData = {
        name: buildingForm.name.trim()
        // organization_id is set automatically from header context
      };

      if (selectedBuilding) {
        await updateBuilding(selectedBuilding.id, buildingData);
      } else {
        await createBuilding(buildingData);
      }

      await loadAllData();
      setIsBuildingModalOpen(false);
      setBuildingForm({ name: '' });
      setSelectedBuilding(null);
    } catch (err) {
      console.error('Error saving building:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to save building' });
    } finally {
      setSubmitting(false);
    }
  };

  // Floor handlers
  const openFloorModal = (floor = null, buildingId = null) => {
    if (floor) {
      setSelectedFloor(floor);
      setFloorForm({ building_id: floor.building_id, floor_number: floor.floor_number });
    } else {
      setSelectedFloor(null);
      setFloorForm({ building_id: buildingId || '', floor_number: '' });
    }
    setFormErrors({});
    setIsFloorModalOpen(true);
  };

  const handleFloorSubmit = async (e) => {
    e.preventDefault();
    if (!floorForm.building_id || !floorForm.floor_number) {
      setFormErrors({ submit: 'Building and floor number are required' });
      return;
    }

    try {
      setSubmitting(true);
      const floorData = {
        building_id: parseInt(floorForm.building_id),
        floor_number: parseInt(floorForm.floor_number)
      };

      if (selectedFloor) {
        await updateFloor(selectedFloor.id, floorData);
      } else {
        await createFloor(floorData);
      }

      await loadAllData();
      setIsFloorModalOpen(false);
      setFloorForm({ building_id: '', floor_number: '' });
      setSelectedFloor(null);
    } catch (err) {
      console.error('Error saving floor:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to save floor' });
    } finally {
      setSubmitting(false);
    }
  };

  // Room handlers
  const openRoomModal = (room = null, floorId = null) => {
    if (room) {
      setSelectedRoom(room);
      setRoomForm({
        floor_id: room.floor_id,
        room_name: room.room_name,
        room_type: room.room_type || ''
      });
    } else {
      setSelectedRoom(null);
      setRoomForm({ floor_id: floorId || '', room_name: '', room_type: '' });
    }
    setFormErrors({});
    setIsRoomModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomForm.floor_id || !roomForm.room_name.trim()) {
      setFormErrors({ submit: 'Floor and room name are required' });
      return;
    }

    try {
      setSubmitting(true);
      const roomData = {
        floor_id: parseInt(roomForm.floor_id),
        room_name: roomForm.room_name.trim(),
        room_type: roomForm.room_type.trim() || null
      };

      if (selectedRoom) {
        await updateRoom(selectedRoom.id, roomData);
      } else {
        await createRoom(roomData);
      }

      await loadAllData();
      setIsRoomModalOpen(false);
      setRoomForm({ floor_id: '', room_name: '', room_type: '' });
      setSelectedRoom(null);
    } catch (err) {
      console.error('Error saving room:', err);
      setFormErrors({ submit: err.response?.data?.detail || 'Failed to save room' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handlers
  const openDeleteModal = (item, type) => {
    setDeleteItem({ ...item, type });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      setSubmitting(true);
      if (deleteItem.type === 'building') {
        await deleteBuilding(deleteItem.id);
      } else if (deleteItem.type === 'floor') {
        await deleteFloor(deleteItem.id);
      } else if (deleteItem.type === 'room') {
        await deleteRoom(deleteItem.id);
      }

      await loadAllData();
      setIsDeleteModalOpen(false);
      setDeleteItem(null);
    } catch (err) {
      console.error('Error deleting:', err);
      alert(err.response?.data?.detail || 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  // Upload floor plan handler
  const openUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadFloorPlan = async (e) => {
    e.preventDefault();
    // TODO: Implement floor plan upload
    alert('Floor plan upload functionality will be implemented');
    setIsUploadModalOpen(false);
  };

  // Get room count for a floor
  const getRoomCount = (floorId) => {
    return rooms.filter(r => r.floor_id === floorId).length;
  };

  if (orgLoading || loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Location Management</h1>
          <p className="page-subtitle">Manage buildings, floors, and rooms</p>
        </div>
        <Card>
          <Card.Content>
            <div className="loading-state">
              {orgLoading ? 'Loading organization...' : 'Loading locations...'}
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
          <h1 className="page-title">Location Management</h1>
          <p className="page-subtitle">Manage buildings, floors, and rooms</p>
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
          <h1 className="page-title">Location Management</h1>
          <p className="page-subtitle">Manage buildings, floors, and rooms</p>
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
    <div className="page-container locations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Buildings & Floor Plans</h1>
          <p className="page-subtitle">Manage hospital buildings, floors, and rooms</p>
        </div>
        <button onClick={() => openBuildingModal()} className="btn btn-primary">
          <Building2 size={16} />
          Add Building
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Buildings"
          value={buildings.length}
          icon={Building2}
        />
        <StatCard
          title="Total Floors"
          value={floors.length}
          icon={FiLayers}
        />
        <StatCard
          title="Total Rooms"
          value={rooms.length}
          icon={FiHome}
        />
      </div>

      {/* Buildings Table */}
      {buildings.map(building => (
        <Card key={building.id} className="building-card">
          <Card.Header>
            <div className="building-header-content">
              <div className="building-title-section">
                <Building2 size={24} className="building-icon" />
                <h2 className="building-title">{building.name}</h2>
              </div>
              <div className="building-actions">
                <button
                  onClick={() => openFloorModal(null, building.id)}
                  className="btn btn-secondary"
                >
                  <FiPlus size={16} />
                  Add Floor
                </button>
                <button
                  onClick={() => openUploadModal(null)}
                  className="btn btn-secondary"
                >
                  <FiUpload size={16} />
                  Upload Floor Plan
                </button>
                <button
                  onClick={() => openBuildingModal(building)}
                  className="btn-icon btn-edit"
                  title="Edit building"
                >
                  <FiEdit2 size={16} />
                </button>
                <button
                  onClick={() => openDeleteModal(building, 'building')}
                  className="btn-icon btn-delete"
                  title="Delete building"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            {floors.filter(f => f.building_id === building.id).length === 0 ? (
              <div className="empty-state-small">
                <p>No floors added yet. Click "Add Floor" to create the first floor.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="locations-table">
                  <thead>
                    <tr>
                      <th>Floor</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Rooms</th>
                      <th>Floor Plan</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {floors
                      .filter(f => f.building_id === building.id)
                      .sort((a, b) => a.floor_number - b.floor_number)
                      .map(floor => (
                        <tr key={floor.id}>
                          <td className="floor-number-cell">{floor.floor_number}</td>
                          <td className="floor-name-cell">
                            {floor.floor_number === 0 ? 'Ground Floor' :
                             floor.floor_number === 1 ? 'First Floor' :
                             floor.floor_number === 2 ? 'Second Floor' :
                             floor.floor_number === 'OT' ? 'Operation Theatre' :
                             `Floor ${floor.floor_number}`}
                          </td>
                          <td>
                            <span className="type-badge type-general">General</span>
                          </td>
                          <td className="rooms-count-cell">{getRoomCount(floor.id)}</td>
                          <td className="floor-plan-cell">
                            <span className="not-uploaded-badge">Not uploaded</span>
                          </td>
                          <td className="actions-cell">
                            <button
                              onClick={() => openRoomModal(null, floor.id)}
                              className="btn-icon btn-success"
                              title="Add room"
                            >
                              <FiPlus size={16} />
                            </button>
                            <button
                              onClick={() => openFloorModal(floor)}
                              className="btn-icon btn-edit"
                              title="Edit floor"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(floor, 'floor')}
                              className="btn-icon btn-delete"
                              title="Delete floor"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Content>
        </Card>
      ))}

      {buildings.length === 0 && (
        <Card>
          <Card.Content>
            <div className="empty-state">
              <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No buildings found. Add your first building to get started.</p>
              <button onClick={() => openBuildingModal()} className="btn btn-primary">
                <Building2 size={16} />
                Add Building
              </button>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Building Modal */}
      <Modal isOpen={isBuildingModalOpen} onClose={() => setIsBuildingModalOpen(false)}>
        <Modal.Header onClose={() => setIsBuildingModalOpen(false)}>
          {selectedBuilding ? 'Edit Building' : 'Add New Building'}
        </Modal.Header>
        <form onSubmit={handleBuildingSubmit}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="building_name">
                Building Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="building_name"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ name: e.target.value })}
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
              onClick={() => setIsBuildingModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : selectedBuilding ? 'Update Building' : 'Create Building'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Floor Modal */}
      <Modal isOpen={isFloorModalOpen} onClose={() => setIsFloorModalOpen(false)}>
        <Modal.Header onClose={() => setIsFloorModalOpen(false)}>
          {selectedFloor ? 'Edit Floor' : 'Add New Floor'}
        </Modal.Header>
        <form onSubmit={handleFloorSubmit}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="floor_building">
                Building <span className="required">*</span>
              </label>
              <select
                id="floor_building"
                value={floorForm.building_id}
                onChange={(e) => setFloorForm({ ...floorForm, building_id: e.target.value })}
                required
                disabled={selectedFloor !== null}
              >
                <option value="">Select a building</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="floor_number">
                Floor Number <span className="required">*</span>
              </label>
              <input
                type="number"
                id="floor_number"
                value={floorForm.floor_number}
                onChange={(e) => setFloorForm({ ...floorForm, floor_number: e.target.value })}
                placeholder="e.g., 1, 2, 3"
                required
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsFloorModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : selectedFloor ? 'Update Floor' : 'Create Floor'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Room Modal */}
      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)}>
        <Modal.Header onClose={() => setIsRoomModalOpen(false)}>
          {selectedRoom ? 'Edit Room' : 'Add New Room'}
        </Modal.Header>
        <form onSubmit={handleRoomSubmit}>
          <Modal.Body>
            {formErrors.submit && (
              <div className="error-message">{formErrors.submit}</div>
            )}
            <div className="form-group">
              <label htmlFor="room_floor">
                Floor <span className="required">*</span>
              </label>
              <select
                id="room_floor"
                value={roomForm.floor_id}
                onChange={(e) => setRoomForm({ ...roomForm, floor_id: e.target.value })}
                required
                disabled={selectedRoom !== null}
              >
                <option value="">Select a floor</option>
                {floors.map(floor => {
                  const building = buildings.find(b => b.id === floor.building_id);
                  return (
                    <option key={floor.id} value={floor.id}>
                      {building?.name} - Floor {floor.floor_number}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="room_name">
                Room Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="room_name"
                value={roomForm.room_name}
                onChange={(e) => setRoomForm({ ...roomForm, room_name: e.target.value })}
                placeholder="e.g., Room 101, ICU-A"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="room_type">Room Type (Optional)</label>
              <input
                type="text"
                id="room_type"
                value={roomForm.room_type}
                onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                placeholder="e.g., ICU, Ward, ER"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : selectedRoom ? 'Update Room' : 'Create Room'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <Modal.Header onClose={() => setIsDeleteModalOpen(false)}>
          Confirm Delete
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this {deleteItem?.type}?</p>
          {deleteItem && (
            <div className="delete-confirmation">
              <strong>
                {deleteItem.type === 'building' && deleteItem.name}
                {deleteItem.type === 'floor' && `Floor ${deleteItem.floor_number}`}
                {deleteItem.type === 'room' && deleteItem.room_name}
              </strong>
            </div>
          )}
          <p className="warning-text">
            This action cannot be undone. All associated {deleteItem?.type === 'building' ? 'floors and rooms' : deleteItem?.type === 'floor' ? 'rooms' : 'data'} will also be deleted.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-danger"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Upload Floor Plan Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
        <Modal.Header onClose={() => setIsUploadModalOpen(false)}>
          Upload Floor Plan
        </Modal.Header>
        <form onSubmit={handleUploadFloorPlan}>
          <Modal.Body>
            <div className="form-group">
              <label htmlFor="floor_plan_file">
                Select Floor Plan Image <span className="required">*</span>
              </label>
              <input
                type="file"
                id="floor_plan_file"
                accept="image/*,.pdf"
                required
              />
              <small className="help-text">Supported formats: PNG, JPG, PDF (Max 10MB)</small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Upload'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
};

export default Locations;
