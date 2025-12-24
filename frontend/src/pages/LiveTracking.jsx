import { useState, useEffect } from 'react';
import { MapPin, List, Search, ChevronDown } from 'lucide-react';
import './LiveTracking.css';

const LiveTracking = () => {
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'moving', 'stationary', 'out-of-range'
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);

  // Mock data - Replace with actual API calls
  useEffect(() => {
    // Simulate fetching buildings
    setBuildings([
      { id: 1, name: 'Building A' },
      { id: 2, name: 'Building B' },
      { id: 3, name: 'Building C' }
    ]);

    // Auto-refresh timestamp
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load floors when building is selected
  useEffect(() => {
    if (selectedBuilding) {
      // Mock floors data - Replace with actual API call
      setFloors([
        { id: 1, name: 'Floor 1', building_id: selectedBuilding },
        { id: 2, name: 'Floor 2', building_id: selectedBuilding },
        { id: 3, name: 'Floor 3', building_id: selectedBuilding }
      ]);
    } else {
      setFloors([]);
      setSelectedFloor('');
    }
  }, [selectedBuilding]);

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
          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <MapPin size={18} />
              <span>On Map</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
              <span>By List</span>
            </button>
          </div>

          {/* Building Selector */}
          <div className="selector-group">
            <label className="selector-label">Building:</label>
            <div className="custom-select">
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="select-input"
              >
                <option value="">Select building</option>
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
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="select-input"
                disabled={!selectedBuilding}
              >
                <option value="">Select floor</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
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
          {!selectedFloor ? (
            <div className="empty-state">
              <MapPin size={64} className="empty-icon" />
              <h3 className="empty-title">No Floor Selected</h3>
              <p className="empty-description">
                Please select a building & floor or search for a patient to locate.
              </p>
            </div>
          ) : (
            <div className="map-container">
              {/* Map or List content will go here */}
              <div className="map-placeholder">
                <p>Map view will be displayed here for {selectedBuilding} - Floor {selectedFloor}</p>
              </div>
            </div>
          )}
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
            {!selectedFloor ? (
              <div className="no-floor-message">No tags found on this floor</div>
            ) : (
              <div className="no-floor-message">No tags found on this floor</div>
            )}
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
