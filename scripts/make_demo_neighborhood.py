"""Builds the mission demo: a suburban neighbourhood with a delivery hub at its edge.

Streets on a grid, houses with gable roofs, gardens with pools and fences, trees, parked cars,
a park in the middle, a row of apartment blocks, and a logistics hub with a concrete apron for
the carrier to take off from. Generated rather than downloaded, so it carries no licence and can
be rebuilt at any time. Units are metres and Y is up, so a mission over it needs no scale fix.

    cd server && uv run python ../scripts/make_demo_neighborhood.py ../storage/demo/neighborhood.glb
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

SEED = 20261025
rng = np.random.default_rng(SEED)

HALF = 190.0  # the ground runs from -HALF to HALF on both axes
ROADS = (-75.0, 75.0)  # centre lines of the streets, both ways
ROAD = 10.0
WALK = 2.5


def material(color: tuple[float, float, float], roughness: float = 0.85, metal: float = 0.0):
    return PBRMaterial(baseColorFactor=[*color, 1.0], metallicFactor=metal, roughnessFactor=roughness)


MATERIALS = {
    "grass": material((0.36, 0.5, 0.27), 0.95),
    "lawn": material((0.45, 0.6, 0.32), 0.95),
    "asphalt": material((0.17, 0.17, 0.19), 0.9),
    "walk": material((0.62, 0.61, 0.58), 0.9),
    "paint": material((0.92, 0.9, 0.82), 0.7),
    "concrete": material((0.55, 0.55, 0.56), 0.9),
    "wall_white": material((0.9, 0.88, 0.84)),
    "wall_cream": material((0.89, 0.82, 0.68)),
    "wall_sand": material((0.8, 0.7, 0.55)),
    "wall_grey": material((0.66, 0.67, 0.69)),
    "roof_tile": material((0.62, 0.27, 0.18), 0.75),
    "roof_slate": material((0.25, 0.27, 0.3), 0.7),
    "roof_flat": material((0.42, 0.43, 0.45), 0.9),
    "glass": material((0.12, 0.16, 0.22), 0.15, 0.4),
    "door": material((0.32, 0.22, 0.15), 0.8),
    "fence": material((0.86, 0.84, 0.8), 0.8),
    "hedge": material((0.2, 0.34, 0.18), 0.95),
    "trunk": material((0.33, 0.24, 0.17), 0.9),
    "leaf_a": material((0.22, 0.42, 0.2), 0.9),
    "leaf_b": material((0.3, 0.48, 0.22), 0.9),
    "leaf_c": material((0.18, 0.36, 0.24), 0.9),
    "water": material((0.2, 0.55, 0.75), 0.1, 0.1),
    "car_red": material((0.62, 0.12, 0.1), 0.35, 0.3),
    "car_blue": material((0.14, 0.26, 0.5), 0.35, 0.3),
    "car_white": material((0.88, 0.88, 0.9), 0.35, 0.3),
    "car_dark": material((0.12, 0.12, 0.13), 0.35, 0.3),
    "hub_wall": material((0.85, 0.86, 0.88), 0.6),
    "hub_accent": material((0.24, 0.45, 0.85), 0.5),
    "sand": material((0.82, 0.74, 0.56), 0.95),
    "play": material((0.9, 0.55, 0.15), 0.6),
}

parts: dict[str, list[trimesh.Trimesh]] = {name: [] for name in MATERIALS}


def add(name: str, mesh: trimesh.Trimesh, at=(0.0, 0.0, 0.0), yaw: float = 0.0) -> None:
    if yaw:
        mesh.apply_transform(trimesh.transformations.rotation_matrix(yaw, [0, 1, 0]))
    mesh.apply_translation(at)
    parts[name].append(mesh)


def box(name: str, size, at, yaw: float = 0.0) -> None:
    """A box standing on `at`: the y given is its base, not its centre."""
    x, y, z = at
    add(name, trimesh.creation.box(extents=size), (0, 0, 0), yaw)
    parts[name][-1].apply_translation((x, y + size[1] / 2, z))


def gable(width: float, depth: float, rise: float, overhang: float = 0.5) -> trimesh.Trimesh:
    """A pitched roof over a width-by-depth footprint, ridge along the depth, base at y=0."""
    w, d = width / 2 + overhang, depth / 2 + overhang
    vertices = np.array(
        [[-w, 0, -d], [w, 0, -d], [w, 0, d], [-w, 0, d], [0, rise, -d], [0, rise, d]], dtype=float
    )
    # Wound so every face points outwards: two slopes, two gable ends, the underside.
    faces = np.array(
        [[0, 3, 5], [0, 5, 4], [1, 4, 5], [1, 5, 2], [0, 4, 1], [3, 2, 5], [0, 1, 2], [0, 2, 3]]
    )
    return trimesh.Trimesh(vertices, faces, process=False)


def tree(x: float, z: float, scale: float = 1.0) -> None:
    height = rng.uniform(3.5, 6.0) * scale
    trunk = trimesh.creation.cylinder(radius=0.22 * scale, height=height, sections=8)
    trunk.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    add("trunk", trunk, (x, height / 2, z))
    crown = trimesh.creation.icosphere(subdivisions=1, radius=rng.uniform(2.2, 3.4) * scale)
    crown.apply_scale((1.0, rng.uniform(0.85, 1.25), 1.0))
    add(str(rng.choice(["leaf_a", "leaf_b", "leaf_c"])), crown, (x, height + 1.2 * scale, z))


def car(x: float, z: float, yaw: float) -> None:
    color = str(rng.choice(["car_red", "car_blue", "car_white", "car_dark", "car_white"]))
    body = trimesh.creation.box(extents=(1.8, 0.75, 4.3))
    body.apply_translation((0, 0.55, 0))
    cabin = trimesh.creation.box(extents=(1.6, 0.6, 2.3))
    cabin.apply_translation((0, 1.2, -0.2))
    add(color, body, (x, 0, z), yaw)
    add("glass", cabin, (x, 0, z), yaw)


def house(cx: float, cz: float, facing: float) -> None:
    """One 22 by 30 metre lot, drawn facing +Z and turned to face its street: a house set back
    from the pavement, a car on the drive, and a fenced garden behind with a tree or a pool."""
    width = rng.uniform(9.0, 13.0)
    depth = rng.uniform(8.0, 11.0)
    storeys = int(rng.choice([1, 2, 2]))
    height = 3.1 * storeys
    wall = str(rng.choice(["wall_white", "wall_cream", "wall_sand", "wall_grey", "wall_white"]))
    roof = str(rng.choice(["roof_tile", "roof_tile", "roof_slate"]))
    turn = trimesh.transformations.rotation_matrix(facing, [0, 1, 0])

    def world(local) -> tuple[float, float, float]:
        x, y, z = turn[:3, :3] @ np.asarray(local, dtype=float)
        return cx + x, y, cz + z

    def block(name: str, size, local) -> None:
        mesh = trimesh.creation.box(extents=size)
        mesh.apply_translation((local[0], local[1] + size[1] / 2, local[2]))
        mesh.apply_transform(turn)
        add(name, mesh, (cx, 0, cz))

    front = 9.0  # the house's front wall, six metres back from the pavement at z = 15
    centre = front - depth / 2
    block("lawn", (22.0, 0.06, 30.0), (0, 0, 0))
    block(wall, (width, height, depth), (0, 0, centre))
    roof_mesh = gable(width, depth, rng.uniform(2.2, 3.4))
    roof_mesh.apply_translation((0, height, centre))
    roof_mesh.apply_transform(turn)
    add(roof, roof_mesh, (cx, 0, cz))
    block("door", (1.1, 2.1, 0.12), (width * 0.2, 0, front))
    for side in (-1, 1):
        for storey in range(storeys):
            block("glass", (1.6, 1.3, 0.1), (side * width * 0.3, 1.0 + 3.1 * storey, front))

    drive = -width / 2 - 2.2
    block("concrete", (3.2, 0.08, 8.0), (drive, 0, 11.0))
    if rng.random() < 0.8:
        x, _, z = world((drive, 0, 11.0))
        car(x, z, facing)

    for side in (-1, 1):
        block("fence", (0.12, 1.4, 30.0 - (15 - front) - depth), (side * 10.9, 0, (front - depth - 15) / 2))
    block("fence", (22.0, 1.4, 0.12), (0, 0, -15.0))
    if rng.random() < 0.35:
        pool = rng.uniform(-4, 4)
        block("concrete", (5.6, 0.1, 8.6), (pool, 0, -9.0))
        block("water", (4.0, 0.14, 7.0), (pool, 0, -9.0))
    for _ in range(int(rng.integers(1, 3))):
        x, _, z = world((rng.choice([-7.5, 7.5]) + rng.uniform(-1, 1), 0, rng.uniform(-13, -9)))
        tree(x, z, rng.uniform(0.8, 1.1))


def streets() -> None:
    box("grass", (2 * HALF, 0.2, 2 * HALF), (0, -0.2, 0))
    for c in ROADS:
        for along_x in (True, False):
            size = (2 * HALF, 0.04, ROAD) if along_x else (ROAD, 0.04, 2 * HALF)
            at = (0, 0.0, c) if along_x else (c, 0.0, 0)
            box("asphalt", size, at)
            for side in (-1, 1):
                offset = side * (ROAD / 2 + WALK / 2)
                walk = (2 * HALF, 0.14, WALK) if along_x else (WALK, 0.14, 2 * HALF)
                box("walk", walk, (0, 0.0, c + offset) if along_x else (c + offset, 0.0, 0))
            # dashed centre line
            for d in np.arange(-HALF + 3, HALF - 3, 9.0):
                if any(abs(d - other) < ROAD for other in ROADS):
                    continue
                dash = (3.0, 0.02, 0.18) if along_x else (0.18, 0.02, 3.0)
                box("paint", dash, (d, 0.04, c) if along_x else (c, 0.04, d))
    # street trees along every pavement
    for c in ROADS:
        for d in np.arange(-HALF + 8, HALF - 8, 16.0):
            if any(abs(d - other) < ROAD + 6 for other in ROADS):
                continue
            for side in (-1, 1):
                offset = side * (ROAD / 2 + WALK + 1.2)
                tree(d, c + offset, 0.8)
                tree(c + offset, d, 0.8)


def park(cx: float, cz: float, size: float) -> None:
    box("lawn", (size, 0.08, size), (cx, 0, cz))
    box("walk", (size, 0.1, 3.0), (cx, 0, cz))
    box("walk", (3.0, 0.1, size), (cx, 0, cz))
    box("sand", (14, 0.12, 10), (cx + size / 4, 0, cz - size / 4))
    for i in range(3):
        box("play", (0.3, 2.5, 0.3), (cx + size / 4 - 4 + i * 4, 0.1, cz - size / 4))
    box("play", (8.5, 0.3, 0.3), (cx + size / 4, 2.5, cz - size / 4))
    box("water", (16, 0.1, 9), (cx - size / 4, 0, cz + size / 4))
    for _ in range(26):
        x, z = rng.uniform(-size / 2 + 3, size / 2 - 3, 2)
        if abs(x) < 3 or abs(z) < 3:
            continue
        tree(cx + x, cz + z, rng.uniform(1.0, 1.4))


def apartments(cx: float, cz: float) -> None:
    for i, x in enumerate((-22.0, 0.0, 22.0)):
        floors = 4 + i % 2
        box("wall_grey" if i % 2 else "wall_white", (16, 3.0 * floors, 14), (cx + x, 0, cz))
        box("roof_flat", (16.6, 0.4, 14.6), (cx + x, 3.0 * floors, cz))
        for f in range(floors):
            for wx in (-5, 0, 5):
                box("glass", (2.4, 1.5, 0.1), (cx + x + wx, 3.0 * f + 1.0, cz + 7.02))
    for x in np.arange(-30, 31, 6):
        car(cx + x, cz + 12, np.pi / 2)


def hub(cx: float, cz: float) -> None:
    """The logistics hub: a hangar, its control office, and a concrete apron with a fence."""
    box("concrete", (60, 0.12, 46), (cx, 0, cz))
    box("hub_wall", (30, 9, 18), (cx - 12, 0, cz - 12))
    box("hub_accent", (30.4, 1.2, 18.4), (cx - 12, 7.2, cz - 12))
    box("roof_flat", (31, 0.5, 19), (cx - 12, 9, cz - 12))
    box("glass", (12, 5.5, 0.1), (cx - 12, 0.2, cz - 2.95))
    box("hub_wall", (10, 6, 8), (cx + 18, 0, cz - 15))
    box("glass", (8, 1.6, 0.1), (cx + 18, 3.4, cz - 10.95))
    for x in np.arange(cx - 30, cx + 31, 3.0):
        box("fence", (0.1, 2.0, 0.1), (x, 0, cz + 23))
        box("fence", (0.1, 2.0, 0.1), (x, 0, cz - 23))
    box("fence", (60, 0.08, 0.08), (cx, 1.9, cz + 23))


def build() -> trimesh.Scene:
    streets()
    # The streets cut the ground into three bands each way; each band is a block.
    edge = ROAD / 2 + WALK
    bands = [(-HALF, ROADS[0] - edge), (ROADS[0] + edge, ROADS[1] - edge), (ROADS[1] + edge, HALF)]
    for i, (x0, x1) in enumerate(bands):
        for j, (z0, z1) in enumerate(bands):
            cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
            if (i, j) == (1, 1):
                park(cx, cz, 120)
            elif (i, j) == (0, 2):
                hub(cx, cz)
            elif (i, j) == (2, 0):
                apartments(cx, cz + 22)
                apartments(cx, cz - 28)
            else:
                # A row of lots along each side of the block, each facing the street beside it.
                for lx in np.arange(x0 + 13, x1 - 12, 22.0):
                    house(lx, z1 - 16, 0.0)
                    house(lx, z0 + 16, np.pi)

    scene = trimesh.Scene()
    for name, meshes in parts.items():
        if not meshes:
            continue
        merged = trimesh.util.concatenate(meshes)
        merged.visual = trimesh.visual.TextureVisuals(material=MATERIALS[name])
        scene.add_geometry(merged, node_name=name, geom_name=name)
    return scene


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "neighborhood.glb")
    target.parent.mkdir(parents=True, exist_ok=True)
    scene = build()
    target.write_bytes(scene.export(file_type="glb"))
    triangles = sum(len(g.faces) for g in scene.geometry.values())
    print(f"{target}: {triangles:,} triangles, {target.stat().st_size / 1e6:.1f} MB")
