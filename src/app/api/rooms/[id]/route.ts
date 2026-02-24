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
      },
      locks: {
        where: {
          expiresAt: { gt: now },
        },
      },
    },
  });

  if (!room) return notFound("Room not found");

  after(() => autoAdoptStaleExpansions(id));

  return NextResponse.json(room);
}
