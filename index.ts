/**
 * Mia Software Development (mia-software-dev) — typed source reference.
 * =========================================================================
 * Board task 2E. Built to the owner (Luis) requirements (2026-06-22 call): build
 * software FOR a non-technical user, secure-by-default, on SQLite, with a front
 * end + back end, asking about auth before exposing data, escalating to Voltek
 * when stuck. The RULES live in the bundled skill (skills/.../SKILL.md); these
 * tools create the structure the skill works inside.
 *
 * index.js is the runnable entry OpenClaw loads; this file is the typed reference.
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";

type AuthChoice = "yes" | "no" | "ask";
type Config = { projectsDir?: string; defaultDatabase?: "sqlite" };
type Column = { name?: string; type?: string };
type ToolResult = { content: Array<{ type: "text"; text: string }>; details: unknown };
type Args = Record<string, unknown>;

/** Resolve the OpenClaw agent workspace the same way the core does. */
function workspaceDir(): string {
  const home = process.env.HOME?.trim() || process.env.USERPROFILE?.trim() || homedir();
  const explicit = process.env.OPENCLAW_WORKSPACE_DIR?.trim();
  const profile = process.env.OPENCLAW_PROFILE?.trim();
  if (explicit) return explicit;
  if (profile && profile.toLowerCase() !== "default") return join(home, ".openclaw", `workspace-${profile}`);
  return join(home, ".openclaw", "workspace");
}

