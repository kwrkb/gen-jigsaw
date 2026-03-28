import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/errors";
import { CreateUserSchema } from "@/lib/validation";
import { createId } from "@paralleldrive/cuid2";
import { setSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

const USER_CREATE_RATE_LIMIT_MAX = 20;
const USER_CREATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1時間

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  // プロキシなし環境では全リクエストが "unknown" になりグローバルブロックが起きるためスキップ
  if (ip !== "unknown" && !checkRateLimit("user-create", ip, USER_CREATE_RATE_LIMIT_MAX, USER_CREATE_RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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
