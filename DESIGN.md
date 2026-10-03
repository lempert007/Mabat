# Mabat — Design Document

Mabat ("מבט", a gaze) is a web app that presents a 3D model of a structure and its
surroundings to a board of directors. Editors upload a model, walk through it, and pin
points of interest (POIs) with rich content. Guests explore the model, open any point and
read everything the editors prepared. Share links open a project at a specific point.

## 1. Constraints

| Constraint | Consequence |
| --- | --- |
| Offline Ubuntu host, no internet at runtime | No CDN, no web fonts, no external HDRI. The typeface (Assistant) is served from `public/fonts`, the Draco decoder from `public/draco`, and lighting is generated in code rather than loaded as an HDRI. |
| Python 3.12 + FastAPI, React + TypeScript, PostgreSQL | No vanilla JS. Strict TypeScript. |
| Models up to ~100 MB, OBJ first, more formats where possible | Server converts every upload to a single GLB. Browser only ever loads GLB. |
| One model per project (v1) | Schema keeps `model_path` on the project; a later `models` table is a clean extension. |
| Hebrew interface, right to left | The document is `dir="rtl" lang="he"`. Components use logical utilities (`start`/`end`, `ps`/`pe`, `ms`/`me`) so the layout mirrors. Every string lives in `src/i18n/he.ts`. |
| App owns the storage folder | Layout is `STORAGE_ROOT/projects/<project-id>/...`. Nothing outside it is read. |

## 2. Roles

- **Editor**: named account, password login. Creates projects, uploads models, places and edits points, manages categories, invites other editors.
- **Guest**: anonymous, one click. Read-only. Can open share links.

Sessions are JWTs in an `httpOnly` cookie. Guests get a JWT with `role=guest`.

## 3. Domain model

```
users        id, username, password_hash, display_name, created_at
projects     id, name, description, status(uploaded|processing|ready|failed), stage(draft|ready),
             error_message,
             source_filename, source_format, model_path, thumbnail_path,
             model_stats(jsonb), settings(jsonb), created_by, created_at, updated_at
categories   id, project_id, name, color, sort_order
pois         id, project_id, identifier, title, summary, category_id,
             position(jsonb {x,y,z}), normal(jsonb), camera(jsonb {position, target}),
             blocks(jsonb []), sort_order,
             created_by, updated_by, created_at, updated_at
attachments  id, project_id, poi_id?, kind(image|document), filename, mime, size,
             path, thumb_path?, width?, height?, created_at
```

### Content blocks

A POI's content is an ordered list of typed blocks (JSONB). Editors compose freely; the
viewer renders every type with one component per type. Adding a block type never needs a
migration.

| type | payload |
| --- | --- |
| `section` | `title`, `defaultOpen`, `blocks[]` of any type below. Sections never nest. |
| `heading` | `text` |
| `text` | `markdown` |
| `specs` | `items[]` of `{label, value}` |
| `table` | `columns[]`, `rows[][]` |
| `images` | `items[]` of `{attachmentId, caption}` |
| `documents` | `items[]` of `{attachmentId, title}` |
| `link` | `url`, `label` |

### Project settings (jsonb)

`modelRotation` `{x,y,z,w}` or null, `introCamera` `{position, target}`,
`environment` (`studio`|`night`|`dawn`), `showGrid`.

Models are treated as Y-up. A source exported some other way up lands on its face, so a project
carries a `modelRotation` that the viewer applies to the model. The editor sets it by pressing
quarter-turn buttons and watching the model turn, rather than by naming an axis.

Points are stored in world coordinates, so changing the rotation rotates every point of the
project by the difference: positions, surface normals and saved camera poses. Without that, the
markers would stay where the geometry used to be. Turns are quarter circles only, which is all a
mis-exported model needs and keeps the result square to the world with no accumulated drift.

## 4. Storage layout

```
STORAGE_ROOT/
  projects/<project-id>/
    source/<original upload>       kept as-is for re-processing
    model.glb                      what the browser loads
    thumbnail.jpg                  gallery cover, captured from the viewer
    attachments/<attachment-id>.<ext>
    attachments/<attachment-id>.thumb.jpg   (images only)
```

## 5. Model pipeline

