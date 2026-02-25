# 状態遷移の TOCTOU 競合防止

対象: Prisma で状態依存の更新を行う全てのAPIルート・バックグラウンドジョブ

## DO
- `updateMany()` の `where` に現在の状態を含め、アトミックに check-and-update する
- `result.count === 0` で競合を検出し、409 Conflict を返す

```typescript
const result = await prisma.expansion.updateMany({
  where: { id, status: "QUEUED" },
  data: { status: "RUNNING" },
});
if (result.count === 0) {
  return conflict("Expansion is not in QUEUED status");
}
```

## DO NOT
- `findUnique` → `if (status === X)` → `update` の3ステップパターンを使わない（read と write の間で状態が変わる）

## 適用箇所
- `src/app/api/expansions/[id]/run/route.ts` — QUEUED → RUNNING
- `src/app/api/rooms/[id]/generate-initial/route.ts` — PENDING/FAILED → GENERATING
- `src/lib/auto-adopt.ts` — DONE → ADOPTED/REJECTED
