import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/errors";
import { AcquireLockSchema, ReleaseLockSchema } from "@/lib/validation";
import { acquireLock, releaseLock } from "@/lib/lock-service";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { emitRoomEvent } from "@/lib/sse-emitter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const userId = await getUserIdFromSession(req);
  if (!userId) return unauthorized("Login required");

  const body = await req.json().catch(() => null);
  const parsed = AcquireLockSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  const { x, y } = parsed.data;
  const result = await acquireLock(roomId, x, y, userId);

  if (!result.success) {
    return conflict(`Cell is locked by another user`);
  }

  emitRoomEvent(roomId, "room_update");
  return NextResponse.json({ success: true, x, y });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const userId = await getUserIdFromSession(req);
  if (!userId) return unauthorized("Login required");

  const body = await req.json().catch(() => null);
  const parsed = ReleaseLockSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { x, y } = parsed.data;
  const result = await releaseLock(roomId, x, y, userId);

  if (!result.success) {
    return forbidden("You do not own this lock");
  }

  emitRoomEvent(roomId, "room_update");
  return NextResponse.json({ success: true });
}
