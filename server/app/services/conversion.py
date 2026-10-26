"""Convert uploaded 3D files to a single GLB the browser can load.

Strategies, by source extension:
- glb                            copied as-is (materials untouched)
- gltf obj stl ply off 3mf dae   loaded with trimesh and exported to GLB
- fbx 3ds x3d usd* abc           Blender headless, when a `blender` binary is on PATH
- zip kmz                        unpacked first, then the main mesh file is picked by priority

`.skp` is recognised but cannot be read here: SketchUp's SDK has no Linux build, so nothing
that runs on the server can open one. Those uploads are turned away with export instructions
rather than a generic "unsupported format", see NEEDS_EXPORT.
"""

import os
import re
import shutil
import subprocess
import zipfile
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import trimesh

TRIMESH_FORMATS = {"gltf", "obj", "stl", "ply", "off", "3mf", "dae"}
BLENDER_FORMATS = {"fbx", "3ds", "x3d", "usd", "usda", "usdc", "usdz", "abc"}
PASSTHROUGH_FORMATS = {"glb"}
ARCHIVE_FORMATS = {"zip", "kmz"}

SUPPORTED_UPLOAD_FORMATS = PASSTHROUGH_FORMATS | TRIMESH_FORMATS | BLENDER_FORMATS | ARCHIVE_FORMATS

# Formats we recognise but cannot open, and what to do about each. The text reaches the person
# who tried to upload, so it says which button to press rather than which library is missing.
NEEDS_EXPORT = {
    "skp": (
        "קובץ SketchUp נפתח רק בתוך SketchUp עצמו, ולכן אי אפשר לקרוא אותו כאן. "
        "בתפריט File › Export › 3D Model אפשר לייצא אותו ל-COLLADA (‎.dae), ל-KMZ או ל-OBJ, "
        "ואת הקובץ שיוצא להעלות לכאן כמו שהוא."
    ),
}

# Order matters: when an archive contains several candidates, the first match wins. COLLADA sits
# high because that is what a KMZ from SketchUp holds.
_PRIORITY = [
    "glb",
    "gltf",
    "dae",
    "obj",
    "fbx",
    "usdz",
    "usd",
    "usdc",
    "usda",
    "3ds",
    "x3d",
    "abc",
    "stl",
    "ply",
    "off",
    "3mf",
]

_BLENDER_SCRIPT = Path(__file__).resolve().parent.parent.parent / "scripts" / "blender_to_glb.py"

# `<up_axis>` lives in COLLADA's <asset> block, which the exporter writes before any geometry.
_UP_AXIS = re.compile(rb"<up_axis>\s*([XYZ])_UP\s*</up_axis>", re.IGNORECASE)
_ASSET_HEAD_BYTES = 64 * 1024


class ConversionError(Exception):
    """Raised with a human-readable message when a model cannot be converted."""


@dataclass
class ModelStats:
    triangles: int
    vertices: int
    bounds_min: list[float]
    bounds_max: list[float]

    def as_dict(self) -> dict:
        extents = [b - a for a, b in zip(self.bounds_min, self.bounds_max, strict=True)]
        return {
            "triangles": self.triangles,
            "vertices": self.vertices,
            "boundsMin": self.bounds_min,
            "boundsMax": self.bounds_max,
            "extents": extents,
        }


