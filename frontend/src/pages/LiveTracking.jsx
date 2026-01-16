import { useState, useEffect } from 'react';
import { MapPin, Search, ChevronDown, Upload, MapPinned } from 'lucide-react';
import { fetchBuildings, fetchFloors, fetchRooms, fetchDevices, fetchLivePositions, updateRoom } from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { websocketService } from '../services/websocket';
import MapVisualization from '../components/MapVisualization';
import FloorPlanUploadModal from '../components/FloorPlanUploadModal';
import PermissionGate from '../components/PermissionGate';
import './LiveTracking.css';

const LiveTracking = () => {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'moving', 'stationary', 'out-of-range'
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [liveTags, setLiveTags] = useState([]);
  const [offlineTags, setOfflineTags] = useState([]); // Tags that went offline with last location
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [coordinateMarkingMode, setCoordinateMarkingMode] = useState(false);
  const [selectedRoomForMarking, setSelectedRoomForMarking] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]); // Points being drawn for polygon

  // Fetch buildings and anchors when organization changes
  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadBuildings();
      loadAnchors();
      loadLivePositions();
    }

    // Auto-refresh data every 10 seconds
    const dataRefreshInterval = setInterval(() => {
      if (!orgLoading && currentOrganization) {
        // Refresh anchors and live positions
        loadAnchors();
        loadLivePositions();
      }
    }, 10000); // Refresh every 10 seconds

    // Auto-refresh timestamp display
    const timestampInterval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => {
      clearInterval(dataRefreshInterval);
      clearInterval(timestampInterval);
    };
  }, [orgLoading, currentOrganization]);

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (!currentOrganization) return;

    const handleLocationUpdate = (data) => {
      console.log('Location update received:', data);
      // Refresh live positions when location updates come in
      loadLivePositions();
    };

    const handleTagLost = (data) => {
      console.log('Tag lost:', data);

      // Find the tag that was lost
      setLiveTags(prev => {
        const lostTag = prev.find(tag => tag.tag_id === data.tag_id);

        // Move to offline tags with last known location
        if (lostTag) {
          setOfflineTags(prevOffline => {
            // Check if already in offline list
            const exists = prevOffline.some(t => t.tag_id === data.tag_id);
            if (!exists) {
              return [...prevOffline, {
                ...lostTag,
                status: 'offline',
                offlineAt: new Date().toISOString()
              }];
            }
            return prevOffline;
          });
        }

        // Remove from live tags
        return prev.filter(tag => tag.tag_id !== data.tag_id);
      });
    };

    // Subscribe to WebSocket events (using 'on' method)
    const unsubLocationUpdate = websocketService.on('LOCATION_UPDATE', handleLocationUpdate);
    const unsubTagLost = websocketService.on('TAG_LOST', handleTagLost);

    return () => {
      // Call the unsubscribe functions returned by 'on'
      unsubLocationUpdate();
      unsubTagLost();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      const buildingsData = await fetchBuildings();
      setBuildings(buildingsData);

      // Don't auto-select - let user see all buildings initially
      setSelectedBuilding(null);
    } catch (err) {
      console.error('Error loading buildings:', err);
      setError('Failed to load buildings');
      setBuildings([]);
      setSelectedBuilding(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAnchors = async () => {
    try {
      console.log('Loading anchors...');
      const anchorsData = await fetchDevices();
      console.log('Loaded anchors:', anchorsData);
      setAnchors(anchorsData);
    } catch (err) {
      console.error('Error loading anchors:', err);
    }
  };

  const loadLivePositions = async () => {
    try {
      const response = await fetchLivePositions();
      // Transform the response to match our tag structure
      // Separate active and offline tags based on status from backend
      const activeTags = [];
      const offlineTags = [];

      response.positions.forEach(pos => {
        const tag = {
          tag_id: pos.handbandSerial,
          name: pos.handbandSerial,
          userName: pos.userName,
          entityName: pos.userName, // Using userName as entityName for now
          room_id: pos.roomId, // Use roomId directly from backend
          lastSeenRoom: pos.lastSeenRoom,
          updatedAt: pos.updatedAt,
          status: pos.status, // Use status from backend
        };

        if (pos.status === 'offline') {
          offlineTags.push(tag);
        } else {
          activeTags.push(tag);
        }
      });

      setLiveTags(activeTags);
      setOfflineTags(offlineTags);
    } catch (err) {
      console.error('Error loading live positions:', err);
    }
  };

  // Load all floors for all buildings (for map visualization)
  useEffect(() => {
    if (buildings.length > 0) {
      loadAllFloors();
    }
  }, [buildings]);

  const loadAllFloors = async () => {
    try {
      console.log('Loading all floors for buildings:', buildings);
      const allFloorsPromises = buildings.map(building => fetchFloors(building.id));
      const allFloorsArrays = await Promise.all(allFloorsPromises);
      const allFloors = allFloorsArrays.flat();
      console.log('Loaded floors:', allFloors);
      setFloors(allFloors);

      // Load rooms for all floors
      loadAllRooms(allFloors);
    } catch (err) {
      console.error('Error loading floors:', err);
    }
  };

  const loadAllRooms = async (floorsData) => {
    try {
      const allRoomsPromises = floorsData.map(floor => fetchRooms(floor.id));
      const allRoomsArrays = await Promise.all(allRoomsPromises);
      const allRooms = allRoomsArrays.flat();
      setRooms(allRooms);
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  // Filter tags to only show those with valid room_id
  const enhancedLiveTags = liveTags.filter(tag => tag.room_id !== null);
  const enhancedOfflineTags = offlineTags.filter(tag => tag.room_id !== null);

  // Combine all tags for display (active + offline)
  const allTags = [...enhancedLiveTags, ...enhancedOfflineTags];

  const getTimeAgo = () => {
    const now = new Date();
    const seconds = Math.floor((now - lastUpdate) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const handleFloorPlanUploadSuccess = async () => {
    // Reload floors to get updated floor_plan_path
    console.log('Reloading floors after floor plan change...');
    await loadAllFloors();
    // Force a re-render by briefly deselecting and reselecting the floor
    const currentFloor = selectedFloor;
    setSelectedFloor(null);
    setTimeout(() => {
      setSelectedFloor(currentFloor);
    }, 100);
  };

  const handleAddPolygonPoint = (coordinates) => {
    if (!coordinateMarkingMode || !selectedRoomForMarking) return;

    // Add point to polygon
    setPolygonPoints(prev => [...prev, coordinates]);
    console.log('Added polygon point:', coordinates);
  };

  const handleCompletePolygon = async () => {
    if (!selectedRoomForMarking || polygonPoints.length < 3) {
      alert('Please mark at least 3 points to create a room boundary');
      return;
    }

    try {
      // Update room with polygon coordinates
      await updateRoom(selectedRoomForMarking.id, {
        polygon_coordinates: polygonPoints
      });

      // Reload rooms to reflect changes
      const floorsData = floors.length > 0 ? floors : await fetchFloors();
      await loadAllRooms(floorsData);

      // Clear marking mode
      setCoordinateMarkingMode(false);
      setSelectedRoomForMarking(null);
      setPolygonPoints([]);

      alert(`Room "${selectedRoomForMarking.room_name}" boundary marked successfully with ${polygonPoints.length} points!`);
    } catch (err) {
      console.error('Error updating room coordinates:', err);
      alert('Failed to update room coordinates');
    }
  };

  const handleStartMarkingRoom = (room) => {
    setSelectedRoomForMarking(room);
    setCoordinateMarkingMode(true);
    setPolygonPoints([]); // Reset polygon points
  };

  const handleCancelMarking = () => {
    setCoordinateMarkingMode(false);
    setSelectedRoomForMarking(null);
    setPolygonPoints([]);
  };

  const handleUndoLastPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
  };

  const selectedFloorData = floors.find(f => f.id === selectedFloor);
  const hasFloorPlan = selectedFloorData?.floor_plan_path;

  // Debug logging
  useEffect(() => {
    if (selectedFloor && selectedFloorData) {
      console.log('Selected floor:', selectedFloor);
      console.log('Selected floor data:', selectedFloorData);
      console.log('Has floor plan:', hasFloorPlan);
    }
  }, [selectedFloor, selectedFloorData, hasFloorPlan]);

  return (
    <div className="live-tracking">
      {/* Page Header */}
      <div className="tracking-header">
        <div className="header-left">
          <h1 className="tracking-title">Live Tracking</h1>
          <p className="tracking-subtitle">Real-time patient tag locations across the hospital</p>
        </div>
        <div className="header-right">
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
          </div>
          <span className="update-time">Updated {getTimeAgo()}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="tracking-controls">
        <div className="controls-left">
          {/* Building Selector */}
          <div className="selector-group">
            <label className="selector-label">Building:</label>
            <div className="custom-select">
              <select
                value={selectedBuilding || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedBuilding(value ? parseInt(value) : null);
                  setSelectedFloor(null);
                  setSelectedRoom(null);
                }}
                className="select-input"
              >
                <option value="">All Buildings</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="select-icon" />
            </div>
          </div>

          {/* Floor Selector */}
          <div className="selector-group">
            <label className="selector-label">Floor:</label>
            <div className="custom-select">
              <select
                value={selectedFloor || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedFloor(value ? parseInt(value) : null);
                  setSelectedRoom(null);
                }}
                className="select-input"
                disabled={!selectedBuilding}
              >
                <option value="">All Floors</option>
                {floors
                  .filter(floor => !selectedBuilding || floor.building_id === selectedBuilding)
                  .map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      Floor {floor.floor_number}
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} className="select-icon" />
            </div>
          </div>

          {/* Room Selector */}
          <div className="selector-group">
            <label className="selector-label">Room:</label>
            <div className="custom-select">
              <select
                value={selectedRoom || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedRoom(value ? parseInt(value) : null);
                }}
                className="select-input"
                disabled={!selectedFloor}
              >
                <option value="">All Rooms</option>
                {rooms
                  .filter(room => !selectedFloor || room.floor_id === selectedFloor)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_name}
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} className="select-icon" />
            </div>
          </div>
        </div>

        {/* Floor Plan Actions */}
        <div className="controls-right">
          <PermissionGate permission="FLOOR_EDIT">
            {selectedFloor && (
              <>
                <button
                  onClick={() => setShowFloorPlanModal(true)}
                  className="action-btn floor-plan-btn"
                  title="Upload floor plan"
                >
                  <Upload size={18} />
                  {hasFloorPlan ? 'Manage Floor Plan' : 'Upload Floor Plan'}
                </button>

                {hasFloorPlan && !coordinateMarkingMode && (
                  <button
                    onClick={() => {
                      const roomsOnFloor = rooms.filter(r => r.floor_id === selectedFloor);
                      if (roomsOnFloor.length === 0) {
                        alert('No rooms on this floor to mark coordinates.');
                        return;
                      }
                      handleStartMarkingRoom(roomsOnFloor[0]);
                    }}
                    className="action-btn mark-coordinates-btn"
                    title="Mark room coordinates on floor plan"
                  >
                    <MapPinned size={18} />
                    Mark Room Locations
                  </button>
                )}

                {coordinateMarkingMode && (
                  <div className="marking-mode-indicator">
                    <span className="marking-text">
                      Drawing boundary for: <strong>{selectedRoomForMarking?.room_name}</strong>
                      <br />
                      Points: {polygonPoints.length} {polygonPoints.length >= 3 ? '(Ready to complete)' : '(Need at least 3)'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {polygonPoints.length > 0 && (
                        <button
                          onClick={handleUndoLastPoint}
                          className="btn-undo-point"
                          title="Undo last point"
                        >
                          Undo
                        </button>
                      )}
                      {polygonPoints.length >= 3 && (
                        <button
                          onClick={handleCompletePolygon}
                          className="btn-complete-polygon"
                          title="Complete the room boundary"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={handleCancelMarking}
                        className="btn-cancel-marking"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </PermissionGate>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="tracking-content">
        {/* Map/List View Area - LEFT SIDE */}
        <div className="tracking-main">
          {loading && (
            <div className="empty-state">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          )}

          {error && (
            <div className="empty-state">
              <p className="error-message" style={{ color: '#e74c3c' }}>{error}</p>
            </div>
          )}

          {!loading && !error && buildings.length === 0 ? (
            <div className="empty-state">
              <MapPin size={64} className="empty-icon" />
              <h3 className="empty-title">No Buildings Found</h3>
              <p className="empty-description">
                Please create buildings, floors, and rooms in the Buildings section first.
              </p>
            </div>
          ) : !loading && !error && buildings.length > 0 ? (
            <div className="map-container" style={{ height: '100%' }}>
              <MapVisualization
                buildings={buildings}
                floors={floors}
                rooms={rooms}
                anchors={anchors}
                tags={allTags}
                selectedBuilding={selectedBuilding}
                selectedFloor={selectedFloor}
                selectedRoom={selectedRoom}
                onSelectBuilding={(id) => {
                  setSelectedBuilding(id);
                  setSelectedFloor(null);
                  setSelectedRoom(null);
                }}
                onSelectFloor={(id) => {
                  setSelectedFloor(id);
                  setSelectedRoom(null);
                  // Auto-select the building for this floor
                  const floor = floors.find(f => f.id === id);
                  if (floor) {
                    setSelectedBuilding(floor.building_id);
                  }
                }}
                onSelectRoom={(id) => {
                  setSelectedRoom(id);
                  // Auto-select the floor and building for this room
                  const room = rooms.find(r => r.id === id);
                  if (room) {
                    setSelectedFloor(room.floor_id);
                    const floor = floors.find(f => f.id === room.floor_id);
                    if (floor) {
                      setSelectedBuilding(floor.building_id);
                    }
                  }
                }}
                polygonPoints={coordinateMarkingMode ? polygonPoints : null}
                onAddPolygonPoint={coordinateMarkingMode ? handleAddPolygonPoint : null}
              />
            </div>
          ) : null}
        </div>

        {/* Right Sidebar - RIGHT SIDE */}
        <div className="tracking-sidebar">
          {/* Search Box */}
          <div className="sidebar-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search patient or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Filter Buttons */}
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${activeFilter === 'moving' ? 'active' : ''}`}
              onClick={() => setActiveFilter('moving')}
            >
              Moving
            </button>
            <button
              className={`filter-btn ${activeFilter === 'stationary' ? 'active' : ''}`}
              onClick={() => setActiveFilter('stationary')}
            >
              Stationary
            </button>
            <button
              className={`filter-btn ${activeFilter === 'out-of-range' ? 'active' : ''}`}
              onClick={() => setActiveFilter('out-of-range')}
            >
              Out Of Range
            </button>
          </div>

          {/* Tags List */}
          <div className="tags-list">
            {allTags.length === 0 ? (
              <div className="no-floor-message">No tags detected</div>
            ) : (
              allTags
                .filter(tag => {
                  // Filter by search term
                  if (searchTerm && !tag.userName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                      !tag.tag_id?.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                  }
                  // Filter by selected room/floor/building
                  if (selectedRoom && tag.room_id !== selectedRoom) return false;
                  if (selectedFloor) {
                    const room = rooms.find(r => r.id === tag.room_id);
                    if (!room || room.floor_id !== selectedFloor) return false;
                  }
                  if (selectedBuilding) {
                    const room = rooms.find(r => r.id === tag.room_id);
                    if (!room) return false;
                    const floor = floors.find(f => f.id === room.floor_id);
                    if (!floor || floor.building_id !== selectedBuilding) return false;
                  }
                  return true;
                })
                .map(tag => (
                  <div
                    key={tag.tag_id}
                    className={`tag-item ${tag.status === 'offline' ? 'tag-offline' : ''}`}
                  >
                    <div className="tag-info">
                      <strong>{tag.userName || tag.name}</strong>
                      <span className="tag-id">{tag.tag_id}</span>
                      {tag.status === 'offline' && (
                        <span className="tag-status-badge offline">LOST</span>
                      )}
                    </div>
                    <div className="tag-location">
                      <MapPin size={14} />
                      <span>{tag.lastSeenRoom}</span>
                    </div>
                    <div className="tag-time">
                      {tag.status === 'offline' ? 'Last seen: ' : ''}{tag.updatedAt}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Stats */}
          <div className="stats-section">
            <div className="stat-item">
              <span className="stat-label">Active Tags</span>
              <span className="stat-value">{enhancedLiveTags.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Lost Tags</span>
              <span className="stat-value" style={{ color: '#e74c3c' }}>{enhancedOfflineTags.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rooms with Tags</span>
              <span className="stat-value">{new Set(allTags.map(t => t.room_id)).size}</span>
            </div>
          </div>

          {/* Counts */}
          {/* <div className="counts-section">
            <div className="count-row">
              <span className="count-value">0</span>
            </div>
            <div className="count-row">
              <span className="count-value">0</span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Floor Plan Upload Modal */}
      {showFloorPlanModal && selectedFloorData && (
        <FloorPlanUploadModal
          isOpen={showFloorPlanModal}
          onClose={() => setShowFloorPlanModal(false)}
          floor={selectedFloorData}
          onUploadSuccess={handleFloorPlanUploadSuccess}
        />
      )}
    </div>
  );
};

export default LiveTracking;
