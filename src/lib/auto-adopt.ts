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

  let adopted = 0;
  for (const expansion of stale) {
    if (!expansion.resultImageUrl) continue;

    try {
      await prisma.$transaction([
        prisma.tile.create({
          data: {
            id: createId(),
            roomId: expansion.roomId,
            x: expansion.targetX,
            y: expansion.targetY,
            imageUrl: expansion.resultImageUrl,
            createdByUserId: expansion.createdByUserId,
          },
        }),
        prisma.expansion.update({
          where: { id: expansion.id },
          data: { status: "ADOPTED" },
        }),
        prisma.lock.deleteMany({
          where: {
            roomId: expansion.roomId,
            x: expansion.targetX,
            y: expansion.targetY,
          },
        }),
      ]);
      adopted++;
    } catch (err) {
      console.warn(`[auto-adopt] expansion ${expansion.id} failed:`, err);
    }
  }

  if (adopted > 0) {
    emitRoomEvent(roomId, "room_update");
  }
}