def extension_of(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


def blender_available() -> bool:
    return shutil.which("blender") is not None


def _find_main_file(folder: Path) -> Path:
    candidates = [p for p in folder.rglob("*") if p.is_file() and not p.name.startswith("._")]
    for ext in _PRIORITY:
        for path in candidates:
            if extension_of(path.name) == ext:
                return path
    for path in candidates:
        guidance = NEEDS_EXPORT.get(extension_of(path.name))
        if guidance:
            raise ConversionError(guidance)
    raise ConversionError(
        "בקובץ הדחוס אין קובץ דגם שאפשר לקרוא. הפורמטים הנתמכים: " + ", ".join(_PRIORITY)
    )


def _extract_archive(archive: Path) -> Path:
    target = archive.parent / "extracted"
    if target.exists():
        shutil.rmtree(target)
    target.mkdir()
    with zipfile.ZipFile(archive) as zf:
        for member in zf.infolist():
            # Guard against zip-slip: never write outside the target folder.
            dest = (target / member.filename).resolve()
            if target.resolve() not in dest.parents and dest != target.resolve():
                continue
            zf.extract(member, target)
    return target


def _stats_from_scene(scene: trimesh.Scene) -> ModelStats:
    triangles = 0
    vertices = 0
    for geometry in scene.geometry.values():
        if isinstance(geometry, trimesh.Trimesh):
            triangles += int(len(geometry.faces))
            vertices += int(len(geometry.vertices))
    bounds = scene.bounds
    if bounds is None:
        bounds = np.zeros((2, 3))
    return ModelStats(
        triangles=triangles,
        vertices=vertices,
        bounds_min=[float(v) for v in bounds[0]],
        bounds_max=[float(v) for v in bounds[1]],
    )


def declared_up_axis(path: Path) -> str | None:
    """The up axis a COLLADA file states for itself, or None when it states nothing."""
    if extension_of(path.name) != "dae":
        return None
    try:
        with path.open("rb") as handle:
            match = _UP_AXIS.search(handle.read(_ASSET_HEAD_BYTES))
    except OSError:
        return None
    return f"{match.group(1).decode().upper()}_UP" if match else None


def _apply_up_axis(scene: trimesh.Scene, up_axis: str | None) -> None:
    """Stand the scene up the way glTF expects. SketchUp models Z-up and says so in the file."""
    if up_axis is None or up_axis == "Y_UP":
        return
    axis = [1, 0, 0] if up_axis == "Z_UP" else [0, 0, 1]
    angle = -np.pi / 2 if up_axis == "Z_UP" else np.pi / 2
    scene.apply_transform(trimesh.transformations.rotation_matrix(angle, axis))


def _load_scene(path: Path) -> trimesh.Scene:
    loaded = trimesh.load(path, force="scene")
    if isinstance(loaded, trimesh.Scene):
        scene = loaded
    else:
        scene = trimesh.Scene(loaded)
    if not scene.geometry:
        raise ConversionError("בקובץ הדגם אין גאומטריה.")
    return scene


def _normalize_materials(scene: trimesh.Scene) -> None:
    """OBJ/STL/PLY carry no metalness data; glTF's default (fully metallic) renders almost black."""
    for geometry in scene.geometry.values():
        visual = getattr(geometry, "visual", None)
        material = getattr(visual, "material", None)
        if material is None:
            continue
        if isinstance(material, trimesh.visual.material.SimpleMaterial):
            material = material.to_pbr()
            visual.material = material
        if isinstance(material, trimesh.visual.material.PBRMaterial):
            material.metallicFactor = 0.0
            if material.roughnessFactor is None:
                material.roughnessFactor = 0.85


def _convert_with_trimesh(source: Path, output: Path) -> ModelStats:
    scene = _load_scene(source)
    _apply_up_axis(scene, declared_up_axis(source))
    _normalize_materials(scene)
    output.write_bytes(scene.export(file_type="glb"))
    return _stats_from_scene(scene)


def _convert_with_blender(source: Path, output: Path) -> ModelStats:
    if not blender_available():
        raise ConversionError(
            f"כדי לקרוא קובצי '.{extension_of(source.name)}' צריך Blender בשרת. "
            "אפשר גם לייצא את הדגם ל-OBJ או ל-GLB."
        )
    result = subprocess.run(
        [
            "blender",
            "--background",
            "--python",
            str(_BLENDER_SCRIPT),
            "--",
            str(source),
            str(output),
        ],
        capture_output=True,
        text=True,
        timeout=60 * 30,
        check=False,
    )
    if result.returncode != 0 or not output.exists():
        tail = (result.stderr or result.stdout).strip().splitlines()[-5:]
        raise ConversionError("ההמרה ב-Blender נכשלה: " + " | ".join(tail))
    return _stats_from_scene(_load_scene(output))


def _copy_glb(source: Path, output: Path) -> ModelStats:
    shutil.copyfile(source, output)
    return _stats_from_scene(_load_scene(output))


Strategy = Callable[[Path, Path], ModelStats]


def _strategies_for(ext: str) -> list[Strategy]:
    """Converters to try, best first. COLLADA gets a second chance because exporters differ:
    trimesh is always here, Blender reads the awkward files but is only there if installed."""
    if ext in PASSTHROUGH_FORMATS:
        return [_copy_glb]
    if ext == "dae" and blender_available():
        return [_convert_with_trimesh, _convert_with_blender]
    if ext in TRIMESH_FORMATS:
        return [_convert_with_trimesh]
    if ext in BLENDER_FORMATS:
        return [_convert_with_blender]
    return []


def convert_to_glb(source: Path, output: Path) -> ModelStats:
    """Convert `source` into `output` (a .glb). Returns geometry statistics."""
    ext = extension_of(source.name)
    guidance = NEEDS_EXPORT.get(ext)
    if guidance:
        raise ConversionError(guidance)
    if ext in ARCHIVE_FORMATS:
        source = _find_main_file(_extract_archive(source))
        ext = extension_of(source.name)

    strategies = _strategies_for(ext)
    if not strategies:
        raise ConversionError(f"פורמט דגם לא נתמך: '.{ext}'.")

    output.parent.mkdir(parents=True, exist_ok=True)
    # Strategies write beside the live model and it is swapped in only on success, so a failed
    # retry leaves the working model alone and no strategy can mistake an old file for its own.
    partial = output.with_name(f"{output.stem}.partial{output.suffix}")
    try:
        for index, strategy in enumerate(strategies):
            partial.unlink(missing_ok=True)
            try:
                stats = strategy(source, partial)
            except ConversionError:
                if index == len(strategies) - 1:
                    raise
            except Exception as exc:  # trimesh raises many exception types
                if index == len(strategies) - 1:
                    raise ConversionError(f"לא הצלחנו לקרוא את הדגם: {exc}") from exc
            else:
                os.replace(partial, output)
                return stats
    finally:
        partial.unlink(missing_ok=True)
    raise AssertionError("unreachable")  # pragma: no cover
