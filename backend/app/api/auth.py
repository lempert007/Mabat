from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Session, get_current_session
from app.core.config import get_settings
from app.core.security import Role, create_session_token
from app.db.session import get_db
from app.schemas.auth import LoginRequest, SessionOut, UserOut
from app.services import users as user_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.session_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
        path="/",
    )


@router.post("/login", response_model=SessionOut)
async def login(
    data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> SessionOut:
    user = await user_service.authenticate(db, data.username, data.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "השם או הסיסמה לא נכונים.")
    _set_cookie(response, create_session_token(Role.EDITOR, user.id))
    return SessionOut(role=Role.EDITOR, user=UserOut.model_validate(user))


@router.post("/guest", response_model=SessionOut)
async def join_as_guest(response: Response) -> SessionOut:
    _set_cookie(response, create_session_token(Role.GUEST))
    return SessionOut(role=Role.GUEST)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(get_settings().cookie_name, path="/")


@router.get("/me", response_model=SessionOut)
async def me(session: Session | None = Depends(get_current_session)) -> SessionOut:
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "אין חיבור פעיל.")
    return SessionOut(
        role=session.role,
        user=UserOut.model_validate(session.user) if session.user else None,
    )
