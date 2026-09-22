from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models import User


async def get_by_username(db: AsyncSession, username: str) -> User | None:
    return await db.scalar(select(User).where(User.username == username))


async def get_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    return await db.get(User, user_id)


async def list_users(db: AsyncSession) -> list[User]:
    return list((await db.scalars(select(User).order_by(User.created_at))).all())


async def count_users(db: AsyncSession) -> int:
    return int(await db.scalar(select(func.count(User.id))) or 0)


async def create_user(db: AsyncSession, username: str, display_name: str, password: str) -> User:
    user = User(
        username=username.strip().lower(),
        display_name=display_name.strip(),
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, username: str, password: str) -> User | None:
    user = await get_by_username(db, username.strip().lower())
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.commit()
