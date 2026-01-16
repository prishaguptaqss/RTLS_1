import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Rectangle, Circle, Marker, Popup, useMap, ImageOverlay, useMapEvents, Polygon, Polyline } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapVisualization.css';
import { getFloorPlanBlobUrl } from '../services/api';

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
 * FloorPlanLayer - Component that displays floor plan image overlay with polygon drawing support
 */
function FloorPlanLayer({ floor, rooms, onRoomCoordinateClick, polygonPoints, onAddPolygonPoint }) {
  const [imageBounds, setImageBounds] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const map = useMap();

  useEffect(() => {
    if (!floor?.floor_plan_path) {
      setImageLoaded(false);
      setImageBounds(null);
      setImageUrl(null);
      return;
    }

    // Fetch floor plan image as blob URL with authentication
    const loadFloorPlan = async () => {
      try {
        const blobUrl = await getFloorPlanBlobUrl(floor.id);
        if (!blobUrl) {
          console.error('Failed to load floor plan');
          return;
        }

        setImageUrl(blobUrl);

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          console.log('Floor plan image loaded:', img.width, 'x', img.height);
          // Set bounds based on image dimensions
          // Use image pixel dimensions as coordinate system
          const bounds = [[0, 0], [img.height, img.width]];
          setImageBounds(bounds);
          setImageLoaded(true);

          // Fit map to image bounds with padding
          map.fitBounds(bounds, { padding: [50, 50] });
        };

        img.onerror = () => {
          console.error('Failed to load floor plan image');
          setImageLoaded(false);
          setImageBounds(null);
        };

        img.src = blobUrl;
      } catch (error) {
        console.error('Error loading floor plan:', error);
      }
    };

    loadFloorPlan();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [floor, map]);

  useMapEvents({
    click: (e) => {
      if (imageLoaded) {
        const { lat, lng } = e.latlng;
        console.log('Floor plan clicked at:', lng, lat);

        // If in polygon drawing mode, add point to polygon
        if (onAddPolygonPoint) {
          onAddPolygonPoint({ x: lng, y: lat });
        }
        // Legacy single-point mode
        else if (onRoomCoordinateClick) {
          onRoomCoordinateClick({ x: lng, y: lat });
        }
      }
    }
  });

  if (!floor?.floor_plan_path || !imageBounds || !imageLoaded || !imageUrl) {
    return null;
  }

  return (
    <>
      <ImageOverlay
        url={imageUrl}
        bounds={imageBounds}
        opacity={0.9}
        zIndex={10}
      />

      {/* Show polygon being drawn */}
      {polygonPoints && polygonPoints.length > 0 && (
        <>
          {/* Draw lines connecting the points */}
          {polygonPoints.length > 1 && (
            <Polyline
              positions={polygonPoints.map(p => [p.y, p.x])}
              pathOptions={{
                color: '#ffc107',
                weight: 3,
                dashArray: '5, 5',
              }}
            />
          )}

          {/* Draw line from last point to first (closing the polygon preview) */}
          {polygonPoints.length >= 3 && (
            <Polyline
              positions={[
                [polygonPoints[polygonPoints.length - 1].y, polygonPoints[polygonPoints.length - 1].x],
                [polygonPoints[0].y, polygonPoints[0].x]
              ]}
              pathOptions={{
                color: '#ffc107',
                weight: 2,
                dashArray: '10, 10',
                opacity: 0.5,
              }}
            />
          )}

          {/* Draw circles at each point */}
          {polygonPoints.map((point, index) => (
            <Circle
              key={`polygon-point-${index}`}
              center={[point.y, point.x]}
              radius={10}
              pathOptions={{
                color: index === 0 ? '#4caf50' : '#ffc107',
                fillColor: index === 0 ? '#4caf50' : '#ffc107',
                fillOpacity: 0.8,
                weight: 2,
              }}
            />
          ))}
        </>
      )}
    </>
  );
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
  onRoomCoordinateClick = null, // Callback when clicking on floor plan to mark room coordinates (legacy single-point)
  polygonPoints = null, // Array of {x, y} points for polygon being drawn
  onAddPolygonPoint = null, // Callback when user clicks to add a point to polygon
  onRoomPolygonClick = null, // Callback when clicking on a room polygon (for update/delete actions)
}) => {
  const [layout, setLayout] = useState(null);
  const [viewBounds, setViewBounds] = useState(null);
  const [viewZoom, setViewZoom] = useState(null);
  const layoutEngine = useRef(new LogicalLayoutEngine());

  // Check if selected floor has a floor plan
  const selectedFloorData = floors.find(f => f.id === selectedFloor);
  const hasFloorPlan = selectedFloorData?.floor_plan_path;

  // Debug logging
  console.log('[MapVisualization] Rendering with:', {
    buildings: buildings.length,
    floors: floors.length,
    rooms: rooms.length,
    anchors: anchors.length,
    tags: tags.length,
    selectedFloor,
    hasFloorPlan
  });

  // Calculate layout whenever data changes
  useEffect(() => {
    if (buildings.length > 0) {
      const newLayout = layoutEngine.current.calculateLayout(buildings, floors, rooms, anchors);
      setLayout(newLayout);

      // Set initial view to show all buildings (only if no floor plan is active)
      if (newLayout.bounds && !hasFloorPlan) {
        setViewBounds(newLayout.bounds);
      }
    }
  }, [buildings, floors, rooms, anchors, hasFloorPlan]);

  // Handle hierarchy selection and zoom
  useEffect(() => {
    if (!layout) return;

    // If floor has a floor plan and a room is selected, zoom to that room on the floor plan
    if (hasFloorPlan && selectedFloor && selectedRoom) {
      const room = rooms.find(r => r.id === selectedRoom);
      if (room && room.polygon_coordinates && Array.isArray(room.polygon_coordinates) && room.polygon_coordinates.length >= 3) {
        // Calculate bounds from room polygon coordinates
        const xCoords = room.polygon_coordinates.map(coord => coord.x);
        const yCoords = room.polygon_coordinates.map(coord => coord.y);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        // Add padding around the room (20% of room size)
        const paddingX = (maxX - minX) * 0.2;
        const paddingY = (maxY - minY) * 0.2;

        const roomBounds = [
          [minY - paddingY, minX - paddingX],
          [maxY + paddingY, maxX + paddingX]
        ];

        console.log('Zooming to room on floor plan:', room.room_name, roomBounds);
        setViewBounds(roomBounds);
        return;
      }
    }

    // If floor has a floor plan but no room selected, let FloorPlanLayer handle initial bounds
    if (hasFloorPlan && selectedFloor && !selectedRoom) {
      // Bounds will be set by FloorPlanLayer when image loads
      return;
    }

    // When floor plan is removed or not present, use logical layout bounds
    if (selectedRoom && layout.rooms[selectedRoom]) {
      // Zoom to specific room in logical layout
      setViewBounds(layout.rooms[selectedRoom].bounds);
    } else if (selectedFloor && layout.floors[selectedFloor]) {
      // Zoom to floor (this will show rooms in logical layout)
      console.log('Setting view to floor bounds:', layout.floors[selectedFloor].bounds);
      setViewBounds(layout.floors[selectedFloor].bounds);
    } else if (selectedBuilding && layout.buildings[selectedBuilding]) {
      // Zoom to building
      setViewBounds(layout.buildings[selectedBuilding].bounds);
    } else {
      // Show all buildings
      setViewBounds(layout.bounds);
    }
  }, [selectedBuilding, selectedFloor, selectedRoom, layout, hasFloorPlan, rooms]);

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

  // Get tag positions - works for both logical layout and floor plan
  const getTagPositions = () => {
    if (!layout) return [];

    console.log('[MapVisualization] Getting tag positions for', tags.length, 'tags');
    console.log('[MapVisualization] hasFloorPlan:', hasFloorPlan, 'selectedFloor:', selectedFloor);

    const positions = tags.map(tag => {
      const room = rooms.find(r => r.id === tag.room_id);
      if (!room) {
        console.log('[MapVisualization] Tag', tag.tag_id, 'has no matching room. room_id:', tag.room_id);
        return null;
      }

      let position;

      // If floor plan exists and room has polygon coordinates, calculate center
      if (hasFloorPlan && selectedFloor && room.polygon_coordinates && Array.isArray(room.polygon_coordinates) && room.polygon_coordinates.length >= 3) {
        // Calculate centroid of polygon
        const sumX = room.polygon_coordinates.reduce((sum, coord) => sum + coord.x, 0);
        const sumY = room.polygon_coordinates.reduce((sum, coord) => sum + coord.y, 0);
        const centerX = sumX / room.polygon_coordinates.length;
        const centerY = sumY / room.polygon_coordinates.length;
        position = [centerY, centerX]; // Leaflet format [lat, lng] = [y, x]
        console.log('[MapVisualization] Tag', tag.tag_id, 'in room', room.room_name, 'at polygon center:', position);
      }
      // If floor plan exists and room has single point coordinates (legacy), use those
      else if (hasFloorPlan && selectedFloor && room.x_coordinate != null && room.y_coordinate != null) {
        position = [room.y_coordinate, room.x_coordinate];
        console.log('[MapVisualization] Tag', tag.tag_id, 'in room', room.room_name, 'at point:', position);
      }
      // Use logical layout
      else {
        const roomLayout = layout.rooms[tag.room_id];
        if (!roomLayout) {
          console.log('[MapVisualization] Tag', tag.tag_id, 'has no room layout');
          return null;
        }
        position = roomLayout.center;
        console.log('[MapVisualization] Tag', tag.tag_id, 'in room', room.room_name, 'at logical layout:', position);
      }

      return {
        ...tag,
        position: position,
      };
    }).filter(Boolean);

    console.log('[MapVisualization] Calculated', positions.length, 'tag positions');
    return positions;
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

        {/* Render Floor Plan if available and floor is selected */}
        {hasFloorPlan && selectedFloor && (
          <FloorPlanLayer
            floor={selectedFloorData}
            rooms={rooms.filter(r => r.floor_id === selectedFloor)}
            onRoomCoordinateClick={onRoomCoordinateClick}
            polygonPoints={polygonPoints}
            onAddPolygonPoint={onAddPolygonPoint}
          />
        )}

        {/* Render Buildings (only if no floor plan is showing) */}
        {!hasFloorPlan && buildings.map(building => {
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

        {/* Render Floors (only if no floor plan is showing) */}
        {!hasFloorPlan && floors.map(floor => {
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

        {/* Render Rooms - show on both floor plan and logical view */}
        {rooms.map(room => {
          // Filter rooms based on selection
          if (selectedFloor) {
            if (room.floor_id !== selectedFloor) return null;
          } else if (selectedBuilding) {
            const roomFloor = floors.find(f => f.id === room.floor_id);
            if (!roomFloor || roomFloor.building_id !== selectedBuilding) return null;
          }

          const isSelected = selectedRoom === room.id;
          const roomColor = getRoomColor(room.room_type);

          // If floor plan exists and room has polygon coordinates, use those
          if (hasFloorPlan && selectedFloor && room.polygon_coordinates && Array.isArray(room.polygon_coordinates) && room.polygon_coordinates.length >= 3) {
            // Convert polygon coordinates to Leaflet format [lat, lng] = [y, x]
            const polygonPositions = room.polygon_coordinates.map(coord => [coord.y, coord.x]);

            return (
              <Polygon
                key={`room-${room.id}`}
                positions={polygonPositions}
                pathOptions={{
                  color: isSelected ? '#2c3e50' : roomColor,
                  weight: isSelected ? 3 : 2,
                  fillColor: roomColor,
                  fillOpacity: isSelected ? 0.4 : 0.2,
                }}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation(); // Prevent event from bubbling
                    if (onRoomPolygonClick) {
                      onRoomPolygonClick(room);
                    } else {
                      onSelectRoom(room.id);
                    }
                  },
                }}
              >
                <Popup>
                  <strong>{room.room_name}</strong>
                  <br />
                  Type: {room.room_type || 'N/A'}
                  <br />
                  Anchors: {anchors.filter(a => a.room_id === room.id).length}
                  <br />
                  Points: {room.polygon_coordinates.length}
                </Popup>
              </Polygon>
            );
          }

          // If floor plan exists and room has single point coordinates (legacy), use those
          if (hasFloorPlan && selectedFloor && room.x_coordinate != null && room.y_coordinate != null) {
            // Use room's actual coordinates on floor plan
            const size = 50; // Room marker size in pixels on floor plan
            const roomBounds = [
              [room.y_coordinate - size/2, room.x_coordinate - size/2],
              [room.y_coordinate + size/2, room.x_coordinate + size/2]
            ];

            return (
              <Rectangle
                key={`room-${room.id}`}
                bounds={roomBounds}
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
                  <br />
                  Coords: ({room.x_coordinate.toFixed(0)}, {room.y_coordinate.toFixed(0)})
                </Popup>
              </Rectangle>
            );
          }

          // Use logical layout
          const roomLayout = layout.rooms[room.id];
          if (!roomLayout) {
            console.warn(`No layout found for room ${room.id} (${room.room_name})`);
            return null;
          }

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
          // Filter anchors based on selection
          const anchorRoom = rooms.find(r => r.id === anchor.room_id);
          if (!anchorRoom) return null;

          if (selectedRoom && anchor.room_id !== selectedRoom) return null;
          if (selectedFloor && anchorRoom.floor_id !== selectedFloor) return null;
          if (selectedBuilding) {
            const roomFloor = floors.find(f => f.id === anchorRoom.floor_id);
            if (!roomFloor || roomFloor.building_id !== selectedBuilding) return null;
          }

          // Determine anchor position based on floor plan or logical layout
          let anchorPosition;
          let anchorRadius;

          // If floor plan exists and floor is selected
          if (hasFloorPlan && selectedFloor) {
            // First priority: Use anchor's explicit coordinates
            if (anchor.x_coordinate != null && anchor.y_coordinate != null) {
              anchorPosition = [anchor.y_coordinate, anchor.x_coordinate]; // Leaflet format [lat, lng] = [y, x]
              anchorRadius = 15;
            }
            // Second priority: If anchor has no coordinates but room has polygon, use room center
            else if (anchorRoom.polygon_coordinates && Array.isArray(anchorRoom.polygon_coordinates) && anchorRoom.polygon_coordinates.length >= 3) {
              // Calculate centroid of room polygon
              const sumX = anchorRoom.polygon_coordinates.reduce((sum, coord) => sum + coord.x, 0);
              const sumY = anchorRoom.polygon_coordinates.reduce((sum, coord) => sum + coord.y, 0);
              const centerX = sumX / anchorRoom.polygon_coordinates.length;
              const centerY = sumY / anchorRoom.polygon_coordinates.length;
              anchorPosition = [centerY, centerX];
              anchorRadius = 15;
            }
            // Third priority: Room has single point coordinates
            else if (anchorRoom.x_coordinate != null && anchorRoom.y_coordinate != null) {
              anchorPosition = [anchorRoom.y_coordinate, anchorRoom.x_coordinate];
              anchorRadius = 15;
            } else {
              // Room has no coordinates on floor plan, don't show anchor
              return null;
            }
          } else {
            // Use logical layout (no floor plan)
            const anchorLayout = layout.anchors[anchor.anchor_id];
            if (!anchorLayout) return null;
            anchorPosition = anchorLayout.position;
            anchorRadius = 2;
          }

          const isActive = anchor.status === 'active';

          return (
            <Circle
              key={`anchor-${anchor.anchor_id}`}
              center={anchorPosition}
              radius={anchorRadius}
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
                {hasFloorPlan && anchor.x_coordinate != null && anchor.y_coordinate != null && (
                  <>
                    <br />
                    Coords: ({anchor.x_coordinate.toFixed(0)}, {anchor.y_coordinate.toFixed(0)})
                  </>
                )}
              </Popup>
            </Circle>
          );
        })}

        {/* Render Live Tags */}
        {tagPositions.map(tag => {
          // Filter tags based on selection (only show tags in visible rooms)
          const tagRoom = rooms.find(r => r.id === tag.room_id);
          if (!tagRoom) return null;

          if (selectedRoom && tag.room_id !== selectedRoom) return null;
          if (selectedFloor && tagRoom.floor_id !== selectedFloor) return null;
          if (selectedBuilding) {
            const roomFloor = floors.find(f => f.id === tagRoom.floor_id);
            if (!roomFloor || roomFloor.building_id !== selectedBuilding) return null;
          }

          const isOffline = tag.status === 'offline';

          // Create custom DivIcon for tag with pulse animation
          const tagIcon = L.divIcon({
            className: 'custom-tag-marker',
            html: `<div class="tag-pulse-container">
                     <div class="tag-dot ${isOffline ? 'tag-dot-offline' : 'tag-dot-active'}"></div>
                   </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          return (
            <Marker
              key={`tag-${tag.tag_id}`}
              position={tag.position}
              icon={tagIcon}
            >
              <Popup>
                <strong>{tag.name || tag.tag_id}</strong>
                {isOffline && <span style={{color: '#e74c3c', fontWeight: 'bold'}}> (LOST)</span>}
                <br />
                {tag.entityName && `Patient: ${tag.entityName}`}
                {tag.userName && `User: ${tag.userName}`}
                <br />
                Location: {tagRoom.room_name}
                <br />
                Status: {isOffline ? 'Offline - Last seen' : 'Active'}
                <br />
                {tag.updatedAt}
              </Popup>
            </Marker>
          );
        })}
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
          <span>Active Tag</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle" style={{ background: '#e74c3c' }}></div>
          <span>Lost Tag</span>
        </div>
      </div>
    </div>
  );
};

export default MapVisualization;
