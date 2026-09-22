# Mabat

3D structure showcase for a board of directors. FastAPI + React/TS + PostgreSQL. Runs offline.
Read `DESIGN.md` before changing architecture.

## Layout
- `backend/` FastAPI app (`app/`), Alembic migrations, CLI in `app/cli.py`.
- `frontend/` Vite + React + TypeScript. One component per file under `src/components/<feature>/`.
- `docker-compose.yml` for deployment, `.env.example` documents every setting.

## Rules
- No runtime network calls to the internet. Fonts, HDRI, libraries are bundled.
- One React component per file, named export matching the file name. Feature folders, no `utils.ts` dumping ground.
- Server data via TanStack Query hooks in `src/api/`. Viewer UI state in zustand stores under `src/store/`.
- Backend: routers in `app/api/`, business logic in `app/services/`, no logic in routers beyond validation and auth.
- Alembic migration for every schema change. Never edit an applied migration.
- A form that holds a draft must show whether the draft differs from what is stored, disable its
  save when it does not, and ask before discarding. Never label a drafted value as saved.
- Point coordinates are world-space. Anything that moves the model as a whole, such as
  `modelRotation`, has to move the project's points by the same amount or they detach from it.
- Anything served from a URL that can change behind the scenes needs a version in the query, the
  way `modelVersion` and the thumbnail's `v` do. Otherwise a reprocessed project keeps serving
  the old file from cache.
- Measure before optimising the viewer, and say what you measured. The frame cost of an effect
  is rarely what it looks like: bloom cost a whole frame budget here for something barely visible.
- The 3D canvas renders on demand. Anything that changes the picture outside of camera
  movement must call `invalidate()`, or the change will not appear until the next frame.
- Never animate an element's transform with framer-motion and write that same transform by
  hand (see `useDraggable`); pick one owner per property.
- Tailwind v4 emits `translate`, `rotate` and `scale` as standalone CSS properties, not as
  `transform`. Hand-written CSS that targets a Tailwind-positioned element must use those same
  properties: setting `transform` stacks a second transformation on top rather than replacing
  it. This shifted every occluded marker off its point by 18px until it was fixed.
- The interface is Hebrew and right to left. Every user-visible string lives in `src/i18n/he.ts`,
  including the messages the API returns, which reach the user in toasts.
- Voice: short controls stay as plain nouns; sentences are warm and spoken. Say what happened
  rather than what failed. Keep destructive warnings and field labels exact.
- Hebrew has a singular form for one, so any count that appears in a sentence goes through
  `counted()` with a pair of strings rather than a single template.
- Use logical Tailwind utilities (`start`/`end`, `ps`/`pe`, `ms`/`me`, `text-start`) rather than
  physical ones, or the layout will not mirror. Physical `left`/`top` is correct only where a
  value is written in screen pixels, such as the 3D markers.
- Wrap Latin or numeric runs inside Hebrew text in `<bdi>`, or give the element `dir="ltr"`.
  Without it the bidi algorithm reorders things like `P-01` and `01 / 03`.
- `.skp` cannot be converted, here or anywhere on Linux: SketchUp's SDK is Windows and macOS
  only, so there is no library to add and no Blender importer that works. A format we recognise
  but cannot read belongs in `NEEDS_EXPORT`, which turns the refusal into the export that does
  work, and the upload dialog checks for it before sending the file rather than after.
- A COLLADA states its own up axis and SketchUp's says `Z_UP`. Honour what the file declares
  instead of guessing: `modelRotation` is there for models that declare nothing and still land
  on their face.
- Fonts live in `public/fonts` and are declared in `globals.css`. Do not reintroduce a font
  package or a CDN link; the deployment has no internet.

## Dev
Copy `.env.example` to `.env` first, then run **Mabat: full stack** from VS Code's Run and Debug
panel: it ensures the database, migrates, and starts both halves. By hand:

```
./scripts/ensure-db.sh
cd backend && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

`scripts/ensure-db.sh` prefers a PostgreSQL that is already running and only starts the container
when nothing answers, so a local install is never duplicated.

Before committing: `npm run lint && npm run typecheck` in `frontend`, and
`uv run ruff check app && uv run pytest` in `backend`.
