"""The interface's API types are generated from `frontend/openapi.json`.

If the committed file falls behind the app, the interface compiles against a schema the server
no longer has, and the mistake only shows up at run time.
"""

from app.cli import OPENAPI_PATH, openapi_document


def test_the_committed_schema_matches_the_app():
    assert OPENAPI_PATH.read_text(encoding="utf-8") == openapi_document(), (
        "frontend/openapi.json is out of date. Run `uv run python -m app.cli openapi`, "
        "then `npm run api:types` in frontend."
    )
