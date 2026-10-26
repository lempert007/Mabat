"""Carrying a set of points from one model to another.

This is the flow with the most moving parts: categories matched by name, attachments copied
into the target project with their references rewritten, and two different import modes.
"""

import io

from PIL import Image


async def make_project(client, name: str) -> str:
    """A project with a trivial model, ready for points."""
    model = io.BytesIO()
    # A single triangle is enough: these tests are about points, not geometry.
    model.write(b"")
    response = await client.post(
        "/projects",
        data={"name": name, "description": ""},
        files={"file": ("model.obj", b"v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n", "text/plain")},
    )
    response.raise_for_status()
    return response.json()["id"]


async def add_image(client, project_id: str) -> str:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (120, 80, 40)).save(buffer, "PNG")
    response = await client.post(
        f"/projects/{project_id}/attachments",
        files={"file": ("photo.png", buffer.getvalue(), "image/png")},
    )
    response.raise_for_status()
    return response.json()["id"]


async def add_point(client, project_id: str, title: str, blocks=None, category=None) -> dict:
    body = {
        "title": title,
        "position": {"x": 1.0, "y": 2.0, "z": 3.0},
        "normal": {"x": 0.0, "y": 1.0, "z": 0.0},
        "blocks": blocks or [],
    }
    if category:
        body["categoryId"] = category
    response = await client.post(f"/projects/{project_id}/pois", json=body)
    response.raise_for_status()
    return response.json()


async def test_export_carries_points_and_their_category_names(client):
    project = await make_project(client, "source")
    categories = (await client.get(f"/projects/{project}/categories")).json()
    await add_point(client, project, "Gatehouse", category=categories[0]["id"])

    document = (await client.get(f"/projects/{project}/points/export")).json()

    assert document["format"] == "mabat.points"
    assert [point["title"] for point in document["points"]] == ["Gatehouse"]
    assert document["points"][0]["categoryName"] == categories[0]["name"]


async def test_import_recreates_points_and_missing_categories(client):
    source = await make_project(client, "from")
    categories = (await client.get(f"/projects/{source}/categories")).json()
    await client.patch(f"/categories/{categories[0]['id']}", json={"name": "Bastion"})
    await add_point(client, source, "Keep", category=categories[0]["id"])
    document = (await client.get(f"/projects/{source}/points/export")).json()

    target = await make_project(client, "to")
    result = (
        await client.post(
            f"/projects/{target}/points/import", json={"document": document, "mode": "append"}
        )
    ).json()

    assert result["pointsCreated"] == 1
    assert result["categoriesCreated"] == 1
    names = [c["name"] for c in (await client.get(f"/projects/{target}/categories")).json()]
    assert "Bastion" in names


async def test_import_copies_attachments_and_rewrites_their_references(client):
    source = await make_project(client, "with-photo")
    attachment = await add_image(client, source)
    await add_point(
        client,
        source,
        "Tower",
        blocks=[
            {"id": "b1", "type": "images", "items": [{"attachmentId": attachment, "caption": ""}]}
        ],
    )
    document = (await client.get(f"/projects/{source}/points/export")).json()

    target = await make_project(client, "copy")
    result = (
        await client.post(
            f"/projects/{target}/points/import", json={"document": document, "mode": "append"}
        )
    ).json()
    assert result["attachmentsCopied"] == 1

    points = (await client.get(f"/projects/{target}/pois")).json()
    copied = points[0]["blocks"][0]["items"][0]["attachmentId"]
    assert copied != attachment, "the copy must have its own identity"
    assert (await client.get(f"/attachments/{copied}/file")).status_code == 200


async def test_import_drops_references_whose_file_is_gone(client):
    target = await make_project(client, "broken-refs")
    document = {
        "format": "mabat.points",
        "version": 1,
        "exportedAt": "2026-01-01T00:00:00Z",
        "sourceProjectId": None,
        "sourceProjectName": "elsewhere",
        "categories": [],
        "points": [
            {
                "identifier": "P-01",
                "title": "Missing photo",
                "summary": "",
                "categoryName": None,
                "position": {"x": 0, "y": 0, "z": 0},
                "normal": {"x": 0, "y": 1, "z": 0},
                "camera": None,
                "blocks": [
                    {
                        "id": "b1",
                        "type": "images",
                        "items": [
                            {"attachmentId": "3f1d6e7a-0000-4000-8000-000000000000", "caption": ""}
                        ],
                    }
                ],
            }
        ],
    }

    result = (
        await client.post(
            f"/projects/{target}/points/import", json={"document": document, "mode": "append"}
        )
    ).json()

    assert result["attachmentsMissing"] == 1
    points = (await client.get(f"/projects/{target}/pois")).json()
    assert points[0]["blocks"][0]["items"] == [], (
        "a dead reference must not render as a broken image"
    )


async def test_append_gives_a_clashing_identifier_a_free_one(client):
    project = await make_project(client, "clash")
    existing = await add_point(client, project, "First")
    document = (await client.get(f"/projects/{project}/points/export")).json()

    await client.post(
        f"/projects/{project}/points/import", json={"document": document, "mode": "append"}
    )

    identifiers = [p["identifier"] for p in (await client.get(f"/projects/{project}/pois")).json()]
    assert existing["identifier"] in identifiers
    assert len(identifiers) == len(set(identifiers)) == 2


async def test_replace_swaps_the_points_rather_than_adding_to_them(client):
    project = await make_project(client, "replace")
    await add_point(client, project, "Old one")
    document = {
        "format": "mabat.points",
        "version": 1,
        "exportedAt": "2026-01-01T00:00:00Z",
        "sourceProjectId": None,
        "sourceProjectName": "elsewhere",
        "categories": [],
        "points": [
            {
                "identifier": "P-01",
                "title": "New one",
                "summary": "",
                "categoryName": None,
                "position": {"x": 0, "y": 0, "z": 0},
                "normal": {"x": 0, "y": 1, "z": 0},
                "camera": None,
                "blocks": [],
            }
        ],
    }

    await client.post(
        f"/projects/{project}/points/import", json={"document": document, "mode": "replace"}
    )

    titles = [p["title"] for p in (await client.get(f"/projects/{project}/pois")).json()]
    assert titles == ["New one"]


async def test_replace_clears_attachments_nothing_refers_to(client, storage_root):
    project = await make_project(client, "orphans")
    attachment = await add_image(client, project)
    await add_point(
        client,
        project,
        "Has photo",
        blocks=[
            {"id": "b1", "type": "images", "items": [{"attachmentId": attachment, "caption": ""}]}
        ],
    )
    folder = storage_root / "projects" / project / "attachments"
    assert len(list(folder.iterdir())) > 0

    empty = {
        "format": "mabat.points",
        "version": 1,
        "exportedAt": "2026-01-01T00:00:00Z",
        "sourceProjectId": None,
        "sourceProjectName": "elsewhere",
        "categories": [],
        "points": [],
    }
    await client.post(
        f"/projects/{project}/points/import", json={"document": empty, "mode": "replace"}
    )

    assert list(folder.iterdir()) == [], "repeated imports would otherwise pile up files"
