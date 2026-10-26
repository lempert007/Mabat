"""Operational commands. Run with: uv run python -m app.cli --help"""

import asyncio
import json
from pathlib import Path

import typer

from app.db.session import SessionLocal
from app.services import users as user_service

cli = typer.Typer(help="Mabat maintenance commands", no_args_is_help=True)


@cli.command("create-editor")
def create_editor(
    username: str = typer.Argument(..., help="Login name"),
    display_name: str = typer.Option(None, help="Shown in the UI; defaults to the username"),
    password: str = typer.Option(..., prompt=True, hide_input=True, confirmation_prompt=True),
) -> None:
    """Create an editor account."""

    async def run() -> None:
        async with SessionLocal() as db:
            if await user_service.get_by_username(db, username.lower()):
                typer.echo(f"User '{username}' already exists.")
                raise typer.Exit(code=1)
            user = await user_service.create_user(db, username, display_name or username, password)
            typer.echo(f"Created editor '{user.username}' ({user.id}).")

    asyncio.run(run())


@cli.command("list-editors")
def list_editors() -> None:
    """List editor accounts."""

    async def run() -> None:
        async with SessionLocal() as db:
            for user in await user_service.list_users(db):
                typer.echo(f"{user.username:20} {user.display_name:30} {user.created_at:%Y-%m-%d}")

    asyncio.run(run())


# The interface's API types are generated from this file, so it is committed and kept current.
OPENAPI_PATH = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"


def openapi_document() -> str:
    from app.main import app

    return json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"


@cli.command("openapi")
def export_openapi() -> None:
    """Write the API schema the interface's types are generated from."""
    OPENAPI_PATH.write_text(openapi_document(), encoding="utf-8")
    typer.echo(f"Wrote {OPENAPI_PATH}. Now run: cd frontend && npm run api:types")


if __name__ == "__main__":
    cli()
