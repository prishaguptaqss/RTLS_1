# Permission Reference Guide

Quick reference for all available permissions in the RTLS RBAC system.

## Permission Codes

### Dashboard
| Code | Description |
|------|-------------|
| `DASHBOARD_VIEW` | View dashboard page |

### Buildings Module
| Code | Description | Type |
|------|-------------|------|
| `BUILDING_VIEW` | View buildings, floors, and rooms | Parent |
| `BUILDING_CREATE` | Create new buildings | Child |
| `BUILDING_EDIT` | Edit existing buildings | Child |
| `BUILDING_DELETE` | Delete buildings | Child |
| `FLOOR_CREATE` | Add floors to buildings | Child |
| `FLOOR_EDIT` | Edit existing floors | Child |
| `FLOOR_DELETE` | Delete floors | Child |
| `ROOM_CREATE` | Add rooms to floors | Child |
| `ROOM_EDIT` | Edit existing rooms | Child |
| `ROOM_DELETE` | Delete rooms | Child |

### Entities Module (Patients/Materials)
| Code | Description | Type |
|------|-------------|------|
| `ENTITY_VIEW` | View entities | Parent |
| `ENTITY_ADMIT` | Admit/create new entities | Child |
| `ENTITY_EDIT` | Edit entity information | Child |
| `ENTITY_DISCHARGE` | Discharge entities | Child |
| `ENTITY_DELETE` | Delete entities | Child |

### Devices Module
| Code | Description | Type |
|------|-------------|------|
| `DEVICE_VIEW` | View devices (tags and anchors) | Parent |
| `DEVICE_CREATE` | Add new devices | Child |
| `DEVICE_EDIT` | Edit device information | Child |
| `DEVICE_DELETE` | Delete devices | Child |

### Live Positions
| Code | Description |
|------|-------------|
| `LIVE_POSITION_VIEW` | View real-time location tracking |

### Organizations Module
| Code | Description | Type |
|------|-------------|------|
| `ORGANIZATION_VIEW` | View organizations | Parent |
| `ORGANIZATION_CREATE` | Create new organizations | Child |
| `ORGANIZATION_EDIT` | Edit organization information | Child |
| `ORGANIZATION_DELETE` | Delete organizations | Child |

### Staff Management Module
| Code | Description | Type |
|------|-------------|------|
| `STAFF_VIEW` | View staff users | Parent |
| `STAFF_CREATE` | Create new staff users | Child |
| `STAFF_EDIT` | Edit staff user information | Child |
| `STAFF_DELETE` | Delete staff users | Child |

### Role Management Module
| Code | Description | Type |
|------|-------------|------|
| `ROLE_VIEW` | View roles and permissions | Parent |
| `ROLE_CREATE` | Create new roles | Child |
| `ROLE_EDIT` | Edit existing roles | Child |
| `ROLE_DELETE` | Delete roles | Child |

### Settings
| Code | Description |
|------|-------------|
| `SETTINGS_VIEW` | Access settings page |

## Usage in Code

### Backend (Python)
```python
from app.utils.permissions import Permission

# In route dependencies
@router.post("/buildings", dependencies=[Depends(require_permission(Permission.BUILDING_CREATE))])
def create_building(...):
    pass
```

### Frontend (JavaScript/React)
```jsx
import { useAuth } from '../contexts/AuthContext';

// In component
const { hasPermission } = useAuth();

if (hasPermission('BUILDING_CREATE')) {
  // Show create button
}

// Or use PermissionGate
<PermissionGate permission="BUILDING_CREATE">
  <button>Create Building</button>
</PermissionGate>
```

## Permission Hierarchy Rules

1. **Parent permissions** control access to the entire module
2. **Child permissions** require the parent to be enabled
3. **Admins** have all permissions automatically
4. **Unchecking parent** disables all child permissions

## Common Permission Combinations

### Read-Only User
```
DASHBOARD_VIEW
BUILDING_VIEW
ENTITY_VIEW
DEVICE_VIEW
LIVE_POSITION_VIEW
```

### Data Entry User
```
DASHBOARD_VIEW
BUILDING_VIEW
ENTITY_VIEW
ENTITY_ADMIT
ENTITY_EDIT
DEVICE_VIEW
LIVE_POSITION_VIEW
```

### Manager
```
DASHBOARD_VIEW
BUILDING_VIEW (+ all children)
ENTITY_VIEW (+ all children)
DEVICE_VIEW (+ all children)
LIVE_POSITION_VIEW
ORGANIZATION_VIEW
```

### Admin
All permissions automatically granted via `is_admin = true`
