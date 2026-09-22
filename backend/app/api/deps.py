"""Request dependencies: database session, current session, role guards."""

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import Role, decode_session_token
from app.db.session import get_db
from app.models import User
from app.services import users as user_service


@dataclass
class Session:
    role: Role
    user: User | None = None

    @property
    def user_id(self) -> UUID | None:
        return self.user.id if self.user else None


async def get_current_session(
    request: Request, db: AsyncSession = Depends(get_db)
) -> Session | None:
    token = request.cookies.get(get_settings().cookie_name)
    if not token:
        return None
    payload = decode_session_token(token)
    if payload is None:
        return None
    role = Role(payload.get("role", Role.GUEST))
    if role is Role.EDITOR:
        user = await user_service.get_by_id(db, UUID(payload["sub"])) if "sub" in payload else None
        if user is None:
            return None
        return Session(role=role, user=user)
    return Session(role=Role.GUEST)


async def require_session(session: Session | None = Depends(get_current_session)) -> Session:
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "צריך להיכנס, או להמשיך כאורח.")
    return session


async def require_editor(session: Session = Depends(require_session)) -> Session:
    if session.role is not Role.EDITOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "הפעולה הזו פתוחה לעורכים בלבד.")
    return session
