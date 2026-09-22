"""Turning an uploaded model the right way up.

Models arrive from all sorts of exporters, and a Z-up source lands on its face. The fix is a
rotation stored on the project and applied to the model when it is drawn. Points are stored in
world coordinates, so whenever the rotation changes they have to come along with it, otherwise
every marker would be left floating where the geometry used to be.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.common import Quaternion
from app.services.pois import list_pois

IDENTITY = Quaternion(x=0.0, y=0.0, z=0.0, w=1.0)


def multiply(a: Quaternion, b: Quaternion) -> Quaternion:
    """The rotation of `b` followed by the rotation of `a`."""
    return Quaternion(
        x=a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y=a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z=a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        w=a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    )


def inverse(q: Quaternion) -> Quaternion:
    """Valid for unit quaternions, which is all we ever store."""
    return Quaternion(x=-q.x, y=-q.y, z=-q.z, w=q.w)


def rotate(q: Quaternion, point: dict[str, float]) -> dict[str, float]:
    x, y, z = point["x"], point["y"], point["z"]
    # t = 2 * (q_vector x point); result = point + q.w * t + q_vector x t
    tx = 2.0 * (q.y * z - q.z * y)
    ty = 2.0 * (q.z * x - q.x * z)
    tz = 2.0 * (q.x * y - q.y * x)
    return {
        "x": x + q.w * tx + q.y * tz - q.z * ty,
        "y": y + q.w * ty + q.z * tx - q.x * tz,
        "z": z + q.w * tz + q.x * ty - q.y * tx,
    }


def is_identity(q: Quaternion | None) -> bool:
    return q is None or (q.x == 0.0 and q.y == 0.0 and q.z == 0.0 and abs(q.w) == 1.0)


def same(a: Quaternion | None, b: Quaternion | None) -> bool:
    if is_identity(a) and is_identity(b):
        return True
    if a is None or b is None:
        return False
    return all(abs(getattr(a, f) - getattr(b, f)) < 1e-9 for f in ("x", "y", "z", "w"))


async def reorient_points(
    db: AsyncSession,
    project_id: UUID,
    previous: Quaternion | None,
    current: Quaternion | None,
) -> int:
    """Move every point of a project by the change in the model's rotation."""
    if same(previous, current):
        return 0

    delta = multiply(current or IDENTITY, inverse(previous or IDENTITY))
    points = await list_pois(db, project_id)
    for poi in points:
        poi.position = rotate(delta, poi.position)
        poi.normal = rotate(delta, poi.normal)
        if poi.camera:
            poi.camera = {
                "position": rotate(delta, poi.camera["position"]),
                "target": rotate(delta, poi.camera["target"]),
            }
    return len(points)
