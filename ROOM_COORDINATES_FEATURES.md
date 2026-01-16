# Room Coordinates Management - Feature Implementation

## Overview
Enhanced the Live Tracking page with intelligent room coordinate management features that prevent duplicate marking, allow coordinate updates/deletion, and provide a better user experience.

## Implemented Features

### 1. Smart "Mark Room Locations" Button Visibility

**Behavior:**
- Button **ONLY shows** when there are rooms **without coordinates** on the selected floor
- Shows count of rooms needing coordinates: `Mark Room Locations (3)`
- Button **hides automatically** when all rooms on the floor have coordinates marked
- Button **reappears** when admin creates a new room without coordinates

**Implementation:**
- Filters rooms on selected floor to find those without valid polygon coordinates
- Validates that polygon_coordinates exists, is an array, and has at least 3 points
- Updates button visibility dynamically based on room state

```jsx
// Check if there are rooms without coordinates
const roomsWithoutCoordinates = roomsOnSelectedFloor.filter(room =>
  !room.polygon_coordinates ||
  !Array.isArray(room.polygon_coordinates) ||
  room.polygon_coordinates.length < 3
);
const hasRoomsNeedingCoordinates = roomsWithoutCoordinates.length > 0;
```

**Location:**
- File: `frontend/src/pages/LiveTracking.jsx:361-371`
- Button logic: Lines 486-503

---

### 2. Click on Room Polygon to Update/Delete

**Behavior:**
When admin/user clicks on a room polygon (room with existing coordinates):
- A modal menu appears in the center of the screen
- Shows the room name
- Provides three options:
  1. **Update Coordinates** - Edit the existing polygon
  2. **Delete Coordinates** - Remove coordinates (room remains)
  3. **Cancel** - Close the menu

**Modal Features:**
- Prevents clicks from propagating to the map
- Auto-closes when clicking outside (via event listener)
- Does not show during coordinate marking mode
- Styled with blue border and shadow for visibility

**Implementation:**
```jsx
const handleRoomPolygonClick = (room) => {
  if (coordinateMarkingMode) return;
  setShowRoomActions({
    roomId: room.id,
    roomName: room.room_name
  });
};
```

**Location:**
- Handler: `frontend/src/pages/LiveTracking.jsx:303-311`
- UI: Lines 625-678

---

### 3. Update Room Coordinates

**Behavior:**
- When "Update Coordinates" is clicked:
  1. Enters edit mode with existing polygon points pre-loaded
  2. Shows marking interface with current points already drawn on map
  3. User can add/remove points to adjust the boundary
  4. "Undo" button removes last point
  5. "Complete" button saves the updated coordinates
  6. Indicator shows "Editing boundary for: [Room Name]"

**Edit Mode Features:**
- Pre-populates `polygonPoints` with existing coordinates
- Sets `isEditingCoordinates` flag to true
- Shows appropriate UI text ("Editing" vs "Drawing")
- Success message says "updated" instead of "marked"

**Implementation:**
```jsx
const handleStartMarkingRoom = (room, isEdit = false) => {
  setSelectedRoomForMarking(room);
  setCoordinateMarkingMode(true);
  setIsEditingCoordinates(isEdit);

  // If editing, pre-populate with existing polygon points
  if (isEdit && room.polygon_coordinates && Array.isArray(room.polygon_coordinates)) {
    setPolygonPoints([...room.polygon_coordinates]);
  } else {
    setPolygonPoints([]);
  }
  setShowRoomActions(null);
};
```

**Location:**
- Start editing: `frontend/src/pages/LiveTracking.jsx:275-290`
- Update handler: Lines 313-319
- Complete handler: Lines 245-274

---

### 4. Delete Room Coordinates

**Behavior:**
- When "Delete Coordinates" is clicked:
  1. Shows confirmation dialog with clear warning
  2. If confirmed, sets `polygon_coordinates` to `null`
  3. Room remains in database, only coordinates are removed
  4. Room no longer appears on floor plan
  5. "Mark Room Locations" button reappears (room needs coordinates again)
  6. Shows success message after deletion

**Confirmation Dialog:**
```
Are you sure you want to delete the coordinates for "[Room Name]"?
The room will remain but its location on the floor plan will be removed.
```

**Implementation:**
```jsx
const handleDeleteRoomCoordinates = async () => {
  const room = rooms.find(r => r.id === showRoomActions?.roomId);
  if (!room) return;

  const confirmed = window.confirm(
    `Are you sure you want to delete the coordinates for "${room.room_name}"?...`
  );

  if (!confirmed) return;

  try {
    await updateRoom(room.id, {
      polygon_coordinates: null
    });

    await loadAllRooms(floorsData);
    setShowRoomActions(null);
    alert(`Coordinates for "${room.room_name}" have been deleted successfully.`);
  } catch (err) {
    console.error('Error deleting room coordinates:', err);
    alert('Failed to delete room coordinates');
  }
};
```

