import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type FnMock = ReturnType<typeof vi.fn>;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    room: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getUserIdFromSession: vi.fn(),
}));

vi.mock("@/lib/auto-adopt", () => ({
  autoAdoptStaleExpansions: vi.fn(),
}));

async function getMocks() {
  const [prismaModule, authModule] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auth"),
  ]);

  return {
    prismaMock: prismaModule.prisma as any,
    getUserIdFromSessionMock: vi.mocked(authModule.getUserIdFromSession) as unknown as FnMock,
  };
}

describe("GET /api/rooms/:id", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated session exists", async () => {
    const { getUserIdFromSessionMock } = await getMocks();
    getUserIdFromSessionMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/rooms/room-1");

    const res = await GET(req, { params: Promise.resolve({ id: "room-1" }) });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Login required");
  });

  it("returns 200 when authenticated", async () => {
    const { getUserIdFromSessionMock, prismaMock } = await getMocks();
    getUserIdFromSessionMock.mockResolvedValue("user-1");
    prismaMock.room.findUnique.mockResolvedValue({
      id: "room-1",
      expansions: [],
    });

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/rooms/room-1");

    const res = await GET(req, { params: Promise.resolve({ id: "room-1" }) });

    expect(res.status).toBe(200);
  });
});
