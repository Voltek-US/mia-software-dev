# Mia Software Development (mia-software-dev)

Board task **2E** — the flagship "build software for a non-technical user" plugin,
built to the requirements from the Luis call (2026-06-22).

It bundles:
- **A skill** (`skills/mia-software-dev/SKILL.md`) — the rules Mia follows when a
  user asks to build something: secure-by-default, SQLite, front-end + back-end,
  ask about auth before showing data, explain Vercel / GitHub / AI keys, escalate to
  Voltek when stuck.
- **Two tools** (`contracts.tools`):
  - `scaffold_project` — creates `projects/<slug>/` with structured-work files
    (`requirements.md` / `task-plan.md` / `decisions.md` / `state.json`) and a
    runnable `frontend/` + `backend/` skeleton on **SQLite** (base tables
    `app_settings` + `activity_log`).
  - `add_table` — append a table to a scaffolded project's `backend/schema.sql`.

## Config (`configSchema`)
- `projectsDir` — where projects are scaffolded (default `<workspace>/projects`).
- `defaultDatabase` — `sqlite` (Luis's standard: local, nothing exposed).

## Notes
- Database is **SQLite**, not Postgres — per the owner (Luis) decision on the call.
- Follows the 2D structured-work discipline (plan-first project folder) and is gated
  by the 2A exec-policy for schema/publish/spend actions.
- Does **not** modify the OpenClaw core — it only registers tools + a skill.

Generated app skeleton:
```
projects/<slug>/
  requirements.md  task-plan.md  decisions.md  state.json  README.md  .gitignore
  backend/   package.json  server.js  db.js  schema.sql  .env.example
  frontend/  index.html  main.js  styles.css
```
