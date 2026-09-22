"""Builds the demo model: a layered castle on a mountain.

Generated rather than downloaded so the sample carries no licence, can be regenerated at any
time, and has named features at known coordinates worth pinning points to.

    cd backend && uv run python ../scripts/make_demo_model.py ../storage/demo/castle.glb
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

SEED = 20260913
rng = np.random.default_rng(SEED)

# ---------------------------------------------------------------- materials


def stone(color: tuple[float, float, float], roughness: float = 0.85) -> PBRMaterial:
    return PBRMaterial(
        baseColorFactor=[*color, 1.0],
        metallicFactor=0.0,
        roughnessFactor=roughness,
    )


MATERIALS = {
    "wall": stone((0.78, 0.75, 0.69)),  # curtain walls and towers
    "wall_shadow": stone((0.62, 0.59, 0.55)),  # plinths, string courses, buttresses
    "keep": stone((0.84, 0.81, 0.74)),  # the keep reads a shade lighter
    "roof": stone((0.42, 0.19, 0.16), 0.7),  # tiled roofs
    "timber": stone((0.31, 0.21, 0.14), 0.9),  # gates, bridge deck, shutters
    "void": stone((0.05, 0.05, 0.06), 0.95),  # windows, arrow slits, the gate arch
    "gold": PBRMaterial(
        baseColorFactor=[0.85, 0.68, 0.28, 1.0], metallicFactor=0.85, roughnessFactor=0.35
    ),
}

# Every part is collected per material, then merged so the export carries one mesh per material.
parts: dict[str, list[trimesh.Trimesh]] = {name: [] for name in MATERIALS}


def add(material: str, mesh: trimesh.Trimesh, at=(0.0, 0.0, 0.0), rotate_z: float = 0.0) -> None:
    if rotate_z:
        mesh.apply_transform(trimesh.transformations.rotation_matrix(rotate_z, [0, 1, 0]))
    mesh.apply_translation(at)
    parts[material].append(mesh)


def box(size, at, material="wall", rotate_z: float = 0.0) -> None:
    add(material, trimesh.creation.box(extents=size), at, rotate_z)


def cylinder(radius: float, height: float, at, material="wall", sections: int = 24) -> None:
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    add(material, mesh, at)


def cone(radius: float, height: float, at, material="roof", sections: int = 24) -> None:
    mesh = trimesh.creation.cone(radius=radius, height=height, sections=sections)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))
    add(material, mesh, at)


# ---------------------------------------------------------------- the mountain


def value_noise(shape: tuple[int, int], frequency: int) -> np.ndarray:
    """Smooth noise from a coarse random grid, interpolated up to full resolution."""
    coarse = rng.random((frequency + 1, frequency + 1))
    y = np.linspace(0, frequency, shape[0])
    x = np.linspace(0, frequency, shape[1])
    y0, x0 = np.floor(y).astype(int), np.floor(x).astype(int)
    y1, x1 = np.minimum(y0 + 1, frequency), np.minimum(x0 + 1, frequency)
    ty, tx = y - y0, x - x0
    # Smoothstep keeps the interpolation from looking like a grid.
    ty, tx = (ty * ty * (3 - 2 * ty))[:, None], (tx * tx * (3 - 2 * tx))[None, :]
    top = coarse[np.ix_(y0, x0)] * (1 - tx) + coarse[np.ix_(y0, x1)] * tx
    bottom = coarse[np.ix_(y1, x0)] * (1 - tx) + coarse[np.ix_(y1, x1)] * tx
    return top * (1 - ty) + bottom * ty


def fbm(shape: tuple[int, int], octaves: int = 5) -> np.ndarray:
    total = np.zeros(shape)
    amplitude, frequency, norm = 1.0, 3, 0.0
    for _ in range(octaves):
        total += value_noise(shape, frequency) * amplitude
        norm += amplitude
        amplitude *= 0.5
        frequency *= 2
    return total / norm


GRID = 340
# A narrow footprint against a high summit is what makes this read as a mountain rather than a
# mound: the slope from the base to the plateau averages a little over 50 degrees.
EXTENT = 88.0  # radius of the mountain's footprint
SUMMIT = 76.0  # height of the plateau the castle stands on
PLATEAU_RADIUS = 31.0
HEIGHTS: np.ndarray | None = None  # filled in by build_mountain, sampled by the road


def build_mountain() -> trimesh.Trimesh:
    """A terraced peak with a flat summit, trimmed to a circle so it has no cut edges."""
    global HEIGHTS

    line = np.linspace(-EXTENT, EXTENT, GRID)
    x, z = np.meshgrid(line, line)
    distance = np.sqrt(x**2 + z**2)
    reach = np.clip(distance / EXTENT, 0.0, 1.0)

    # Steep through the middle, easing off near the base, so the silhouette has shoulders.
    profile = np.cos(reach * np.pi / 2) ** 1.35
    height = profile * SUMMIT

    # Ridges running outward from the peak give the slopes some structure.
    angle = np.arctan2(z, x)
    ridges = np.abs(np.sin(angle * 3.5 + fbm((GRID, GRID), octaves=3) * 4.0))
    height += (1.0 - ridges) * 9.0 * profile

    height += (fbm((GRID, GRID)) - 0.5) * 18.0 * profile**0.7

    # Terraces through the upper slopes, which is what makes the mountain read as layers.
    terraced = np.round(height / 5.5) * 5.5
    banding = np.clip(1.4 - reach * 2.2, 0.0, 1.0)
    height = height * (1 - banding * 0.8) + terraced * (banding * 0.8)

    # Flatten the summit for the castle, and pin the rim to zero so the base closes cleanly.
    summit_blend = np.clip((distance - PLATEAU_RADIUS) / 20.0, 0.0, 1.0)
    height = height * summit_blend + SUMMIT * (1 - summit_blend)
    height *= np.clip((1.0 - reach) * 6.0, 0.0, 1.0)
    height[distance < PLATEAU_RADIUS] = SUMMIT

    HEIGHTS = height
    vertices = np.column_stack([x.ravel(), height.ravel(), z.ravel()])

    index = np.arange(GRID * GRID).reshape(GRID, GRID)
    top_left, top_right = index[:-1, :-1].ravel(), index[:-1, 1:].ravel()
    bottom_left, bottom_right = index[1:, :-1].ravel(), index[1:, 1:].ravel()
    faces = np.vstack(
        [
            np.column_stack([top_left, bottom_left, top_right]),
            np.column_stack([top_right, bottom_left, bottom_right]),
        ]
    )

    # Keep only the faces inside the circle: a square sheet would read as a cut-out.
    centres = vertices[faces].mean(axis=1)
    faces = faces[np.sqrt(centres[:, 0] ** 2 + centres[:, 2] ** 2) <= EXTENT * 0.995]

    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    mesh.remove_unreferenced_vertices()

    # Colour by height and steepness: turf low down, scree and bare rock above.
    normals = mesh.vertex_normals
    steepness = 1.0 - np.clip(normals[:, 1], 0.0, 1.0)
    elevation = np.clip(mesh.vertices[:, 1] / SUMMIT, 0.0, 1.0)

    # Kept deliberately dark: tone mapping and the scene lights lift these considerably, and a
    # brighter palette turns the mountain into pale sand.
    turf = np.array([0.15, 0.22, 0.11])
    scree = np.array([0.31, 0.28, 0.24])
    rock = np.array([0.20, 0.19, 0.19])
    color = turf[None, :] * (1 - elevation)[:, None] + scree[None, :] * elevation[:, None]
    # Anything steep is bare rock; the transition is sharp so cliffs read as cliffs.
    exposure = np.clip(steepness * 2.4, 0.0, 1.0)[:, None]
    color = color * (1 - exposure) + rock[None, :] * exposure
    color *= rng.uniform(0.78, 1.22, (len(mesh.vertices), 1))

    mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=np.clip(color, 0, 1))
    return mesh


def terrain_height(px: float, pz: float) -> float:
    """Height of the generated terrain at a point, for placing things that follow the ground."""
    assert HEIGHTS is not None, "build_mountain must run first"
    step = (2 * EXTENT) / (GRID - 1)
    col = int(round((px + EXTENT) / step))
    row = int(round((pz + EXTENT) / step))
    return float(HEIGHTS[np.clip(row, 0, GRID - 1), np.clip(col, 0, GRID - 1)])


def build_road() -> None:
    """A switchback road climbing the south face to the gatehouse bridge."""
    turns, slabs = 1.65, 220
    start_radius, end_radius = EXTENT * 0.94, PLATEAU_RADIUS + 6.0
    for i in range(slabs):
        t = i / (slabs - 1)
        radius = start_radius + (end_radius - start_radius) * t
        angle = np.pi / 2 + t * turns * 2 * np.pi
        px, pz = radius * np.cos(angle), radius * np.sin(angle)
        y = terrain_height(px, pz)

        nxt = min((i + 1) / (slabs - 1), 1.0)
        nr = start_radius + (end_radius - start_radius) * nxt
        na = np.pi / 2 + nxt * turns * 2 * np.pi
        heading = np.arctan2(nr * np.sin(na) - pz, nr * np.cos(na) - px)

        box((5.2, 0.8, 4.4), (px, y + 0.2, pz), "wall_shadow", rotate_z=-heading)
        if i % 7 == 0:  # a low retaining kerb on the outer edge
            box(
                (5.2, 1.3, 0.7),
                (px + 2.0 * np.cos(angle), y + 0.8, pz + 2.0 * np.sin(angle)),
                "wall_shadow",
                rotate_z=-heading,
            )


# ---------------------------------------------------------------- castle pieces


def crenellate(points: np.ndarray, top: float, thickness: float, material="wall") -> None:
    """Merlons along a path, leaving gaps between them."""
    for start, end in zip(points[:-1], points[1:], strict=True):
        span = np.linalg.norm(end - start)
        count = max(int(span // 2.2), 1)
        for i in range(count):
            centre = start + (end - start) * ((i + 0.5) / count)
            angle = np.arctan2(end[1] - start[1], end[0] - start[0])
            box(
                (1.3, 1.4, thickness),
                (centre[0], top + 0.7, centre[1]),
                material,
                rotate_z=-angle,
            )


def curtain_wall(points: np.ndarray, base: float, height: float, thickness: float) -> None:
    """A wall following a path, with a walkway lip and merlons on top."""
    for start, end in zip(points[:-1], points[1:], strict=True):
        span = np.linalg.norm(end - start)
        centre = (start + end) / 2
        angle = np.arctan2(end[1] - start[1], end[0] - start[0])
        box((span, height, thickness), (centre[0], base + height / 2, centre[1]), "wall", -angle)
        # A course of darker stone where the wall meets the rock.
        box(
            (span, 1.2, thickness + 0.7),
            (centre[0], base + 0.6, centre[1]),
            "wall_shadow",
            -angle,
        )
    crenellate(points, base + height, thickness + 0.5)


def tower(centre, base: float, height: float, radius: float, roof: bool = True) -> None:
    x, z = centre
    cylinder(radius, height, (x, base + height / 2, z), "wall")
    cylinder(radius + 0.5, 1.6, (x, base + 0.8, z), "wall_shadow")
    # A corbelled ring under the parapet, the way real towers flare out at the top.
    cylinder(radius + 0.7, 1.1, (x, base + height - 0.55, z), "wall_shadow")

    ring = np.array(
        [
            [x + (radius + 0.2) * np.cos(a), z + (radius + 0.2) * np.sin(a)]
            for a in np.linspace(0, 2 * np.pi, 13)
        ]
    )
    crenellate(ring, base + height, 0.9)

    if roof:
        cone(radius + 0.9, radius * 1.9, (x, base + height + 1.4, z), "roof")
        cylinder(0.12, 1.4, (x, base + height + 1.4 + radius * 1.9 + 0.5, z), "gold", sections=6)

    # Arrow slits, one per floor.
    for floor in range(1, int(height // 4)):
        for a in np.linspace(0, 2 * np.pi, 5)[:-1]:
            box(
                (0.35, 1.5, 0.6),
                (x + radius * np.cos(a), base + floor * 4.0, z + radius * np.sin(a)),
                "void",
                rotate_z=-a,
            )


def polygon(radius: float, sides: int, rotation: float = 0.0) -> np.ndarray:
    angles = np.linspace(0, 2 * np.pi, sides + 1) + rotation
    return np.column_stack([radius * np.cos(angles), radius * np.sin(angles)])


def pitched_roof(size, at, material="roof") -> None:
    """A simple gabled roof as two leaning slabs."""
    width, length = size
    x, y, z = at
    pitch = np.radians(34)
    slope = width / (2 * np.cos(pitch))
    for side in (-1, 1):
        slab = trimesh.creation.box(extents=(slope, 0.35, length))
        slab.apply_transform(trimesh.transformations.rotation_matrix(side * pitch, [0, 0, 1]))
        slab.apply_translation((x + side * width / 4, y + width / 4 * np.tan(pitch), z))
        parts[material].append(slab)


def hall(centre, base: float, size, height: float, rotate: float = 0.0) -> None:
    """A long building with windows and a pitched roof."""
    width, length = size
    x, z = centre
    box((width, height, length), (x, base + height / 2, z), "wall", rotate)
    box((width + 0.6, 1.0, length + 0.6), (x, base + 0.5, z), "wall_shadow", rotate)
    pitched_roof((width + 1.0, length + 0.8), (x, base + height, z))
    for offset in np.linspace(-length / 2 + 2.2, length / 2 - 2.2, max(int(length // 3.4), 2)):
        for side in (-1, 1):
            local = np.array([side * width / 2, offset])
            angle = -rotate
            rotated = np.array(
                [
                    local[0] * np.cos(angle) - local[1] * np.sin(angle),
                    local[0] * np.sin(angle) + local[1] * np.cos(angle),
                ]
            )
            box(
                (0.5, 2.4, 1.2),
                (x + rotated[0], base + height * 0.55, z + rotated[1]),
                "void",
                rotate,
            )


# ---------------------------------------------------------------- the castle

OUTER_BASE = SUMMIT
OUTER_RADIUS = 25.0
INNER_BASE = SUMMIT + 4.0
INNER_RADIUS = 13.5
KEEP_BASE = INNER_BASE


def build_castle() -> None:
    # --- outer ward: the first ring of defence, hugging the summit ---
    outer = polygon(OUTER_RADIUS, 11, rotation=np.pi / 11)
    curtain_wall(outer, OUTER_BASE, 8.0, 2.4)
    for index, corner in enumerate(outer[:-1]):
        # Alternating tower heights keep the silhouette from being monotonous.
        tower(corner, OUTER_BASE, 13.0 if index % 2 else 16.0, 3.2)

    # --- the gatehouse, facing the approach from the south ---
    gate_z = OUTER_RADIUS + 1.0
    box((13.0, 11.0, 5.0), (0, OUTER_BASE + 5.5, gate_z), "wall")
    box((14.0, 1.4, 6.0), (0, OUTER_BASE + 0.7, gate_z), "wall_shadow")
    box((4.2, 6.6, 6.0), (0, OUTER_BASE + 3.3, gate_z), "void")  # the arch
    box((3.8, 5.4, 0.5), (0, OUTER_BASE + 2.7, gate_z - 2.6), "timber")  # the gate itself
    crenellate(np.array([[-6.5, gate_z], [6.5, gate_z]]), OUTER_BASE + 11.0, 5.0)
    for side in (-1, 1):
        tower((side * 7.4, gate_z), OUTER_BASE, 18.0, 3.4)

    # A bridge on piers, crossing the gap the road climbs to.
    for step in range(6):
        depth = 3.2 + step * 4.4
        drop = step * 2.6
        box((7.0, 0.7, 4.6), (0, OUTER_BASE - 0.6 - drop * 0.42, gate_z + depth), "timber")
        if step % 2 == 0 and step:
            box(
                (1.2, 6.0 + drop, 1.2),
                (0, OUTER_BASE - 3.6 - drop * 0.7, gate_z + depth),
                "wall_shadow",
            )

    # --- inner ward: a raised platform holding the keep and the hall ---
    cylinder(INNER_RADIUS + 2.0, 4.0, (0, SUMMIT + 2.0, 0), "wall_shadow", sections=48)
    inner = polygon(INNER_RADIUS, 9, rotation=np.pi / 9)
    curtain_wall(inner, INNER_BASE, 7.0, 2.0)
    for corner in inner[:-1][::2]:
        tower(corner, INNER_BASE, 11.0, 2.6)

    # Stairs climbing from the outer ward up to the inner gate.
    for step in range(9):
        box(
            (5.0, 0.55, 1.3),
            (0, OUTER_BASE + 0.3 + step * 0.48, INNER_RADIUS + 6.5 - step * 1.25),
            "wall_shadow",
        )

    # --- the keep: the tallest thing on the mountain ---
    keep_w, keep_d, keep_h = 13.0, 11.0, 26.0
    box((keep_w, keep_h, keep_d), (0, KEEP_BASE + keep_h / 2, -1.5), "keep")
    box((keep_w + 1.4, 2.0, keep_d + 1.4), (0, KEEP_BASE + 1.0, -1.5), "wall_shadow")
    # String courses mark the floors from outside.
    for floor in (1, 2, 3):
        box(
            (keep_w + 0.8, 0.6, keep_d + 0.8),
            (0, KEEP_BASE + floor * 6.2, -1.5),
            "wall_shadow",
        )
    # Windows: taller ones higher up, the way a great chamber sits above storage.
    for floor, window_h in ((1, 1.8), (2, 2.6), (3, 3.2)):
        for side, axis in ((-1, "x"), (1, "x"), (-1, "z"), (1, "z")):
            for offset in (-3.2, 0.0, 3.2):
                if axis == "x":
                    at = (side * keep_w / 2, KEEP_BASE + floor * 6.2 + 2.6, -1.5 + offset)
                    size = (0.5, window_h, 1.2)
                else:
                    at = (offset, KEEP_BASE + floor * 6.2 + 2.6, -1.5 + side * keep_d / 2)
                    size = (1.2, window_h, 0.5)
                box(size, at, "void")
    crenellate(
        np.array(
            [
                [-keep_w / 2 - 0.4, -1.5 - keep_d / 2 - 0.4],
                [keep_w / 2 + 0.4, -1.5 - keep_d / 2 - 0.4],
                [keep_w / 2 + 0.4, -1.5 + keep_d / 2 + 0.4],
                [-keep_w / 2 - 0.4, -1.5 + keep_d / 2 + 0.4],
                [-keep_w / 2 - 0.4, -1.5 - keep_d / 2 - 0.4],
            ]
        ),
        KEEP_BASE + keep_h,
        1.6,
        "keep",
    )
    # Corner turrets, each a little taller than the battlements.
    for sx in (-1, 1):
        for sz in (-1, 1):
            turret = (sx * (keep_w / 2 + 0.2), -1.5 + sz * (keep_d / 2 + 0.2))
            cylinder(
                2.1, keep_h + 5.0, (turret[0], KEEP_BASE + (keep_h + 5.0) / 2, turret[1]), "keep"
            )
            cone(2.7, 5.2, (turret[0], KEEP_BASE + keep_h + 5.0 + 1.0, turret[1]), "roof")
            cylinder(
                0.1, 1.2, (turret[0], KEEP_BASE + keep_h + 11.4, turret[1]), "gold", sections=6
            )

    # --- courtyard buildings ---
    hall((0.0, 9.5), INNER_BASE, (8.0, 15.0), 7.0)  # great hall
    hall((-9.0, 2.0), INNER_BASE, (6.0, 9.0), 5.5, rotate=np.pi / 2)  # lodgings

    # Chapel with an apse and a slim spire.
    chapel = (9.0, 1.0)
    hall(chapel, INNER_BASE, (5.5, 10.0), 6.0)
    cylinder(2.75, 6.0, (chapel[0], INNER_BASE + 3.0, chapel[1] - 5.0), "wall", sections=20)
    cone(3.1, 3.0, (chapel[0], INNER_BASE + 6.0, chapel[1] - 5.0), "roof", sections=20)
    box((1.4, 5.0, 1.4), (chapel[0], INNER_BASE + 9.0, chapel[1] + 3.0), "wall")
    cone(1.5, 5.5, (chapel[0], INNER_BASE + 11.5, chapel[1] + 3.0), "roof", sections=12)

    # The well in the middle of the outer ward.
    cylinder(1.6, 1.6, (-13.0, OUTER_BASE + 0.8, 11.0), "wall_shadow", sections=16)
    for side in (-1, 1):
        box((0.4, 3.0, 0.4), (-13.0 + side * 1.3, OUTER_BASE + 2.3, 11.0), "timber")
    box((0.4, 0.4, 3.4), (-13.0, OUTER_BASE + 3.8, 11.0), "timber")


def main(destination: Path) -> None:
    scene = trimesh.Scene()
    scene.add_geometry(build_mountain(), geom_name="mountain")

    build_castle()
    build_road()
    for name, meshes in parts.items():
        if not meshes:
            continue
        merged = trimesh.util.concatenate(meshes)
        merged.visual = trimesh.visual.TextureVisuals(material=MATERIALS[name])
        scene.add_geometry(merged, geom_name=name)

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(scene.export(file_type="glb"))

    triangles = sum(len(g.faces) for g in scene.geometry.values())
    size_mb = destination.stat().st_size / 1_048_576
    print(f"{destination}  {triangles:,} triangles  {size_mb:.1f} MB")
    print("bounds:", np.round(scene.bounds, 1).tolist())


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "castle.glb"))
