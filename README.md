# BucketList

A self-hosted achievement checklist app: bucket list items, visited locations,
Japanese eki stamps, climbed summits — or anything else you want to track.
The schema is **not hardcoded** — you define collections and fields yourself
in the PocketBase admin panel, and the Vue frontend automatically renders a
checklist UI for any collection that follows the conventions below.

## Stack

- **Backend/admin:** [PocketBase](https://pocketbase.io) — single binary,
  embedded SQLite, built-in admin UI, auto REST API, auth, file storage.
- **Frontend:** Vue 3 + Vite + TypeScript, Pinia, vue-router, Leaflet
  (OpenStreetMap) for maps, Tailwind CSS.
- **Deployment:** one Docker container. The built Vue app is served directly
  by PocketBase (`pb_public/`), so there's a single port and a single volume.

## Quick start

```sh
docker compose up --build
```

Then open **http://localhost:8090/_/** and create your first superuser
account (PocketBase prompts you for this on first run). That's also the
login you'll use in the app itself at **http://localhost:8090/**.

## Creating a checklist collection

The frontend treats any PocketBase collection as an "achievement checklist"
if it has a `status` select field with exactly these three options:
`todo`, `ongoing`, `completed`. Everything else is rendered generically based
on field type — add whatever fields you want.

| Purpose | Field name | PocketBase field type | Notes |
|---|---|---|---|
| Status *(required)* | `status` | Select (single), values: `todo`, `ongoing`, `completed` | Marks the collection as a checklist. |
| Creation date | `created` | Autodate, "set on create" | **Not added automatically** — add it yourself so records sort/display by creation date. |
| Last updated (optional) | `updated` | Autodate, "set on create" + "set on update" | Nice to have, not required. |
| Completion date | `date_completed` | Date | Optional. Auto-filled with today's date in the UI when you set status to `completed`, if empty. |
| GPS coordinates | `lat` **and** `lon` | Number + Number | This exact name pair is rendered as a click-to-pin Leaflet map, both in the edit form and on the `/map` view. |
| Free text | any name | Text or Editor (rich text) | Rendered as a text input / textarea. |
| Photo | any name | File (image) | Rendered as an upload control with a thumbnail preview. |
| Numbers (elevation, etc.) | any name | Number | Plain number input. |
| Display name shown in lists | `name` or `title` | Text | Used as the row label; falls back to the record ID if absent. |

Example collections to create for the achievements described in the project
brief:

- **bucket_list**: `name` (text), `status`, `created`, `date_completed`.
- **visited_locations**: `name` (text), `lat`, `lon`, `status`, `created`, `date_completed`.
- **eki_stamps**: `name` (text), `lat`, `lon`, `stamp_photo` (file), `status`, `created`, `date_completed`.
- **climbed_summits**: `name` (text), `lat`, `lon`, `elevation` (number), `status`, `created`, `date_completed`.

Set each collection's API rules (List/View/Create/Update/Delete) to require
auth (e.g. `@request.auth.id != ""`), or leave them locked down to superuser
— the frontend always authenticates as your superuser account, so it works
either way.

Once a collection matches the convention, it shows up automatically on the
dashboard and at `/c/<collection-name>` — no frontend code changes needed.

## Schema migrations

`backend/pb_migrations/` is bind-mounted into the container, so collection
schemas live in git. PocketBase applies pending migrations on startup and
**auto-generates a new migration file whenever you change a collection in the
admin panel** — those land straight in the repo, ready to commit.

`eki_stamps` ships as a migration (`*_created_eki_stamps.js`) and is created for
you on first start. To write one by hand, copy the shape of an existing file:
field `id`s and the system `id` primary key can be omitted, and PocketBase fills
them in.

### Automatic geo fields

`backend/pb_hooks/geo_fields.pb.js` adds the `lat`/`lon` pair to any collection
that qualifies as a checklist, on both create *and* update — `status` is often
added to a collection after the fact, and that counts. So every checklist is
map-ready without you having to remember.

Two consequences worth knowing:

- The hook **re-adds `lat`/`lon` if you delete them** from a checklist
  collection. To genuinely drop them, remove the `status` field first (which
  also removes the collection from the app).
- PocketBase number columns are `NOT NULL DEFAULT 0`, so a record with no
  coordinates reads back as `0, 0` — a real spot in the Gulf of Guinea. The app
  treats that exact pair as "no coordinates" (`toCoords` in
  `frontend/src/lib/schema.ts`) rather than dropping a pin on Null Island.

## Importing records from CSV

PocketBase can import/export collection *schemas* from the admin panel, but not
records. The app adds that: open a collection from the dashboard and click
**Import CSV**.

The importer only ever writes records into the collection you're viewing — it
never creates or modifies a collection. Use **Download template** in the dialog
to get a CSV with the correct header row.

Rules:

- **Column names must match the collection's field names exactly.** Any unknown,
  duplicate, or misspelled column refuses the whole file, as does a missing
  column for a required field. Optional fields may simply be left out.
- `status` values must be `todo`, `ongoing` or `completed`. Numbers must parse,
  dates must be `YYYY-MM-DD` or an ISO timestamp, booleans accept
  `true`/`false`, `1`/`0` or `yes`/`no`.
- `created` and `updated` are set by PocketBase — don't include them.
- File/photo fields can't come from a CSV; attach those by editing the record.
- Comma, semicolon and tab delimiters are supported and auto-detected. Quoted
  fields may contain delimiters and newlines.

Rows are validated against the schema before anything is written, and bad rows
are listed with their line number. You can then import the valid rows and fix
the rest separately. Every row is created as a new record — importing the same
file twice gives you duplicates.

## Development

Run PocketBase locally (or via `docker compose up pocketbase`), then in a
second terminal:

```sh
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8090`, so the dev server talks to
your local PocketBase instance directly.

## Security note

The Vue app authenticates to PocketBase as your **superuser** account,
because introspecting collection schemas (to render the generic UI) requires
superuser-level access — regular auth users can't list schemas. That's a
reasonable tradeoff for a personal, single-user app, but it means the
browser holds a superuser token. If you expose this beyond your own machine
or home network, put it behind a VPN (e.g. Tailscale) or an
authentication-aware reverse proxy rather than opening the port to the
public internet.
