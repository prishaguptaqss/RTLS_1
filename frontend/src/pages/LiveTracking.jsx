import { useState, useEffect } from 'react';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import { fetchBuildings, fetchFloors, fetchRooms, fetchDevices, fetchLivePositions } from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { websocketService } from '../services/websocket';
import MapVisualization from '../components/MapVisualization';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch buildings and anchors when organization changes
  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadBuildings();
      loadAnchors();
      loadLivePositions();
    }

    // Auto-refresh timestamp
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
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
      // Remove tag from live positions or mark as offline
      setLiveTags(prev => prev.filter(tag => tag.tag_id !== data.tag_id));
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
      const anchorsData = await fetchDevices();
      setAnchors(anchorsData);
    } catch (err) {
      console.error('Error loading anchors:', err);
    }
  };

  const loadLivePositions = async () => {
    try {
      const response = await fetchLivePositions();
      // Transform the response to match our tag structure
      const tags = response.positions.map(pos => ({
        tag_id: pos.handbandSerial,
        name: pos.handbandSerial,
        userName: pos.userName,
        entityName: pos.userName, // Using userName as entityName for now
        room_id: pos.room_id, // Note: API response doesn't include room_id, need to look it up
        lastSeenRoom: pos.lastSeenRoom,
        updatedAt: pos.updatedAt,
      }));
      setLiveTags(tags);
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
      const allFloorsPromises = buildings.map(building => fetchFloors(building.id));
      const allFloorsArrays = await Promise.all(allFloorsPromises);
      const allFloors = allFloorsArrays.flat();
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

  // Map room names to room IDs for live tag positioning
  const getRoomIdByName = (roomName) => {
    const room = rooms.find(r => r.room_name === roomName);
    return room ? room.id : null;
  };

  // Enhance live tags with room_id lookup
  const enhancedLiveTags = liveTags.map(tag => ({
    ...tag,
    room_id: getRoomIdByName(tag.lastSeenRoom),
  })).filter(tag => tag.room_id !== null); // Only show tags with valid room mappings

  const getTimeAgo = () => {
    const now = new Date();
    const seconds = Math.floor((now - lastUpdate) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

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
                tags={enhancedLiveTags}
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
            {enhancedLiveTags.length === 0 ? (
              <div className="no-floor-message">No active tags detected</div>
            ) : (
              enhancedLiveTags
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
                  <div key={tag.tag_id} className="tag-item">
                    <div className="tag-info">
                      <strong>{tag.userName || tag.name}</strong>
                      <span className="tag-id">{tag.tag_id}</span>
                    </div>
                    <div className="tag-location">
                      <MapPin size={14} />
                      <span>{tag.lastSeenRoom}</span>
                    </div>
                    <div className="tag-time">{tag.updatedAt}</div>
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
              <span className="stat-label">Rooms with Tags</span>
              <span className="stat-value">{new Set(enhancedLiveTags.map(t => t.room_id)).size}</span>
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
    </div>
  );
};

export default LiveTracking;
