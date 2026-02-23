# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains App Router pages and API routes (`src/app/api/**/route.ts`).
- `src/components/` holds UI building blocks (`canvas/`, `expansion/`, form/toast components).
- `src/lib/` contains shared server/client logic (Prisma client, validation, lock service, image provider abstraction).
- `src/types/` stores shared TypeScript types.
- `prisma/schema.prisma` defines the data model; SQLite is used locally.
- `public/` keeps static assets and generated images (`public/generated/`).

## Build, Test, and Development Commands
- `mise install` installs the pinned Node runtime from `mise.toml` (Node 24).
- `npm install` installs dependencies.
- `npm run db:push` syncs Prisma schema to the local DB.
- `npm run dev` starts local development server at `http://localhost:3000`.
- `npm run build` creates a production build; `npm run start` serves it.
- `npm run db:studio` opens Prisma Studio for DB inspection.
- `npx tsc --noEmit` performs type-checking (primary automated quality gate).

## Coding Style & Naming Conventions
- Use TypeScript with strict typing; avoid `any` unless justified.
- Use 2-space indentation and double quotes (match existing files).
- React components: PascalCase (`TileGrid`); variables/functions: camelCase.
- Keep route handlers in `route.ts` files under `src/app/api/...`.
- Prefer `@/*` path alias imports over deep relative paths.

## Testing Guidelines
- No dedicated test framework is configured yet.
- Before opening a PR, run `npx tsc --noEmit` and `npm run build`.
- Validate core flows manually: user setup, room creation, expansion run/adopt/reject, and lock behavior.
- If adding tests, colocate near source as `*.test.ts` / `*.test.tsx` and document the run command in your PR.

## Commit & Pull Request Guidelines
- Follow concise, imperative commit messages; `fix: ...` style (Conventional Commit prefix) is preferred.
- Keep commits scoped to one concern.
- PRs should include: purpose, key changes, manual verification steps, and screenshots/GIFs for UI changes.
- Link related issues and note schema/env changes explicitly.

## Security & Configuration Tips
- Never commit secrets; keep local values in `.env`.
- Coordinate Prisma schema changes carefully and mention migration impact in PR notes.
