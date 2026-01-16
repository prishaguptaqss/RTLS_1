import { useState, useEffect } from 'react';
import { Users, DoorOpen, Clock, Search, AlertTriangle, MapPin, ChevronDown } from 'lucide-react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import { fetchEntities, fetchBuildings, fetchFloors, fetchRooms, fetchDevices, fetchLivePositions } from '../services/api';
import { useSearch } from '../contexts/SearchContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { websocketService } from '../services/websocket';
import MapVisualization from '../components/MapVisualization';
import './LivePositions.css';
import './LiveTracking.css';

const PatientTrackingWithToggle = () => {
  const [isMapView, setIsMapView] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleViewChange = (newView) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsMapView(newView);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  return (
    <div className="patient-tracking-container">
      <div className={`view-wrapper ${isTransitioning ? 'transitioning' : 'active'}`}>
        {!isMapView ? (
          <LivePositions setIsMapView={handleViewChange} />
        ) : (
          <LiveTracking setIsMapView={handleViewChange} />
        )}
      </div>
    </div>
  );
};

const LivePositions = ({ setIsMapView }) => {
  const { searchQuery } = useSearch();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tracked');
  const [stats, setStats] = useState({
    trackedCount: 0,
    untrackedCount: 0,
    lastUpdate: null
  });

  useEffect(() => {
    loadEntities();
    const interval = setInterval(loadEntities, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadEntities = async () => {
    try {
      const data = await fetchEntities();
      const entitiesWithTags = (data || []).filter(e => e.assigned_tag_id);
      setEntities(entitiesWithTags);

      const tracked = entitiesWithTags.filter(e => e.tracking_status === 'tracked').length;
      const untracked = entitiesWithTags.filter(e => e.tracking_status === 'untracked').length;

      setStats({
        trackedCount: tracked,
        untrackedCount: untracked,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabFilteredEntities = entities.filter(e => e.tracking_status === activeTab);

  const filteredEntities = tabFilteredEntities.filter(entity => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entity.name?.toLowerCase().includes(query) ||
      entity.entity_id?.toLowerCase().includes(query) ||
      entity.assigned_tag_id?.toLowerCase().includes(query) ||
      entity.tag_name?.toLowerCase().includes(query) ||
      entity.current_location?.toLowerCase().includes(query)
    );
  });

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const now = new Date();
    const then = new Date(dateString);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="live-positions">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Tracking</h1>
        </div>
        {/* Toggle Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>List View</span>
          <button
            onClick={() => setIsMapView(true)}
            aria-label="Switch to map view"
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease',
              backgroundColor: '#cbd5e1',
              outline: 'none'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: 'white',
              position: 'absolute',
              top: '3px',
              left: '3px',
              transition: 'left 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Map View</span>
        </div>
      </div>

      <div className="stats-grid">
        <div
          className={`stat-card clickable ${activeTab === 'tracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracked')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <h4 className="stat-card-title">Tracked Patients</h4>
            <p className="stat-card-value" style={{ color: '#10b981', fontSize: '2rem', fontWeight: 'bold' }}>
              {stats.trackedCount}
            </p>
            <p className="stat-card-subtitle">Currently being tracked</p>
          </div>
          <div className="stat-card-icon" style={{ color: '#10b981' }}>
            <Users size={28} />
          </div>
        </div>

        <div
          className={`stat-card clickable ${activeTab === 'untracked' ? 'active' : ''}`}
          onClick={() => setActiveTab('untracked')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-content">
            <h4 className="stat-card-title">Untracked Patients</h4>
            <p className="stat-card-value" style={{ color: '#ef4444', fontSize: '2rem', fontWeight: 'bold' }}>
              {stats.untrackedCount}
            </p>
            <p className="stat-card-subtitle">Lost signal</p>
          </div>
          <div className="stat-card-icon" style={{ color: '#ef4444' }}>
            <AlertTriangle size={28} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <h4 className="stat-card-title">Latest Update</h4>
            <p className="stat-card-value" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[0] : '-'}
            </p>
            <p className="stat-card-subtitle">
              {stats.lastUpdate ? formatDateTime(stats.lastUpdate).split(',')[1] : 'Most recent update'}
            </p>
          </div>
          <div className="stat-card-icon">
            <Clock size={28} />
          </div>
        </div>
      </div>

      <Card className="positions-card">
        <Card.Header>
          <div className="card-header-content">
            <div>
              <Card.Title>Patient Positions</Card.Title>
            </div>
          </div>
        </Card.Header>

        <div className="tabs-container">
          <button
            className={`tab ${activeTab === 'tracked' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracked')}
          >
            <Users size={16} />
            Tracked ({stats.trackedCount})
          </button>
          <button
            className={`tab ${activeTab === 'untracked' ? 'active' : ''}`}
            onClick={() => setActiveTab('untracked')}
          >
            <AlertTriangle size={16} />
            Untracked ({stats.untrackedCount})
          </button>
        </div>

        <Card.Content className="table-content">
          {loading ? (
            <div className="loading-state">Loading patients...</div>
          ) : filteredEntities.length === 0 ? (
            <div className="empty-state">
              {searchQuery.trim() ? 'No matching patients found' : `No ${activeTab} patients`}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Patient ID</Table.Head>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Tag</Table.Head>
                  <Table.Head>{activeTab === 'tracked' ? 'Current Location' : 'Last Location'}</Table.Head>
                  {activeTab === 'untracked' && <Table.Head></Table.Head>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredEntities.map((entity) => (
                  <Table.Row key={entity.entity_id}>
                    <Table.Cell>
                      <strong>{entity.entity_id}</strong>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {entity.name?.charAt(0).toUpperCase() || 'E'}
                        </div>
                        <span>{entity.name || 'Unknown'}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {entity.tag_name ? (
                        <span>{entity.tag_name}</span>
                      ) : (
                        <code className="serial-code">{entity.assigned_tag_id}</code>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {entity.current_location || <span className="text-muted">Unknown</span>}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Content>
      </Card>

      <div className="pagination">
        <span className="pagination-info">Rows per page: 10</span>
        <span className="pagination-range">1-2 of 2</span>
        <div className="pagination-controls">
          <button className="pagination-btn" disabled>&lt;</button>
          <button className="pagination-btn" disabled>&gt;</button>
        </div>
      </div>
    </div>
  );
};

const LiveTracking = ({ setIsMapView }) => {
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [liveTags, setLiveTags] = useState([]);
  const [offlineTags, setOfflineTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orgLoading && currentOrganization) {
      loadBuildings();
      loadAnchors();
      loadLivePositions();
    }

    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [orgLoading, currentOrganization]);

  useEffect(() => {
    if (!currentOrganization) return;

    const handleLocationUpdate = (data) => {
      console.log('Location update received:', data);
      loadLivePositions();
    };

    const handleTagLost = (data) => {
      console.log('Tag lost:', data);

      setLiveTags(prev => {
        const lostTag = prev.find(tag => tag.tag_id === data.tag_id);

        if (lostTag) {
          setOfflineTags(prevOffline => {
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

        return prev.filter(tag => tag.tag_id !== data.tag_id);
      });
    };

    const unsubLocationUpdate = websocketService.on('LOCATION_UPDATE', handleLocationUpdate);
    const unsubTagLost = websocketService.on('TAG_LOST', handleTagLost);

    return () => {
      unsubLocationUpdate();
      unsubTagLost();
    };
  }, [currentOrganization]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      const buildingsData = await fetchBuildings();
      setBuildings(buildingsData);
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
      const activeTags = [];
      const offlineTags = [];

      response.positions.forEach(pos => {
        const tag = {
          tag_id: pos.handbandSerial,
          name: pos.handbandSerial,
          userName: pos.userName,
          entityName: pos.userName,
          room_id: pos.roomId,
          lastSeenRoom: pos.lastSeenRoom,
          updatedAt: pos.updatedAt,
          status: pos.status,
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

  const enhancedLiveTags = liveTags.filter(tag => tag.room_id !== null);
  const enhancedOfflineTags = offlineTags.filter(tag => tag.room_id !== null);
  const allTags = [...enhancedLiveTags, ...enhancedOfflineTags];

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
      <div className="tracking-header">
        <div className="header-left">
          <h1 className="tracking-title">Live Tracking</h1>
          <p className="tracking-subtitle">Real-time patient tag locations across the hospital</p>
        </div>
        <div className="header-right">
          {/* Toggle Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '20px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>List View</span>
            <button
              onClick={() => setIsMapView(false)}
              aria-label="Switch to list view"
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease',
                backgroundColor: '#3b82f6',
                outline: 'none'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: 'white',
                position: 'absolute',
                top: '3px',
                left: '27px',
                transition: 'left 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Map View</span>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
          </div>
          <span className="update-time">Updated {getTimeAgo()}</span>
        </div>
      </div>

      <div className="tracking-controls">
        <div className="controls-left">
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

      <div className="tracking-content">
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
                  const floor = floors.find(f => f.id === id);
                  if (floor) {
                    setSelectedBuilding(floor.building_id);
                  }
                }}
                onSelectRoom={(id) => {
                  setSelectedRoom(id);
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

        <div className="tracking-sidebar">
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

          <div className="tags-list">
            {allTags.length === 0 ? (
              <div className="no-floor-message">No tags detected</div>
            ) : (
              allTags
                .filter(tag => {
                  if (searchTerm && !tag.userName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                      !tag.tag_id?.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                  }
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
        </div>
      </div>
    </div>
  );
};

export default PatientTrackingWithToggle;