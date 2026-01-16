# Debugging Anchors and Tags on Floor Plan

## Changes Made

### 1. Enhanced Anchor Positioning Logic
**File:** `frontend/src/components/MapVisualization.jsx` (Lines 667-745)

The anchor rendering logic now follows this priority:

1. **First Priority**: Use anchor's explicit `x_coordinate` and `y_coordinate` if set
2. **Second Priority**: If anchor has no coordinates, calculate position from room's polygon center
3. **Third Priority**: Use room's single-point coordinates (legacy)
4. **Fallback**: Use logical layout (when no floor plan)

**Key Fix**: Anchors without explicit coordinates will now appear at their room's center on the floor plan instead of not showing at all.

### 2. Added Debug Logging

Added comprehensive logging to help diagnose issues:

**In LiveTracking.jsx:**
- `loadAnchors()`: Logs number of anchors and sample anchor data
- `loadLivePositions()`: Logs response, active tags, and offline tags

**In MapVisualization.jsx:**
- Component render: Logs counts of all data
- `getTagPositions()`: Logs each tag's position calculation
- Anchor render: Shows which positioning method is used

## How to Debug

### Step 1: Open Browser Console
Open the Live Tracking page and check the browser console (F12 → Console tab)

### Step 2: Check Data Loading

Look for these log messages:

```
Loading anchors...
Loaded anchors: [...]
Number of anchors: X
Sample anchor: {...}
```

**What to verify:**
- Are anchors being loaded? (count > 0)
- Do anchors have `room_id` set?
- Do anchors have `x_coordinate` and `y_coordinate`?

```
Live positions response: {...}
Active tags: [...]
Offline tags: [...]
```

**What to verify:**
- Are tags being loaded? (count > 0)
- Do tags have `roomId` set?
- Does `roomId` match actual room IDs in the database?

### Step 3: Check MapVisualization Rendering

```
[MapVisualization] Rendering with: {
  buildings: X,
  floors: X,
  rooms: X,
  anchors: X,
  tags: X,
  selectedFloor: X,
  hasFloorPlan: true/false
}
```

**What to verify:**
- Are anchors and tags being passed to MapVisualization?
- Is `selectedFloor` set?
- Is `hasFloorPlan` true?

```
[MapVisualization] Getting tag positions for X tags
[MapVisualization] hasFloorPlan: true selectedFloor: X
[MapVisualization] Tag XXX in room YYY at polygon center: [y, x]
[MapVisualization] Calculated X tag positions
```

**What to verify:**
- Are tags finding their rooms?
- Are positions being calculated?
- Are the coordinates within the floor plan bounds?

## Common Issues and Solutions

### Issue 1: Anchors Not Showing
**Symptom**: "Number of anchors: 0"
**Solution**:
- Check that anchors are created in the Devices page
- Verify anchors are assigned to rooms on the selected floor

### Issue 2: Anchors Showing But Not on Floor Plan
**Symptom**: Anchors visible in logical view but disappear when floor plan loads
**Possible Causes:**
1. Anchors have no coordinates AND their rooms have no polygon coordinates
2. Anchors are assigned to rooms on a different floor

**Solution:**
- Ensure rooms have polygon coordinates marked
- OR set explicit x/y coordinates for anchors
- Verify anchor's `room_id` matches rooms on the selected floor

### Issue 3: Tags Not Showing
**Symptom**: "Active tags: []"
**Possible Causes:**
1. No live position data from ESP32 devices
2. Tags not associated with entities/users
3. `roomId` from API doesn't match room IDs

**Solution:**
- Check backend API `/api/positions/live` returns data
- Verify tags are assigned to entities
- Check that ESP32 devices are sending BLE data
- Ensure `roomId` in API response matches room IDs in database

### Issue 4: Room ID Mismatch
**Symptom**: Tags have `roomId` but no matching room found
**Cause**: The `roomId` from live positions doesn't match actual room IDs

**Solution:**
- Check if `pos.roomId` is the room's database ID or room name
- Update the mapping in `loadLivePositions()` if needed:
```javascript
// If roomId is actually room_name, find the room first
const room = rooms.find(r => r.room_name === pos.lastSeenRoom);
const tag = {
  ...
  room_id: room ? room.id : null,
  ...
};
```

## Testing Checklist

- [ ] Open Live Tracking page
- [ ] Check console logs for data loading
- [ ] Select building with floor plan
- [ ] Select floor with polygon-marked rooms
- [ ] Verify anchors appear on floor plan (green/red circles)
- [ ] Verify tags appear on floor plan (yellow pulsing dots)
- [ ] Click on anchor to see popup with details
- [ ] Click on tag to see popup with details
- [ ] Check that anchors/tags are inside their room boundaries

## Data Requirements

For anchors and tags to display correctly on the floor plan:

### Anchors
- Must be assigned to a room (`room_id` not null)
- Room must be on the selected floor
- Room must have polygon coordinates marked
- OR anchor must have explicit `x_coordinate`, `y_coordinate`

### Tags
- Must have live position data from backend API
- `pos.roomId` must match a room ID in the database
- Room must be on the selected floor
- Room must have polygon coordinates marked

## Next Steps

If issues persist after checking the above:

1. **Check Database**: Verify room IDs, anchor assignments, and polygon coordinates
2. **Check API**: Test `/api/positions/live` and `/api/devices` endpoints directly
3. **Check WebSocket**: Ensure WebSocket connection for real-time updates
4. **Review Logs**: Look for any error messages in console

## Contact

If you need further assistance, provide:
- Screenshots of browser console logs
- Selected building and floor
- Number of anchors and tags expected vs showing
