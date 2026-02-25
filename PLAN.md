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

### Steps（追加）
- [completed] PR #2 作成（feature/mvp-enhancements → main）
- [completed] Gemini + Claude コードレビュー実施（5軸監査）
- [completed] PR インラインコメント 6件追加
- [completed] GitHub Issues #3〜#9 作成（Medium 以上の findings）
- [completed] PR #2 レビュー指摘（Codex P1 × 2・kwrkb Critical/High/Medium・Gemini High/Medium）の修正
- [completed] PR #2 を main へマージ
- [completed] Issue #8: referenceImageUrl 外部 URL 対応（loadReferenceImage() に置換）
- [completed] Issue #3 + #4: ストレージ抽象化 + SSE アーキテクチャ文書化（PR #10）
- [completed] PR #18 作成（feature/phase3-canvas-refinement → main）

### Steps（UI/UX デザインリニューアル）
- [completed] Phase 1: デザイン基盤構築（依存追加なし）
  - [x] globals.css: フルデザイントークンシステム（カラー/シャドウ/角丸/ダークモード/スクロールバー）
  - [x] layout.tsx: Space Grotesk + Noto Sans JP フォント導入（next/font/google）
  - [x] page.tsx: ホームページのカラー統一（アクセントカラー、シャドウ、ディスプレイフォント）
  - [x] user-setup.tsx: オンボーディング改善（タグライン追加、カードデザイン刷新）
  - [x] create-room-form.tsx: アクセントカラー適用
  - [x] room-list.tsx: ルームカード（ホバーエフェクト、左アクセントバー）
  - [x] toast.tsx: ステータスカラートークン化
  - [x] canvas/tile-grid.tsx: キャンバス背景トークン化
  - [x] canvas/tile-cell.tsx: 全状態のカラートークン化
  - [x] expansion/expansion-panel.tsx: モーダルカラートークン化
  - [x] expansion/candidate-list.tsx: バッジ・ボタンカラートークン化
  - [x] room/[id]/page.tsx: ルームページ全体のトークン化
- [completed] Phase 2: コンポーネントポリッシュ（lucide-react / framer-motion 導入）
  - [x] アイコン置換: emoji (🧩, 🔒, ✅ 等) → lucide-react アイコンコンポーネント
  - [x] アニメーション導入: framer-motion による状態遷移アニメーション
    - [x] tile-cell: タイル出現時の fade-in / scale-in
    - [x] expansion-panel: モーダルの open/close アニメーション
    - [x] toast: スライドイン / スライドアウト
    - [x] user-setup / room-list / candidate-list: 視覚的洗練と導入アニメーション
- [completed] Phase 3: キャンバス体験の深化
- [ ] Phase 4: レスポンシブ＆最終ポリッシュ

### Steps（初期画像生成 + DB クリーンアップ）
- [x] DB クリーンアップ (dev.db 削除 + db:push + generated/ クリア)
- [x] Phase: 初期画像生成機能
  - [x] Prisma スキーマ: Room に initialPrompt / initialTileStatus / updatedAt 追加
  - [x] 型定義: InitialTileStatus, Room 型更新
  - [x] プロバイダー: generateInitial メソッド追加 (provider, mock, dalle2)
  - [x] バリデーション: CreateRoomSchema に prompt 追加
  - [x] API: rooms POST 更新 + generate-initial エンドポイント新規作成
  - [x] UI: ルーム作成フォームに prompt textarea 追加
  - [x] UI: 初期タイル生成中スピナー表示 + 失敗時リトライ
- [x] PRレビュー指摘対応（PR #11）
  - [x] generate-initial: `updateMany` によるアトミックな GENERATING 遷移で重複生成防止
  - [x] generate-initial: GENERATING 状態の5分タイムアウトでスタック回復
  - [x] generate-initial: `JSON.parse` に try-catch 追加
  - [x] create-room-form: fire-and-forget 削除、ルームページ側で PENDING 自動トリガー
  - [x] dalle2-provider: `sanitizePromptText` で制御文字除去+長さ制限（インジェクション対策）
  - [x] dalle2-provider: `executeWithRetry` にリトライ+DL+アップロードを共通化

