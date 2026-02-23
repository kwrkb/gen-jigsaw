# Gen-Jigsaw: Gemini Context

このファイルは、Gemini CLI がプロジェクトの構造、技術スタック、および開発フローを理解するためのガイドラインです。

## プロジェクト概要

Gen-Jigsaw は、生成AI (DALL-E 2) を利用した協働型アウトペイントパズルアプリケーションです。プレイヤーは 1 枚の初期タイルから始まり、隣接するセルに新しいタイルを生成して世界を広げていきます。ルームオーナーが生成されたタイルの採用・却下を決定するキュレーション機能を持ちます。

## 技術スタック

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Frontend**: React 19, TypeScript, [TailwindCSS v4](https://tailwindcss.com/)
- **Database**: SQLite with [Prisma 6](https://www.prisma.io/)
- **Authentication**: [iron-session](https://github.com/vvo/iron-session) (Cookie-based session)
- **Image Generation**: OpenAI DALL-E 2 (Provider pattern for Mock support)
- **Real-time**: Server-Sent Events (SSE) for room state updates
- **Testing**: [Vitest](https://vitest.dev/)
- **Package Manager**: npm (Node.js 24+, managed via [mise](https://mise.jdx.dev/))

## ディレクトリ構成

- `src/app/`: Next.js のページコンポーネントと API ルート
    - `api/`: REST API エンドポイント
    - `room/[id]/`: パズル画面
- `src/components/`: 再利用可能な UI コンポーネント
    - `canvas/`: グリッドの描画、パン・ズーム操作
    - `expansion/`: プロンプト入力、候補タイルのプレビューと採用 UI
- `src/lib/`: コアロジックと外部サービス連携
    - `image-gen/`: 画像生成プロバイダー（DALL-E 2, Mock）
    - `storage/`: 画像ストレージプロバイダー（Local, S3 互換）
    - `sse-emitter.ts`: ルームイベントの配信管理
    - `lock-service.ts`: セルの排他制御（ロックシステム）
- `src/types/`: 共有型定義
- `prisma/`: データベーススキーマ (`schema.prisma`)
- `public/`: 静的資産およびローカルに保存された生成画像

## 主要な開発コマンド

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# データベースのマイグレーション（スキーマの適用）
npm run db:push

# Prisma Studio の起動
npm run db:studio

# テストの実行
npm run test

# 型チェック
npx tsc --noEmit
```

## 開発の規約とガイドライン

### 1. コーディングスタイル
- React 19 の機能（`use` hook, Server Components 等）を積極的に活用します。
- スタイリングには TailwindCSS v4 を使用し、インラインクラスでの定義を基本とします。

### 2. データ更新と同期
- タイルの追加やステータス変更は、SSE (`/api/rooms/[id]/events`) を通じてクライアントに通知されます。
- クライアント側では `useRoom` フック（`src/hooks/use-room.ts` 相当）を使用して SSE を購読し、状態を最新に保ちます。

### 3. 排他制御
- 同一のセルに対して複数のユーザーが同時に生成を開始しようとするのを防ぐため、`Lock` モデルを使用したロックシステムが実装されています。
- 新しい `Expansion` を作成する前に、必ず `src/lib/lock-service.ts` を通じてロックを取得する必要があります。

### 4. 画像生成とストレージ
- 開発環境では `IMAGE_GEN_PROVIDER=mock` を使用することで、API キーなしで動作確認が可能です。
- 生成された画像は `STORAGE_PROVIDER=local` の場合、`public/generated/` に保存され、`/generated/filename` としてアクセスされます。

## データモデルの要点

- **Room**: パズルのセッション。オーナーがタイルの採用権限を持ちます。
- **Tile**: 確定した画像。`(roomId, x, y)` で一意。
- **Expansion**: 生成中の候補。ステータス管理 (`QUEUED` -> `RUNNING` -> `DONE` -> `ADOPTED`/`REJECTED`) が重要です。
- **Lock**: セルの編集中状態を保持。一定時間 (90s) でタイムアウトします。
