"""User management routes."""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
from middlewares.auth import admin_only, protect
from models.user import UserUpdateInput
import services.user_service as user_service

router = APIRouter(tags=["Users"])


@router.get("/me")
async def get_me(
    token: dict = Depends(protect),
    session: AsyncSession = Depends(get_session),
):
    """GET /me - get current authenticated user profile."""
    user_id = token.get("userId")
    user = await user_service.get_me(user_id, session)
    return {"data": user}


@router.get("/users", dependencies=[Depends(admin_only)])
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    q: Optional[str] = None,
    city: Optional[str] = None,
    type: Optional[str] = Query(None, pattern="^(admin|client)$"),
    min_age: Optional[int] = Query(None, ge=1),
    max_age: Optional[int] = Query(None, ge=1),
    session: AsyncSession = Depends(get_session),
):
    """GET /users - admin only."""
    query_params = {
        "page": page,
        "limit": limit,
        "q": q,
        "city": city,
        "type": type,
        "min_age": min_age,
        "max_age": max_age,
    }
    return await user_service.get_users(query_params, session)


@router.put("/users/{id}", dependencies=[Depends(admin_only)])
async def update_user(
    id: int,
    body: UserUpdateInput,
    session: AsyncSession = Depends(get_session),
):
    """PUT /users/{id} - admin only."""
    user = await user_service.update_user(id, body.model_dump(exclude_none=True), session)
    return {"data": user}


@router.delete("/users/{id}", status_code=204, dependencies=[Depends(admin_only)])
async def delete_user(id: int, session: AsyncSession = Depends(get_session)):
    """DELETE /users/{id} - admin only."""
    await user_service.delete_user(id, session)
