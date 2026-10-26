"""The delivery mission and the drone models it flies.

A mission rides inside the project's settings, so the quiet failure would be a saved mission that
reads back changed, or one written before a field existed that no longer reads at all.
"""

import trimesh

from tests.test_transfer import make_project

DROP = {"x": 12.0, "y": 0.5, "z": -4.0}


def drone_model() -> bytes:
    return trimesh.creation.box(extents=(3.0, 0.4, 1.2)).export(file_type="glb")


async def save_mission(client, project: str, **mission) -> dict:
    settings = (await client.get(f"/projects/{project}")).json()["settings"]
    response = await client.patch(
        f"/projects/{project}", json={"settings": {**settings, "mission": mission}}
    )
    return response


async def test_a_new_project_has_no_mission_and_no_drone_models(client):
    project = (await client.get(f"/projects/{await make_project(client, 'plain')}")).json()

    assert project["settings"]["mission"] is None
    assert project["vehicles"] == {"carrier": None, "droid": None, "parcel": None}


async def test_a_mission_reads_back_as_it_was_saved(client):
    project = await make_project(client, "delivery")
    stages = {"lower": {"title": "Down it goes", "caption": "Gently.", "shot": "ground"}}
    noise = [{"label": "45 dB", "points": [DROP, {**DROP, "x": 40.0}, {**DROP, "z": 30.0}]}]

    response = await save_mission(
        client, project, drop=DROP, tetherLength=95, waypoints=[DROP], stages=stages, noise=noise
    )

    assert response.status_code == 200
    mission = (await client.get(f"/projects/{project}")).json()["settings"]["mission"]
    assert mission["drop"] == DROP
    assert mission["tetherLength"] == 95
    assert mission["waypoints"] == [DROP]
    assert mission["stages"] == stages
    assert mission["noise"] == noise
    # Whatever the editor did not send comes back as the default the interface starts from.
    assert mission["cruiseAltitude"] == 90
    assert mission["carrier"]["size"] == 3.6


async def test_a_mission_out_of_bounds_is_refused(client):
    project = await make_project(client, "impossible")

    responses = [
        await save_mission(client, project, tetherLength=-5),
        await save_mission(client, project, cruiseSpeed=0),
        await save_mission(client, project, stages={"teleport": {"title": "?"}}),
        await save_mission(client, project, carrier={"size": 3, "color": "blue"}),
        await save_mission(client, project, noise=[{"points": []}] * 9),
    ]

    assert [r.status_code for r in responses] == [422] * len(responses)
    assert (await client.get(f"/projects/{project}")).json()["settings"]["mission"] is None


async def test_an_uploaded_drone_model_is_served_until_it_is_removed(client):
    project = await make_project(client, "fleet")

    uploaded = await client.put(
        f"/projects/{project}/vehicles/carrier",
        files={"file": ("carrier.glb", drone_model(), "model/gltf-binary")},
    )

    assert uploaded.status_code == 200
    version = uploaded.json()["vehicles"]["carrier"]
    assert version
    served = await client.get(f"/projects/{project}/vehicles/carrier?v={version}")
    assert served.status_code == 200
    assert served.content[:4] == b"glTF"

    removed = await client.delete(f"/projects/{project}/vehicles/carrier")
    assert removed.json()["vehicles"]["carrier"] is None
    assert (await client.get(f"/projects/{project}/vehicles/carrier")).status_code == 404


async def test_a_drone_model_in_another_format_is_converted(client):
    project = await make_project(client, "converted")
    obj = b"v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"

    uploaded = await client.put(
        f"/projects/{project}/vehicles/droid", files={"file": ("droid.obj", obj, "text/plain")}
    )

    assert uploaded.status_code == 200
    served = await client.get(f"/projects/{project}/vehicles/droid")
    assert served.content[:4] == b"glTF"


async def test_an_unreadable_drone_model_keeps_the_previous_one(client):
    project = await make_project(client, "kept")
    first = await client.put(
        f"/projects/{project}/vehicles/parcel",
        files={"file": ("parcel.glb", drone_model(), "model/gltf-binary")},
    )

    refused = [
        await client.put(
            f"/projects/{project}/vehicles/parcel",
            files={"file": ("parcel.glb", b"not a model", "model/gltf-binary")},
        ),
        await client.put(
            f"/projects/{project}/vehicles/parcel",
            files={"file": ("parcel.txt", b"hello", "text/plain")},
        ),
        await client.put(
            f"/projects/{project}/vehicles/rocket",
            files={"file": ("rocket.glb", drone_model(), "model/gltf-binary")},
        ),
    ]

    assert [r.status_code for r in refused] == [422, 415, 422]
    after = (await client.get(f"/projects/{project}")).json()["vehicles"]["parcel"]
    assert after == first.json()["vehicles"]["parcel"]


async def test_guests_watch_the_mission_but_cannot_change_the_fleet(client, guest_client):
    project = await make_project(client, "watched")
    await client.put(
        f"/projects/{project}/vehicles/carrier",
        files={"file": ("carrier.glb", drone_model(), "model/gltf-binary")},
    )

    assert (await guest_client.get(f"/projects/{project}/vehicles/carrier")).status_code == 200
    refused = [
        await guest_client.put(
            f"/projects/{project}/vehicles/droid",
            files={"file": ("droid.glb", drone_model(), "model/gltf-binary")},
        ),
        await guest_client.delete(f"/projects/{project}/vehicles/carrier"),
    ]
    assert [r.status_code for r in refused] == [403, 403]
