# 実装計画: Gen-Jigsaw MVP強化

## 実行ステータス

### Goal
`PLAN.md` に定義した MVP 強化項目（画像生成本番化 / SSE / セッション認証 / テスト基盤）を段階的に実装し、進捗を同期する。

### Steps
- [completed] フェーズ1: DALL-E 2 プロバイダ実装・画像生成経路の差し替え
- [completed] フェーズ2: SSE エンドポイントとイベント発火の実装
- [completed] フェーズ3: `iron-session` によるセッション認証と API 権限移行
- [completed] フェーズ4: Vitest/CI の最小導入（可能な範囲）
- [completed] 最終検証（type-check/build）と `PLAN.md` 最終更新

### Notes
- 依存追加（`npm install`）は `getaddrinfo EAI_AGAIN registry.npmjs.org` により未完了。
- そのため `npx tsc --noEmit` は新規依存未導入エラーで停止し、`npm run build` / `npm test` は未実行。

## 現状の把握

- **基本機能**: ルーム作成、タイルの拡張（モック生成）、採用/却下、ロック機構は実装済み。
- **画像生成**: `MockImageGenProvider` が `placeholder.png` をコピーするのみ。
- **リアルタイム性**: `useRoom` フックは SSE 優先（`ready`/`room_update`/`error` イベント）＋ポーリングフォールバック実装済み。バックエンドの SSE エンドポイント (`/api/rooms/[id]/events`) は未実装。
- **認証**: `use-user.ts` は `GET /api/session` でセッション読み込み、`DELETE /api/session` でログアウト、`POST /api/users` でユーザー作成を行う設計。ただしサーバー側 `/api/session` ルートは未実装（404）。`localStorage` は未使用。
- **FAILED 時ロック解放**: `src/app/api/expansions/[id]/run/route.ts:59-71` でトランザクション処理済み（実装完了）。

## 妥当性チェック（2026-02-23）

- 計画の方向性（本番画像生成 / SSE / 認証強化 / テスト整備）は `README.md` の TODO と現行実装に整合しており妥当。
- 画像生成プロバイダは **DALL-E 2** を採用。DALL-E 3 はアウトペインティング非対応、Stable Diffusion は実装コスト高のため除外。
  - DALL-E 2 の `/v1/images/edits` エンドポイントでマスク付き outpainting を実現。
  - `GenerateInput.referenceImageUrl` + `direction`（`N`/`E`/`S`/`W`）からマスク画像を生成してAPIへ渡す。
  - 将来的な差し替えは `IMAGE_GEN_PROVIDER` 環境変数で制御（Stability AI 等）。

## 開発目標

1. 画像生成を **DALL-E 2**（OpenAI `/v1/images/edits`）へ差し替え、アウトペインティングによるタイル拡張を実現する。
2. SSE (Server-Sent Events) を導入し、他ユーザーの操作を即座に反映させる。
3. `iron-session` を導入し、セッションベースの確実な認証と権限制御（オーナーのみ採用可能等）を実現する。
4. 自動テストを導入し、複雑なロック機構や状態遷移の品質を担保する。

---

## 実施フェーズ

### フェーズ1: 画像生成基盤の本番対応（DALL-E 2）

**採用プロバイダ:** OpenAI DALL-E 2 (`/v1/images/edits`) — outpainting に対応する唯一の低コスト選択肢。

#### 実装ステップ

- [ ] `openai` npm パッケージの追加
- [ ] `sharp` npm パッケージの追加（マスク画像生成・RGBA変換に必須）
- [ ] `DallE2ImageGenProvider` の実装 (`src/lib/image-gen/dalle2-provider.ts`)
  - `referenceImageUrl`（例: `/generated/xxx.png`）をローカルパスへ変換:
    `path.join(process.cwd(), 'public', referenceImageUrl)`
  - 参照画像を PNG (RGBA) へ変換（`sharp` を使用）
  - `direction`（`N`/`E`/`S`/`W`）に応じてアルファチャンネル付きマスク画像を生成
    - 例: `E` → 参照画像の右半分をマスク（透過）、左半分を不透過
    - 例: `S` → 参照画像の下半分をマスク（透過）、上半分を不透過
  - OpenAI `images.edit()` へ参照画像・マスク・プロンプトを渡す
  - `size` は `256x256` または `512x512`（現行 `run/route.ts:45` で `256` ハードコード）
  - レスポンスの `url` をダウンロードして `/public/generated/{cuid}.png` に保存
- [ ] リトライロジックの実装（指数バックオフ、最大3回、429/5xx のみ対象）
- [ ] `src/lib/image-gen/index.ts` に `IMAGE_GEN_PROVIDER=dalle2` のケースを追加
- [ ] `.env.example` に `OPENAI_API_KEY`, `IMAGE_GEN_PROVIDER=dalle2` を追記
- [ ] 生成済み画像の保存先を `/public/generated/` から Cloudflare R2 / AWS S3 等へ移行（将来対応・オプション）

