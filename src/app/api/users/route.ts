import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/errors";
import { CreateUserSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const user = await prisma.user.create({
    data: {
      id: createId(),
      displayName: parsed.data.displayName,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
