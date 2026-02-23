import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  expansion: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  tile: {
    findUnique: vi.fn(),
  },
  lock: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const generateMock = vi.hoisted(() => vi.fn());
const emitRoomEventMock = vi.hoisted(() => vi.fn());
const getUserIdFromSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/image-gen", () => ({
  getImageGenProvider: () => ({
    generate: generateMock,
  }),
}));

vi.mock("@/lib/sse-emitter", () => ({
  emitRoomEvent: emitRoomEventMock,
}));

vi.mock("@/lib/auth", () => ({
  getUserIdFromSession: getUserIdFromSessionMock,
}));

describe("POST /api/expansions/:id/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserIdFromSessionMock.mockResolvedValue("user-1");
  });

  it("updates expansion to DONE on successful image generation", async () => {
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
    prismaMock.expansion.update
      .mockResolvedValueOnce({ id: "exp-1", status: "RUNNING" })
      .mockResolvedValueOnce({
        id: "exp-1",
        status: "DONE",
        resultImageUrl: "/generated/new.png",
      });
    generateMock.mockResolvedValue({ imagePath: "/generated/new.png" });

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
    prismaMock.expansion.update.mockResolvedValue({ id: "exp-1", status: "RUNNING" });
    prismaMock.lock.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockResolvedValue([]);
    generateMock.mockRejectedValue(new Error("OpenAI down"));

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
