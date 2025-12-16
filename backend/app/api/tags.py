"""
Tag CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.tag import Tag, TagCreate, TagUpdate
from app.models.tag import Tag as TagModel
from app.api.deps import get_db

router = APIRouter()


@router.get("/", response_model=List[Tag])
async def list_tags(db: Session = Depends(get_db)):
    """List all tags."""
    return db.query(TagModel).all()


@router.post("/", response_model=Tag, status_code=201)
async def create_tag(tag: TagCreate, db: Session = Depends(get_db)):
    """Create a new tag."""
    db_tag = TagModel(**tag.model_dump())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.get("/{tag_id}", response_model=Tag)
async def get_tag(tag_id: str, db: Session = Depends(get_db)):
    """Get tag by ID."""
    tag = db.query(TagModel).filter(TagModel.tag_id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.put("/{tag_id}", response_model=Tag)
async def update_tag(tag_id: str, tag_update: TagUpdate, db: Session = Depends(get_db)):
    """Update tag."""
    tag = db.query(TagModel).filter(TagModel.tag_id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    update_data = tag_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tag, key, value)

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(tag_id: str, db: Session = Depends(get_db)):
    """Delete tag."""
    tag = db.query(TagModel).filter(TagModel.tag_id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(tag)
    db.commit()
    return None
