# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Demo Next.js app for a Malaysian bank client, showcasing AI-powered loan application review. Frontend only — the AI API is not yet built.

## Tech Stack

- Next.js 16 (App Router, Turbopack for dev)
- React 19, TypeScript (strict mode)
- Tailwind CSS v4 (uses `@tailwindcss/postcss`, no `tailwind.config.js`)
- shadcn/ui (base-luma style, RSC enabled)
- pnpm

## Code Style

- No semicolons, double quotes, 2-space indent, trailing commas (ES5)
- Prettier with `prettier-plugin-tailwindcss` sorts Tailwind classes automatically
- Run `pnpm format` to format all files
- Path alias: `@/*` maps to project root

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript check (`tsc --noEmit`)
- `pnpm format` — Prettier (writes in-place)

## Architecture: Async Review Submission (polling)

The loan-review flow calls `dev-genie.001.gs/smart-api/*` **directly from the browser** (genie-core CORS is `*`; the published smart-API routes are public/unauthenticated).

```
Browser ──POST multipart──> dev-genie/reviewer_v2            → { taskID }
Browser ──GET poll (3s)───> dev-genie/reviewer_v2/status/:id → nodeInfos + status (+ output on success)
Browser ──GET poll (5s)───> dev-genie/hl-get-status          → result statuses for history
```

**Key points:**

- `reviewer_v2` is **async**: submit returns a `taskID`; the browser polls `reviewer_v2/status/:taskID` until `status` is `success` (carries `output.{ca,result,summary,decision}` as ordered `[{Key,Value}]` arrays) or `failed` (carries `errorMessage`).
- **TanStack Query** owns all server state and polling (`lib/loan-review/hooks.ts`); polling auto-stops on terminal state. Pure derivations live in `lib/loan-review/phase.ts`.
- The old fly.io proxy was removed — it only existed to dodge Vercel's 60 s streaming timeout, which no longer applies now that every request is short. (The fly.io machine, if still running, can be decommissioned separately with `fly apps destroy`.)
- History (`hl_retriever`) and delete (`mbl_delete_s2`) also call `dev-genie` directly.
