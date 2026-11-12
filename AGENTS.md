# Instructions for coding agents (Codex, Claude Code…)

JoyTo is a Next.js 15 (App Router) + React 19 + TypeScript (strict) app. UI in English by default, French available.

## Commands
- `npm run dev` — dev server on http://localhost:3000
- `npm run check` — typecheck + unit tests + production build. Run it before finishing any task; it must pass.
- `npm run format` — Prettier (print width 140).

## Architecture rules
- Data model: `src/lib/types.ts`, mirrored in `db/schema.sql`. Keep both in sync.
- All business rules live in `src/lib/actions.ts` (writes) and `src/lib/selectors.ts` / `matching.ts` / `pricing.ts` (reads and calculations). Screens must not duplicate business logic.
- Screens call `run((s) => someAction(s, ...))` from `useStore()`. `run` returns the action result synchronously.
- Never store translated text in data: notifications store a `type` + ids, rendered by `src/lib/notifications.ts`.
- Privacy: a companion only sees the senior's last name and the meeting point after their offer is accepted (`missionForCompanion`). Do not bypass it.
- The AI route (`src/app/api/assistant`) may only suggest activities passed in `candidates`; keep `sanitize()` and zod validation.

## Joy (voice assistant, flagship feature)
- Proposals are computed from data in `src/lib/joy/proposals.ts` (no text), turned into words in `src/lib/joy/script.ts`.
- Voice engine `src/components/joy/useJoyVoice.ts`: GPT Realtime 2.1 over WebRTC when `OPENAI_API_KEY` is set (ephemeral key from `/api/joy/session`), browser speech otherwise.
- Hard rule: Joy never books or pays. Tool `open_confirmation` only opens `ProposalSheet`; the user must tap the green button. Never send last names or addresses to the model.
- Joy only starts on a user tap (browser audio policy and product choice).

## Text and translations
- Every user-facing string goes in `src/i18n/en.ts` AND `src/i18n/fr.ts` (TypeScript fails if a French key is missing).
- Use `const { t, f } = useI18n()`: `t` for texts, `f` for dates, money, durations and bilingual seed texts (`f.text(value)`).

## Design rules (art direction "Cultivating connection")
- Use tokens and classes from `src/app/globals.css`; do not hard-code new colours.
- Forest green `--forest` for primary buttons, coral for accents and map pins, sun for alerts, navy for headings, sand/linen background.
- Font Nunito; base size 18 px; tap targets ≥ 48 px; text contrast ≥ 4.5:1.
- Must work at 390 px wide with no horizontal scroll (bottom tab bar on phones, top navigation from 960 px).

## Demo
- Seed data: `src/lib/seed.ts` (all fictional). Demo password: `demo1234`.
- Bump `version` in `createSeed()` when the shape of the data changes, so browsers reload the seed.