1. Upload (multipart) → saved to `source/`. Archives (`zip`, `kmz`) are extracted; the main mesh file is located by extension priority (`glb, gltf, dae, obj, fbx, …`). A format in `NEEDS_EXPORT` is turned away here with instructions rather than a generic refusal.
2. Status → `processing`. Conversion runs in a worker thread so the API stays responsive.
3. Converter picks a strategy:
   - `.glb` → copied as-is (keeps materials exactly).
   - A COLLADA that declares `<up_axis>Z_UP</up_axis>`, as SketchUp's does, is rotated into the Y-up world the viewer and glTF assume.
   - `.gltf, .dae, .obj, .stl, .ply, .off, .3mf` → `trimesh` scene → GLB (materials and textures preserved where the format has them). COLLADA needs `pycollada`, which is a dependency, so SketchUp's usual export works without Blender.
   - `.fbx, .3ds, .x3d, .usd*` → Blender headless if `blender` is on `PATH`, otherwise the upload fails with a clear message. COLLADA lists Blender as a second strategy when it is installed, because exporters disagree and Blender reads the awkward files.
   - `.skp` → refused with export instructions. SketchUp's SDK has no Linux build, so no server-side converter can exist; the useful thing to do is name the export that works.
4. Stats (triangle count, bounds, extents) are written to `model_stats`. Status → `ready`.
   The GLB is written beside the live one and swapped in only on success, so a failed retry keeps
   the working model. A retry is refused while a conversion is queued or running, and since
   conversions run in the server process, any left `processing` by a restart are marked failed
   at startup so they can be retried.
5. The first time an editor opens a ready project with no thumbnail, the viewer captures the canvas and posts it. "Set cover" in the viewer does the same on demand.

## 6. API (prefix `/api`)

```
POST   /auth/login            {username, password}          → session cookie
POST   /auth/guest                                          → guest cookie
POST   /auth/logout
GET    /auth/me                                             → {role, user?}

GET    /users                  (editor)
POST   /users                  (editor)  {username, password, displayName}
DELETE /users/{id}             (editor, not self)

GET    /projects
POST   /projects               (editor, multipart: file, name, description)
GET    /projects/{id}
PATCH  /projects/{id}          (editor) name, description, settings
DELETE /projects/{id}          (editor)
GET    /projects/{id}/model?v=<modelVersion>                 → model.glb (Range supported)
GET    /projects/{id}/thumbnail
PUT    /projects/{id}/thumbnail (editor, multipart image)

GET    /projects/{id}/categories
POST   /projects/{id}/categories        (editor)
PATCH  /categories/{id}                 (editor)
DELETE /categories/{id}                 (editor)

GET    /projects/{id}/pois
POST   /projects/{id}/pois              (editor)
PUT    /projects/{id}/pois/order        (editor) [poiId...]
GET    /pois/{id}
PATCH  /pois/{id}                       (editor)
DELETE /pois/{id}                       (editor)

POST   /projects/{id}/attachments       (editor, multipart) → attachment
GET    /attachments/{id}/file
GET    /attachments/{id}/thumb
DELETE /attachments/{id}                (editor)
```

## 7. Frontend

Vite + React 18 + TypeScript. One component per file. Feature folders.

- **State**: TanStack Query for server data, zustand for viewer UI state (selected POI, mode, tour), no global app state beyond session.
- **3D**: react-three-fiber, drei (`CameraControls`, `Environment` with procedural light formers, `useGLTF`), `three-mesh-bvh` for fast raycasting (click-to-place, marker occlusion), `@react-three/postprocessing` (bloom, vignette).
- **Cost of a frame**: measured, not guessed. Bloom was costing about a full frame's budget on a
  dark, largely diffuse scene that barely showed it, so only a vignette remains; the composer
  with just that costs under 3ms. The resolution cap is 1.5 rather than the display's own, and
  drops further while the camera moves. Together these took a camera move from 54ms a frame to
  24ms on the same machine.
- **Loading**: the viewer route is loaded on demand, because three.js and its helpers are over a
  megabyte and only that route needs them. Login and the gallery ship 49 KB of app code instead
  of 253 KB. nginx must be told to compress proxied responses or the model is sent uncompressed,
  which costs about half the transfer.
- **Rendering**: the canvas runs `frameloop="demand"`, so an idle viewer issues no draw calls at all. Anything that changes the picture without user input asks for the next frame itself. Resolution drops while the camera moves (`regress` + `AdaptiveDpr`) and returns when it settles.
- **Markers**: a DOM overlay whose transforms are written straight from the render loop, never through React state, so moving the camera re-renders nothing. Occlusion costs a raycast per marker, so one marker is re-tested per frame in rotation. Occluded markers fade; the selected one pulses.
- **Editing panels**: scene settings live in a draggable, backdrop-free panel so the model stays visible and interactive while a setting is being changed. Continuous controls preview instantly through the query cache and save on a debounce.
- **Camera**: every POI stores a curated camera pose. Selecting a POI flies there with easing. Tour mode plays POIs in order. Double-clicking the model focuses that spot; double-clicking again returns to the view it was called from, and moving to a point or resetting the view retires that return view.
- **Routes**: `/login`, `/` (gallery), `/p/:projectId` (viewer, `?poi=` deep link). Visiting a share link without a session silently creates a guest session.

