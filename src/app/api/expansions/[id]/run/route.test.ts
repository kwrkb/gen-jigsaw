import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type FnMock = ReturnType<typeof vi.fn>;

type PrismaMock = {
  expansion: {
    findUnique: FnMock;
    update: FnMock;
  };
  tile: {
    findUnique: FnMock;
    findMany: FnMock;
  };
  lock: {
    deleteMany: FnMock;
  };
  $transaction: FnMock;
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    expansion: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    lock: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/image-gen", () => ({
  getImageGenProvider: vi.fn(),
}));

vi.mock("@/lib/sse-emitter", () => ({
  emitRoomEvent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserIdFromSession: vi.fn(),
}));

async function getMocks() {
  const [prismaModule, imageGenModule, sseModule, authModule] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/image-gen"),
    import("@/lib/sse-emitter"),
    import("@/lib/auth"),
  ]);

  return {
    prismaMock: prismaModule.prisma as unknown as PrismaMock,
    getImageGenProviderMock: vi.mocked(imageGenModule.getImageGenProvider) as unknown as FnMock,
    emitRoomEventMock: vi.mocked(sseModule.emitRoomEvent) as unknown as FnMock,
    getUserIdFromSessionMock: vi.mocked(authModule.getUserIdFromSession) as unknown as FnMock,
  };
}

describe("POST /api/expansions/:id/run", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const { getUserIdFromSessionMock } = await getMocks();
    getUserIdFromSessionMock.mockResolvedValue("user-1");
  });

  it("updates expansion to DONE on successful image generation", async () => {
    const { prismaMock, getImageGenProviderMock, emitRoomEventMock } = await getMocks();

    const generateMock = vi.fn().mockResolvedValue({ imagePath: "/generated/new.png" });
    getImageGenProviderMock.mockReturnValue({
      generate: generateMock,
    });

    prismaMock.expansion.findUnique.mockResolvedValue({
      id: "exp-1",
      roomId: "room-1",
      fromTileId: "tile-1",
      direction: "E",
      promptJson: JSON.stringify({ text: "sunset" }),
      status: "QUEUED",
      targetX: 1,
      targetY: 0,
    });
    prismaMock.tile.findUnique.mockResolvedValue({
      id: "tile-1",
      imageUrl: "/placeholder.png",
    });
    prismaMock.tile.findMany.mockResolvedValue([]);
    prismaMock.expansion.update
      .mockResolvedValueOnce({ id: "exp-1", status: "RUNNING" })
      .mockResolvedValueOnce({
        id: "exp-1",
        status: "DONE",
        resultImageUrl: "/generated/new.png",
      });

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/expansions/exp-1/run", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "exp-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("DONE");
    expect(prismaMock.expansion.update).toHaveBeenCalledTimes(2);
    expect(emitRoomEventMock).toHaveBeenCalledWith("room-1", "room_update");
  });

  it("marks expansion as FAILED and releases lock on provider error", async () => {
    const { prismaMock, getImageGenProviderMock } = await getMocks();

    const generateMock = vi.fn().mockRejectedValue(new Error("OpenAI down"));
    getImageGenProviderMock.mockReturnValue({
      generate: generateMock,
    });

    prismaMock.expansion.findUnique.mockResolvedValue({
      id: "exp-1",
      roomId: "room-1",
      fromTileId: "tile-1",
      direction: "E",
      promptJson: JSON.stringify({ text: "sunset" }),
      status: "QUEUED",
      targetX: 1,
      targetY: 0,
    });
    prismaMock.tile.findUnique.mockResolvedValue({
      id: "tile-1",
      imageUrl: "/placeholder.png",
    });
    prismaMock.tile.findMany.mockResolvedValue([]);
    prismaMock.expansion.update.mockResolvedValue({ id: "exp-1", status: "RUNNING" });
    prismaMock.lock.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockResolvedValue([]);

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/expansions/exp-1/run", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "exp-1" }) });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Image generation failed");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when no authenticated session exists", async () => {
    const { getUserIdFromSessionMock } = await getMocks();
    getUserIdFromSessionMock.mockResolvedValue(null);

    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/expansions/exp-1/run", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: "exp-1" }) });

    expect(res.status).toBe(401);
  });
});
