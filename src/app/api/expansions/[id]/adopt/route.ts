import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  conflict,
  notFound,
  unauthorized,
} from "@/lib/errors";
import { AdoptExpansionSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";
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
  const parsed = AdoptExpansionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const expansion = await prisma.expansion.findUnique({ where: { id } });
  if (!expansion) return notFound("Expansion not found");

  if (expansion.status !== "DONE") {
    return conflict(`Expansion is not in DONE status (current: ${expansion.status})`);
  }

  await prisma.expansionVote.upsert({
    where: { expansionId_userId: { expansionId: id, userId } },
    create: { id: createId(), expansionId: id, userId, vote: "ADOPT" },
    update: { vote: "ADOPT" },
  });

  emitRoomEvent(expansion.roomId, "room_update");
  return NextResponse.json({ vote: "ADOPT" });
}
