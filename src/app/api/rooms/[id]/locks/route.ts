import { NextRequest, NextResponse } from "next/server";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { AcquireLockSchema, ReleaseLockSchema } from "@/lib/validation";
import { acquireLock, releaseLock } from "@/lib/lock-service";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = AcquireLockSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  const { x, y, userId } = parsed.data;
  const result = await acquireLock(roomId, x, y, userId);

  if (!result.success) {
    return conflict(`Cell is locked by another user`);
  }

  return NextResponse.json({ success: true, x, y });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = ReleaseLockSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { x, y, userId } = parsed.data;
  const result = await releaseLock(roomId, x, y, userId);

  if (!result.success) {
    return forbidden("You do not own this lock");
  }

  return NextResponse.json({ success: true });
}
