import { prisma } from "./prisma";
import { createId } from "@paralleldrive/cuid2";

const LOCK_TTL_SECONDS = 90;

export async function acquireLock(
  roomId: string,
  x: number,
  y: number,
  userId: string
): Promise<{ success: boolean; lockedByUserId?: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000);

  // 既存のロックを確認
  const existing = await prisma.lock.findUnique({
    where: { roomId_x_y: { roomId, x, y } },
  });

  if (existing) {
    // 期限切れなら削除
    if (existing.expiresAt < now) {
      await prisma.lock.delete({
        where: { roomId_x_y: { roomId, x, y } },
      });
    } else if (existing.lockedByUserId === userId) {
      // 同一ユーザーなら延長
      await prisma.lock.update({
        where: { roomId_x_y: { roomId, x, y } },
        data: { expiresAt },
      });
      return { success: true };
    } else {
      // 別ユーザーがロック中
      return { success: false, lockedByUserId: existing.lockedByUserId };
    }
  }

  // 新規ロック作成
  await prisma.lock.create({
    data: {
      id: createId(),
      roomId,
      x,
      y,
      lockedByUserId: userId,
      expiresAt,
    },
  });

  return { success: true };
}

export async function releaseLock(
  roomId: string,
  x: number,
  y: number,
  userId: string
): Promise<{ success: boolean }> {
  const existing = await prisma.lock.findUnique({
    where: { roomId_x_y: { roomId, x, y } },
  });

  if (!existing) {
    return { success: true }; // 既に存在しない
  }

  if (existing.lockedByUserId !== userId) {
    return { success: false };
  }

  await prisma.lock.delete({
    where: { roomId_x_y: { roomId, x, y } },
  });

  return { success: true };
}
