"""
Permission constants for RBAC system.
Each permission controls access to specific features and actions.
"""

from enum import Enum
from typing import Dict, List


class PermissionModule(str, Enum):
    """Modules in the application."""
    DASHBOARD = "dashboard"
    BUILDING = "building"
    PATIENT = "patient"
    DEVICE = "device"
    LIVE_POSITION = "live_position"
    LIVE_TRACKING = "live_tracking"
    STAFF = "staff"
    ROLE = "role"
    SETTINGS = "settings"
    ORGANIZATION = "organization"


class Permission(str, Enum):
    """All available permissions in the system."""

    # Dashboard
    DASHBOARD_VIEW = "DASHBOARD_VIEW"

    # Building Management
    BUILDING_VIEW = "BUILDING_VIEW"
    BUILDING_CREATE = "BUILDING_CREATE"
    BUILDING_EDIT = "BUILDING_EDIT"
    BUILDING_DELETE = "BUILDING_DELETE"
    FLOOR_CREATE = "FLOOR_CREATE"
    FLOOR_EDIT = "FLOOR_EDIT"
    FLOOR_DELETE = "FLOOR_DELETE"
    ROOM_CREATE = "ROOM_CREATE"
    ROOM_EDIT = "ROOM_EDIT"
    ROOM_DELETE = "ROOM_DELETE"

    # Patient Management
    PATIENT_VIEW = "PATIENT_VIEW"
    PATIENT_ADMIT = "PATIENT_ADMIT"
    PATIENT_EDIT = "PATIENT_EDIT"
    PATIENT_DISCHARGE = "PATIENT_DISCHARGE"
    PATIENT_DELETE = "PATIENT_DELETE"

    # Device Management
    DEVICE_VIEW = "DEVICE_VIEW"
    DEVICE_CREATE = "DEVICE_CREATE"
    DEVICE_EDIT = "DEVICE_EDIT"
    DEVICE_DELETE = "DEVICE_DELETE"

    # Live Positions
    LIVE_POSITION_VIEW = "LIVE_POSITION_VIEW"

    # Live Tracking
    LIVE_TRACKING_VIEW = "LIVE_TRACKING_VIEW"

    # Staff Management (Admin only)
    STAFF_VIEW = "STAFF_VIEW"
    STAFF_CREATE = "STAFF_CREATE"
    STAFF_EDIT = "STAFF_EDIT"
    STAFF_DELETE = "STAFF_DELETE"

    # Role Management (Admin only)
    ROLE_VIEW = "ROLE_VIEW"
    ROLE_CREATE = "ROLE_CREATE"
    ROLE_EDIT = "ROLE_EDIT"
    ROLE_DELETE = "ROLE_DELETE"

    # Settings (Admin only)
    SETTINGS_VIEW = "SETTINGS_VIEW"

    # Organization Management
    ORGANIZATION_VIEW = "ORGANIZATION_VIEW"
    ORGANIZATION_CREATE = "ORGANIZATION_CREATE"
    ORGANIZATION_EDIT = "ORGANIZATION_EDIT"
    ORGANIZATION_DELETE = "ORGANIZATION_DELETE"


