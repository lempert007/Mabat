# Mabat

A dark, board-room-ready web app for presenting a 3D model of a structure with rich points of interest.
Editors upload a model, walk through it and pin points with content. Guests explore, open points and
follow share links. Runs entirely offline.

Over the same model it plays a **live delivery mission**: a carrier drone flies the route, hovers and
lowers its load on a rope to the drop. What happens on the ground is up to the editor: upload any
models, say what rides what, and click the places each one goes; a rover drives off with a parcel
on its back, a small drone flies away and lands. It plays as a narrated show in stages with
cinematic cameras and live telemetry.

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

### On Windows

The VS Code launch and tasks carry Windows overrides, so **Mabat: full stack** works as-is. The
database script there is `scripts/ensure-db.ps1`: it uses a running PostgreSQL, else starts the
`postgresql*` Windows service, else the container.

```powershell
winget install PostgreSQL.PostgreSQL.16          # registers a service that starts with Windows
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost `
  -c "CREATE ROLE mabat LOGIN CREATEDB PASSWORD 'change-me';" -c "CREATE DATABASE mabat OWNER mabat;"
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File scripts\ensure-db.ps1
cd backend; uv sync; uv run alembic upgrade head; uv run uvicorn app.main:app --reload
cd ..\frontend; npm install; npm run dev
```

The first editor account comes from `MABAT_INITIAL_EDITOR_USERNAME` / `MABAT_INITIAL_EDITOR_PASSWORD`
in `.env` (created when the users table is empty). More editors: the **Editors** button in the gallery,
or `uv run python -m app.cli create-editor <name>`.

Viewers share one guest account, `MABAT_GUEST_USERNAME` / `MABAT_GUEST_PASSWORD`. It can look at
everything and change nothing. Changing the password signs every guest out; leaving it empty closes
guest access.

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

## API types

The interface's API types are generated from the backend's OpenAPI schema, so the two halves cannot
disagree about a field. After changing a schema in `backend/app/schemas/`:

```bash
cd backend && uv run python -m app.cli openapi     # writes frontend/openapi.json
cd ../frontend && npm run api:types                # writes src/api/schema.d.ts
```

Both files are committed. A backend test fails while `openapi.json` is behind the app, and a frontend
test checks that a new mission in the interface starts from the server's defaults.

## Tests

```bash
cd backend && uv run pytest
cd frontend && npm test          # the mission's flight logic
```

They use a throwaway database and skip if no PostgreSQL is reachable. The role needs
`ALTER ROLE <user> CREATEDB;` once.

## The sample model

`scripts/make_demo_model.py` generates the demo: a terraced peak with a three-ring castle on top,
a gatehouse and bridge, a keep with corner turrets, a chapel, and a switchback road up the face.
It is generated rather than downloaded, so it carries no licence and can be rebuilt at any time.

```bash
cd backend && uv run --with scipy python ../scripts/make_demo_model.py ../castle.glb
```

`scipy` is only needed here, not by the app. Without it, trimesh computes the terrain's vertex
normals in a pure-Python loop and the script runs for many minutes instead of seconds.

Upload the result as a project. Roughly 200,000 triangles and 5 MB.

## Delivery missions

Open a project, press **עריכת המשימה** in the toolbar and choose where the rope sets its load down by
clicking the model. That one click is a whole mission: it starts playing straight away, with the carrier arriving
from beyond the model. Everything else is optional and changes the scene as you move it:

| Tab | What it sets |
| --- | --- |
| מסלול | The drop, a hover point if the carrier should hold off to one side, a hub to take off from and land on, waypoints in order, and the model's real width if its units are not metres. Each place has a button that flies the camera to it |
| טיסה | The carrier (name, size, colour or your own model), cruise altitude and speed, climb rate, hover altitude, rope length (with a check that it reaches), winch speed, release height, and how long it waits at the end |
| בשטח | Everything on the ground. Add a drone, a rover or a parcel, give it your own model if you like, and say what it starts on: the rope, another actor (on top or hanging underneath), or standing on the model. Then click its stops on the model, one after another, on the ground, a roof or a wall; each gets a time at that kind's own pace, which you can change. Each stop can say which way to face (a compass dial) and how far to lean, and an actor that sticks to surfaces stands square to whatever it was clicked on. A timeline docks above the player with one lane per actor: drag a stop to retime it and it snaps to other actors' stops, drag the end of a wait to lengthen it, double-click to fly to it |
| שלבים | Each stage's title, caption and camera, with a button to watch just that stage |
| רעש | Noise contours from your acoustic study, traced on the ground point by point. In the show, sound rings run out from the drone to each contour's edge, which glows; outside every contour it is quiet. Hidden until you turn it on, from the player or this tab |

Viewers get **צפייה במשימה** on the intro. The player along the bottom has the stages as chapters:
click to jump, drag to scrub. The camera is cinematic by default; dragging takes over while it keeps
following the action; panning with the right button, or editing, frees it entirely, as does **חופשי**. For presenting, **עצירה בסוף כל שלב** pauses at
the end of each stage until you go on, **חזרה על השלב** loops one stage, and the speed button runs
the show at ½×, 1×, 2× or 4×.

| Key | In a mission |
| --- | --- |
| `Space` | Play / pause |
| `→` `←` | Next / previous stage (presenting: plays the stage waiting to start) |
| `Esc` | Stop placing on the model |
| `Enter` / `Backspace` | While adding waypoints, stops or a noise contour: finish / take back the last point |
| `→` `←` `Delete` | On a stop focused in the timeline: a tenth of a second later or earlier (`Shift`: a second), remove it |
| `[` `]` `Delete` | On the selected stop: turn it 15° either way, remove it |
| `Ctrl+Z` / `Ctrl+Shift+Z` | With the mission panel open: undo / redo |

While editing, the camera orbits and zooms about whatever is under the pointer, double-click flies in close, and **מעקב** keeps the selected actor in view.

### The neighbourhood demo

`scripts/make_demo_neighborhood.py` builds a suburban neighbourhood with a logistics hub at one
corner, in metres and Y-up, to try missions on. Like the castle it is generated, so it carries no
licence. Roughly 40,000 triangles and under a megabyte.

```bash
cd backend && uv run python ../scripts/make_demo_neighborhood.py ../neighborhood.glb
```

Upload it as a project, place the hub on the concrete apron by the hangar and the drop in any back
garden.

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
