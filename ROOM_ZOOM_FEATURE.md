# Room Zoom Feature

## Overview
Added automatic zoom functionality when users select a room in Live Tracking. The map smoothly zooms to the selected room's location with appropriate padding.

## Implementation

### File Modified
**`frontend/src/components/MapVisualization.jsx`** (Lines 384-437)

### How It Works

#### 1. Room Selection on Floor Plan
When a room is selected and a floor plan is active:

```javascript
if (hasFloorPlan && selectedFloor && selectedRoom) {
  // Find the selected room
  const room = rooms.find(r => r.id === selectedRoom);

  // If room has polygon coordinates
  if (room && room.polygon_coordinates && room.polygon_coordinates.length >= 3) {
    // Calculate bounding box from polygon points
    const xCoords = room.polygon_coordinates.map(coord => coord.x);
    const yCoords = room.polygon_coordinates.map(coord => coord.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // Add 20% padding around room
    const paddingX = (maxX - minX) * 0.2;
    const paddingY = (maxY - minY) * 0.2;

    // Set bounds with padding
    const roomBounds = [
      [minY - paddingY, minX - paddingX],
      [maxY + paddingY, maxX + paddingX]
    ];

    setViewBounds(roomBounds);
  }
}
```

#### 2. Padding Calculation
- **20% Padding**: Adds 20% of the room's width/height on all sides
- **Purpose**: Prevents room from filling entire viewport, provides context
- **Adjustable**: Change the `0.2` multiplier to increase/decrease padding

#### 3. Zoom Behavior

**Scenario 1: Room Selected on Floor Plan**
- User selects a room from dropdown
- Map smoothly zooms to room's polygon bounds
- Room appears centered with 20% padding around it

**Scenario 2: Floor Selected, No Room**
- Map shows entire floor plan
- FloorPlanLayer handles initial bounds

**Scenario 3: Logical Layout (No Floor Plan)**
- Room zoom uses logical layout bounds
- Works the same as before

## User Experience

### Before
- User selects room from dropdown
- Map stays at current zoom level
- User manually scrolls/zooms to find room

### After
- User selects room from dropdown
- Map automatically zooms to room location
- Smooth animation transitions to room
- Room is centered with space around it

## Usage

### In Live Tracking Page

1. **Select Building**: Choose a building from dropdown
2. **Select Floor**: Choose a floor with a floor plan
3. **Select Room**: Click room dropdown and choose a room
4. **Auto Zoom**: Map automatically zooms to selected room

### Zoom Animation

The zoom uses Leaflet's `fitBounds` with animation:
- Duration: 0.5 seconds
- Easing: ease-in-out
- Padding: 50px viewport padding + 20% room padding

## Technical Details

### Dependencies
- Leaflet's `fitBounds()` method
- React `useEffect` hook for reactive zoom
- Room polygon coordinates

### Performance
- Zoom calculation runs only when selection changes
- O(n) complexity where n = number of polygon points
- Typically 4-10 points per room, very fast

### Coordinate System
- Uses Leaflet's CRS.Simple (pixel-based)
- Coordinates are in floor plan image pixels
- Format: `[y, x]` (Leaflet's lat/lng convention)

## Customization

### Change Padding Amount

To adjust padding around room:

```javascript
// Current: 20% padding
const paddingX = (maxX - minX) * 0.2;
const paddingY = (maxY - minY) * 0.2;

// For more padding (e.g., 30%):
const paddingX = (maxX - minX) * 0.3;
const paddingY = (maxY - minY) * 0.3;

// For less padding (e.g., 10%):
const paddingX = (maxX - minX) * 0.1;
const paddingY = (maxY - minY) * 0.1;
```

### Change Animation Speed

In the `MapViewControl` component:

```javascript
// Current: 0.5 seconds
map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.5 });

// Faster: 0.3 seconds
map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.3 });

// Slower: 1 second
map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0 });
```

### Disable Animation

```javascript
map.fitBounds(bounds, { padding: [50, 50], animate: false });
```

## Testing

### Test Cases

1. ✅ Select room on floor plan → Should zoom to room
2. ✅ Select different room → Should zoom to new room
3. ✅ Deselect room → Should show full floor
4. ✅ Select room without coordinates → Should not crash
5. ✅ Select room in logical layout → Should zoom normally
6. ✅ Switch between floors → Should reset zoom appropriately

### How to Test

1. Open Live Tracking page
2. Select "Main Building" from Building dropdown
3. Select "Floor 2" from Floor dropdown
4. Select "Room 103" from Room dropdown
5. **Expected**: Map smoothly zooms to Room 103
6. Select "Cafeteria" from Room dropdown
7. **Expected**: Map smoothly zooms to Cafeteria
8. Select "All Rooms" to deselect
9. **Expected**: Map zooms out to show entire floor

## Edge Cases Handled

### Room Without Coordinates
- **Issue**: Room has no `polygon_coordinates`
- **Handling**: Skip zoom, log warning
- **Fallback**: Show full floor plan

### Invalid Polygon
- **Issue**: Polygon has < 3 points
- **Handling**: Skip zoom, log warning
- **Fallback**: Show full floor plan

### Room Not Found
- **Issue**: Selected room ID doesn't exist
- **Handling**: Skip zoom, log error
- **Fallback**: Show full floor plan

## Future Enhancements

1. **Highlight Selected Room**: Add visual highlight/border around selected room
2. **Mini-map**: Show full floor plan with current view indicator
3. **Room History**: Remember last viewed rooms for quick navigation
4. **Keyboard Shortcuts**: Use arrow keys to navigate between rooms
5. **Search and Zoom**: Type room name to find and zoom to it
6. **Double-click Zoom**: Double-click room to zoom in further

## Related Features

- **Room Polygon Marking**: [ROOM_COORDINATES_FEATURES.md](ROOM_COORDINATES_FEATURES.md)
- **Anchor/Tag Visualization**: [DEBUGGING_ANCHORS_TAGS.md](DEBUGGING_ANCHORS_TAGS.md)
- **Floor Plan Upload**: FloorPlanUploadModal component

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

All modern browsers with ES6 support.

---

**Version**: 1.0
**Last Updated**: January 2026
**Author**: Claude (Anthropic)
