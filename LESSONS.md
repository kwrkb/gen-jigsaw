# LESSONS

開発で得た教訓・パターンの記録。同じミスを繰り返さないためのルール集。

## PRレビュー・マージ運用 (2026-03-17)

### Jules (AI) 生成PRは型安全性とロギングの品質チェックが必須
- Jules が生成したPR #42 (logger) と #43 (バッチ最適化) で、`any` 型の乱用やスタックトレース消失など品質問題が複数発見された
- **ルール**: AI生成PRは特に以下を重点チェックする — (1) `any` 型が不必要に使われていないか (2) Error処理でスタック情報が失われていないか (3) テストが正しいランナー(Vitest)で実行されているか

### logger で Error オブジェクトを加工する際はスタックトレースを保持する
- PR #42 の `formatArg` が `err.message` のみ返却し、スタックトレースが完全に消失していた。デバッグが極めて困難になる
- **ルール**: Error を文字列化する場合は `arg.stack || arg.message` を使う。`arg.message` 単体での変換は禁止

### 競合する複数PRのマージ順序を事前に計画する
- PR #42 (logger) と #43 (バッチ最適化) が `auto-adopt.ts` で競合。#43を先にマージ → #42をリベースして解決した
- **ルール**: 同じファイルを変更する複数PRがある場合、依存関係の少ない方を先にマージし、残りをリベースする。マージ前にファイル重複を `gh pr diff` で確認する

### サブエージェントの worktree は権限不足で失敗することがある
- `isolation: "worktree"` でエージェントを起動したが、Edit/Bash 権限が拒否されて作業できなかった
- **ルール**: worktree エージェントが権限問題で失敗した場合は、メインプロセスで直接対応に切り替える。権限モードは `auto` または `bypassPermissions` を使う

## セキュリティ修正 (2026-03-29)

### adopt/reject 投票は「誰でも可」が意図された設計
- スキーマにルームメンバーシップテーブルがなく、認証済みユーザーなら誰でも投票可能。IDORに見えるが仕様
- **ルール**: adopt/reject ルートにルームメンバーシップ制限を追加しない。将来メンバーシップテーブルを追加する場合は vote ルートも合わせて変更する

### 高コスト操作の新規エンドポイントにはレートリミッターを使う
- `src/lib/rate-limit.ts` にインメモリ Map ベースの `checkRateLimit(limiterId, key, max, windowMs)` が実装済み
- **ルール**: 画像生成など外部API費用が発生する操作には必ず `checkRateLimit()` を適用する。サーバー再起動でリセットされるが単一インスタンスには十分

### tile.imageUrl は常にローカルパス。HTTP URL を loadReferenceImage に渡さない
- SSRF防止のため `loadReferenceImage()` は HTTP/HTTPS URL を意図的に拒否する。DALL-E URLのダウンロードは `downloadAndUpload()` が直接行う
- **ルール**: `tile.imageUrl` に外部URLを格納しない。`/placeholder.png` または `/generated/{cuid}.png` のみ。HTTP対応をこの関数に追加しないこと

### 推移的依存の脆弱性は npm overrides で修正し、メジャーアップを避ける
- Prisma 6.x が `effect@3.18.4`（GHSA-38f7-945m-qr2g）に依存。修正版は Prisma 7.x のみだが、メジャーアップには破壊的変更リスクがある
- **ルール**: 推移的依存の脆弱性は `package.json` の `"overrides"` フィールドで脆弱パッケージを強制アップデートする。メジャーバージョンアップは最後の手段とし、まず `overrides` を試す

### npm audit fix --dry-run で変更内容を事前確認する
- `npm audit fix` を直接実行すると何が変わるか不明なまま lock ファイルが書き換わる
- **ルール**: `npm audit fix --dry-run` で変更予定パッケージを確認してから本実行する。`--force` が必要な場合は特に慎重に確認する
