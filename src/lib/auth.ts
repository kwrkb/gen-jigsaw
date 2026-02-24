import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getSession } from "./session";

export async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const session = await getSession(req);
  const userId = session?.userId ?? null;
  if (!userId) return null;

  // DB にユーザーが存在するか確認（stale session 対策）
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;

  return userId;
}
