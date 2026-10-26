"""Blender headless script: import any supported file and export a GLB.

Usage: blender --background --python blender_to_glb.py -- <input> <output.glb>
"""

import sys
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
source, output = Path(argv[0]), Path(argv[1])

bpy.ops.wm.read_factory_settings(use_empty=True)

ext = source.suffix.lower()
importers = {
    ".fbx": lambda: bpy.ops.import_scene.fbx(filepath=str(source)),
    ".dae": lambda: bpy.ops.wm.collada_import(filepath=str(source)),
    ".3ds": lambda: bpy.ops.import_scene.max3ds(filepath=str(source)),
    ".x3d": lambda: bpy.ops.import_scene.x3d(filepath=str(source)),
    ".abc": lambda: bpy.ops.wm.alembic_import(filepath=str(source)),
}
for usd_ext in (".usd", ".usda", ".usdc", ".usdz"):
    importers[usd_ext] = lambda: bpy.ops.wm.usd_import(filepath=str(source))

if ext not in importers:
    raise SystemExit(f"No Blender importer for {ext}")

importers[ext]()
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", export_apply=True)
