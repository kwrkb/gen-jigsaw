import type { NextRequest, NextResponse } from "next/server";
import { sealData, unsealData } from "iron-session";

const SESSION_COOKIE_NAME = "gen_jigsaw_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export interface SessionUser {
  userId: string;
  displayName: string;
}

const SESSION_SECRET = (() => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }
  return secret;
})();

export async function getSession(req: NextRequest): Promise<SessionUser | null> {
  const sealed = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sealed) return null;

  try {
    return await unsealData<SessionUser>(sealed, { password: SESSION_SECRET });
  } catch {
    return null;
  }
}

export async function setSession(res: NextResponse, user: SessionUser) {
  const sealed = await sealData(user, {
    password: SESSION_SECRET,
    ttl: SESSION_TTL_SECONDS,
  });

  res.cookies.set(SESSION_COOKIE_NAME, sealed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function destroySession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
