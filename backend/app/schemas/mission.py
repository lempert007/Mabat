"""A delivery mission: the flight the live showcase plays over the project's model.

The mission belongs to the editor and travels inside the project's settings. Positions are world
coordinates, like a point's. Every distance, speed and duration is in metres and seconds of the
real flight, and `units_per_meter` relates the two.

The flight itself is fixed: the carrier flies to the drop, holds over it and lowers whatever
hangs on its rope. What happens on the ground is the editor's: the actors, what each one rides
in on, and the keyframes it moves through once it is free.

The defaults are the ones the interface starts a new mission with. A mission saved before a
field existed reads back with that field's default, so adding one never needs a migration.
"""

from typing import Annotated, Literal

from pydantic import Field, StringConstraints, model_validator

from app.schemas.common import ApiModel, Quaternion, Vec3

StageKind = Literal["takeoff", "cruise", "approach", "lower", "onsite", "raise", "return", "land"]
CameraShot = Literal["chase", "orbit", "wide", "ground", "top", "side", "close"]
# How an actor moves, which decides its built-in look and the pace new keyframes are timed at.
ActorKind = Literal["drone", "rover", "parcel"]
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]
ActorId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_-]{1,40}$")]
# An uploaded model, named by the store when it was converted (`services/mission_models.py`).
ModelId = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{32}$")]
# What an actor starts on: the carrier's rope, another actor's id, or null to stand on the model.
HOOK = "hook"


class Vehicle(ApiModel):
    """The carrier."""

    # What the presentation calls it, such as the product's name. Empty uses the default.
    name: str = Field(default="", max_length=60)
    # Longest side in metres. A model is scaled to it, whatever units it was drawn in.
    size: float = Field(gt=0, le=100)
    # Turns an uploaded model so it flies nose first.
    rotation: Quaternion | None = None
    # Livery of the built-in model.
    color: HexColor = "#5b9cff"
    # The editor's own model. Null flies the built-in one.
    model: ModelId | None = None


class Keyframe(ApiModel):
    """Where an actor is at one moment, and which way it faces: it arrives, waits, moves on."""

    # Seconds after the load is set down.
    at: float = Field(ge=0, le=3600)
    # The spot clicked on the model, world coordinates.
    place: Vec3
    # Which way that surface faces, world space. Null: straight up.
    normal: Vec3 | None = None
    # Metres off that spot, away from the surface, for something flying.
    lift: float = Field(default=0, ge=0, le=500)
    # Seconds it waits there before moving on.
    hold: float = Field(default=0, ge=0, le=600)
    # Degrees it faces, turning about its own up. Null: the way it is moving.
    heading: float | None = Field(default=None, ge=-180, le=180)
    # Degrees it leans nose down and rolls to its right, on top of everything else.
    pitch: float = Field(default=0, ge=-90, le=90)
    roll: float = Field(default=0, ge=-180, le=180)


class Actor(ApiModel):
    id: ActorId
    # What the presentation calls it. Empty: the interface names it by its kind.
    name: str = Field(default="", max_length=60)
    kind: ActorKind = "parcel"
    # Longest side in metres.
    size: float = Field(default=0.45, gt=0, le=100)
    color: HexColor = "#c9a27a"
    rotation: Quaternion | None = None
    model: ModelId | None = None
    rides: str | None = HOOK
    # Riding another actor, it sits on top of it or hangs underneath.
    mount: Literal["below", "above"] = "below"
    # Riding another actor, it gets off this many seconds after the load is set down.
    leaves: float = Field(default=0, ge=0, le=3600)
    # On the rope, it goes back up with it instead of being set free.
    stays_hooked: bool = False
    # Faces the way it moves. Off for something that is carried, like a parcel.
    turns: bool = True
    # Stands square to whatever it is on, so it climbs a wall or leans on a slope. Off for
    # something that keeps itself level, like a drone.
    follows_surface: bool = True
    keys: list[Keyframe] = Field(default_factory=list, max_length=40)

    @model_validator(mode="after")
    def _keys_in_order(self) -> "Actor":
        for before, after in zip(self.keys, self.keys[1:], strict=False):
            if after.at < before.at + before.hold - 1e-6:
                raise ValueError("keyframes must follow each other in time")
        return self


def _load() -> list[Actor]:
    return [Actor(id="load", kind="parcel", size=0.45, color="#c9a27a", turns=False)]


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
    # Where the rope sets its load down. A mission without one cannot be played yet.
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
    # How far above the drop the load is let go. Zero sets it down.
    release_height: float = Field(default=0, ge=0, le=200)
    # How long the carrier stays once everything on the ground has stopped moving.
    dwell: float = Field(default=3, ge=0, le=120)

    carrier: Vehicle = Field(default_factory=lambda: Vehicle(size=3.6, color="#5b9cff"))
    actors: list[Actor] = Field(default_factory=_load, max_length=8)
    stages: dict[StageKind, StageText] = Field(default_factory=dict)
    noise: list[NoiseZone] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def _actors_fit_together(self) -> "Mission":
        ids = [actor.id for actor in self.actors]
        if len(set(ids)) != len(ids):
            raise ValueError("every actor needs its own id")
        rides = {actor.id: actor.rides for actor in self.actors}
        if sum(ride == HOOK for ride in rides.values()) > 1:
            raise ValueError("only one actor can hang on the rope")
        for actor in self.actors:
            seen = {actor.id}
            ride = actor.rides
            while ride not in (None, HOOK):
                if ride not in rides:
                    raise ValueError(f"'{actor.id}' rides an actor that does not exist")
                if ride in seen:
                    raise ValueError(f"'{actor.id}' ends up riding itself")
                seen.add(ride)
                ride = rides[ride]
        return self

    def model_ids(self) -> set[str]:
        """Every uploaded model the mission draws."""
        models = [self.carrier.model, *(actor.model for actor in self.actors)]
        return {model for model in models if model}