#### 実装済み（対応不要）

- ~~FAILED 時のロック解放~~: `run/route.ts:59-71` のトランザクション処理で実装済み

---

### フェーズ2: リアルタイム更新 (SSE) の導入

**クライアント側は変更不要**。`use-room.ts` の SSE 雛形は完成しており、`ready`/`room_update`/`error` イベントを処理する。

#### サーバー側実装ステップ

- [ ] SSE エミッター (`src/lib/sse-emitter.ts`) の実装
  - `EventEmitter` ベースの in-process pub/sub
  - `emit(roomId: string, event: string)` でルーム単位にイベント発火
- [ ] SSE エンドポイントの実装 (`src/app/api/rooms/[id]/events/route.ts`)
  - Next.js App Router の `ReadableStream` + 生 `Response` パターンを使用
  - `request.signal` の `abort` イベントでクリーンアップ（接続切断時のリスナー除去）
  - 接続確立時に `ready` イベントを送信
  - `room_update` イベントを受信したらクライアントへ転送
- [ ] 状態変更時のイベント発火（以下6ルートに `sse-emitter.emit()` を追加）
  - `POST /api/rooms/:id/expansions` — Expansion 作成時
  - `POST /api/expansions/:id/run` — DONE/FAILED 更新時
  - `POST /api/expansions/:id/adopt` — Tile 追加時
  - `POST /api/expansions/:id/reject` — Expansion 却下時
  - `POST /api/rooms/:id/locks` — Lock 取得時
  - `DELETE /api/rooms/:id/locks` — Lock 解放時

---

### フェーズ3: 認証・権限制御の強化（`iron-session`）

**`iron-session`（暗号化 Cookie セッション）を採用**。`use-user.ts` の既存構造（`GET /api/session`、`DELETE /api/session`、`POST /api/users`）をそのまま活用するため、**クライアント側の変更は不要**。

#### 実装ステップ

- [ ] `iron-session` npm パッケージの追加
- [ ] `src/lib/session.ts` の実装
  - `getSession(req)`: Cookie からセッション復号 → `{ userId, displayName }` を返す
  - `setSession(res, user)`: `Set-Cookie` ヘッダを付与
  - `destroySession(res)`: Cookie を無効化
  - `.env.example` に `SESSION_SECRET`（32文字以上のランダム文字列）を追記
- [ ] `/api/session` ルートの実装
  - `GET`: Cookie からセッション復号 → ユーザー情報を返す（未セッション時は 401）
  - `DELETE`: Cookie 破棄 → 204 を返す
- [ ] `POST /api/users` の改修
  - ユーザー作成後、レスポンスで `Set-Cookie`（`setSession` 呼び出し）を設定
- [ ] `src/lib/auth.ts` の実装
  - `getUserIdFromSession(req)`: Cookie セッションから `userId` を取得するヘルパー
  - 各 API ルートで段階的に `body.userId` の参照を置換
- [ ] `adopt`/`reject` のオーナーチェックをセッションベースに移行

#### 移行戦略

1. まず `/api/session` を実装（クライアント変更なし、既存 API は変更なし）
2. `POST /api/users` に `Set-Cookie` を追加
3. 各 API ルートを順次 `getUserIdFromSession` ベースへ移行

---

### フェーズ4: 品質ゲートとテストの整備

**テストフレームワーク: Vitest**（ESM ネイティブ、Next.js 親和性が高い）

#### 実装ステップ

- [ ] `vitest` パッケージの追加と `vitest.config.ts` の設定
  - `@/*` パスエイリアスの解決設定（`tsconfig.json` の `paths` と合わせる）
- [ ] `lock-service.ts` の単体テスト作成
- [ ] Expansion ライフサイクル（`QUEUED → RUNNING → DONE`）の統合テスト作成
- [ ] CI (GitHub Actions) 設定 (`.github/workflows/ci.yml`)
  - `jdx/mise-action@v2` で Node.js 24 をセットアップ（`mise.toml` 対応）
  - Lint (`eslint`)、Type-check (`npx tsc --noEmit`)、Test (`vitest`) を自動実行

---

## フェーズ間依存関係

```
フェーズ1 (DALL-E 2)  ─┐
                        ├── フェーズ3 (iron-session) ── フェーズ4 (テスト)
フェーズ2 (SSE)       ─┘
```

- **フェーズ1 と 2 は並行可能**（依存関係なし）
- **フェーズ3 は全 API に影響する**ため、1・2 完了後が望ましい
- **フェーズ4 はいつでも開始可能**だが、3 完了後が効率的

---

## 期待される成果

- ユーザーが「+」を押してから、隣接タイルに整合した画像がアウトペインティングで生成・表示される。
- 他のユーザーが拡張している場所がリアルタイムで分かるようになる。
- セキュアな環境でルーム運営ができるようになる。
