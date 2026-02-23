import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  lock: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("lock-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("acquires lock when no existing lock", async () => {
    const tx = {
      lock: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    type Tx = typeof tx;
    prismaMock.$transaction.mockImplementation(async (fn: (tx: Tx) => unknown) =>
      fn(tx)
    );

    const { acquireLock } = await import("./lock-service");
    const result = await acquireLock("room-1", 1, 2, "user-1");

    expect(result.success).toBe(true);
    expect(tx.lock.create).toHaveBeenCalledTimes(1);
  });

  it("fails when lock is held by another user", async () => {
    const now = new Date();
    const tx = {
      lock: {
        findUnique: vi.fn().mockResolvedValue({
          roomId: "room-1",
          x: 1,
          y: 2,
          lockedByUserId: "user-2",
          expiresAt: new Date(now.getTime() + 60_000),
        }),
        delete: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
    type Tx = typeof tx;
    prismaMock.$transaction.mockImplementation(async (fn: (tx: Tx) => unknown) =>
      fn(tx)
    );

    const { acquireLock } = await import("./lock-service");
    const result = await acquireLock("room-1", 1, 2, "user-1");

    expect(result).toEqual({ success: false, lockedByUserId: "user-2" });
    expect(tx.lock.create).not.toHaveBeenCalled();
  });

  it("returns conflict when unique constraint is hit", async () => {
    prismaMock.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "0.0.0",
      })
    );

    const { acquireLock } = await import("./lock-service");
    const result = await acquireLock("room-1", 1, 2, "user-1");

    expect(result).toEqual({ success: false });
  });

  it("releases lock only when owned by current user", async () => {
    prismaMock.lock.findUnique.mockResolvedValue({
      roomId: "room-1",
      x: 3,
      y: 4,
      lockedByUserId: "owner",
    });
    prismaMock.lock.delete.mockResolvedValue({});

    const { releaseLock } = await import("./lock-service");

    const denied = await releaseLock("room-1", 3, 4, "other");
    expect(denied).toEqual({ success: false });

    const granted = await releaseLock("room-1", 3, 4, "owner");
    expect(granted).toEqual({ success: true });
    expect(prismaMock.lock.delete).toHaveBeenCalledTimes(1);
  });
});
