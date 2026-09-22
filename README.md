# Mabat

A dark, board-room-ready web app for presenting a 3D model of a structure with rich points of interest.
Editors upload a model, walk through it and pin points with content. Guests explore, open points and
follow share links. Runs entirely offline.

See [DESIGN.md](DESIGN.md) for the architecture and [CLAUDE.md](CLAUDE.md) for conventions.

## Stack

FastAPI (Python 3.12) · PostgreSQL 16 · React 18 + TypeScript · react-three-fiber · Tailwind v4

The interface is in Hebrew, right to left. The Assistant typeface is served from `frontend/public/fonts`,
so no font is ever fetched from the network.

## Local development

Requirements: Python 3.12, `uv`, Node 22+, a PostgreSQL server.

```bash
cp .env.example .env            # edit DATABASE_URL, MABAT_SECRET_KEY, MABAT_STORAGE_ROOT
createuser mabat -P && createdb -O mabat mabat
cd backend && uv sync && cd ../frontend && npm install
```

In VS Code, run **Mabat: full stack** from the Run and Debug panel. It brings the database up,
applies migrations, serves the API with the debugger attached, and starts the interface. The two
halves can also be launched on their own from the same list.

To do it by hand instead:

```bash
./scripts/ensure-db.sh                          # uses a running PostgreSQL, or starts the container
cd backend && uv run alembic upgrade head
uv run uvicorn app.main:app --reload            # http://localhost:8000

cd ../frontend && npm run dev                   # http://localhost:5173 (proxies /api)
```

`scripts/ensure-db.sh` leaves an existing PostgreSQL alone, so a local install is used as-is and
the container is only started when nothing else answers.

The first editor account comes from `MABAT_INITIAL_EDITOR_USERNAME` / `MABAT_INITIAL_EDITOR_PASSWORD`
in `.env` (created when the users table is empty). More editors: the **Editors** button in the gallery,
or `uv run python -m app.cli create-editor <name>`.

## Deploying on the offline Ubuntu host

Docker Compose runs Postgres, the API and nginx (static frontend + `/api` proxy).

```bash
cp .env.example .env    # set MABAT_SECRET_KEY, POSTGRES_PASSWORD, MABAT_STORAGE_ROOT, initial editor
docker compose build    # needs internet once, or build elsewhere and `docker save` / `docker load`
docker compose up -d    # http://<host>/
```

`MABAT_STORAGE_ROOT` on the host is bind-mounted into the backend. Models, covers and attachments live
under `<storage>/projects/<project-id>/`. Back that folder up together with the database.

Optional: install Blender on the host image to accept FBX, 3DS, X3D and USD uploads. Without it,
GLB, glTF, COLLADA, OBJ (zip with MTL and textures), KMZ, STL, PLY, OFF and 3MF are supported.

## Tests

```bash
cd backend && uv run pytest
```

They use a throwaway database and skip if no PostgreSQL is reachable. The role needs
`ALTER ROLE <user> CREATEDB;` once.

## The sample model

`scripts/make_demo_model.py` generates the demo: a terraced peak with a three-ring castle on top,
a gatehouse and bridge, a keep with corner turrets, a chapel, and a switchback road up the face.
It is generated rather than downloaded, so it carries no licence and can be rebuilt at any time.

```bash
cd backend && uv run python ../scripts/make_demo_model.py ../castle.glb
```

Upload the result as a project. Roughly 200,000 triangles and 5 MB.

## If a model arrives the wrong way up

Exporters disagree about which way is up, so a model can land on its face. Open scene settings
and use **כיוון הדגם** at the top: each button turns the model a quarter circle and you watch it
until it stands correctly. Any points already placed turn with it, and **איפוס הכיוון** puts
everything back.

## Supported model uploads

| Format | Notes |
| --- | --- |
| `.glb` | Used as-is. Best quality and fastest. |
| `.gltf` | Zip it together with its `.bin` and textures. |
| `.obj` | Zip it with the `.mtl` and texture images to keep materials. |
| `.dae` | COLLADA. A Z-up file is stood upright automatically, see below. |
| `.kmz` | A zipped COLLADA with its textures. What SketchUp's KMZ export produces. |
| `.stl`, `.ply`, `.off`, `.3mf` | Geometry only. |
| `.fbx`, `.3ds`, `.x3d`, `.usd*`, `.abc` | Requires Blender on the server. |
| `.skp` | Cannot be read here. See below. |

Keep models under a few hundred MB. The browser loads a single GLB.

## SketchUp

Editors working in SketchUp save `.skp` files, and nothing running on a Linux server can open one:
SketchUp's SDK ships for Windows and macOS only, so there is no library, no Blender importer and no
converter to install. The app recognises the format anyway and says what to do instead, both in the
upload dialog (before the file is sent) and from the API.

The export takes a moment in SketchUp itself: **File › Export › 3D Model**, then COLLADA (`.dae`),
KMZ or OBJ. All three come back with materials, and all three are read here without Blender.

SketchUp models in Z-up and writes `<up_axis>Z_UP</up_axis>` into its COLLADA. The converter reads
that and turns the model upright, so a tower arrives standing rather than lying on its side. Files
that declare nothing are left exactly as they are.

## Marking a project ready

A card shows how the upload is getting on only while that matters. Once the model is processed,
the card shows where you have put the project instead: **טיוטה** or **מוכן להצגה**. Switch between
them from the card's menu.

## Moving points to a different model

Replacing a model does not mean rebuilding its points. In the viewer's toolbar, **ייצוא נקודות** writes
every point to a file. Open the project holding the new model and use **ייבוא נקודות** to read it
back. Categories and any attached images or documents come across too. Choose whether to add to
the project's existing points or replace them. Positions are kept, so each point lands roughly
where it belongs and only the ones that moved need adjusting.

## Navigation

Drag to orbit, scroll to zoom, right-drag to pan. Double-click a spot on the model to focus
it, and double-click again to return to the previous view.

Editors get a right-click menu: on a marker it offers edit and delete, and anywhere on the model
it drops a new point right there. There is no edit mode to switch on; a point opens for editing
from that menu or from the pencil on its dashboard.

| Key | Action |
| --- | --- |
| `Enter` | Enter the model from the intro |
| `←` `→` | Previous / next point |
| `Esc` | Cancel placement, stop the tour, or close the point |
