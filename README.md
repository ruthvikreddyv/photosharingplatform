# Contact Sheet — Photo Sharing Platform

A full-stack submission for the TrizenAI Full-Stack Internship Challenge: a
photography/event team collaboratively uploads photos, a Lead/Admin curates
and publishes a PIN-protected gallery, and a customer views it with just a
link and a PIN — no account needed.

## 1. Project overview

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, JWT auth.
- **Frontend:** React (Vite, TypeScript), React Router, plain CSS (no UI
  framework — a small custom design system, see `frontend/src/styles/tokens.css`).
- **Database:** SQLite by default (zero setup, file-based) — schema is
  written to be portable to PostgreSQL with a one-line change.
- **Photo storage:** an abstraction layer (`backend/src/lib/storage.ts`)
  that saves to local disk today and is written so an S3/GCS/Azure Blob
  driver can be dropped in without touching any route code. Only photo
  *metadata* is ever stored in the database, never binary image data.

## 2. System architecture

```
 ┌────────────┐        HTTPS/JSON        ┌───────────────┐       ┌────────────┐
 │  React SPA │ ───────────────────────► │  Express API  │ ────► │  Database  │
 │  (Vite)    │ ◄─────────────────────── │ (JWT-secured) │       │ (SQLite/PG)│
 └────────────┘                          └───────┬───────┘       └────────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │ Storage driver  │
                                          │ (local / S3)    │
                                          └─────────────────┘
```

- Auth: stateless JWT bearer tokens issued at register/login, decoded by
  `authenticate` middleware, role-gated by `requireRole("ADMIN" | "MEMBER")`.
- Access control: every event-scoped route re-checks that the caller is
  either the Admin who created the event or a Team Member explicitly
  assigned to it (`src/lib/access.ts`) — this is what stops a user from
  reaching another team's event just by guessing an ID.
- Gallery publish is a **snapshot**: publishing copies the currently
  selected photo IDs into a `GalleryPhoto` join table and issues a fresh
  6-digit PIN (bcrypt-hashed, never stored in plaintext). Re-selecting
  photos in the workspace afterward does not change what's already live
  until the Admin re-publishes.
- The public gallery routes (`/api/public/gallery/*`) carry no auth at
  all by design — the PIN *is* the access control — and only ever return
  photos that were part of that snapshot.

### Database schema

```
User (id, name, email, passwordHash, role[ADMIN|MEMBER])
Event (id, name, createdBy → User)
EventMember (eventId, userId)              — join table: who's on which event
Photo (id, eventId, uploadedById, filename, storageKey,
       storageLocation, mimeType, fileSize, selected, createdAt)
Gallery (id, eventId [unique], slug [unique], pinHash, publishedAt)
GalleryPhoto (galleryId, photoId)          — snapshot of what was published
```

See `backend/prisma/schema.prisma` for the full source of truth.

## 3. Local setup

Requires Node.js 18+.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates dev.db and applies the schema
npm run seed                         # optional: demo accounts + a sample gallery
npm run dev                          # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL should point at the backend above
npm install
npm run dev              # http://localhost:5173
```

### Running tests

```bash
cd backend
npm test
```

Tests use Vitest + Supertest against the same Express app used in
production (`src/app.ts`), hitting the real SQLite database configured in
`.env`, with randomly generated emails per run so they never collide.
Coverage includes: registration/login, rejecting bad credentials, blocking
unauthenticated requests, a Team Member being blocked from creating events
or publishing galleries, a non-member being blocked from viewing an event,
one Admin being blocked from managing another Admin's event, publishing a
gallery, rejecting the wrong PIN, accepting the correct PIN, and confirming
photos left out of publishing never appear via the public endpoint.

> **A note on this build's own testing:** I wrote and reviewed this code
> carefully and it type-checks cleanly end to end, but I built it inside a
> sandboxed environment that could not reach `binaries.prisma.sh` (the host
> Prisma's CLI downloads its query engine from), so I could not execute
> `prisma generate` or run the test suite myself before handing this over.
> On a normal machine with internet access, the setup steps above should
> work exactly as written — please run `npm test` yourself once you have
> the project locally, and let me know if anything doesn't check out.

## 4. Environment variables

**Backend (`backend/.env`)** — see `.env.example` for the full list:
`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `STORAGE_DRIVER`,
`AWS_*` (only if `STORAGE_DRIVER=s3`), `CORS_ORIGIN`.

**Frontend (`frontend/.env`)**: `VITE_API_URL` — the backend's base URL.

## 5. Deployment steps (suggested)

This repo isn't pre-wired to a specific host — pick whichever you're
comfortable with. A simple, free-tier-friendly path:

1. **Database:** provision a small Postgres instance (Neon, Supabase, or
   Railway all have free tiers). Change `datasource db { provider =
   "postgresql" }` in `schema.prisma`, set `DATABASE_URL` accordingly, and
   run `npx prisma migrate deploy`.
2. **Photo storage:** create an S3 bucket (or GCS/Azure equivalent),
   implement `S3StorageDriverStub` in `backend/src/lib/storage.ts` using
   `@aws-sdk/client-s3`, and set `STORAGE_DRIVER=s3` plus the `AWS_*`
   variables. (Left as a stub in this submission — see Known Limitations.)
3. **Backend:** deploy `backend/` to Render, Railway, or Fly.io as a Node
   web service (`npm run build && npm start`).
4. **Frontend:** deploy `frontend/` to Vercel or Netlify as a static Vite
   build (`npm run build`, publish `dist/`), with `VITE_API_URL` set to
   the deployed backend's URL.
5. Update `CORS_ORIGIN` on the backend to the deployed frontend's origin.

## 6. Demo credentials (after running `npm run seed`)

- **Admin/Lead:** `admin@demo.com` / `Passw0rd!`
- **Team Member:** `member@demo.com` / `Passw0rd!`
- **Demo gallery:** `/gallery/abc123`, PIN `482917`

## 7. Known limitations

- **S3 storage is a documented stub, not wired up.** Photos are fully
  functional via local disk storage (correctly abstracted behind an
  interface), but implementing the real AWS SDK calls was left out to
  keep the take-home scoped — see `backend/src/lib/storage.ts` for exactly
  where that plugs in.
- **No image resizing/thumbnails, pagination, or CDN** — listed as
  optional/bonus items in the brief and intentionally deprioritized in
  favor of the core workflow being solid.
- **Gallery PINs are per-event, not per-viewer**, and there's no
  expiration or rate-limiting on PIN attempts yet — worth adding before
  any real production use.
- **Prisma CLI could not be exercised in the authoring sandbox** (see
  the testing note above) — please run the setup + test steps yourself
  on first checkout.

## 8. Explaining scenario handling

| Scenario from the brief | How it's handled |
|---|---|
| User accesses another event | `assertEventAccess` returns 403 on every event-scoped route |
| Team Member tries to publish a gallery | blocked by `requireRole("ADMIN")` on the publish route |
| Failed photo upload | multer file-type/size limits + try/catch return a 400/500 with a clear message |
| Incorrect gallery PIN | bcrypt compare fails → 401, generic message (no hints) |
| Access to unpublished photos | public endpoint only ever reads from the `GalleryPhoto` snapshot, never raw `Photo` rows |
