import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/errors";
import { CreateUserSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";
import { setSession } from "@/lib/session";

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

  const response = NextResponse.json(user, { status: 201 });
  await setSession(response, {
    userId: user.id,
    displayName: user.displayName,
  });
  return response;
}
