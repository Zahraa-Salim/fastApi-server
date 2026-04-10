"""
Authors router — CRUD endpoints for blog authors.

POST   /api/authors      — create author (admin only)
GET    /api/authors      — list authors with pagination/search/sort
GET    /api/authors/:id  — get single author by ID
PATCH  /api/authors/:id  — update author (admin only)
DELETE /api/authors/:id  — soft delete author (admin only)

All endpoints require JWT authentication (protect middleware).
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
from middlewares.auth import protect, admin_only
from models.author import AuthorCreate, AuthorUpdate
import services.author_service as author_service

# dependencies=[Depends(protect)] = router.use(protect) in Express
router = APIRouter(tags=["Authors"], dependencies=[Depends(protect)])


@router.post("/", status_code=201)
async def create_author(
    body: AuthorCreate,
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: POST /api/authors"""
    author = await author_service.create_author(body.model_dump(), session)
    return {"data": author}


@router.get("/")
async def get_authors(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort: Optional[str] = None,
    order: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    q: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: GET /api/authors with sorting, pagination, search"""
    query_params = {
        "page": page, "limit": limit,
        "sort": sort, "order": order, "q": q,
    }
    result = await author_service.get_authors(query_params, session)
    return result


@router.get("/{id}")
async def get_author(id: int, session: AsyncSession = Depends(get_session)):
    """Equivalent to: GET /api/authors/:id"""
    author = await author_service.get_author_by_id(id, session)
    return {"data": author}


@router.patch("/{id}")
async def update_author(
    id: int,
    body: AuthorUpdate,
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: PATCH /api/authors/:id"""
    author = await author_service.update_author(id, body.model_dump(), session)
    return {"data": author}


@router.delete("/{id}", status_code=204)
async def delete_author(
    id: int,
    user: dict = Depends(admin_only),
    session: AsyncSession = Depends(get_session),
):
    """Equivalent to: DELETE /api/authors/:id (soft delete)"""
    await author_service.delete_author(id, session)
