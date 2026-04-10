"""Public statistics routes for the authentication system assignment."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
import services.user_service as user_service

router = APIRouter(tags=["Stats"])


@router.get("/stats/count")
async def get_total_users(session: AsyncSession = Depends(get_session)):
    return await user_service.get_total_users(session)


@router.get("/stats/average-age")
async def get_average_age(session: AsyncSession = Depends(get_session)):
    return await user_service.get_average_age(session)


@router.get("/stats/top-cities")
async def get_top_cities(session: AsyncSession = Depends(get_session)):
    return await user_service.get_top_cities(session)
