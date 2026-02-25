# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gen-Jigsaw is a collaborative AI-powered outpainting puzzle app. Users expand a world grid by generating new tiles in adjacent cells. The room owner reviews and adopts/rejects generated tiles.

**Stack:** Next.js 15 (App Router) / React 19 / TypeScript / Prisma / SQLite / TailwindCSS v4 / Zod

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run tests (Vitest)
npm run db:push      # Apply Prisma schema to SQLite
npm run db:studio    # Open Prisma Studio GUI
npx tsc --noEmit     # Type check
```

Node.js 24 is managed via mise (`mise.toml`).

## Architecture

### Data Flow

Client (React + hooks) → Next.js API Routes → Prisma → SQLite (`prisma/dev.db`)

### Key Directories

- `src/app/api/` — API routes (REST endpoints)
- `src/app/room/[id]/` — Room detail page
- `src/components/canvas/` — Interactive grid with pan/zoom (`tile-grid.tsx`, `tile-cell.tsx`)
- `src/components/expansion/` — Prompt input & candidate list UI
- `src/hooks/` — `useUser` (iron-session cookie), `useRoom` (SSE + 3s polling fallback), `useToast`
- `src/lib/` — Prisma singleton, Zod validation schemas, error helpers, lock service
- `src/lib/image-gen/` — Provider pattern for image generation (mock + DALL-E 2)
- `src/lib/storage/` — Storage provider abstraction (currently local filesystem)
- `src/types/` — Shared TypeScript types
- `prisma/schema.prisma` — Database schema (User, Room, Tile, Expansion, ExpansionVote, Lock)

### Core Workflow: Expansion Lifecycle

1. User clicks "+" on adjacent cell → **acquires lock** (90s TTL)
2. Enters prompt → creates **Expansion** (status: QUEUED)
3. Client calls `/api/expansions/[id]/run` → image generation → status: DONE
4. Users vote on candidates (ExpansionVote: ADOPT / REJECT)
5. After timeout (default 60s), `auto-adopt.ts` resolves based on vote tally → ADOPTED (creates Tile + releases lock) or REJECTED (releases lock)

Status transitions: `QUEUED → RUNNING → DONE → ADOPTED/REJECTED` (or `FAILED`)

### Lock System (`src/lib/lock-service.ts`)

Optimistic locking per grid cell `(roomId, x, y)` with 90-second TTL. SQLite serialized writes ensure safety. Expired locks are cleaned up on acquisition attempts.

### Image Generation (`src/lib/image-gen/`)

Provider interface pattern. `MockImageGenProvider` copies `public/placeholder.png` to `public/generated/{cuid}.png`. `DallE2ImageGenProvider` uses OpenAI API. Swap via `IMAGE_GEN_PROVIDER` env var (`mock` or `dalle2`).

### State Management

- **User identity:** iron-session cookie (`gen_jigsaw_session`) — sealed/encrypted, httpOnly
- **Room state:** SSE via `/api/rooms/:id/events` with 3-second polling fallback (`useRoom` hook)
- **Path alias:** `@/*` → `./src/*`

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/users` | Create user (sets session cookie) |
| GET/DELETE | `/api/session` | Get current user / logout |
| GET/POST | `/api/rooms` | List / create room |
| GET | `/api/rooms/:id` | Room detail (tiles, expansions, locks) |
| GET | `/api/rooms/:id/events` | SSE stream for real-time updates |
| POST | `/api/rooms/:id/generate-initial` | Generate initial tile image |
| POST/DELETE | `/api/rooms/:id/locks` | Acquire / release lock |
| POST | `/api/rooms/:id/expansions` | Create expansion |
| POST | `/api/expansions/:id/run` | Execute image generation |
| POST | `/api/expansions/:id/adopt` | Record ADOPT vote |
| POST | `/api/expansions/:id/reject` | Record REJECT vote |

All endpoints validate input with Zod schemas from `src/lib/validation.ts`.

## Implementation Guidelines

### SSE + Fallback Polling (`useRoom`)

`use-room.ts` のSSE/ポーリング制御は過去4回修正されている。変更時は以下を守ること:

- **`onopen`**: SSE接続（再接続含む）確立時に発火。ここでフォールバックポーリングを停止する
- **`onerror`**: 切断時に発火。ここでフォールバックポーリングを開始する
- **`room_update`イベント**: データ受信時。`fetchRoom()` + ポーリング停止
- カスタムイベント（`ready`等）をポーリング制御に使わない。サーバー実装に依存し、再接続ループ時に期待通り発火しない場合がある

### fetch後のハンドリング

fire-and-forget的なfetch（`generate-initial`等）では、成功・HTTPエラー・ネットワークエラーの**3ケース全て**を最初から考慮する。典型的には `.finally(callback)` で統一するのが最もシンプル。

- `res.ok` のみで分岐するとHTTPエラー時に状態更新が漏れる
- `catch` でフラグをリセットすると `refetch` → 再評価 → 即再fetch のループリスクがある
