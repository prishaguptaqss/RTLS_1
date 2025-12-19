"""
Enum definitions for database models and schemas.
"""
import enum


class UserStatus(str, enum.Enum):
    """User status enumeration."""
    active = "active"
    inactive = "inactive"


class TagStatus(str, enum.Enum):
    """Tag (BLE beacon) status enumeration."""
    active = "active"
    offline = "offline"


class AnchorStatus(str, enum.Enum):
    """Anchor (ESP32 gateway) status enumeration."""
    active = "active"
    offline = "offline"


class EventType(str, enum.Enum):
    """Location event type enumeration."""
    LOCATION_CHANGE = "LOCATION_CHANGE"
    INITIAL_LOCATION = "INITIAL_LOCATION"
    TAG_LOST = "TAG_LOST"


class EntityType(str, enum.Enum):
    """Entity type enumeration."""
    person = "person"
    material = "material"
