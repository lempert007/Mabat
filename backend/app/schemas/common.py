"""Shared schema base with camelCase JSON aliases."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints
from pydantic.alias_generators import to_camel


def Trimmed(max_length: int, min_length: int = 1):  # noqa: N802  (reads as a type)
    """A string with surrounding whitespace removed before its length is checked."""
    return Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)
    ]


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Vec3(ApiModel):
    x: float
    y: float
    z: float


class Quaternion(ApiModel):
    """A rotation. The identity is (0, 0, 0, 1)."""

    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0


class CameraPose(ApiModel):
    position: Vec3
    target: Vec3
