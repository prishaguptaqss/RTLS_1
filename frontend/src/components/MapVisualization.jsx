import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Rectangle, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapVisualization.css';

// Fix for default marker icons in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * MapViewControl - Component that handles map view changes
 */
function MapViewControl({ bounds, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.5 });
    } else if (zoom) {
      map.setView(zoom.center, zoom.level, { animate: true, duration: 0.5 });
    }
  }, [map, bounds, zoom]);

  return null;
}

/**
 * LogicalLayoutEngine - Generates coordinates for buildings, floors, rooms, and anchors
 * when no manual coordinates are provided
 */
class LogicalLayoutEngine {
  constructor(config = {}) {
    this.config = {
      buildingSpacing: config.buildingSpacing || 200,
      floorHeight: config.floorHeight || 150,
      roomSize: config.roomSize || 40,
      roomSpacing: config.roomSpacing || 10,
      anchorSize: config.anchorSize || 5,
      maxRoomsPerRow: config.maxRoomsPerRow || 5,
    };
  }

  /**
   * Calculate layout for entire organization hierarchy
   */
  calculateLayout(buildings, floors, rooms, anchors) {
    const layout = {
      buildings: {},
      floors: {},
      rooms: {},
      anchors: {},
      bounds: null,
    };

    let currentX = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    buildings.forEach((building, buildingIndex) => {
      const buildingFloors = floors.filter(f => f.building_id === building.id);
      const buildingWidth = this.calculateBuildingWidth(buildingFloors, rooms);
      const buildingHeight = buildingFloors.length * this.config.floorHeight;

      // Building position
      const buildingX = currentX;
      const buildingY = 0;

      layout.buildings[building.id] = {
        x: buildingX,
        y: buildingY,
        width: buildingWidth,
        height: buildingHeight,
        bounds: [
          [buildingY, buildingX],
          [buildingY + buildingHeight, buildingX + buildingWidth]
        ],
      };

      // Update bounds
      minX = Math.min(minX, buildingX);
      maxX = Math.max(maxX, buildingX + buildingWidth);
      minY = Math.min(minY, buildingY);
      maxY = Math.max(maxY, buildingY + buildingHeight);

      // Layout floors within building
      buildingFloors.forEach((floor, floorIndex) => {
        const floorY = buildingY + (floorIndex * this.config.floorHeight);
        const floorRooms = rooms.filter(r => r.floor_id === floor.id);

        layout.floors[floor.id] = {
          x: buildingX,
          y: floorY,
          width: buildingWidth,
          height: this.config.floorHeight,
          bounds: [
            [floorY, buildingX],
            [floorY + this.config.floorHeight, buildingX + buildingWidth]
          ],
        };

        // Layout rooms within floor (grid layout)
        this.layoutRooms(floorRooms, buildingX, floorY, buildingWidth, layout, anchors);
      });

      currentX += buildingWidth + this.config.buildingSpacing;
    });

    // Calculate overall bounds
    layout.bounds = [
      [minY - 20, minX - 20],
      [maxY + 20, maxX + 20]
    ];

    return layout;
  }

  calculateBuildingWidth(floors, rooms) {
    let maxRoomsOnAnyFloor = 0;
    floors.forEach(floor => {
      const roomCount = rooms.filter(r => r.floor_id === floor.id).length;
      maxRoomsOnAnyFloor = Math.max(maxRoomsOnAnyFloor, roomCount);
    });

    const roomsPerRow = Math.min(maxRoomsOnAnyFloor, this.config.maxRoomsPerRow);
    return roomsPerRow * (this.config.roomSize + this.config.roomSpacing) + this.config.roomSpacing;
  }

  layoutRooms(floorRooms, startX, startY, floorWidth, layout, anchors) {
    const { roomSize, roomSpacing, anchorSize } = this.config;
    const padding = 10;

    floorRooms.forEach((room, index) => {
      const row = Math.floor(index / this.config.maxRoomsPerRow);
      const col = index % this.config.maxRoomsPerRow;

      // Use manual coordinates if available, otherwise calculate
      const roomX = room.x_coordinate !== null && room.x_coordinate !== undefined
        ? room.x_coordinate
        : startX + padding + (col * (roomSize + roomSpacing));
      const roomY = room.y_coordinate !== null && room.y_coordinate !== undefined
        ? room.y_coordinate
        : startY + padding + (row * (roomSize + roomSpacing));

      layout.rooms[room.id] = {
        x: roomX,
        y: roomY,
        width: roomSize,
        height: roomSize,
        bounds: [
          [roomY, roomX],
          [roomY + roomSize, roomX + roomSize]
        ],
        center: [roomY + roomSize / 2, roomX + roomSize / 2],
      };

      // Layout anchors within room
      const roomAnchors = anchors.filter(a => a.room_id === room.id);
      roomAnchors.forEach((anchor, anchorIndex) => {
        // Use manual coordinates if available, otherwise position around room center
        const anchorX = anchor.x_coordinate !== null && anchor.x_coordinate !== undefined
          ? anchor.x_coordinate
          : roomX + roomSize / 2 + (anchorIndex * anchorSize * 2);
        const anchorY = anchor.y_coordinate !== null && anchor.y_coordinate !== undefined
          ? anchor.y_coordinate
          : roomY + roomSize / 2;

        layout.anchors[anchor.anchor_id] = {
          x: anchorX,
          y: anchorY,
          position: [anchorY, anchorX],
        };
      });
    });
  }
}

