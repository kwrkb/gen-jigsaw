import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { AdoptExpansionSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = AdoptExpansionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { userId } = parsed.data;

  const expansion = await prisma.expansion.findUnique({ where: { id } });
  if (!expansion) return notFound("Expansion not found");

  if (expansion.status !== "DONE") {
    return conflict(`Expansion is not in DONE status (current: ${expansion.status})`);
  }

  if (!expansion.resultImageUrl) {
    return conflict("Expansion has no result image");
  }

  // ルームのオーナーのみ採用可能
  const room = await prisma.room.findUnique({ where: { id: expansion.roomId } });
  if (!room) return notFound("Room not found");
  if (room.ownerUserId !== userId) {
    return forbidden("Only the room owner can adopt expansions");
  }

  // トランザクション: Tile作成 + status更新 + ロック解放
  const [tile, updatedExpansion] = await prisma.$transaction([
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
      where: { id },
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

  return NextResponse.json({ tile, expansion: updatedExpansion });
}
