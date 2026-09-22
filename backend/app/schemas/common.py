"""Shared schema base with camelCase JSON aliases."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


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
