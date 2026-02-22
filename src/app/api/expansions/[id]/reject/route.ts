import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { z } from "zod";

const RejectSchema = z.object({ userId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { userId } = parsed.data;
  const expansion = await prisma.expansion.findUnique({ where: { id } });
  if (!expansion) return notFound("Expansion not found");

  if (expansion.status !== "DONE") {
    return conflict(`Expansion is not in DONE status`);
  }

  const room = await prisma.room.findUnique({ where: { id: expansion.roomId } });
  if (!room) return notFound("Room not found");
  if (room.ownerUserId !== userId) {
    return forbidden("Only the room owner can reject expansions");
  }

  // ロック解放 + status更新
  await prisma.$transaction([
    prisma.expansion.update({
      where: { id },
      data: { status: "REJECTED" },
    }),
    prisma.lock.deleteMany({
      where: {
        roomId: expansion.roomId,
        x: expansion.targetX,
        y: expansion.targetY,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
