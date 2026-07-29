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
