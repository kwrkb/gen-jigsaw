# fire-and-forget fetch のエラーハンドリング

対象: fire-and-forget な `fetch()` 呼び出し全般（`generate-initial` 等）

## DO
- `.finally(callback)` で結果に関わらず実行すべき状態更新（`refetch()` 等）を行う
- 最初から3ケース全てを考慮する: 成功 (`res.ok`)、HTTPエラー (`!res.ok`)、ネットワークエラー (rejected promise)

## DO NOT
- `.then(res => { if (res.ok) ... })` だけで分岐しない — HTTPエラー時に状態更新が漏れる
- `.catch(() => { flag = false })` でトリガーガードをリセットしない — `refetch → 再評価 → 即再fetch` のループを引き起こす
- `.finally()` で済む場合に `.then()` と `.catch()` に分割しない
