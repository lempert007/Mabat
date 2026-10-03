"""Requests that are well formed but wrong: they must be refused cleanly, never half applied.

Each of these used to end in a 500 or in data pointing somewhere it should not.
"""

import io

from PIL import Image

from tests.test_transfer import add_point, make_project


async def _first_category(client, project_id: str) -> str:
    return (await client.get(f"/projects/{project_id}/categories")).json()[0]["id"]


async def test_a_point_cannot_borrow_another_projects_category(client):
    home = await make_project(client, "home")
    elsewhere = await make_project(client, "elsewhere")
    foreign = await _first_category(client, elsewhere)

    created = await client.post(
        f"/projects/{home}/pois",
        json={"position": {"x": 0, "y": 0, "z": 0}, "categoryId": foreign},
    )
    assert created.status_code == 422

    point = await add_point(client, home, "Keep")
    updated = await client.patch(f"/pois/{point['id']}", json={"categoryId": foreign})
    assert updated.status_code == 422
    assert (await client.get(f"/pois/{point['id']}")).json()["categoryId"] is None


async def test_an_attachment_cannot_name_another_projects_point(client):
    home = await make_project(client, "files home")
    elsewhere = await make_project(client, "files elsewhere")
    foreign_point = await add_point(client, elsewhere, "Gate")

    response = await client.post(
        f"/projects/{home}/attachments",
        data={"poi_id": foreign_point["id"]},
        files={"file": ("doc.pdf", b"%PDF-1.4\n", "application/pdf")},
    )

    assert response.status_code == 422
    assert (await client.get(f"/projects/{home}/attachments")).json() == []


async def test_a_corrupt_image_is_refused_and_leaves_no_files(client, storage_root):
    project = await make_project(client, "corrupt image")

    response = await client.post(
        f"/projects/{project}/attachments",
        files={"file": ("photo.png", b"not really a png", "image/png")},
    )

    assert response.status_code == 415
    assert list((storage_root / "projects" / project / "attachments").iterdir()) == []


async def test_a_corrupt_cover_is_refused(client):
    project = await make_project(client, "corrupt cover")

    response = await client.put(
        f"/projects/{project}/thumbnail",
        files={"file": ("cover.jpg", b"garbage", "image/jpeg")},
    )

    assert response.status_code == 415
    assert (await client.get(f"/projects/{project}")).json()["hasThumbnail"] is False


async def test_a_real_cover_is_stored(client):
    project = await make_project(client, "real cover")
    buffer = io.BytesIO()
    Image.new("RGB", (32, 20), (10, 20, 30)).save(buffer, "JPEG")

    response = await client.put(
        f"/projects/{project}/thumbnail",
        files={"file": ("cover.jpg", buffer.getvalue(), "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["hasThumbnail"] is True


async def test_a_title_of_only_spaces_is_refused(client):
    project = await make_project(client, "titles")

    response = await client.post(
        f"/projects/{project}/pois", json={"title": "   ", "position": {"x": 0, "y": 0, "z": 0}}
    )

    assert response.status_code == 422


async def test_an_edited_points_file_is_held_to_the_api_limits(client):
    project = await make_project(client, "hand edited")
    document = {
        "format": "mabat.points",
        "version": 1,
        "exportedAt": "2026-01-01T00:00:00Z",
        "categories": [{"name": "Walls", "color": "red"}],
        "points": [
            {
                "identifier": "P-01",
                "title": "x" * 500,
                "position": {"x": 0, "y": 0, "z": 0},
                "normal": {"x": 0, "y": 1, "z": 0},
            }
        ],
    }

    response = await client.post(
        f"/projects/{project}/points/import", json={"document": document, "mode": "append"}
    )

    assert response.status_code == 422
    assert (await client.get(f"/projects/{project}/pois")).json() == []


async def test_imported_points_come_after_the_existing_ones(client):
    project = await make_project(client, "ordering")
    existing = await add_point(client, project, "First")
    document = (await client.get(f"/projects/{project}/points/export")).json()

    await client.post(
        f"/projects/{project}/points/import", json={"document": document, "mode": "append"}
    )

    points = (await client.get(f"/projects/{project}/pois")).json()
    assert [p["title"] for p in points] == ["First", "First"]
    assert points[0]["id"] == existing["id"]
    assert points[1]["sortOrder"] > points[0]["sortOrder"]
