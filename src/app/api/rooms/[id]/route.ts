import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import { autoAdoptStaleExpansions } from "@/lib/auto-adopt";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const now = new Date();

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      tiles: true,
      expansions: {
        where: {
          status: { notIn: ["ADOPTED", "REJECTED"] },
        },
        include: {
          votes: true,
        },
      },
      locks: {
        where: {
          expiresAt: { gt: now },
        },
      },
    },
  });

  if (!room) return notFound("Room not found");

  // DONE 状態の Expansion がある場合のみ自動決定を試みる（Gemini 指摘）
  const hasDone = room.expansions.some((e) => e.status === "DONE");
  if (hasDone) {
    after(() => autoAdoptStaleExpansions(id));
  }

  return NextResponse.json(room);
}
