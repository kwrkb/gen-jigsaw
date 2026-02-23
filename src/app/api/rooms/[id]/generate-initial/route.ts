import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, unauthorized, forbidden, conflict } from "@/lib/errors";
import { getUserIdFromSession } from "@/lib/auth";
import { getImageGenProvider } from "@/lib/image-gen";
import { emitRoomEvent } from "@/lib/sse-emitter";
import type { PromptJson } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromSession(req);
  if (!userId) return unauthorized("Login required");

  const { id: roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");
  if (room.ownerUserId !== userId) return forbidden("Only room owner can generate initial tile");
  if (room.initialTileStatus !== "PENDING" && room.initialTileStatus !== "FAILED") {
    return conflict("Initial tile generation already in progress or completed");
  }

  // GENERATING に遷移
  await prisma.room.update({
    where: { id: roomId },
    data: { initialTileStatus: "GENERATING" },
  });
  emitRoomEvent(roomId, "room_update");

  try {
    const prompt: PromptJson = room.initialPrompt
      ? JSON.parse(room.initialPrompt)
      : { text: "a colorful landscape" };

    const provider = getImageGenProvider();
    const result = await provider.generateInitial({ prompt, size: 256 });

    // 成功: Tile(0,0) の imageUrl 更新 + status DONE
    await prisma.$transaction([
      prisma.tile.updateMany({
        where: { roomId, x: 0, y: 0 },
        data: { imageUrl: result.imagePath },
      }),
      prisma.room.update({
        where: { id: roomId },
        data: { initialTileStatus: "DONE" },
      }),
    ]);
    emitRoomEvent(roomId, "room_update");

    return NextResponse.json({ status: "DONE", imageUrl: result.imagePath });
  } catch (error) {
    console.error("Initial tile generation failed:", error);

    // 失敗: status FAILED
    await prisma.room.update({
      where: { id: roomId },
      data: { initialTileStatus: "FAILED" },
    });
    emitRoomEvent(roomId, "room_update");

    return NextResponse.json({ status: "FAILED" }, { status: 500 });
  }
}
