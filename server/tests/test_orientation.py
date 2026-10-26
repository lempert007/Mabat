"""The quaternion maths behind straightening a model that arrived the wrong way up."""

import math

import pytest

from app.schemas.common import Quaternion
from app.services import orientation

QUARTER_X = Quaternion(x=-math.sin(math.pi / 4), y=0.0, z=0.0, w=math.cos(math.pi / 4))
QUARTER_Y = Quaternion(x=0.0, y=math.sin(math.pi / 4), z=0.0, w=math.cos(math.pi / 4))


def approx(point: dict[str, float]) -> dict[str, float]:
    return {key: pytest.approx(value, abs=1e-9) for key, value in point.items()}


def test_quarter_turn_about_x_stands_a_z_up_model_upright():
    # What a Z-up exporter calls "up" should end up along +Y.
    assert orientation.rotate(QUARTER_X, {"x": 0.0, "y": 0.0, "z": 10.0}) == approx(
        {"x": 0.0, "y": 10.0, "z": 0.0}
    )


def test_rotation_preserves_length():
    point = {"x": 3.0, "y": -4.0, "z": 12.0}
    turned = orientation.rotate(QUARTER_Y, point)
    before = math.dist((0, 0, 0), tuple(point.values()))
    after = math.dist((0, 0, 0), tuple(turned.values()))
    assert after == pytest.approx(before)


def test_four_quarter_turns_return_to_the_start():
    point = {"x": 1.0, "y": 2.0, "z": 3.0}
    turned = point
    for _ in range(4):
        turned = orientation.rotate(QUARTER_X, turned)
    assert turned == approx(point)


def test_inverse_undoes_a_rotation():
    point = {"x": 5.0, "y": 1.0, "z": -2.0}
    there = orientation.rotate(QUARTER_X, point)
    back = orientation.rotate(orientation.inverse(QUARTER_X), there)
    assert back == approx(point)


def test_multiply_composes_in_order():
    combined = orientation.multiply(QUARTER_Y, QUARTER_X)
    point = {"x": 0.0, "y": 0.0, "z": 10.0}
    assert orientation.rotate(combined, point) == approx(
        orientation.rotate(QUARTER_Y, orientation.rotate(QUARTER_X, point))
    )


def test_identity_is_recognised_however_it_is_written():
    assert orientation.is_identity(None)
    assert orientation.is_identity(Quaternion())
    assert orientation.is_identity(Quaternion(w=-1.0))
    assert not orientation.is_identity(QUARTER_X)


def test_same_treats_absent_and_identity_alike():
    assert orientation.same(None, Quaternion())
    assert not orientation.same(None, QUARTER_X)