function projectsDir(cfg: Config): string {
  const override = typeof cfg?.projectsDir === "string" && cfg.projectsDir.trim() ? cfg.projectsDir.trim() : "";
  return override || join(workspaceDir(), "projects");
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function slugify(name: string): string {
  return (
    String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  );
}

/** SQLite-safe identifier: letters, digits, underscore; must start with a letter. */
function ident(name: unknown, fallback: string): string {
  const v = String(name || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+/, "");
  return /^[a-z][a-z0-9_]*$/.test(v) ? v : fallback;
}

function result(text: string, details: unknown): ToolResult {
  return { content: [{ type: "text", text }], details };
}

function writeFile(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
}

const BASE_SCHEMA = [
  "-- Base tables — every Mia-scaffolded project gets these.",
  "CREATE TABLE IF NOT EXISTS app_settings (",
  "  key   TEXT PRIMARY KEY,",
  "  value TEXT",
  ");",
  "CREATE TABLE IF NOT EXISTS activity_log (",
  "  id     INTEGER PRIMARY KEY AUTOINCREMENT,",
  "  ts     TEXT DEFAULT (datetime('now')),",
  "  action TEXT NOT NULL,",
  "  detail TEXT",
  ");",
  "",
].join("\n");

/** Build every file for a new project. Returns { relativePath: content }. */
function scaffoldFiles(
  slug: string,
  name: string,
  desc: string | undefined,
  authChoice: AuthChoice,
  isPublic: boolean,
): Record<string, string> {
  const authLine =
    authChoice === "yes"
      ? "Required (login)"
      : authChoice === "no"
        ? "None — local/personal use only"
        : "ASK the user (default to required if any personal data)";
  const publicLine = isPublic
    ? "Intended public — REQUIRE explicit confirm + verify no personal data before deploy (Vercel key needed)"
    : "Private / local only (default)";
  const description = desc || "TODO: capture what the user wants to build.";

  const files: Record<string, string> = {};

  files["requirements.md"] = [
    `# ${name} — requirements`,
    "",
    "> Scaffolded by Mia (mia-software-dev). The user is non-technical; Mia makes the engineering calls.",
    "",
    "## What we're building",
    description,
    "",
    "## Decisions (locked)",
    "- Database: **SQLite** (local file, nothing exposed by default)",
    "- Structure: `frontend/` + `backend/` (Node)",
    `- Authentication: ${authLine}`,
    `- Public on the internet: ${publicLine}`,
    "",
    "## Definition of done",
    "- Runnable frontend + backend on SQLite, base tables present, plan followed.",
    "",
  ].join("\n");

  files["task-plan.md"] = [
    `# ${name} — task plan`,
    "",
    "- [x] Scaffold project structure (frontend/ + backend/ + SQLite + base tables)",
    "- [ ] Confirm requirements with the user (what screens, what data)",
    "- [ ] Decide authentication (ASK the user) and record in decisions.md",
    "- [ ] backend: define tables (add_table) and the API endpoints",
    "- [ ] frontend: build the screens that talk to the API",
    "- [ ] Test locally (cd backend && npm install && npm start, then open frontend/index.html)",
    "- [ ] If publishing: get a Vercel key from the user, confirm NO personal data is exposed, then deploy",
    "",
  ].join("\n");

  files["decisions.md"] = [
    `# ${name} — decisions`,
    "",
    "- DB: **SQLite** (owner standard — local, nothing exposed).",
    `- Auth: ${authLine}.`,
    `- Public: ${publicLine}.`,
    "- Secrets: env vars / secret store only — never in code or git.",
    "",
  ].join("\n");

  files["state.json"] =
    JSON.stringify(
      {
        status: "in-progress",
        current: "confirm requirements with the user",
        done: ["scaffold"],
        pending: ["requirements", "auth", "backend", "frontend", "test"],
        blocked: [],
      },
      null,
      2,
    ) + "\n";

  files["README.md"] = [
    `# ${name}`,
    "",
    "Scaffolded by Mia. Front end + back end on SQLite.",
    "",
    "## Run",
    "1. `cd backend && npm install && npm start`",
    "2. open `frontend/index.html` in a browser",
    "",
  ].join("\n");

  files[".gitignore"] = ["node_modules/", "*.sqlite", ".env", ""].join("\n");

  // ---- backend ----
  files["backend/package.json"] =
    JSON.stringify(
      {
        name: `${slug}-backend`,
        version: "0.1.0",
        type: "module",
        scripts: { start: "node server.js" },
        dependencies: { "better-sqlite3": "^11.0.0", express: "^4.19.0" },
      },
      null,
      2,
    ) + "\n";

  files["backend/schema.sql"] = BASE_SCHEMA;

  files["backend/db.js"] = [
    'import Database from "better-sqlite3";',
    'import { readFileSync } from "node:fs";',
    'import { join, dirname } from "node:path";',
    'import { fileURLToPath } from "node:url";',
    "",
    "const here = dirname(fileURLToPath(import.meta.url));",
    'export const db = new Database(join(here, "data.sqlite"));',
    'db.exec(readFileSync(join(here, "schema.sql"), "utf8"));',
    "",
  ].join("\n");

  files["backend/server.js"] = [
    'import express from "express";',
    'import { db } from "./db.js";',
    "",
    "const app = express();",
    "app.use(express.json());",
    "",
    'app.get("/api/health", (_req, res) => res.json({ ok: true }));',
    'app.get("/api/settings", (_req, res) =>',
    '  res.json(db.prepare("SELECT key, value FROM app_settings").all()),',
    ");",
    "",
    "const PORT = process.env.PORT || 3001;",
    'app.listen(PORT, () => console.log("backend on http://localhost:" + PORT));',
    "",
  ].join("\n");

  files["backend/.env.example"] = [
    "PORT=3001",
    "# Add provider/deploy keys here. Copy to .env (gitignored) — never commit real keys.",
    "",
  ].join("\n");

  // ---- frontend ----
  files["frontend/index.html"] = [
    "<!doctype html>",
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${name}</title><link rel="stylesheet" href="styles.css"></head>`,
    "<body>",
    `  <h1>${name}</h1>`,
    '  <p id="status">connecting…</p>',
    '  <script src="main.js"></script>',
    "</body>",
    "</html>",
    "",
  ].join("\n");

  files["frontend/main.js"] = [
    'const API = "http://localhost:3001";',
    'fetch(API + "/api/health")',
    "  .then((r) => r.json())",
    '  .then((d) => { document.getElementById("status").textContent = d.ok ? "Backend connected \\u2713" : "Backend error"; })',
    '  .catch(() => { document.getElementById("status").textContent = "Backend not running — in backend/ run: npm install && npm start"; });',
    "",
  ].join("\n");

  files["frontend/styles.css"] = [
    "body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; max-width: 720px; color: #1a1a2e; }",
    "h1 { font-weight: 700; }",
    "",
  ].join("\n");

  return files;
}

function doScaffold(args: Args, cfg: Config): ToolResult {
  const name = str(args.name);
  if (!name) return result('To scaffold a project I need a "name" (e.g. "Acme Dashboard").', { status: "failed" });
  const slug = slugify(name);
  const root = join(projectsDir(cfg), slug);
  if (existsSync(root)) {
    return result(`A project "${slug}" already exists at ${root}. Pick another name or use add_table to extend it.`, {
      status: "failed",
      dir: root,
    });
  }
  const desc = str(args.description);
  const authChoice: AuthChoice = (["yes", "no", "ask"] as const).includes(String(args.auth) as AuthChoice)
    ? (String(args.auth) as AuthChoice)
    : "ask";
  const isPublic = args.public === true || String(args.public).toLowerCase() === "true";

  const files = scaffoldFiles(slug, name, desc, authChoice, isPublic);
  for (const [rel, content] of Object.entries(files)) writeFile(join(root, rel), content);

  const next = [
    `Scaffolded "${name}" at ${root}`,
    "  • frontend/ + backend/ on SQLite (base tables: app_settings, activity_log)",
    "  • structured-work files written (task-plan.md, decisions.md, state.json)",
    "",
    "Next, ask the user (before building screens that show data):",
    "  1) Should this require a LOGIN, or is it just for them on this machine?",
    "  2) Will it ever be PUBLIC on the internet? (if yes → Vercel key + no personal data)",
    "Then use add_table to define data, and build the API + screens per task-plan.md.",
  ].join("\n");
  return result(next, { status: "ok", slug, dir: root, database: "sqlite", auth: authChoice, public: isPublic });
}

function doAddTable(args: Args, cfg: Config): ToolResult {
  const slug = slugify(str(args.project) || "");
  const root = join(projectsDir(cfg), slug);
  const schemaPath = join(root, "backend", "schema.sql");
  if (!str(args.project) || !existsSync(schemaPath)) {
    return result(`No scaffolded project "${slug}" found (expected ${schemaPath}). Run scaffold_project first.`, {
      status: "failed",
    });
  }
  const table = ident(str(args.table) || "", "");
  if (!table) return result('I need a valid "table" name (letters, digits, underscore; start with a letter).', { status: "failed" });

  const cols: Column[] = Array.isArray(args.columns) ? (args.columns as Column[]) : [];
  const colLines = ["  id INTEGER PRIMARY KEY AUTOINCREMENT"];
  for (const c of cols) {
    const cn = ident(c?.name, "");
    if (!cn || cn === "id") continue;
    const t = String(c?.type || "TEXT").toUpperCase();
    const type = ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"].includes(t) ? t : "TEXT";
    colLines.push(`  ${cn} ${type}`);
  }
  const ddl = [`CREATE TABLE IF NOT EXISTS ${table} (`, colLines.join(",\n"), ");", ""].join("\n");

  appendFileSync(schemaPath, "\n" + ddl, "utf8");
  return result(`Added table "${table}" to ${slug} (backend/schema.sql).\n${ddl}`, { status: "ok", slug, table, ddl });
}

export default definePluginEntry({
  id: "mia-software-dev",
  name: "Mia Software Development",
  description: "Scaffold a structured front-end + back-end Node app on SQLite for a non-technical user (board task 2E).",
  register(api) {
    const cfg = (api.pluginConfig ?? {}) as Config;

    api.registerTool(
      {
        name: "scaffold_project",
        label: "Scaffold project",
        description:
          "Create a new software project for a non-technical user: a frontend/ + backend/ skeleton on SQLite with base " +
          "tables and structured-work files (requirements/task-plan/decisions/state). Args: name (required), description, " +
          "auth ('yes'|'no'|'ask'), public (bool). Use when the user asks to build an app/dashboard/tracker/website/tool.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", description: "Project name, e.g. 'Acme Dashboard'." },
            description: { type: "string", description: "What the user wants to build." },
            auth: { type: "string", enum: ["yes", "no", "ask"], description: "Require login? Default: ask the user." },
            public: { type: "boolean", description: "Will it be public on the internet? Default false (private/local)." },
          },
        },
        execute: async (_toolCallId: string, rawParams: unknown) =>
          doScaffold(rawParams && typeof rawParams === "object" ? (rawParams as Args) : {}, cfg),
      },
      { name: "scaffold_project" },
    );

    api.registerTool(
      {
        name: "add_table",
        label: "Add table",
        description:
          "Add a table to a scaffolded project's SQLite schema (backend/schema.sql). Args: project (slug/name), table " +
          "(name), columns (array of { name, type } where type is TEXT|INTEGER|REAL|BLOB|NUMERIC). An id PK is added automatically.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["project", "table"],
          properties: {
            project: { type: "string", description: "The project name or slug from scaffold_project." },
            table: { type: "string", description: "Table name (letters, digits, underscore)." },
            columns: {
              type: "array",
              description: "Columns to create (besides the auto id).",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"] },
                },
                required: ["name"],
              },
            },
          },
        },
        execute: async (_toolCallId: string, rawParams: unknown) =>
          doAddTable(rawParams && typeof rawParams === "object" ? (rawParams as Args) : {}, cfg),
      },
      { name: "add_table" },
    );
  },
});
