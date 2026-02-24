import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  conflict,
  notFound,
  unauthorized,
} from "@/lib/errors";
import { RejectExpansionSchema } from "@/lib/validation";
import { getUserIdFromSession } from "@/lib/auth";
import { emitRoomEvent } from "@/lib/sse-emitter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromSession(req);
  if (!userId) return unauthorized("Login required");

  const body = await req.json().catch(() => null);
  const parsed = RejectExpansionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);
  const expansion = await prisma.expansion.findUnique({ where: { id } });
  if (!expansion) return notFound("Expansion not found");

  if (expansion.status !== "DONE") {
    return conflict(`Expansion is not in DONE status`);
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

  emitRoomEvent(expansion.roomId, "room_update");
  return NextResponse.json({ success: true });
}