# Permission metadata for seeding database
PERMISSION_DEFINITIONS: List[Dict[str, str]] = [
    # Dashboard
    {
        "code": Permission.DASHBOARD_VIEW,
        "name": "View Dashboard",
        "module": PermissionModule.DASHBOARD,
        "description": "Access to view the dashboard"
    },

    # Buildings
    {
        "code": Permission.BUILDING_VIEW,
        "name": "View Buildings",
        "module": PermissionModule.BUILDING,
        "description": "View buildings, floors, and rooms"
    },
    {
        "code": Permission.BUILDING_CREATE,
        "name": "Create Building",
        "module": PermissionModule.BUILDING,
        "description": "Create new buildings"
    },
    {
        "code": Permission.BUILDING_EDIT,
        "name": "Edit Building",
        "module": PermissionModule.BUILDING,
        "description": "Edit existing buildings"
    },
    {
        "code": Permission.BUILDING_DELETE,
        "name": "Delete Building",
        "module": PermissionModule.BUILDING,
        "description": "Delete buildings"
    },
    {
        "code": Permission.FLOOR_CREATE,
        "name": "Add Floor",
        "module": PermissionModule.BUILDING,
        "description": "Add floors to buildings"
    },
    {
        "code": Permission.FLOOR_EDIT,
        "name": "Edit Floor",
        "module": PermissionModule.BUILDING,
        "description": "Edit existing floors"
    },
    {
        "code": Permission.FLOOR_DELETE,
        "name": "Delete Floor",
        "module": PermissionModule.BUILDING,
        "description": "Delete floors"
    },
    {
        "code": Permission.ROOM_CREATE,
        "name": "Add Room",
        "module": PermissionModule.BUILDING,
        "description": "Add rooms to floors"
    },
    {
        "code": Permission.ROOM_EDIT,
        "name": "Edit Room",
        "module": PermissionModule.BUILDING,
        "description": "Edit existing rooms"
    },
    {
        "code": Permission.ROOM_DELETE,
        "name": "Delete Room",
        "module": PermissionModule.BUILDING,
        "description": "Delete rooms"
    },

    # Patients
    {
        "code": Permission.PATIENT_VIEW,
        "name": "View Patients",
        "module": PermissionModule.PATIENT,
        "description": "View patients"
    },
    {
        "code": Permission.PATIENT_ADMIT,
        "name": "Add Patient",
        "module": PermissionModule.PATIENT,
        "description": "Add new patients to the system"
    },
    {
        "code": Permission.PATIENT_EDIT,
        "name": "Edit Patient",
        "module": PermissionModule.PATIENT,
        "description": "Edit patient information"
    },
    {
        "code": Permission.PATIENT_DISCHARGE,
        "name": "Remove Patient",
        "module": PermissionModule.PATIENT,
        "description": "Remove or deactivate patients from tracking"
    },
    {
        "code": Permission.PATIENT_DELETE,
        "name": "Delete Patient",
        "module": PermissionModule.PATIENT,
        "description": "Delete patients"
    },

    # Devices
    {
        "code": Permission.DEVICE_VIEW,
        "name": "View Devices",
        "module": PermissionModule.DEVICE,
        "description": "View devices (tags and anchors)"
    },
    {
        "code": Permission.DEVICE_CREATE,
        "name": "Add Device",
        "module": PermissionModule.DEVICE,
        "description": "Add new devices"
    },
    {
        "code": Permission.DEVICE_EDIT,
        "name": "Edit Device",
        "module": PermissionModule.DEVICE,
        "description": "Edit device information"
    },
    {
        "code": Permission.DEVICE_DELETE,
        "name": "Delete Device",
        "module": PermissionModule.DEVICE,
        "description": "Delete devices"
    },

    # Live Positions
    {
        "code": Permission.LIVE_POSITION_VIEW,
        "name": "View Live Positions",
        "module": PermissionModule.LIVE_POSITION,
        "description": "View real-time location tracking"
    },

    # Live Tracking
    {
        "code": Permission.LIVE_TRACKING_VIEW,
        "name": "View Live Tracking",
        "module": PermissionModule.LIVE_TRACKING,
        "description": "Access live tracking feature with map view"
    },

    # Staff Management
    {
        "code": Permission.STAFF_VIEW,
        "name": "View Staff",
        "module": PermissionModule.STAFF,
        "description": "View staff users"
    },
    {
        "code": Permission.STAFF_CREATE,
        "name": "Create Staff",
        "module": PermissionModule.STAFF,
        "description": "Create new staff users"
    },
    {
        "code": Permission.STAFF_EDIT,
        "name": "Edit Staff",
        "module": PermissionModule.STAFF,
        "description": "Edit staff user information"
    },
    {
        "code": Permission.STAFF_DELETE,
        "name": "Delete Staff",
        "module": PermissionModule.STAFF,
        "description": "Delete staff users"
    },

    # Role Management
    {
        "code": Permission.ROLE_VIEW,
        "name": "View Roles",
        "module": PermissionModule.ROLE,
        "description": "View roles and permissions"
    },
    {
        "code": Permission.ROLE_CREATE,
        "name": "Create Role",
        "module": PermissionModule.ROLE,
        "description": "Create new roles"
    },
    {
        "code": Permission.ROLE_EDIT,
        "name": "Edit Role",
        "module": PermissionModule.ROLE,
        "description": "Edit existing roles"
    },
    {
        "code": Permission.ROLE_DELETE,
        "name": "Delete Role",
        "module": PermissionModule.ROLE,
        "description": "Delete roles"
    },

    # Settings
    {
        "code": Permission.SETTINGS_VIEW,
        "name": "View Settings",
        "module": PermissionModule.SETTINGS,
        "description": "Access settings page"
    },

    # Organizations
    {
        "code": Permission.ORGANIZATION_VIEW,
        "name": "View Organizations",
        "module": PermissionModule.ORGANIZATION,
        "description": "View organizations"
    },
    {
        "code": Permission.ORGANIZATION_CREATE,
        "name": "Create Organization",
        "module": PermissionModule.ORGANIZATION,
        "description": "Create new organizations"
    },
    {
        "code": Permission.ORGANIZATION_EDIT,
        "name": "Edit Organization",
        "module": PermissionModule.ORGANIZATION,
        "description": "Edit organization information"
    },
    {
        "code": Permission.ORGANIZATION_DELETE,
        "name": "Delete Organization",
        "module": PermissionModule.ORGANIZATION,
        "description": "Delete organizations"
    },
]


