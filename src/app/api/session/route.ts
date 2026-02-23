import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors";
import { destroySession, getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorized("Not authenticated");

  return NextResponse.json({
    id: session.userId,
    displayName: session.displayName,
  });
}

export async function DELETE() {
  const response = NextResponse.json(null, { status: 204 });
  destroySession(response);
  return response;
}
