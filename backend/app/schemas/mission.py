"""A delivery mission: the flight the live showcase plays over the project's model.

The mission belongs to the editor and travels inside the project's settings. Positions are world
coordinates, like a point's. Every distance, speed and duration is in metres and seconds of the
real flight, and `units_per_meter` relates the two.

The defaults are the ones the interface starts a new mission with. A mission saved before a
field existed reads back with that field's default, so adding one never needs a migration.
"""

from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.schemas.common import ApiModel, Quaternion, Vec3

StageKind = Literal["takeoff", "cruise", "approach", "lower", "deliver", "raise", "return", "land"]
CameraShot = Literal["chase", "orbit", "wide", "ground", "top", "side", "droid"]
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class Vehicle(ApiModel):
    # What the presentation calls it, such as the product's name. Empty uses the default.
    name: str = Field(default="", max_length=60)
    # Longest side in metres. A model is scaled to it, whatever units it was drawn in.
    size: float = Field(gt=0, le=100)
    # Turns an uploaded model so it flies nose first.
    rotation: Quaternion | None = None
    # Livery of the built-in model.
    color: HexColor = "#5b9cff"


class StageText(ApiModel):
    title: str = Field(default="", max_length=80)
    caption: str = Field(default="", max_length=600)
    # Null leaves the camera to the stage's own shot.
    shot: CameraShot | None = None


class NoiseZone(ApiModel):
    """Where the flight can be heard, traced on the ground from an acoustic study."""

    # What the study calls this contour, such as "45 dB". Empty: the interface numbers it.
    label: str = Field(default="", max_length=40)
    # The contour in order around its edge. It closes by itself and needs three points.
    points: list[Vec3] = Field(default_factory=list, max_length=300)


class Mission(ApiModel):
    units_per_meter: float = Field(default=1.0, gt=0, le=1000)
    # Where the carrier takes off and lands. Null: it arrives from beyond the model.
    hub: Vec3 | None = None
    waypoints: list[Vec3] = Field(default_factory=list, max_length=30)
    # Where the parcel lands. A mission without one cannot be played yet.
    drop: Vec3 | None = None
    # Where the carrier holds while lowering. Null: straight above the drop.
    hover: Vec3 | None = None

    cruise_altitude: float = Field(default=90, ge=5, le=1000)
    cruise_speed: float = Field(default=25, gt=0, le=120)
    climb_rate: float = Field(default=5, gt=0, le=30)
    hover_altitude: float = Field(default=70, ge=3, le=1000)
    tether_length: float = Field(default=80, ge=1, le=1000)
    # The winch pays out and reels in at this speed.
    winch_speed: float = Field(default=3, gt=0, le=20)
    release_height: float = Field(default=1.5, ge=0, le=50)
    dwell: float = Field(default=5, ge=0, le=120)

    carrier: Vehicle = Field(default_factory=lambda: Vehicle(size=3.6, color="#5b9cff"))
    droid: Vehicle = Field(default_factory=lambda: Vehicle(size=0.8, color="#34c76f"))
    parcel: Vehicle = Field(default_factory=lambda: Vehicle(size=0.45, color="#c9a27a"))
    stages: dict[StageKind, StageText] = Field(default_factory=dict)
    noise: list[NoiseZone] = Field(default_factory=list, max_length=8)