/**
 * MapVisualization - Main component for hierarchical RTLS visualization
 */
const MapVisualization = ({
  buildings = [],
  floors = [],
  rooms = [],
  anchors = [],
  tags = [], // Live tag positions { tag_id, room_id, name, ... }
  selectedBuilding = null,
  selectedFloor = null,
  selectedRoom = null,
  onSelectBuilding = () => {},
  onSelectFloor = () => {},
  onSelectRoom = () => {},
  onCoordinateUpdate = () => {}, // Callback for coordinate editing
  editMode = false, // Enable coordinate editing
}) => {
  const [layout, setLayout] = useState(null);
  const [viewBounds, setViewBounds] = useState(null);
  const [viewZoom, setViewZoom] = useState(null);
  const layoutEngine = useRef(new LogicalLayoutEngine());

  // Calculate layout whenever data changes
  useEffect(() => {
    if (buildings.length > 0) {
      const newLayout = layoutEngine.current.calculateLayout(buildings, floors, rooms, anchors);
      setLayout(newLayout);

      // Set initial view to show all buildings
      if (newLayout.bounds) {
        setViewBounds(newLayout.bounds);
      }
    }
  }, [buildings, floors, rooms, anchors]);

  // Handle hierarchy selection and zoom
  useEffect(() => {
    if (!layout) return;

    if (selectedRoom && layout.rooms[selectedRoom]) {
      // Zoom to specific room
      setViewBounds(layout.rooms[selectedRoom].bounds);
    } else if (selectedFloor && layout.floors[selectedFloor]) {
      // Zoom to floor
      setViewBounds(layout.floors[selectedFloor].bounds);
    } else if (selectedBuilding && layout.buildings[selectedBuilding]) {
      // Zoom to building
      setViewBounds(layout.buildings[selectedBuilding].bounds);
    } else {
      // Show all buildings
      setViewBounds(layout.bounds);
    }
  }, [selectedBuilding, selectedFloor, selectedRoom, layout]);

  // Get room color based on type
  const getRoomColor = (roomType) => {
    const colors = {
      'ICU': '#e74c3c',
      'Ward': '#3498db',
      'ER': '#e67e22',
      'Operating Room': '#9b59b6',
      'Lab': '#1abc9c',
      'default': '#95a5a6',
    };
    return colors[roomType] || colors.default;
  };

  // Get tag positions
  const getTagPositions = () => {
    if (!layout) return [];

    return tags.map(tag => {
      const room = layout.rooms[tag.room_id];
      if (!room) return null;

      // Position tag at room center with slight random offset to avoid overlap
      const offsetX = (Math.random() - 0.5) * room.width * 0.5;
      const offsetY = (Math.random() - 0.5) * room.height * 0.5;

      return {
        ...tag,
        position: [room.center[0] + offsetY, room.center[1] + offsetX],
      };
    }).filter(Boolean);
  };

  const tagPositions = getTagPositions();

  if (!layout) {
    return (
      <div className="map-visualization-loading">
        <p>Loading map visualization...</p>
      </div>
    );
  }

  return (
    <div className="map-visualization-container">
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: '#f8f9fa' }}
        zoomControl={true}
        attributionControl={false}
        crs={L.CRS.Simple} // Use simple coordinate system (not geographic)
      >
        <MapViewControl bounds={viewBounds} zoom={viewZoom} />

        {/* Render Buildings */}
        {buildings.map(building => {
          const buildingLayout = layout.buildings[building.id];
          if (!buildingLayout) return null;

          const isSelected = selectedBuilding === building.id;

          return (
            <Rectangle
              key={`building-${building.id}`}
              bounds={buildingLayout.bounds}
              pathOptions={{
                color: isSelected ? '#2c3e50' : '#7f8c8d',
                weight: isSelected ? 3 : 2,
                fillColor: '#ecf0f1',
                fillOpacity: 0.2,
              }}
              eventHandlers={{
                click: () => onSelectBuilding(building.id),
              }}
            >
              <Popup>
                <strong>{building.name}</strong>
                <br />
                Floors: {floors.filter(f => f.building_id === building.id).length}
              </Popup>
            </Rectangle>
          );
        })}

        {/* Render Floors (only if building is selected or showing all) */}
        {floors.map(floor => {
          const floorLayout = layout.floors[floor.id];
          if (!floorLayout) return null;

          // Only render floors if their building is selected or no building is selected
          if (selectedBuilding && floor.building_id !== selectedBuilding) return null;

          const isSelected = selectedFloor === floor.id;

          return (
            <Rectangle
              key={`floor-${floor.id}`}
              bounds={floorLayout.bounds}
              pathOptions={{
                color: isSelected ? '#3498db' : '#95a5a6',
                weight: isSelected ? 3 : 1,
                fillColor: '#ffffff',
                fillOpacity: 0.3,
                dashArray: '5, 5',
              }}
              eventHandlers={{
                click: () => onSelectFloor(floor.id),
              }}
            >
              <Popup>
                <strong>Floor {floor.floor_number}</strong>
                <br />
                Rooms: {rooms.filter(r => r.floor_id === floor.id).length}
              </Popup>
            </Rectangle>
          );
        })}

        {/* Render Rooms */}
        {rooms.map(room => {
          const roomLayout = layout.rooms[room.id];
          if (!roomLayout) return null;

          // Filter rooms based on selection
          if (selectedFloor) {
            if (room.floor_id !== selectedFloor) return null;
          } else if (selectedBuilding) {
            const roomFloor = floors.find(f => f.id === room.floor_id);
            if (!roomFloor || roomFloor.building_id !== selectedBuilding) return null;
          }

          const isSelected = selectedRoom === room.id;
          const roomColor = getRoomColor(room.room_type);

          return (
            <Rectangle
              key={`room-${room.id}`}
              bounds={roomLayout.bounds}
              pathOptions={{
                color: isSelected ? '#2c3e50' : roomColor,
                weight: isSelected ? 3 : 2,
                fillColor: roomColor,
                fillOpacity: isSelected ? 0.4 : 0.2,
              }}
              eventHandlers={{
                click: () => onSelectRoom(room.id),
              }}
            >
              <Popup>
                <strong>{room.room_name}</strong>
                <br />
                Type: {room.room_type || 'N/A'}
                <br />
                Anchors: {anchors.filter(a => a.room_id === room.id).length}
              </Popup>
            </Rectangle>
          );
        })}

        {/* Render Anchors */}
        {anchors.map(anchor => {
          const anchorLayout = layout.anchors[anchor.anchor_id];
          if (!anchorLayout) return null;

          // Filter anchors based on selection
          const anchorRoom = rooms.find(r => r.id === anchor.room_id);
          if (!anchorRoom) return null;

          if (selectedRoom && anchor.room_id !== selectedRoom) return null;
          if (selectedFloor && anchorRoom.floor_id !== selectedFloor) return null;
          if (selectedBuilding) {
            const roomFloor = floors.find(f => f.id === anchorRoom.floor_id);
            if (!roomFloor || roomFloor.building_id !== selectedBuilding) return null;
          }

          const isActive = anchor.status === 'active';

          return (
            <Circle
              key={`anchor-${anchor.anchor_id}`}
              center={anchorLayout.position}
              radius={2}
              pathOptions={{
                color: isActive ? '#27ae60' : '#e74c3c',
                weight: 2,
                fillColor: isActive ? '#2ecc71' : '#e74c3c',
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <strong>{anchor.anchor_name || anchor.anchor_id}</strong>
                <br />
                Status: {anchor.status}
                <br />
                Room: {anchorRoom.room_name}
              </Popup>
            </Circle>
          );
        })}

        {/* Render Live Tags */}
        {tagPositions.map(tag => (
          <Circle
            key={`tag-${tag.tag_id}`}
            center={tag.position}
            radius={3}
            pathOptions={{
              color: '#f39c12',
              weight: 2,
              fillColor: '#f1c40f',
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>{tag.name || tag.tag_id}</strong>
              <br />
              {tag.entityName && `Entity: ${tag.entityName}`}
              {tag.userName && `User: ${tag.userName}`}
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#ecf0f1', border: '2px solid #7f8c8d' }}></div>
          <span>Building</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#ffffff', border: '1px dashed #95a5a6' }}></div>
          <span>Floor</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#3498db' }}></div>
          <span>Room</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle" style={{ background: '#2ecc71' }}></div>
          <span>Active Anchor</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle" style={{ background: '#f1c40f' }}></div>
          <span>Live Tag</span>
        </div>
      </div>
    </div>
  );
};

export default MapVisualization;
