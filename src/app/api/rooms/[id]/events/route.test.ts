import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type FnMock = ReturnType<typeof vi.fn>;

vi.mock("@/lib/auth", () => ({
  getUserIdFromSession: vi.fn(),
}));

vi.mock("@/lib/sse-emitter", () => ({
  onRoomEvent: vi.fn(() => vi.fn()),
}));

async function getMocks() {
  const [authModule] = await Promise.all([
    import("@/lib/auth"),
  ]);

  return {
    getUserIdFromSessionMock: vi.mocked(authModule.getUserIdFromSession) as unknown as FnMock,
  };
}

describe("GET /api/rooms/:id/events", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated session exists", async () => {
    const { getUserIdFromSessionMock } = await getMocks();
    getUserIdFromSessionMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/rooms/room-1/events");

    const res = await GET(req, { params: Promise.resolve({ id: "room-1" }) });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Login required");
  });

  it("returns 200 when authenticated", async () => {
    const { getUserIdFromSessionMock } = await getMocks();
    getUserIdFromSessionMock.mockResolvedValue("user-1");

    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/rooms/room-1/events");

    const res = await GET(req, { params: Promise.resolve({ id: "room-1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
