"""Authentication and authorization dependencies."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config.env import settings

security = HTTPBearer()


def decode_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verifies JWT and returns the decoded payload.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


protect = decode_token


def admin_only(user: dict = Depends(protect)):
    """Allows only admin users."""
    if user.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden (admin only)")
    return user
