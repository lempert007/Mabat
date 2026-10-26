"""Reading the files people actually have.

The SketchUp cases matter most: `.skp` is the format our editors save in, and nothing on a
Linux server can open one, so the only useful thing to do is say which export produces a file
we can read. The COLLADA cases cover the detour they take instead.
"""

import zipfile
from pathlib import Path

import pytest

from app.services.conversion import (
    NEEDS_EXPORT,
    SUPPORTED_UPLOAD_FORMATS,
    ConversionError,
    convert_to_glb,
    declared_up_axis,
)

# A COLLADA file with one triangle that is ten units tall on whichever axis it calls up.
COLLADA = """<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>{asset}</asset>
  <library_geometries>
    <geometry id="g1" name="g1"><mesh>
      <source id="p"><float_array id="pa" count="9">0 0 0 1 0 0 {apex}</float_array>
        <technique_common><accessor source="#pa" count="3" stride="3">
          <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
        </accessor></technique_common></source>
      <vertices id="v"><input semantic="POSITION" source="#p"/></vertices>
      <triangles count="1"><input semantic="VERTEX" source="#v" offset="0"/><p>0 1 2</p></triangles>
    </mesh></geometry>
  </library_geometries>
  <library_visual_scenes><visual_scene id="s"><node id="n">
    <instance_geometry url="#g1"/>
  </node></visual_scene></library_visual_scenes>
  <scene><instance_visual_scene url="#s"/></scene>
</COLLADA>
"""


def write_collada(folder: Path, *, up_axis: str | None, name: str = "model.dae") -> Path:
    apex = {"Z_UP": "0 1 10", "X_UP": "10 1 0"}.get(up_axis or "Y_UP", "0 10 1")
    asset = f"<up_axis>{up_axis}</up_axis>" if up_axis else ""
    path = folder / name
    path.write_text(COLLADA.format(asset=asset, apex=apex))
    return path


def tallest_axis(stats) -> int:
    extents = stats.as_dict()["extents"]
    return extents.index(max(extents))


def test_skp_is_turned_away_with_export_instructions(tmp_path):
    source = tmp_path / "castle.skp"
    source.write_bytes(b"\xff\xfe\x00SketchUp")
    with pytest.raises(ConversionError) as error:
        convert_to_glb(source, tmp_path / "out.glb")
    assert str(error.value) == NEEDS_EXPORT["skp"]
    assert "Export" in str(error.value)


def test_skp_is_not_offered_as_a_supported_format():
    assert "skp" not in SUPPORTED_UPLOAD_FORMATS


def test_a_zipped_skp_gets_the_same_instructions(tmp_path):
    archive = tmp_path / "castle.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("castle.skp", b"\xff\xfe\x00SketchUp")
    with pytest.raises(ConversionError) as error:
        convert_to_glb(archive, tmp_path / "out.glb")
    assert str(error.value) == NEEDS_EXPORT["skp"]


def test_kmz_is_read_as_the_zipped_collada_it_is(tmp_path):
    """SketchUp's KMZ export is a zip holding a .dae plus its textures."""
    source = write_collada(tmp_path, up_axis="Z_UP")
    archive = tmp_path / "castle.kmz"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.write(source, "models/castle.dae")
        zf.writestr("doc.kml", "<kml/>")

    output = tmp_path / "out.glb"
    stats = convert_to_glb(archive, output)
    assert output.exists() and output.stat().st_size > 0
    assert stats.triangles == 1


def test_a_z_up_collada_is_stood_upright(tmp_path):
    """SketchUp models in Z-up and says so in the file; glTF and the viewer are Y-up."""
    source = write_collada(tmp_path, up_axis="Z_UP")
    assert declared_up_axis(source) == "Z_UP"
    stats = convert_to_glb(source, tmp_path / "out.glb")
    assert tallest_axis(stats) == 1


def test_a_y_up_collada_is_left_alone(tmp_path):
    source = write_collada(tmp_path, up_axis="Y_UP")
    stats = convert_to_glb(source, tmp_path / "out.glb")
    assert tallest_axis(stats) == 1


def test_a_collada_that_declares_nothing_is_left_alone(tmp_path):
    source = write_collada(tmp_path, up_axis=None)
    assert declared_up_axis(source) is None
    stats = convert_to_glb(source, tmp_path / "out.glb")
    assert tallest_axis(stats) == 1


def test_only_collada_declares_an_up_axis(tmp_path):
    obj = tmp_path / "model.obj"
    obj.write_text("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n")
    assert declared_up_axis(obj) is None
