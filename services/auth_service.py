"""Auth service for register/login with JWT authentication."""

from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from jose import jwt
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.env import settings
from models.tables import UserTable


def _sign_token(user_id: int, user_type: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRES_IN)
    payload = {"userId": user_id, "type": user_type, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def _user_to_dict(user: UserTable) -> dict:
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "city": user.city,
        "age": user.age,
        "type": user.type,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


async def register(data: dict, session: AsyncSession) -> dict:
    email = data["email"]
    password = data["password"]

    # Check duplicate email
    result = await session.execute(select(UserTable).where(UserTable.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already exists")

    # Hash password
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    now = datetime.now(timezone.utc)
    user = UserTable(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=email,
        phone_number=data["phone_number"],
        city=data["city"],
        age=data["age"],
        type="client",
        password=hashed,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    await session.flush()

    token = _sign_token(user.id, user.type)

    return {"token": token, "user": _user_to_dict(user)}


async def login(data: dict, session: AsyncSession) -> dict:
    """
    Equivalent to login() in auth.service.ts.
    Verifies credentials, returns token.
    """
    email = data["email"]
    password = data["password"]

    result = await session.execute(select(UserTable).where(UserTable.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")

    ok = bcrypt.checkpw(password.encode(), user.password.encode())
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _sign_token(user.id, user.type)
    return {"token": token, "user": _user_to_dict(user)}
