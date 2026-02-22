# Gen-Jigsaw

生成AI×協働アウトペイントアプリ。1枚の初期タイルから複数人が上下左右に世界を拡張していくジグソーパズル風サービス。

## 起動方法

```bash
# 依存関係インストール
npm install

# DBセットアップ
npm run db:push

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## 動作確認手順

1. `/` にアクセス → 表示名を入力 → 「はじめる」
2. 「+ 新しいルーム」でルーム作成
3. ルーム画面で初期タイル (0,0) を確認
4. 隣接セルの「+」をクリック → プロンプト入力 → 「生成する」
5. 生成完了後、オーナーが「採用」→ タイルがグリッドに追加される
6. 別ブラウザ/シークレットで2人目ユーザーとして参加 → ロック競合を確認

## 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15 | App Router, API Routes |
| TypeScript | 5 | 型安全 |
| TailwindCSS | v4 | スタイリング |
| Prisma | 6 | ORM |
| SQLite | — | DB (ローカル) |
| Zod | 3 | バリデーション |

## 設計判断

| 判断 | 理由 |
|------|------|
| `/run` は同期（ブロッキング） | MockProviderは1-2秒で終わる。本番APIへ差替時にジョブキュー化 |
| Expansion作成と実行を分離 | 候補管理・リトライ・将来のバッチ対応のため |
| ポーリング3秒 | MVP十分。SSE/WS対応は後回し |
| ユーザー認証なし | localStorageにcuid + displayName保存 |
| Lock取得: find → delete expired → create | SQLiteは書き込みをシリアライズするため安全 |
| `/public/generated/` に画像保存 | Next.jsの静的配信を利用。本番はS3/R2へ移行 |

## APIエンドポイント

```
POST   /api/users                          ユーザー作成
GET    /api/rooms                          ルーム一覧
POST   /api/rooms                          ルーム作成（初期タイル自動生成）
GET    /api/rooms/:id                      ルーム詳細（tiles, expansions, locks含む）
POST   /api/rooms/:id/locks                ロック取得
DELETE /api/rooms/:id/locks                ロック解放
POST   /api/rooms/:id/expansions           Expansion作成
POST   /api/expansions/:id/run             画像生成実行（同期）
POST   /api/expansions/:id/adopt           採用（Tile作成 + ロック解放）
POST   /api/expansions/:id/reject          却下（ロック解放）
```

## データモデル

- **Room**: ルーム。オーナーが採用/却下を判断
- **User**: 表示名のみ（認証なし）
- **Tile**: 確定済みタイル。`(roomId, x, y)` でユニーク
- **Expansion**: 拡張候補。QUEUED → RUNNING → DONE → ADOPTED/REJECTED
- **Lock**: セルのロック（90秒TTL）。同一セルへの競合書き込みを防ぐ

## 今後のTODO

- [ ] 本物の画像生成API（DALL-E, Stable Diffusion等）への差替
- [ ] SSE/WebSocketによるリアルタイム更新
- [ ] 認証（NextAuth.js）
- [ ] 画像ストレージ（S3/R2）への移行
- [ ] ジョブキュー（BullMQ等）で非同期生成
- [ ] ルームへの参加制限（招待リンク）
- [ ] 複数候補の並列生成・比較
- [ ] スタイルプリセット