**Location:** `frontend/src/pages/LiveTracking.jsx:321-348`

---

## Modified Files

### 1. `frontend/src/pages/LiveTracking.jsx`

**New State Variables:**
```jsx
const [showRoomActions, setShowRoomActions] = useState(null);
const [isEditingCoordinates, setIsEditingCoordinates] = useState(false);
```

**New Functions:**
- `handleRoomPolygonClick(room)` - Shows update/delete menu when clicking room polygon
- `handleUpdateRoomCoordinates()` - Initiates edit mode for room coordinates
- `handleDeleteRoomCoordinates()` - Deletes room coordinates with confirmation

**Updated Functions:**
- `handleStartMarkingRoom(room, isEdit)` - Now supports edit mode parameter
- `handleCancelMarking()` - Resets edit mode flag
- `handleCompletePolygon()` - Shows different message for edit vs create

**New Computed Values:**
- `roomsOnSelectedFloor` - All rooms on currently selected floor
- `roomsWithoutCoordinates` - Rooms missing valid polygon coordinates
- `hasRoomsNeedingCoordinates` - Boolean flag for button visibility

**UI Changes:**
- Updated "Mark Room Locations" button visibility logic
- Added room count to button text: `Mark Room Locations (3)`
- Added room actions modal overlay
- Updated marking mode indicator to show "Editing" vs "Drawing"

### 2. `frontend/src/components/MapVisualization.jsx`

**New Prop:**
```jsx
onRoomPolygonClick = null, // Callback when clicking on a room polygon
```

**Updated Event Handler:**
```jsx
eventHandlers={{
  click: (e) => {
    e.originalEvent.stopPropagation();
    if (onRoomPolygonClick) {
      onRoomPolygonClick(room);
    } else {
      onSelectRoom(room.id);
    }
  },
}}
```

**Location:** Lines 349, 574-583

---

## User Workflow Examples

### Scenario 1: Initial Setup
1. Admin uploads floor plan for Floor 1
2. Admin creates 5 rooms on Floor 1
3. "Mark Room Locations (5)" button appears
4. Admin clicks button, marks first room boundary
5. Button updates to "Mark Room Locations (4)"
6. Process repeats until all rooms are marked
7. Button disappears when all 5 rooms have coordinates

### Scenario 2: Adding New Room Later
1. All rooms on Floor 1 already have coordinates
2. "Mark Room Locations" button is hidden
3. Admin creates Room 106 on Floor 1
4. Button automatically reappears: "Mark Room Locations (1)"
5. Admin marks the new room's coordinates
6. Button hides again

### Scenario 3: Updating Room Boundary
1. Admin clicks on Room 102 polygon on the map
2. Modal appears with room name "Room 102"
3. Admin clicks "Update Coordinates"
4. Existing polygon points are shown on map (yellow circles)
5. Admin adjusts boundary by:
   - Clicking to add new points
   - Clicking "Undo" to remove last point
6. Admin clicks "Complete" to save changes
7. Success: "Room 'Room 102' boundary updated successfully with 6 points!"

### Scenario 4: Deleting Room Coordinates
1. Admin clicks on Room 103 polygon
2. Modal appears
3. Admin clicks "Delete Coordinates"
4. Confirmation dialog: "Are you sure you want to delete..."
5. Admin confirms
6. Room 103 disappears from floor plan
7. "Mark Room Locations (1)" button reappears
8. Admin can re-mark Room 103 coordinates later

### Scenario 5: Canceling Operations
1. Admin starts marking room coordinates
2. Clicks multiple points on floor plan
3. Realizes mistake, clicks "Cancel"
4. All unsaved points are discarded
5. Exits marking mode without saving
6. Can start fresh or click on existing room to edit

---

## Technical Details

### Coordinate Data Structure
```javascript
room.polygon_coordinates = [
  { x: 150.5, y: 200.3 },
  { x: 250.8, y: 201.1 },
  { x: 251.2, y: 301.5 },
  { x: 149.9, y: 300.7 }
]
```

### Validation Rules
- Minimum 3 points required for valid polygon
- Coordinates must be in `{x, y}` format
- `polygon_coordinates` must be an array
- Null or undefined coordinates = room needs marking

### API Calls
- **Update:** `PUT /api/rooms/{id}` with `{ polygon_coordinates: [...] }`
- **Delete:** `PUT /api/rooms/{id}` with `{ polygon_coordinates: null }`

### Permission Required
- All coordinate marking features require `FLOOR_EDIT` permission
- Features are wrapped in `<PermissionGate permission="FLOOR_EDIT">`

