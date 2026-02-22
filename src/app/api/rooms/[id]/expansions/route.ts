import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { CreateExpansionSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";

// 方向からdeltaを取得
const DIRECTION_DELTA: Record<string, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = CreateExpansionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { fromTileId, targetX, targetY, direction, promptJson, userId } =
    parsed.data;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  // fromTile の存在確認
  const fromTile = await prisma.tile.findUnique({ where: { id: fromTileId } });
  if (!fromTile || fromTile.roomId !== roomId) {
    return notFound("Source tile not found");
  }

  // 隣接チェック
  const delta = DIRECTION_DELTA[direction];
  if (
    fromTile.x + delta.dx !== targetX ||
    fromTile.y + delta.dy !== targetY
  ) {
    return badRequest("Target position does not match direction");
  }

  // targetX,Y にタイルが既にないことを確認
  const existingTile = await prisma.tile.findUnique({
    where: { roomId_x_y: { roomId, x: targetX, y: targetY } },
  });
  if (existingTile) {
    return conflict("A tile already exists at target position");
  }

  // ロック確認（自分がロックしているか）
  const now = new Date();
  const lock = await prisma.lock.findUnique({
    where: { roomId_x_y: { roomId, x: targetX, y: targetY } },
  });
  if (!lock || lock.expiresAt < now || lock.lockedByUserId !== userId) {
    return conflict("You must acquire a lock before creating an expansion");
  }

  const expansion = await prisma.expansion.create({
    data: {
      id: createId(),
      roomId,
      fromTileId,
      targetX,
      targetY,
      direction,
      promptJson: JSON.stringify(promptJson),
      status: "QUEUED",
      createdByUserId: userId,
    },
  });

  return NextResponse.json(expansion, { status: 201 });
}
