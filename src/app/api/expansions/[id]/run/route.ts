import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/errors";
import { RunExpansionSchema, DirectionSchema } from "@/lib/validation";
import { getImageGenProvider } from "@/lib/image-gen";
import { getUserIdFromSession } from "@/lib/auth";
import { emitRoomEvent } from "@/lib/sse-emitter";
import type { Direction } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromSession(req);
  if (!userId) return unauthorized("Login required");

  const body = await req.json().catch(() => null);
  const parsed = RunExpansionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const expansion = await prisma.expansion.findUnique({ where: { id } });
  if (!expansion) return notFound("Expansion not found");

  if (expansion.createdByUserId !== userId) {
    const room = await prisma.room.findUnique({ where: { id: expansion.roomId } });
    if (room?.ownerUserId !== userId) {
      return forbidden("Not authorized to run this expansion");
    }
  }

  if (expansion.status !== "QUEUED") {
    return conflict(`Expansion is in status ${expansion.status}, expected QUEUED`);
  }

  // fromTile を取得
  const fromTile = await prisma.tile.findUnique({
    where: { id: expansion.fromTileId },
  });
  if (!fromTile) return notFound("Source tile not found");

  // ターゲットセルの上下左右に隣接するタイルを取得
  const NEIGHBOR_OFFSETS: { dir: Direction; dx: number; dy: number }[] = [
    { dir: "N", dx: 0, dy: -1 },
    { dir: "S", dx: 0, dy: 1 },
    { dir: "E", dx: 1, dy: 0 },
    { dir: "W", dx: -1, dy: 0 },
  ];

  const neighborTiles = await prisma.tile.findMany({
    where: {
      roomId: expansion.roomId,
      OR: NEIGHBOR_OFFSETS.map(({ dx, dy }) => ({
        x: expansion.targetX + dx,
        y: expansion.targetY + dy,
      })),
    },
  });

  const adjacentImages: Partial<Record<Direction, string>> = {};
  const coordToDir = new Map<string, Direction>();
  for (const { dir, dx, dy } of NEIGHBOR_OFFSETS) {
    coordToDir.set(`${expansion.targetX + dx},${expansion.targetY + dy}`, dir);
  }
  for (const tile of neighborTiles) {
    const dir = coordToDir.get(`${tile.x},${tile.y}`);
    if (dir) adjacentImages[dir] = tile.imageUrl;
  }

  // RUNNING に変更
  await prisma.expansion.update({
    where: { id },
    data: { status: "RUNNING" },
  });
  emitRoomEvent(expansion.roomId, "room_update");

  try {
    const provider = getImageGenProvider();
    const promptJson = JSON.parse(expansion.promptJson);

    const direction = DirectionSchema.parse(expansion.direction);

    const result = await provider.generate({
      referenceImageUrl: fromTile.imageUrl,
      direction,
      prompt: promptJson,
      size: 256,
      adjacentImages,
    });

    const updated = await prisma.expansion.update({
      where: { id },
      data: {
        status: "DONE",
        resultImageUrl: result.imagePath,
      },
    });

    emitRoomEvent(expansion.roomId, "room_update");
    return NextResponse.json(updated);
  } catch (err) {
    // FAILEDに変更 + ロック解放
    await prisma.$transaction([
      prisma.expansion.update({
        where: { id },
        data: { status: "FAILED" },
      }),
      prisma.lock.deleteMany({
        where: {
          roomId: expansion.roomId,
          x: expansion.targetX,
          y: expansion.targetY,
        },
      }),
    ]);
    emitRoomEvent(expansion.roomId, "room_update");
    console.error("Image generation failed:", err);
    return serverError("Image generation failed");
  }
}
