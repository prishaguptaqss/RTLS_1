"""
Dependency injection functions for API routes.
"""
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.organization import Organization


def get_db():
    """
    Dependency for database session.

    Yields session and ensures cleanup via try/finally.

    Usage in route:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_organization(
    x_organization_id: int = Header(None, alias="X-Organization-ID"),
    db: Session = Depends(get_db)
) -> Organization:
    """
    Get current organization from request header.

    The organization ID is passed via X-Organization-ID header.
    This dependency ensures all API calls are scoped to an organization.

    Usage in route:
        @router.get("/entities")
        def list_entities(org: Organization = Depends(get_current_organization)):
            return org.entities
    """
    if not x_organization_id:
        raise HTTPException(
            status_code=400,
            detail="Organization ID required. Please provide X-Organization-ID header."
        )

    org = db.query(Organization).filter(Organization.id == x_organization_id).first()
    if not org:
        raise HTTPException(
            status_code=404,
            detail=f"Organization with ID {x_organization_id} not found"
        )

    return org
