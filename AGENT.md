# Estaer — Agent Instructions

This file orients any agent (human or AI) working on `web/`. Read it before
making changes.

## Instruction precedence

When sources conflict, follow this order:

1. Explicit, confirmed decisions from the user in the current conversation.
2. The original Equipment Lending requirements (reproduced in the project's
   planning conversation; not duplicated here — see "Source documents"
   below).
3. This repo's own code and docs (`docs/STRUCTURE.md`,
   `docs/DESIGN_SYSTEM_REFERENCE.md`, `docs/changelogs/`).
4. `../FRONTEND_STRUCTURE_PROMPT.md` — reference for file/folder
   organization and naming **only**. Its HTTP backend, Axios, and
   cookie-session assumptions do **not** apply to this project. Supabase is
   the backend; see "Backend adaptation" below.
5. `../Estaer-Design-Handoff/` — the approved **visual** reference. It is a
   static prototype: fake auth, route-selected roles, localStorage sample
   data, and a fixed sample clock (2026-11-04). None of that is production
   behavior. Treat its reservation-rule assumptions as superseded by the
   confirmed rule in "Business rules" below.

## Backend adaptation (read before touching auth or data)

`FRONTEND_STRUCTURE_PROMPT.md` describes a project with an existing HTTP API
(Axios, `withCredentials` cookies, `VITE_API_BASE_URL`). Estaer has none of
that. Concretely:

- No `lib/apiClient.ts` and no `VITE_API_BASE_URL` exist yet. They are not
  "missing" — they are deferred until a real HTTP API replaces Supabase.
- Supabase Auth + Postgres is the backend for this phase. All SDK calls live
  behind feature `apis/*.api.ts` files (the access layer) — see
  `docs/STRUCTURE.md`.
- Sessions use the Supabase JS SDK's own session management (not a custom
  `HttpOnly` cookie scheme — that requirement from the reference template
  does not apply here). See the Phase 3 changelog entry for the exact
  configuration once it exists.
- `types/api.types.ts` (plural) holds the application-owned `APIError`
  shape. It normalizes Supabase errors — no Supabase types or raw SDK
  responses may cross out of the access layer.

## Business rules that override the design handoff

- **Reservation**: the first `pending` or `approved` request on an item
  reserves it exclusively, regardless of requested dates, until rejected or
  actually returned. The prototype's date-overlap check is superseded.
- **Overdue**: begins the calendar day _after_ the return due date
  (last day of use + 1), not on the last day of use itself.
- **Dashboard "on loan"**: an `approved` request whose start date has
  arrived and which has not been marked `returned`. Approval is not
  physical handover; there is no separate "collected" status.
- Request statuses are exactly: `pending → approved → returned` or
  `pending → rejected`. No other statuses.

## Files to read before editing

- `docs/STRUCTURE.md` — folder layout, naming, dependency direction,
  documented deviations from `FRONTEND_STRUCTURE_PROMPT.md`.
- `docs/DESIGN_SYSTEM_REFERENCE.md` — colors, radius, typography, RTL
  rules, and any manual fix applied on top of shadcn CLI output.
- The latest files under `docs/changelogs/` for recent, not-yet-folded-in
  decisions.

## Verification commands

Run after every coherent change, in order, and fix failures before
reporting the task done:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run typecheck` is `tsc -b --noEmit` (project-reference build mode) —
plain `tsc --noEmit` at the root would silently check nothing, since the
root `tsconfig.json` is solution-style (`"files": []`, references only).
Do not substitute it.

## Completion report format

At the end of each task, report in simple Arabic:

1. What was completed.
2. Which files were created/changed and why.
3. Which commands/tests actually ran, with real results.
4. Unresolved issues or configuration the user still needs to do.
5. The next proposed phase.

Never claim a command passed without running it. Never claim security,
email delivery, or auth is verified unless actually exercised.
