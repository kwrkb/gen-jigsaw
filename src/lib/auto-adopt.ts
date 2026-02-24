import { createId } from "@paralleldrive/cuid2";
import { prisma } from "./prisma";
import { emitRoomEvent } from "./sse-emitter";

// DONE 状態のまま放置された Expansion を自動採用するまでの時間 (ms)
// デフォルト 5 分。AUTO_ADOPT_AFTER_MS 環境変数で変更可能。
const AUTO_ADOPT_AFTER_MS = Number(
  process.env.AUTO_ADOPT_AFTER_MS ?? 5 * 60 * 1000
);

export async function autoAdoptStaleExpansions(roomId: string): Promise<void> {
  const threshold = new Date(Date.now() - AUTO_ADOPT_AFTER_MS);

  const stale = await prisma.expansion.findMany({
    where: {
      roomId,
      status: "DONE",
      updatedAt: { lt: threshold },
    },
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

  let adopted = 0;
  for (const [, candidates] of byCell) {
    // ランダムに1件選択
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const rejects = candidates.filter((e) => e.id !== pick.id);

    if (!pick.resultImageUrl) continue;

    try {
      await prisma.$transaction([
        prisma.tile.create({
          data: {
            id: createId(),
            roomId: pick.roomId,
            x: pick.targetX,
            y: pick.targetY,
            imageUrl: pick.resultImageUrl,
            createdByUserId: pick.createdByUserId,
          },
        }),
        prisma.expansion.update({
          where: { id: pick.id },
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
      adopted++;
    } catch (err) {
      console.warn(`[auto-adopt] expansion ${pick.id} failed:`, err);
    }
  }

  if (adopted > 0) {
    emitRoomEvent(roomId, "room_update");
  }
}
