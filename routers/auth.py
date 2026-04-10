"""
Auth router — maps authentication endpoints.

POST /api/auth/register — create a new admin user, returns JWT token.
POST /api/auth/login    — verify credentials, returns JWT token.

No authentication required (public endpoints).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.db import get_session
from models.user import RegisterInput, LoginInput
import services.auth_service as auth_service

router = APIRouter(tags=["Auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterInput, session: AsyncSession = Depends(get_session)):
    """
    Equivalent to: POST /api/auth/register
    Body is auto-validated by Pydantic (replaces validate(registerSchema)).
    """
    result = await auth_service.register(body.model_dump(), session)
    return result


@router.post("/login")
async def login(body: LoginInput, session: AsyncSession = Depends(get_session)):
    """
    Equivalent to: POST /api/auth/login
    Returns JWT token on success.
    """
    result = await auth_service.login(body.model_dump(), session)
    return result
