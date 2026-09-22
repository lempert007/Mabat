from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Session, require_editor
from app.db.session import get_db
from app.schemas.auth import CreateUserRequest, UserOut
from app.services import users as user_service

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_editor)])


@router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[UserOut]:
    return [UserOut.model_validate(u) for u in await user_service.list_users(db)]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(data: CreateUserRequest, db: AsyncSession = Depends(get_db)) -> UserOut:
    if await user_service.get_by_username(db, data.username.lower()):
        raise HTTPException(status.HTTP_409_CONFLICT, "שם המשתמש הזה כבר תפוס.")
    user = await user_service.create_user(db, data.username, data.display_name, data.password)
    return UserOut.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    session: Session = Depends(require_editor),
    db: AsyncSession = Depends(get_db),
) -> None:
    if session.user_id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "אי אפשר להסיר את עצמכם.")
    user = await user_service.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "המשתמש לא נמצא.")
    await user_service.delete_user(db, user)
