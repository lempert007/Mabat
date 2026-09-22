"""Who is allowed to change what.

Guests are the board members the app is built for: they see everything and change nothing.
"""

from tests.test_transfer import add_point, make_project


async def test_guest_can_read_a_project_and_its_points(client, guest_client):
    project = await make_project(client, "readable")
    await add_point(client, project, "Gatehouse")

    assert (await guest_client.get("/projects")).status_code == 200
    assert (await guest_client.get(f"/projects/{project}")).status_code == 200
    points = await guest_client.get(f"/projects/{project}/pois")
    assert points.status_code == 200
    assert [p["title"] for p in points.json()] == ["Gatehouse"]


async def test_guest_cannot_change_anything(client, guest_client):
    project = await make_project(client, "protected")
    point = await add_point(client, project, "Keep")

    refused = [
        await guest_client.post(
            f"/projects/{project}/pois",
            json={"title": "nope", "position": {"x": 0, "y": 0, "z": 0}},
        ),
        await guest_client.patch(f"/pois/{point['id']}", json={"title": "nope"}),
        await guest_client.delete(f"/pois/{point['id']}"),
        await guest_client.patch(f"/projects/{project}", json={"name": "nope"}),
        await guest_client.delete(f"/projects/{project}"),
        await guest_client.post(
            f"/projects/{project}/categories", json={"name": "n", "color": "#ffffff"}
        ),
        await guest_client.get("/users"),
    ]

    assert [r.status_code for r in refused] == [403] * len(refused)
    assert (await client.get(f"/pois/{point['id']}")).json()["title"] == "Keep"


async def test_a_visitor_without_a_session_is_turned_away(anonymous_client):
    assert (await anonymous_client.get("/projects")).status_code == 401
    assert (await anonymous_client.get("/auth/me")).status_code == 401


async def test_guests_may_start_their_own_session(anonymous_client):
    assert (await anonymous_client.post("/auth/guest")).status_code == 200
    session = await anonymous_client.get("/auth/me")
    assert session.json()["role"] == "guest"


async def test_wrong_password_is_refused(anonymous_client):
    response = await anonymous_client.post(
        "/auth/login", json={"username": "editor", "password": "not-it"}
    )
    assert response.status_code == 401
