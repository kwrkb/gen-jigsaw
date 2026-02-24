import { createId } from "@paralleldrive/cuid2";
import { prisma } from "./prisma";
import { emitRoomEvent } from "./sse-emitter";

// DONE 状態のまま放置された Expansion を自動決定するまでの時間 (ms)
// デフォルト 1 分。AUTO_ADOPT_AFTER_MS 環境変数で変更可能。
const AUTO_ADOPT_AFTER_MS = Number(
  process.env.AUTO_ADOPT_AFTER_MS ?? 60 * 1000
);

export async function autoAdoptStaleExpansions(roomId: string): Promise<void> {
  const threshold = new Date(Date.now() - AUTO_ADOPT_AFTER_MS);

  const stale = await prisma.expansion.findMany({
    where: {
      roomId,
      status: "DONE",
      updatedAt: { lt: threshold },
    },
    include: { votes: true },
  });

  if (stale.length === 0) return;

  // (targetX, targetY) でグルーピング
  const byCell = new Map<string, typeof stale>();
  for (const exp of stale) {
    const key = `${exp.targetX},${exp.targetY}`;
    const arr = byCell.get(key) ?? [];
    arr.push(exp);
    byCell.set(key, arr);
  }

  let changed = false;
  for (const [, candidates] of byCell) {
    // 投票集計
    const totalAdopt = candidates.reduce(
      (sum, e) => sum + e.votes.filter((v) => v.vote === "ADOPT").length,
      0
    );
    const totalReject = candidates.reduce(
      (sum, e) => sum + e.votes.filter((v) => v.vote === "REJECT").length,
      0
    );

    let pick: (typeof stale)[0] | undefined;

    if (totalReject > totalAdopt) {
      // reject票 > adopt票 → 全却下 (pick = undefined)
    } else {
      // adopt票 >= reject票（投票ゼロ含む）→ 採用候補を選択
      const valid = candidates.filter((e) => e.resultImageUrl);
      if (valid.length > 0) {
        if (totalAdopt === 0 && totalReject === 0) {
          // 投票ゼロ → ランダム選択
          pick = valid[Math.floor(Math.random() * valid.length)];
        } else {
          // 最多 adopt 票の候補を選択
          pick = valid.reduce((best, e) => {
            const bestVotes = best.votes.filter((v) => v.vote === "ADOPT").length;
            const eVotes = e.votes.filter((v) => v.vote === "ADOPT").length;
            return eVotes > bestVotes ? e : best;
          });
        }
      }
      // valid.length === 0 → 採用できる候補がない → pick = undefined → 全却下
    }

    const rejects = candidates.filter((e) => e.id !== pick?.id);

    if (pick) {
      try {
        await prisma.$transaction([
          prisma.tile.create({
            data: {
              id: createId(),
              roomId: pick.roomId,
              x: pick.targetX,
              y: pick.targetY,
              imageUrl: pick.resultImageUrl!,
              createdByUserId: pick.createdByUserId,
            },
          }),
          // P1: レース対策 — status: "DONE" 条件を追加
          prisma.expansion.updateMany({
            where: { id: pick.id, status: "DONE" },
            data: { status: "ADOPTED" },
          }),
          ...(rejects.length > 0
            ? [
                prisma.expansion.updateMany({
                  where: { id: { in: rejects.map((e) => e.id) } },
                  data: { status: "REJECTED" },
                }),
              ]
            : []),
          prisma.lock.deleteMany({
            where: {
              roomId: pick.roomId,
              x: pick.targetX,
              y: pick.targetY,
            },
          }),
        ]);
        changed = true;
      } catch (err) {
        console.warn(`[auto-adopt] expansion ${pick.id} failed:`, err);
        // P2: リトライループ防止 — 失敗した全候補を REJECTED に更新
        await prisma.expansion
          .updateMany({
            where: { id: { in: candidates.map((e) => e.id) }, status: "DONE" },
            data: { status: "REJECTED" },
          })
          .catch((e2) => console.warn(`[auto-adopt] fallback reject failed:`, e2));
      }
    } else {
      // 全却下
      try {
        await prisma.$transaction([
          prisma.expansion.updateMany({
            where: { id: { in: candidates.map((e) => e.id) } },
            data: { status: "REJECTED" },
          }),
          prisma.lock.deleteMany({
            where: {
              roomId: candidates[0].roomId,
              x: candidates[0].targetX,
              y: candidates[0].targetY,
            },
          }),
        ]);
        changed = true;
      } catch (err) {
        console.warn(`[auto-adopt] all-reject for cell failed:`, err);
      }
    }
  }

  if (changed) {
    emitRoomEvent(roomId, "room_update");
  }
}
