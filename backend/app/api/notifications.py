"""
Notification API endpoints for RTLS system.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from datetime import datetime

from app.schemas.notification import (
    NotificationResponse,
    NotificationList,
    UnreadCountResponse,
    MarkAllReadResponse
)
from app.models.notification import Notification as NotificationModel
from app.api.deps import get_db, get_current_organization, get_current_staff
from app.models.organization import Organization
from app.models.staff import Staff

router = APIRouter()


@router.get("/", response_model=NotificationList)
async def list_notifications(
    status: str = Query("all", regex="^(all|read|unread)$", description="Filter by read status"),
    entity_name: Optional[str] = Query(None, description="Search by entity name"),
    room_number: Optional[str] = Query(None, description="Search by room number"),
    date_from: Optional[datetime] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[datetime] = Query(None, description="Filter to date (ISO format)"),
    sort_by: str = Query("time", regex="^(time|status|severity)$", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    organization: Organization = Depends(get_current_organization),
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    List notifications with filters, sorting, and pagination.
    Only shows notifications for the current organization.
    """
    # Base query filtered by organization
    query = db.query(NotificationModel).filter(
        NotificationModel.organization_id == organization.id
    )

    # Apply status filter
    if status == "read":
        query = query.filter(NotificationModel.is_read == True)
    elif status == "unread":
        query = query.filter(NotificationModel.is_read == False)

    # Apply entity name search (case-insensitive)
    if entity_name:
        search_term = f"%{entity_name.lower()}%"
        query = query.filter(
            or_(
                func.lower(NotificationModel.entity_name).like(search_term),
                func.lower(NotificationModel.user_name).like(search_term)
            )
        )

    # Apply room number search (case-insensitive)
    if room_number:
        search_term = f"%{room_number.lower()}%"
        query = query.filter(func.lower(NotificationModel.last_room).like(search_term))

    # Apply date range filters
    if date_from:
        query = query.filter(NotificationModel.created_at >= date_from)
    if date_to:
        query = query.filter(NotificationModel.created_at <= date_to)

    # Get total count before pagination
    total = query.count()

    # Get unread count
    unread_count = db.query(NotificationModel).filter(
        NotificationModel.organization_id == organization.id,
        NotificationModel.is_read == False
    ).count()

    # Apply sorting
    if sort_by == "time":
        sort_column = NotificationModel.created_at
    elif sort_by == "status":
        sort_column = NotificationModel.is_read
    else:  # severity
        sort_column = NotificationModel.severity

    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Apply pagination
    offset = (page - 1) * limit
    notifications = query.offset(offset).limit(limit).all()

    return NotificationList(
        notifications=notifications,
        total=total,
        page=page,
        limit=limit,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    organization: Organization = Depends(get_current_organization),
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for the current organization."""
    count = db.query(NotificationModel).filter(
        NotificationModel.organization_id == organization.id,
        NotificationModel.is_read == False
    ).count()

    return UnreadCountResponse(count=count)


@router.put("/{notification_id}/mark-read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    organization: Organization = Depends(get_current_organization),
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Mark a single notification as read."""
    notification = db.query(NotificationModel).filter(
        NotificationModel.id == notification_id,
        NotificationModel.organization_id == organization.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)

    return notification


@router.put("/{notification_id}/mark-unread", response_model=NotificationResponse)
async def mark_notification_unread(
    notification_id: int,
    organization: Organization = Depends(get_current_organization),
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Mark a single notification as unread."""
    notification = db.query(NotificationModel).filter(
        NotificationModel.id == notification_id,
        NotificationModel.organization_id == organization.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = False
    notification.read_at = None
    db.commit()
    db.refresh(notification)

    return notification


@router.put("/mark-all-read", response_model=MarkAllReadResponse)
async def mark_all_notifications_read(
    organization: Organization = Depends(get_current_organization),
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current organization."""
    updated_count = db.query(NotificationModel).filter(
        NotificationModel.organization_id == organization.id,
        NotificationModel.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    }, synchronize_session=False)

    db.commit()

    return MarkAllReadResponse(updated_count=updated_count)


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: int,
    organization: Organization = Depends(get_current_organization),
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """Delete a notification."""
    notification = db.query(NotificationModel).filter(
        NotificationModel.id == notification_id,
        NotificationModel.organization_id == organization.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return None