# Permission hierarchy for UI rendering (parent-child relationships)
PERMISSION_HIERARCHY: Dict[str, Dict] = {
    "Dashboard": {
        "parent": Permission.DASHBOARD_VIEW,
        "children": []
    },
    "Buildings": {
        "parent": Permission.BUILDING_VIEW,
        "children": [
            Permission.BUILDING_CREATE,
            Permission.BUILDING_EDIT,
            Permission.BUILDING_DELETE,
            Permission.FLOOR_CREATE,
            Permission.FLOOR_EDIT,
            Permission.FLOOR_DELETE,
            Permission.ROOM_CREATE,
            Permission.ROOM_EDIT,
            Permission.ROOM_DELETE,
        ]
    },
    "Patients": {
        "parent": Permission.PATIENT_VIEW,
        "children": [
            Permission.PATIENT_ADMIT,
            Permission.PATIENT_EDIT,
            Permission.PATIENT_DISCHARGE,
            Permission.PATIENT_DELETE,
        ]
    },
    "Devices": {
        "parent": Permission.DEVICE_VIEW,
        "children": [
            Permission.DEVICE_CREATE,
            Permission.DEVICE_EDIT,
            Permission.DEVICE_DELETE,
        ]
    },
    "Live Positions": {
        "parent": Permission.LIVE_POSITION_VIEW,
        "children": []
    },
    "Live Tracking": {
        "parent": Permission.LIVE_TRACKING_VIEW,
        "children": []
    },
    "Organizations": {
        "parent": Permission.ORGANIZATION_VIEW,
        "children": [
            Permission.ORGANIZATION_CREATE,
            Permission.ORGANIZATION_EDIT,
            Permission.ORGANIZATION_DELETE,
        ]
    },
    "Staff Management": {
        "parent": Permission.STAFF_VIEW,
        "children": [
            Permission.STAFF_CREATE,
            Permission.STAFF_EDIT,
            Permission.STAFF_DELETE,
        ]
    },
    "Role Management": {
        "parent": Permission.ROLE_VIEW,
        "children": [
            Permission.ROLE_CREATE,
            Permission.ROLE_EDIT,
            Permission.ROLE_DELETE,
        ]
    },
    "Settings": {
        "parent": Permission.SETTINGS_VIEW,
        "children": []
    },
}
