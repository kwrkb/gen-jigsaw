# SSE + Fallback Polling 制御

対象: `src/hooks/use-room.ts`

## DO
- `onopen` で fallback polling を停止する（初回接続・再接続の両方で発火）
- `onerror` で fallback polling を開始する（タイマー未存在時のみ）
- `room_update` イベントハンドラ内でも `stopPolling()` を呼ぶ
- `stopPolling()` ヘルパーを定義し、clearInterval + タイマー変数の null 化を行う

## DO NOT
- カスタムSSEイベント（`ready` 等）でポーリングを制御しない。サーバー実装依存で再接続ループ時に発火しない。
- ポーリングを無条件で開始しない（`onerror` 外での `setInterval`）。ポーリングはフォールバックであり、デフォルトではない。
- `room_update` のみに依存してポーリングを停止しない。SSE再接続直後にデータイベントが来なければポーリングが継続する。