### Steps（シームレスタイル接続）
- [completed] 隣接タイルコンテキストによるシームレス画像生成 (PR #20)
  - [x] `provider.ts`: `GenerateInput` に `adjacentImages` フィールド追加
  - [x] `run/route.ts`: ターゲットセルの上下左右タイルを DB から取得
  - [x] `dalle2-provider.ts`: 512x512 コンポジットキャンバス + エッジストリップ + クロップ
  - [x] `route.test.ts`: `tile.findMany` モック追加 + adjacentImages マッピング簡素化

### Steps（Stale Session 修正）
- [ ] `auth.ts`: `getUserIdFromSession` に DB 存在チェック追加（FK 制約エラー P2003 修正）

### Steps（認可チェック修正）
- [x] Issue #21: `run/route.ts` の認可チェック不足を修正
  > expansion 作成者でもルームオーナーでもないユーザーは 403 を返すよう修正。`forbidden` を import 追加。`route.test.ts` の prisma モックに `room.findUnique` を追加し、既存テストの expansion モックに `createdByUserId` を設定。

### Steps（初期タイル拡張セル表示不具合修正 — PR #31）
- [x] `page.tsx`: generate-initial 完了後に `refetch()` を呼び、リロードなしで拡張セルを表示
- [x] `use-room.ts`: SSE ポーリング制御の修正（`ready` イベント依存 → `room_update` + `onopen` で停止）
- [x] PRレビューコメント対応
  - [x] `use-room.ts`: `onopen` ハンドラ追加で SSE 再接続時にフォールバックポーリングを即停止
  - [x] `page.tsx`: `.then`/`.catch` → `.finally(refetch)` に統一（HTTPエラー時の未更新・ループリスク解消）
- [x] `CLAUDE.md` に Implementation Guidelines 追加（SSEポーリング制御・fetchハンドリングの過去の繰り返し修正を教訓として記録）

### Notes
- 2026-02-25: PR #31 レビューコメント対応。`use-room.ts` に `onopen` ハンドラ追加、`page.tsx` の fetch 処理を `.finally(refetch)` に統一。SSEポーリング制御は同じ箇所を4回修正した経緯があるため、CLAUDE.md に Implementation Guidelines として教訓を記録。
- 2026-02-25: Issue #21 対応。`run/route.ts` に認可チェックを追加。expansion 作成者・ルームオーナー以外は 403 を返す。型チェック・テスト全通過を確認。
- 2026-02-24: PR #20 マージ。シームレスタイル接続（コンポジットキャンバス方式）を実装。Stale session による FK 制約エラー (P2003) を発見、`auth.ts` の DB 存在チェック追加を次タスクとする。
- 2026-02-23: UI/UX Phase 3 を完了。`tile-cell` にフレーム効果を追加し、拡張セルをパルス演出＋アイコン強化で再設計。`candidate-list` はタブ化（進行中/採用待ち/履歴）とステータスフィルタを実装。
- 2026-02-23: `lucide-react` / `framer-motion` をインストールし、UI/UX Phase 2 を完了。主要コンポーネントのアイコンを Lucide に置換し、Framer Motion による滑らかなアニメーションを導入。
- 2026-02-23: PR #17（missing hooks 復元 + path traversal 修正）をマージ後、PR #16 のレビュー指摘対応を実施。未定義CSS変数の追加、dark:ハードコード除去、日英混在テキストの日本語統一、AnimatePresence 統合、ホバーボーダー復元、スコープ外 GEMINI.md の除外。
- 依存追加（`npm install`）はネットワーク状況が改善し、ローカル環境でも実行可能となった。
- コードと `package.json` は PR にコミット済み。CI 環境（GitHub Actions）で `npm install` が実行される。
- `npx tsc --noEmit` / `npm run build` / `npm test` のローカル実行は CI に委譲。
- **要対応 Issues**: ~~#3（SSE スケール）~~、~~#4（画像ストレージ）~~ → PR #10 で対応済み。Issue #5/#6/#7/#8 は修正済み。
- **注意**: Codex CLI 使用時は PLAN.md を上書きする場合があるため、実行後に復元・更新すること。

## 現状の把握（2026-02-23 更新）

- **基本機能**: ルーム作成、タイルの拡張、採用/却下、ロック機構は実装済み。
- **初期画像生成**: ルーム作成時にプロンプトを入力し、初期タイル(0,0)をAI生成可能。`Room.initialPrompt` / `initialTileStatus` / `updatedAt` で状態管理。`/api/rooms/[id]/generate-initial` エンドポイントで非同期生成。生成中はスピナー表示、失敗時はリトライボタン表示。初期生成完了まで隣接セルの拡張を抑制。GENERATING 遷移は `updateMany` による条件付き更新で競合防止。5分経過した GENERATING はスタックとみなし FAILED にリセット。ルームページで PENDING を検知し自動トリガー（fire-and-forget 廃止）。プロンプト入力は `sanitizePromptText` で制御文字除去+長さ制限済み。
- **画像生成**: `DallE2ImageGenProvider` を実装済み（`src/lib/image-gen/dalle2-provider.ts`）。`IMAGE_GEN_PROVIDER=dalle2` + `OPENAI_API_KEY` 設定で本番動作可能。`OPENAI_API_KEY` 未設定時はコンストラクタで早期エラー。マスク方向修正済み（境界辺を保持側に）。`referenceImageUrl` の外部 URL 対応済み（Issue #8 解決）。**画像保存は `StorageProvider` 抽象化済み**（`STORAGE_PROVIDER` 環境変数で切り替え可能、デフォルト `local`）。S3/R2 プロバイダは未実装だがインターフェース準備済み（Issue #4 対応済み）。`generateInitial()` メソッドを追加し、初期タイル生成に対応（参照画像・マスク不要の `images.generate()` API を使用）。
- **リアルタイム性**: SSE エンドポイント (`/api/rooms/[id]/events`) 実装済み。`setMaxListeners(0)` 設定済み。`controller.close()` try-catch 保護済み。単一プロセス前提だがアーキテクチャ制約と移行パス（Redis Pub/Sub）を文書化済み（Issue #3 対応済み）。クライアント側フォールバックポーリングは `onerror` で開始、`onopen` + `room_update` で停止する設計（CLAUDE.md Implementation Guidelines 参照）。
- **認証**: `iron-session` による暗号化 Cookie セッション実装済み。`SESSION_SECRET` 検証をモジュールトップレベルで実施。`DELETE /api/session` は bodyless 204 レスポンスに修正済み。
- **FAILED 時ロック解放**: `run/route.ts` のトランザクション処理済み（実装完了）。
- **テスト**: `vitest.config.ts` 設定済み。`lock-service.test.ts`（4ケース）・`run/route.test.ts`（3ケース）作成済み。
- **CI**: `.github/workflows/ci.yml` に `SESSION_SECRET` / `DATABASE_URL` 環境変数を設定済み（Issue #5 解決）。
- **コードレビュー**: Gemini 5軸監査 + Claude レビュー完了。`status/review.md` に記録。Issues #3〜#9 作成済み。レビュー指摘の修正を main へマージ済み。

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

### フェーズ1: 画像生成基盤の本番対応（DALL-E 2）（完了）

**採用プロバイダ:** OpenAI DALL-E 2 (`/v1/images/edits`) — outpainting に対応する唯一の低コスト選択肢。

#### 実装ステップ

- [x] `openai` npm パッケージの追加
- [x] `sharp` npm パッケージの追加（マスク画像生成・RGBA変換に必須）
- [x] `DallE2ImageGenProvider` の実装 (`src/lib/image-gen/dalle2-provider.ts`)
  - `referenceImageUrl` の外部 URL（http/https）対応済み。`loadReferenceImage()` で fetch/readFileSync を分岐（Issue #8 解決）
  - 参照画像を PNG (RGBA) へ変換（`sharp` を使用）
  - `direction`（`N`/`E`/`S`/`W`）に応じてアルファチャンネル付きマスク画像を生成（境界辺を保持側に修正済み）
  - OpenAI `images.edit()` へ参照画像・マスク・プロンプトを渡す
  - `size` は `256x256` または `512x512`（`run/route.ts` で `256` ハードコード）
  - レスポンスの `url` をダウンロードして `/public/generated/{cuid}.png` に保存
- [x] リトライロジックの実装（指数バックオフ、最大3回、429/5xx のみ対象）
- [x] `src/lib/image-gen/index.ts` に `IMAGE_GEN_PROVIDER=dalle2` のケースを追加
- [x] `.env.example` に `OPENAI_API_KEY`, `IMAGE_GEN_PROVIDER=dalle2` を追記
- [x] 生成済み画像の保存先を `StorageProvider` インターフェースに抽象化（Issue #4）
  > `src/lib/storage/` に `StorageProvider` / `LocalStorageProvider` を導入。`STORAGE_PROVIDER` 環境変数で切り替え可能。S3/R2 プロバイダは拡張ポイントとして準備済み。

#### 実装済み（対応不要）

- ~~FAILED 時のロック解放~~: `run/route.ts` のトランザクション処理で実装済み

---

### フェーズ2: リアルタイム更新 (SSE) の導入（完了）

**クライアント側は変更不要**。`use-room.ts` の SSE 雛形は完成しており、`ready`/`room_update`/`error` イベントを処理する。

#### サーバー側実装ステップ

- [x] SSE エミッター (`src/lib/sse-emitter.ts`) の実装
  - `EventEmitter` ベースの in-process pub/sub
  - `emit(roomId: string, event: string)` でルーム単位にイベント発火
  > Issue #3: 単一プロセス前提。`setMaxListeners(0)` 設定済み。アーキテクチャ制約と移行パス（Redis Pub/Sub）を文書化済み。ポーリング（useRoom 3s）がフォールバックとして機能。
- [x] SSE エンドポイントの実装 (`src/app/api/rooms/[id]/events/route.ts`)
  - Next.js App Router の `ReadableStream` + 生 `Response` パターンを使用
  - `request.signal` の `abort` イベントでクリーンアップ（接続切断時のリスナー除去）
  - 接続確立時に `ready` イベントを送信
  - `room_update` イベントを受信したらクライアントへ転送
  - 15秒ごとの keepalive ping 実装済み
  > ~~Issue #6~~: `controller.close()` try-catch 保護済み（修正済み）。
- [x] 状態変更時のイベント発火（以下6ルートに `sse-emitter.emit()` を追加）
  - `POST /api/rooms/:id/expansions` — Expansion 作成時
  - `POST /api/expansions/:id/run` — DONE/FAILED 更新時
  - `POST /api/expansions/:id/adopt` — Tile 追加時
  - `POST /api/expansions/:id/reject` — Expansion 却下時
  - `POST /api/rooms/:id/locks` — Lock 取得時
  - `DELETE /api/rooms/:id/locks` — Lock 解放時

---

### フェーズ3: 認証・権限制御の強化（`iron-session`）（完了）

**`iron-session`（暗号化 Cookie セッション）を採用**。`use-user.ts` の既存構造（`GET /api/session`、`DELETE /api/session`、`POST /api/users`）をそのまま活用するため、**クライアント側の変更は不要**。

#### 実装ステップ

- [x] `iron-session` npm パッケージの追加
- [x] `src/lib/session.ts` の実装
  - `getSession(req)`: Cookie からセッション復号 → `{ userId, displayName }` を返す
  - `setSession(res, user)`: `Set-Cookie` ヘッダを付与
  - `destroySession(res)`: Cookie を無効化
  - `.env.example` に `SESSION_SECRET`（32文字以上のランダム文字列）を追記
  > ~~Issue #7~~: `SESSION_SECRET` 検証をモジュールトップレベルの IIFE へ移動済み（修正済み）。
- [x] `/api/session` ルートの実装
  - `GET`: Cookie からセッション復号 → ユーザー情報を返す（未セッション時は 401）
  - `DELETE`: Cookie 破棄 → 204 を返す
- [x] `POST /api/users` の改修
  - ユーザー作成後、レスポンスで `Set-Cookie`（`setSession` 呼び出し）を設定
- [x] `src/lib/auth.ts` の実装
  - `getUserIdFromSession(req)`: Cookie セッションから `userId` を取得するヘルパー
  - 全 API ルートの `body.userId` 参照を `getUserIdFromSession` に置換済み
- [x] `adopt`/`reject` のオーナーチェックをセッションベースに移行

#### 移行戦略

1. まず `/api/session` を実装（クライアント変更なし、既存 API は変更なし）
2. `POST /api/users` に `Set-Cookie` を追加
3. 各 API ルートを順次 `getUserIdFromSession` ベースへ移行

---

### フェーズ4: 品質ゲートとテストの整備（完了）

**テストフレームワーク: Vitest**（ESM ネイティブ、Next.js 親和性が高い）

#### 実装ステップ

- [x] `vitest` パッケージの追加と `vitest.config.ts` の設定
  - `@/*` パスエイリアスの解決設定（`tsconfig.json` の `paths` と合わせる）
- [x] `lock-service.ts` の単体テスト作成
  - 4ケース: ロック取得・競合・ユニーク制約エラー・解放権限チェック
  > Issue #9: `vi.hoisted` を多用した壊れやすいモック設計。モジュール isolation の改善を推奨。
- [x] Expansion ライフサイクル（`QUEUED → RUNNING → DONE`）の統合テスト作成
  - 3ケース: DONE 更新・FAILED + ロック解放・401 認証エラー
- [x] CI (GitHub Actions) 設定 (`.github/workflows/ci.yml`)
  - `jdx/mise-action@v2` で Node.js 24 をセットアップ（`mise.toml` 対応）
  - Type-check (`npx tsc --noEmit`)、Build、Test (`vitest`) を自動実行
  > ~~Issue #5~~: `SESSION_SECRET` / `DATABASE_URL` を CI 環境変数に設定済み（修正済み）。

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

---

## 今後の UI/UX 改善計画

### Phase 2: コンポーネントポリッシュ（完了）

**依存追加:** `npm install lucide-react framer-motion`

- [x] アイコン置換: emoji (🧩, 🔒, ✅ 等) → lucide-react アイコンコンポーネント
- [x] アニメーション導入: framer-motion による状態遷移アニメーション
  - [x] tile-cell: タイル出現時の fade-in / scale-in
  - [x] expansion-panel: モーダルの open/close アニメーション
  - [x] candidate-list: アイコン化・スタイリング改善
  - [x] toast: スライドイン / スライドアウト
  - [x] user-setup / room-list: 視覚的洗練と導入アニメーション
- [x] レビュー指摘対応: CSS変数定義追加、dark:ハードコード除去、日本語統一、AnimatePresence統合、ホバーボーダー復元

### Phase 3: キャンバス体験の深化

- [x] タイル画像フレーム効果（subtle shadow / border treatment）
- [x] 拡張セル再デザイン（パルスアニメーション、アイコン改善）
- [x] ズームコントロール改善（スライダー、フィットビュー）
- [x] キーボードナビゲーション（矢印キーでセル移動）
- [x] ヘッダー改善（モバイル候補パネル導線を追加）
- [x] サイドバー改善（タブ化、フィルタリング）

### Phase 4: レスポンシブ＆最終ポリッシュ

- [ ] モバイル対応
  - [x] サイドバー → ボトムシート化
  - [x] タッチ対応（ドラッグ/スワイプ）
  - [ ] ピンチズーム
- [ ] スケルトンローディング（コンテンツ読み込み中の UI）
- [x] エンプティステート（候補0件時の改善 UI）
- [ ] アクセシビリティ
  - [x] ARIA ラベル / ロール
  - [ ] フォーカストラップ（モーダル）
  - [x] キーボード操作の対応（キャンバス移動、Esc でモーダルクローズ）
