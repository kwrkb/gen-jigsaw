import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/errors";
import { CreateRoomSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";

export async function GET() {
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { displayName: true } } },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateRoomSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { name, userId, stylePreset } = parsed.data;

  // ユーザー存在確認
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return notFound("User not found");

  // ルーム作成 + 初期タイル(0,0)作成（アトミック）
  const roomId = createId();
  const [room] = await prisma.$transaction([
    prisma.room.create({
      data: {
        id: roomId,
        name,
        ownerUserId: userId,
        stylePreset: stylePreset ?? null,
      },
    }),
    prisma.tile.create({
      data: {
        id: createId(),
        roomId,
        x: 0,
        y: 0,
        imageUrl: "/placeholder.png",
        createdByUserId: userId,
      },
    }),
  ]);

  return NextResponse.json(room, { status: 201 });
}
