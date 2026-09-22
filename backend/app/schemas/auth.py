from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import ApiModel


class LoginRequest(ApiModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserOut(ApiModel):
    id: UUID
    username: str
    display_name: str
    created_at: datetime


class SessionOut(ApiModel):
    role: str
    user: UserOut | None = None


class CreateUserRequest(ApiModel):
    username: str = Field(min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    display_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=6, max_length=256)