### Screens

1. **Login**: centered glass card on a dark animated gradient. Password login for editors, "Continue as guest" button.
2. **Gallery**: header with wordmark and user chip. Cards with cover, name, status, POI count. Editors see "New project" and upload with progress.
3. **Viewer**: full-bleed canvas. Right-clicking a marker offers edit and delete; right-clicking
   the model offers a point at that spot. The right button also pans the camera, so a press is
   only treated as a click if it did not travel.
4. **Viewer detail**: full-bleed canvas. Intro overlay (title, "Explore"). HUD: back/title top-left, actions top-right (share, edit, settings, fullscreen). Left rail: searchable points list with category filter. Right panel: the POI dashboard, led by the category accent, counter, identifier, title and summary, then the content as collapsible sections with an expand-all control, and previous/next carrying the adjacent point titles. Bottom center: tour controls.
4. **The point editor** is a draft: nothing reaches the server until Save. It says so, rather
   than leaving the editor to guess. The footer shows an unsaved marker whenever the draft
   differs from what is stored, Save is disabled when there is nothing to save, the camera badge
   distinguishes set from changed, and leaving with changes asks first.

5. **Editing** (editors): there is no separate mode. Right-clicking the model adds a point where
   the pointer is, right-clicking a marker offers edit and delete, and the dashboard carries an
   edit control. The editor panel holds the fields, "use current view" to store the camera, the
   block editor and attachment upload. Repositioning is the one action that waits for a click on
   the model, and it is started from inside the editor.

### Design language

Dark, quiet, precise. Near-black surfaces, glass panels (`bg white/6, blur 20, border white/10`), one accent color, Inter with tight tracking on headings, 8pt spacing, 12–16px radii, 200–350ms motion with a standard ease. Nothing decorative without a job.

## 8. Deployment

`docker-compose.yml`: `db` (postgres:16), `backend` (uvicorn), `frontend` (nginx serving the static build, proxying `/api`, `client_max_body_size` raised). The storage folder is a bind mount. Images are built on a machine with internet and moved with `docker save` / `docker load`, or built on the host if it has package mirrors.

### Two kinds of status

`status` is how the upload processed, set by the server. It is only shown while it is queued,
running or failed, because "finished converting" is not news.

`stage` is whether the editor considers the project fit to show, and is theirs to set: draft or
ready. Once processing is done, the card shows the stage instead.

### Caching the model

A project's model can be replaced by reprocessing, so `modelVersion` (the file's timestamp) is
part of the URL the viewer requests. The response is then cached hard and can never go stale:
a new model means a new URL. Serving it from a fixed URL with revalidation was the alternative,
but Starlette answers conditional requests with the whole file rather than a 304, so every
visit would re-download several megabytes.

## 9. Moving points between models

Swapping the model under an existing set of points is a first-class flow, because a revised
model should not mean rebuilding the points.

Export and import live in the viewer's toolbar.

- `GET /projects/{id}/points/export` returns a `mabat.points` document: the points with their
  content, plus the category names and colours they use. It downloads as a file.
- `POST /projects/{id}/points/import` reads one back. Categories are matched by name and created
  when missing. Any image or document a point references is copied into the target project and
  the reference is rewritten, so nothing renders broken. References whose file is gone are
  dropped and reported.
- `mode` is `append` or `replace`. Replace clears the project's points first and then removes
  attachments no longer referenced by anything, so repeating an import does not accumulate files.
- Positions come across unchanged, which puts each point roughly where it belongs on a revised
  model. The editor then moves the ones that need it.

## 10. Tests

`backend/tests` covers the parts where a mistake is quiet rather than loud: the quaternion maths
behind straightening a model, the export and import of points including attachment copying and
both import modes, and who is allowed to change what. They run against a throwaway PostgreSQL
database created for the session, and skip rather than fail when no server is reachable.

```bash
cd backend && uv run pytest
```

The database role needs permission to create databases: `ALTER ROLE <user> CREATEDB;`.

## 11. Out of scope for v1 (planned)

Clipping planes, measurements, multiple models per project, PDF export of points, per-presentation access codes, dragging a marker across the model to reposition it.
