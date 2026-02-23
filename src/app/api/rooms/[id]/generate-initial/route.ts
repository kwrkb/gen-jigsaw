import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, unauthorized, forbidden, conflict } from "@/lib/errors";
import { getUserIdFromSession } from "@/lib/auth";
import { getImageGenProvider } from "@/lib/image-gen";
import { emitRoomEvent } from "@/lib/sse-emitter";
import type { PromptJson } from "@/types";

/** GENERATING 状態のまま放置を許容する最大時間（5分） */
const GENERATING_TIMEOUT_MS = 5 * 60 * 1000;

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

  // GENERATING が一定時間経過している場合はスタックとみなし FAILED にリセット
  if (room.initialTileStatus === "GENERATING") {
    const elapsed = Date.now() - new Date(room.updatedAt).getTime();
    if (elapsed < GENERATING_TIMEOUT_MS) {
      return conflict("Initial tile generation already in progress");
    }
    // タイムアウト: FAILED にリセットして続行
    await prisma.room.update({
      where: { id: roomId },
      data: { initialTileStatus: "FAILED" },
    });
  }

  if (room.initialTileStatus === "DONE") {
    return conflict("Initial tile generation already completed");
  }

  // アトミックに GENERATING に遷移（競合防止）
  const updated = await prisma.room.updateMany({
    where: {
      id: roomId,
      initialTileStatus: { in: ["PENDING", "FAILED"] },
    },
    data: { initialTileStatus: "GENERATING" },
  });
  if (updated.count === 0) {
    return conflict("Initial tile generation already in progress or completed");
  }
  emitRoomEvent(roomId, "room_update");

  try {
    let prompt: PromptJson;
    try {
      prompt = room.initialPrompt
        ? JSON.parse(room.initialPrompt)
        : { text: "a colorful landscape" };
    } catch {
      prompt = { text: "a colorful landscape" };
    }

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
