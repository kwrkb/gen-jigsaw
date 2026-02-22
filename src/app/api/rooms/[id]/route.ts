import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      tiles: true,
      expansions: true,
      locks: true,
    },
  });

  if (!room) return notFound("Room not found");

  // 期限切れロックを除外
  const now = new Date();
  const activeLocks = room.locks.filter((l) => l.expiresAt > now);

  return NextResponse.json({ ...room, locks: activeLocks });
}