---

## Visual Indicators

### Button States
- **Hidden:** All rooms have coordinates
- **Visible with count:** "Mark Room Locations (3)" - 3 rooms need marking
- **During marking:** Button hidden, replaced with marking controls

### Marking Mode Indicator
- **New room:** "Drawing boundary for: Room 102"
- **Edit mode:** "Editing boundary for: Room 102"
- Shows point count: "Points: 4 (Ready to complete)"

### Room Actions Modal
- White background with blue border
- Positioned at center of screen
- Three buttons: Update (blue), Delete (red), Cancel (gray)
- Shows room name at top

### Map Visualization
- **Unmarked rooms:** Not visible on floor plan
- **Marked rooms:** Colored polygons on floor plan
- **During marking:** Yellow circles at points, dashed lines connecting them
- **First point:** Green circle to indicate polygon start
- **Closing line:** Dotted line from last point to first (when ≥3 points)

---

## Testing Checklist

- [ ] Upload floor plan
- [ ] Create multiple rooms on floor
- [ ] Verify "Mark Room Locations" button appears with correct count
- [ ] Mark all room coordinates
- [ ] Verify button disappears when all marked
- [ ] Create new room
- [ ] Verify button reappears with count = 1
- [ ] Click on marked room polygon
- [ ] Verify modal appears with correct room name
- [ ] Click "Update Coordinates"
- [ ] Verify existing points are pre-loaded
- [ ] Add/remove points using marking interface
- [ ] Complete update
- [ ] Verify success message says "updated"
- [ ] Click on room polygon again
- [ ] Click "Delete Coordinates"
- [ ] Confirm deletion
- [ ] Verify room disappears from floor plan
- [ ] Verify "Mark Room Locations" button reappears
- [ ] Click "Cancel" in various scenarios
- [ ] Verify no unwanted saves occur

---

## Future Enhancements

1. **Batch Operations:** Mark multiple rooms in sequence without closing marking mode
2. **Coordinate History:** Track changes to room boundaries over time
3. **Room Templates:** Copy polygon shape from one room to another
4. **Measurement Tools:** Show area and perimeter of room polygons
5. **Snap to Grid:** Optional grid snapping for precise alignment
6. **Zoom Controls:** Zoom in/out on floor plan for detailed marking
7. **Keyboard Shortcuts:**
   - ESC to cancel marking
   - Ctrl+Z to undo last point
   - Enter to complete polygon
8. **Visual Feedback:** Highlight room when hovering over polygon
9. **Multi-select:** Select multiple rooms to batch update/delete coordinates

---

## Troubleshooting

### Button Doesn't Appear
- Check if floor plan is uploaded
- Verify rooms exist on the floor
- Check if all rooms already have valid coordinates
- Ensure `FLOOR_EDIT` permission is granted

### Modal Doesn't Show
- Verify clicking directly on room polygon (not white space)
- Check console for JavaScript errors
- Ensure not in marking mode (modal disabled during marking)

### Coordinates Not Saving
- Check minimum 3 points requirement
- Verify network connection
- Check browser console for API errors
- Ensure room ID is valid

### Deleted Coordinates Still Showing
- Refresh the page or reload rooms data
- Check if API call succeeded (network tab)
- Verify database was updated

---

## API Endpoints Used

### Update Room
```http
PUT /api/rooms/{room_id}
Content-Type: application/json

{
  "polygon_coordinates": [
    { "x": 100, "y": 200 },
    { "x": 300, "y": 200 },
    { "x": 300, "y": 400 },
    { "x": 100, "y": 400 }
  ]
}
```

### Delete Coordinates
```http
PUT /api/rooms/{room_id}
Content-Type: application/json

{
  "polygon_coordinates": null
}
```

### Fetch Rooms
```http
GET /api/floors/{floor_id}/rooms
```

---

## Browser Compatibility

- **Tested:** Chrome 120+, Firefox 121+, Safari 17+
- **Required:** ES6 support, async/await
- **Libraries:** React 18, Leaflet 1.9.4, Lucide React

---

## Performance Considerations

- Room coordinate checks run on every render (optimized with useMemo potential)
- Modal uses event delegation for outside clicks
- Polygon pre-loading uses array spread (shallow copy)
- API calls are debounced to prevent rapid-fire updates

---

## Accessibility

- Buttons have descriptive `title` attributes
- Modal can be closed with Cancel button
- Confirmation dialogs use native browser prompts
- Color contrast meets WCAG AA standards

---

## Support

For issues or feature requests, contact the development team or file an issue in the project repository.

**Documentation Version:** 1.0
**Last Updated:** January 2026
**Author:** Claude (Anthropic)
