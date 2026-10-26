"""The delivery mission and the models it draws.

A mission rides inside the project's settings, so the quiet failure would be a saved mission that
reads back changed, or one written before a field existed that no longer reads at all.
"""

import os
import time
from uuid import UUID

import trimesh

from app.services import mission_models
from tests.test_transfer import make_project

DROP = {"x": 12.0, "y": 0.5, "z": -4.0}


def box_model() -> bytes:
    return trimesh.creation.box(extents=(3.0, 0.4, 1.2)).export(file_type="glb")


def rover(**fields) -> dict:
    return {
        "id": "rover",
        "kind": "rover",
        "size": 0.9,
        "keys": [
            {"at": 4, "place": DROP, "hold": 2},
            {"at": 9, "place": {**DROP, "x": 20.0}},
        ],
        **fields,
    }


async def save_mission(client, project: str, **mission):
    settings = (await client.get(f"/projects/{project}")).json()["settings"]
    return await client.patch(
        f"/projects/{project}", json={"settings": {**settings, "mission": mission}}
    )


async def upload(client, project: str, content: bytes = b"", name: str = "model.glb"):
    return await client.post(
        f"/projects/{project}/mission-models",
        files={"file": (name, content or box_model(), "model/gltf-binary")},
    )


async def test_a_new_project_has_no_mission(client):
    project = (await client.get(f"/projects/{await make_project(client, 'plain')}")).json()

    assert project["settings"]["mission"] is None


async def test_a_mission_reads_back_as_it_was_saved(client):
    project = await make_project(client, "delivery")
    stages = {"onsite": {"title": "On the ground", "caption": "Off it goes.", "shot": "close"}}
    noise = [{"label": "45 dB", "points": [DROP, {**DROP, "x": 40.0}, {**DROP, "z": 30.0}]}]
    actors = [rover(), {"id": "box", "rides": "rover", "mount": "above", "leaves": 6}]

    response = await save_mission(
        client,
        project,
        drop=DROP,
        tetherLength=95,
        waypoints=[DROP],
        stages=stages,
        noise=noise,
        actors=actors,
    )

    assert response.status_code == 200
    mission = (await client.get(f"/projects/{project}")).json()["settings"]["mission"]
    assert mission["drop"] == DROP
    assert mission["tetherLength"] == 95
    assert mission["stages"] == stages
    assert mission["noise"] == noise
    assert [actor["id"] for actor in mission["actors"]] == ["rover", "box"]
    assert mission["actors"][0]["keys"][0] == {"at": 4, "place": DROP, "lift": 0, "hold": 2}
    assert mission["actors"][1]["rides"] == "rover"
    # Whatever the editor did not send comes back as the default the interface starts from.
    assert mission["cruiseAltitude"] == 90
    assert mission["carrier"]["size"] == 3.6
    assert mission["actors"][1]["kind"] == "parcel"


async def test_a_mission_starts_with_a_parcel_on_the_rope(client):
    project = await make_project(client, "default")

    await save_mission(client, project, drop=DROP)

    mission = (await client.get(f"/projects/{project}")).json()["settings"]["mission"]
    assert [(actor["id"], actor["rides"]) for actor in mission["actors"]] == [("load", "hook")]


async def test_a_mission_out_of_bounds_is_refused(client):
    project = await make_project(client, "impossible")
    late = {"at": 1, "place": DROP}

    responses = [
        await save_mission(client, project, tetherLength=-5),
        await save_mission(client, project, cruiseSpeed=0),
        await save_mission(client, project, stages={"teleport": {"title": "?"}}),
        await save_mission(client, project, carrier={"size": 3, "color": "blue"}),
        await save_mission(client, project, noise=[{"points": []}] * 9),
        # Keyframes out of order, or one arriving while the last is still waiting.
        await save_mission(client, project, actors=[rover(keys=[*rover()["keys"], late])]),
        await save_mission(client, project, actors=[rover(), rover()]),
        await save_mission(client, project, actors=[rover(), rover(id="other")]),
        await save_mission(client, project, actors=[rover(rides="ghost")]),
        await save_mission(
            client, project, actors=[rover(rides="b"), {"id": "b", "rides": "rover"}]
        ),
        await save_mission(client, project, carrier={"size": 3, "model": "../model"}),
    ]

    assert [r.status_code for r in responses] == [422] * len(responses)
    assert (await client.get(f"/projects/{project}")).json()["settings"]["mission"] is None


async def test_an_uploaded_model_is_served_under_its_own_id(client):
    project = await make_project(client, "models")

    first = await upload(client, project)
    second = await upload(client, project, b"v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n", "rover.obj")

    assert first.status_code == second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    for response in (first, second):
        served = await client.get(f"/projects/{project}/mission-models/{response.json()['id']}")
        assert served.status_code == 200
        assert served.content[:4] == b"glTF"
        assert "immutable" in served.headers["cache-control"]


async def test_an_unreadable_model_is_refused(client):
    project = await make_project(client, "refused")

    refused = [
        await upload(client, project, b"not a model"),
        await upload(client, project, b"hello", "notes.txt"),
    ]

    assert [r.status_code for r in refused] == [422, 415]
    assert (await client.get(f"/projects/{project}/mission-models/{'0' * 32}")).status_code == 404
    assert (await client.get(f"/projects/{project}/mission-models/..%2Fmodel")).status_code in (
        404,
        422,
    )


async def test_models_the_mission_no_longer_draws_are_swept_up(client):
    project = await make_project(client, "sweep")
    kept = (await upload(client, project)).json()["id"]
    dropped = (await upload(client, project)).json()["id"]
    fresh = (await upload(client, project)).json()["id"]
    # Two of them are old enough to be sure about; the third may just not be saved yet.
    folder = mission_models.models_dir(UUID(project))
    old = time.time() - mission_models.GRACE_SECONDS - 60
    for model in (kept, dropped):
        os.utime(folder / f"{model}.glb", (old, old))

    await save_mission(client, project, drop=DROP, actors=[rover(model=kept)])

    served = [
        (await client.get(f"/projects/{project}/mission-models/{model}")).status_code
        for model in (kept, dropped, fresh)
    ]
    assert served == [200, 404, 200]


async def test_guests_watch_the_mission_but_cannot_upload(client, guest_client):
    project = await make_project(client, "watched")
    model = (await upload(client, project)).json()["id"]

    assert (
        await guest_client.get(f"/projects/{project}/mission-models/{model}")
    ).status_code == 200
    assert (await upload(guest_client, project)).status_code == 403
