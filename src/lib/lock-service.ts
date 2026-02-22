import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createId } from "@paralleldrive/cuid2";

const LOCK_TTL_SECONDS = 90;

export async function acquireLock(
  roomId: string,
  x: number,
  y: number,
  userId: string
): Promise<{ success: boolean; lockedByUserId?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000);

      const existing = await tx.lock.findUnique({
        where: { roomId_x_y: { roomId, x, y } },
      });

      if (existing) {
        if (existing.expiresAt < now) {
          // 期限切れなら削除して新規作成へ
          await tx.lock.delete({
            where: { roomId_x_y: { roomId, x, y } },
          });
        } else if (existing.lockedByUserId === userId) {
          // 同一ユーザーなら延長
          await tx.lock.update({
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
      await tx.lock.create({
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
    });
  } catch (e) {
    // ユニーク制約違反 = 別リクエストが先にロックを取得した
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false };
    }
    throw e;
  }
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
