import type { NextRequest } from "next/server";
import { getSession } from "./session";

export async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const session = await getSession(req);
  return session?.userId ?? null;
}
