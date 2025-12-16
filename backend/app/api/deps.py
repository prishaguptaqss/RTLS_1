"""
Dependency injection functions for API routes.
"""
from app.database import SessionLocal


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
