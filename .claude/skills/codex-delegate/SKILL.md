---
name: codex-delegate
description: |
  自然言語のタスク指示を Codex CLI（codex exec）に委譲し、新ブランチで安全に実装させるスキル。
  Claude が差分をレビューし、問題なければ main にマージする。
  Use when: (1) 「Codexに実装して」「Codexに任せて」「codexでやって」と依頼された時,
  (2) GitHub Issue番号を指定して「Codexに実装させて」と依頼された時,
  (3) /codex-delegate で明示的に呼び出し。
  Examples: "Codexにissue #9を実装させて", "Codexにテストを追加させて", "codexでリファクタして"
---

# codex-delegate

Codex CLI に実装を委譲し、Claude がレビューしてマージするワークフロー。

## ワークフロー

### 1. タスク内容の確定

- GitHub Issue番号が指定された場合: `gh issue view <番号>` で本文を取得してプロンプトに注入
- 自然言語の場合: そのまま使用

### 2. 事前保護

保護ファイル（PLAN.md / CLAUDE.md / .claude/）に未コミットの変更がある場合はコミットしてから進める:
```bash
git add PLAN.md && git commit -m "docs: pre-codex snapshot"
```

### 3. 新ブランチ作成

```bash
git checkout -b codex/<タスク概要をケバブケースで>
# Issue番号がある場合
git checkout -b codex/issue-<番号>
```

### 4. codex exec で実装

`dangerouslyDisableSandbox: true` で以下を実行:
```bash
codex exec "<タスク指示（Issue本文を含む）>

## 制約（必ず守ること）
- PLAN.md は読み取り専用。編集・上書き禁止。
- CLAUDE.md は読み取り専用。編集禁止。
- .claude/ 配下のファイルは編集禁止。
- 既存のテストを壊さないこと。
- 実装後に npx tsc --noEmit で型チェックを実行すること。"
```

### 5. Claude による差分レビュー

```bash
git diff main --name-only  # 変更ファイル一覧
git diff main              # 差分詳細
```

確認ポイント:
- **保護ファイルの混入**: PLAN.md / CLAUDE.md / .claude/ に変更があれば除外
  ```bash
  git checkout main -- PLAN.md
  ```
- **スコープ外の変更**: タスクと無関係なファイルが変更されていないか
- **セキュリティ**: 秘密情報のハードコード、危険なコードがないか
- **型エラー**: tsc エラーが残っていないか

### 6. 判定とアクション

**問題なし → マージ**
```bash
git checkout main
git merge --no-ff codex/<ブランチ名> -m "feat: <内容> (via Codex)"
git push origin main
# Issue番号がある場合
gh issue close <番号> --comment "Codex + Claude レビューにて対応。"
```

**軽微な問題 → Claude が修正してマージ**
- Claude が直接修正してからマージ

**重大な問題 → ユーザーに提示**
- 差分と問題点を明示してユーザーに判断を仰ぐ
- ブランチはそのまま残す

## 注意事項

- Codex は PLAN.md を自分のタスクメモとして上書きする挙動があるため、制約プロンプトで禁止を明示する
- `codex exec` は OpenAI API へのネットワークアクセスが必要（`dangerouslyDisableSandbox: true` で実行）
- Codex がコミットを作成した場合でもマージ前に必ず差分レビューを実施する
