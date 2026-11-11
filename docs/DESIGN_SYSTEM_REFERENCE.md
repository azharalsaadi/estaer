# Design System Reference

Source of truth for visuals: `../../Estaer-Design-Handoff/Estaer-Design-Handoff/design-reference/`
(`styles.css`, `app.js`, `assets/`). This file records how that reference
maps onto our Tailwind v4 + shadcn/ui tokens, and every manual fix applied
on top of shadcn CLI output.

## Stack

Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config, no
`tailwind.config.js`) + shadcn/ui, **style: `radix-nova`** (preset `nova`,
base `radix`, `rtl: true`, `iconLibrary: lucide`, `cssVariables: true`).
No other component library (Mantine was an earlier, now-superseded,
proposal — do not add it).

## Color tokens (`src/index.css`)

Mapped 1:1 from the reference CSS variables:

| Token                  | Light value | Reference source              |
| ---------------------- | ----------- | ----------------------------- |
| `--background`         | `#fbfdfc`   | `body{background:#fbfdfc}`    |
| `--foreground`         | `#163b3c`   | `--ink`                       |
| `--primary`            | `#007f7c`   | `--teal`                      |
| `--muted` / `--accent` | `#e3f7f4`   | `--mint`                      |
| `--muted-foreground`   | `#637c7d`   | `--muted`                     |
| `--border`             | `#e2ecea`   | `--line`                      |
| `--input`              | `#ccdcd8`   | input border in `styles.css`  |
| `--ring`               | `#39a9a0`   | `focus-visible` outline color |
| `--destructive`        | `#b84939`   | rejected/overdue badge text   |

**Important convention**: this shadcn preset's generated components apply
their own opacity to `--destructive` (e.g. `bg-destructive/10
text-destructive`) — the token must hold the _saturated_ color, not a
pre-lightened background, or the badge/button text renders too pale to
read. Do not "fix" this by lightening `--destructive` again.

Four additional custom tokens exist for request-status pills, not part of
shadcn's own palette: `--success`/`--success-foreground` (approved, mint
green text on pale green), `--warning`/`--warning-foreground` (pending,
amber), `--neutral`/`--neutral-foreground` (returned, grey) — each a
direct bg/text pair (no opacity trick), matching `.badge.pending` /
`.badge.rejected` / `.badge.returned` in the reference CSS. These are
unused by any component yet; they'll back the status badge in Phase 5/6.

Dark mode tokens exist (shadcn always generates them) but are **not wired
up** — no toggle, no `.dark` class is ever applied. The approved design has
one light theme only.

## Radius scale

`--radius: 0.625rem` (10px) is the shadcn default and already matches the
reference's button radius (`border-radius:10px`) exactly. Derived scale:
`sm`=6px, `md`=8px, `lg`=10px, `xl`=14px, `2xl`=18px, `3xl`=22px, `4xl`=26px.
Cards use `rounded-xl`/`2xl` (14–18px, reference calls for 14–17px — close
enough to use the scale). The Member hero uses an explicit `rounded-[27px]`
arbitrary value instead of the scale, since the reference calls out 27px
specifically as a one-off, not a scale step.

## Typography

`Segoe UI, Arial, sans-serif` — **no external font**. The shadcn Nova
preset defaults to a self-hosted `Geist Variable` font
(`@fontsource-variable/geist`); that package and its CSS import were
removed, and `--font-sans` was overridden in the `@theme inline` block.
Base body size is 15px (`body{font-size:15px}` in `@layer base`), matching
the reference.

## Button / Badge adjustments over CLI output

- `Button`'s `default` size was `h-8 px-2.5` (shadcn's compact default) —
  changed to `h-11 px-5` to match the reference's `padding:12px 20px`
  button proportions.
- `Button`'s `secondary` variant had no visible border — added
  `border-border` so it matches the reference's white-bg + border
  secondary button.
- Everything else in `components/ui/` is unmodified CLI output except the
  `cn` import fix described in `STRUCTURE.md`.

## RTL

- `components.json` has `rtl: true`.
- `App.tsx` wraps the router in `radix-ui`'s `<Direction.Provider>`, driven
  by `useLanguageToggle()` (also sets `document.documentElement.lang`/`dir`
  — mounted once at the app root so it applies even on the public login
  pages, which render no shell).
- Tailwind logical utilities (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`,
  `text-start`/`text-end`) are used throughout instead of `ml-`/`mr-`/
  `left-`/`right-`. The one known exception is `components/ui/sheet.tsx`'s
  `side` prop (physical only) — see `STRUCTURE.md`.
- The OTP/email inputs in the login form are `dir="ltr"` regardless of
  page language, per the numeric/identifier-input rule.
- Directional icons (`ArrowUpRight` in the hero CTA) get
  `rtl:scale-x-[-1]`.

## Assets

Copied (not moved) from the design handoff into `public/assets/`:
`estaer-logo.png`, `equipment-pattern.svg`, `cameras.svg`, `laptops.svg`,
`projectors.svg`, `cables.svg`. The handoff folder itself is untouched.
