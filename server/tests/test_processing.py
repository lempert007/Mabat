"""Model processing when things go wrong: retries, restarts and failed conversions."""

from uuid import UUID

import pytest

from app.services.conversion import ConversionError, convert_to_glb
from tests.test_transfer import make_project

TRIANGLE = b"v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"


async def _set_status(project_id: str, status) -> None:
    from app.db.session import SessionLocal
    from app.models import Project

    async with SessionLocal() as db:
        project = await db.get(Project, UUID(project_id))
        project.status = status
        await db.commit()


async def test_a_running_conversion_cannot_be_started_twice(client):
    from app.models.project import ProjectStatus

    project = await make_project(client, "busy")
    await _set_status(project, ProjectStatus.PROCESSING)

    response = await client.post(f"/projects/{project}/reprocess")

    assert response.status_code == 409


async def test_a_retry_reports_itself_as_queued(client):
    from app.models.project import ProjectStatus

    project = await make_project(client, "retry")
    await _set_status(project, ProjectStatus.FAILED)

    response = await client.post(f"/projects/{project}/reprocess")

    assert response.status_code == 200
    assert response.json()["status"] == "uploaded"


async def test_a_restart_fails_conversions_it_interrupted(client):
    from app.db.session import SessionLocal
    from app.models.project import ProjectStatus
    from app.services import projects as project_service

    project = await make_project(client, "interrupted")
    await _set_status(project, ProjectStatus.PROCESSING)

    async with SessionLocal() as db:
        await project_service.fail_interrupted_processing(db)

    body = (await client.get(f"/projects/{project}")).json()
    assert body["status"] == "failed"
    assert body["errorMessage"] == project_service.INTERRUPTED_MESSAGE


def test_a_failed_conversion_leaves_the_existing_model_alone(tmp_path):
    output = tmp_path / "model.glb"
    good = tmp_path / "good.obj"
    good.write_bytes(TRIANGLE)
    convert_to_glb(good, output)
    working_model = output.read_bytes()

    broken = tmp_path / "broken.obj"
    broken.write_bytes(b"this is not a model")
    with pytest.raises(ConversionError):
        convert_to_glb(broken, output)

    assert output.read_bytes() == working_model
    assert not (tmp_path / "model.partial.glb").exists()
