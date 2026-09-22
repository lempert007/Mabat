"""Password hashing and session token helpers."""

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

_hasher = PasswordHasher()


class Role(StrEnum):
    EDITOR = "editor"
    GUEST = "guest"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_session_token(role: Role, user_id: UUID | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "role": role.value,
        "iat": now,
        "exp": now + timedelta(hours=settings.session_hours),
    }
    if user_id is not None:
        payload["sub"] = str(user_id)
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_session_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
