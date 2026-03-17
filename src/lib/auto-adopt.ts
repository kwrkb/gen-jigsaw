import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { emitRoomEvent } from "./sse-emitter";
import { logger } from "./logger";

// DONE 状態のまま放置された Expansion を自動決定するまでの時間 (ms)
// デフォルト 1 分。AUTO_ADOPT_AFTER_MS 環境変数で変更可能。
const AUTO_ADOPT_AFTER_MS = Number(
  process.env.AUTO_ADOPT_AFTER_MS ?? 60 * 1000
);

type StaleExpansion = Prisma.ExpansionGetPayload<{
  include: { votes: true };
}>;

/**
 * DONE 状態のまま放置された Expansion を自動決定する。
 * パフォーマンス向上のため、可能な限りバッチ処理（createMany/updateMany）を使用する。
 */
export async function autoAdoptStaleExpansions(roomId: string): Promise<void> {
  const threshold = new Date(Date.now() - AUTO_ADOPT_AFTER_MS);

  const stale = await prisma.expansion.findMany({
    where: {
      roomId,
      status: "DONE",
      updatedAt: { lt: threshold },
    },
    include: { votes: true },
  });

  if (stale.length === 0) return;

  // (targetX, targetY) でグルーピング
  const byCell = new Map<string, StaleExpansion[]>();
  for (const exp of stale) {
    const key = `${exp.targetX},${exp.targetY}`;
    const arr = byCell.get(key) ?? [];
    arr.push(exp);
    byCell.set(key, arr);
  }

  const tilesToCreate: {
    id: string;
    roomId: string;
    x: number;
    y: number;
    imageUrl: string;
    createdByUserId: string;
  }[] = [];
  const adoptExpIds: string[] = [];
  const rejectExpIds: string[] = [];
  const locksToDelete: { roomId: string; x: number; y: number }[] = [];

  for (const [, candidates] of byCell) {
    const { pick, rejects } = decideExpansion(candidates);

    if (pick) {
      tilesToCreate.push({
        id: createId(),
        roomId: pick.roomId,
        x: pick.targetX,
        y: pick.targetY,
        imageUrl: pick.resultImageUrl!,
        createdByUserId: pick.createdByUserId,
      });
      adoptExpIds.push(pick.id);
      rejectExpIds.push(...rejects.map((e) => e.id));
      locksToDelete.push({
        roomId: pick.roomId,
        x: pick.targetX,
        y: pick.targetY,
      });
    } else {
      rejectExpIds.push(...candidates.map((e) => e.id));
      locksToDelete.push({
        roomId: candidates[0].roomId,
        x: candidates[0].targetX,
        y: candidates[0].targetY,
      });
    }
  }

  try {
    // パフォーマンス最適化: 全セルを1つのトランザクションでバッチ処理
    await prisma.$transaction([
      ...(tilesToCreate.length > 0
        ? [prisma.tile.createMany({ data: tilesToCreate })]
        : []),
      ...(adoptExpIds.length > 0
        ? [
            prisma.expansion.updateMany({
              where: { id: { in: adoptExpIds }, status: "DONE" },
              data: { status: "ADOPTED" },
            }),
          ]
        : []),
      ...(rejectExpIds.length > 0
        ? [
            prisma.expansion.updateMany({
              where: { id: { in: rejectExpIds }, status: "DONE" },
              data: { status: "REJECTED" },
            }),
          ]
        : []),
      ...(locksToDelete.length > 0
        ? [
            prisma.lock.deleteMany({
              where: { OR: locksToDelete },
            }),
          ]
        : []),
    ]);
    emitRoomEvent(roomId, "room_update");
  } catch (err) {
    // バッチ処理が失敗した場合（例: ユニーク制約違反）、
    // 堅牢性のために従来の逐次処理にフォールバックする
    logger.warn(
      `[auto-adopt] Batched transaction failed, falling back to sequential:`,
      err
    );
    await autoAdoptSequentialFallback(byCell, roomId);
  }
}

/**
 * 与えられた候補の中から採用するものを決定する（投票集計ロジック）
 */
function decideExpansion<
  T extends {
    id: string;
    resultImageUrl: string | null;
    votes: { vote: string }[];
  }
>(candidates: T[]) {
  let totalAdopt = 0;
  let totalReject = 0;
  const candidateAdoptCounts = new Map<string, number>();

  for (const e of candidates) {
    let eAdopt = 0;
    for (const v of e.votes) {
      if (v.vote === "ADOPT") {
        eAdopt++;
      } else if (v.vote === "REJECT") {
        totalReject++;
      }
    }
    totalAdopt += eAdopt;
    candidateAdoptCounts.set(e.id, eAdopt);
  }

  let pick: T | undefined;

  if (totalReject <= totalAdopt) {
    const valid = candidates.filter((e) => e.resultImageUrl);
    if (valid.length > 0) {
      if (totalAdopt === 0 && totalReject === 0) {
        pick = valid[Math.floor(Math.random() * valid.length)];
      } else {
        pick = valid.reduce((best, e) => {
          const bestVotes = candidateAdoptCounts.get(best.id) ?? 0;
          const eVotes = candidateAdoptCounts.get(e.id) ?? 0;
          return eVotes > bestVotes ? e : best;
        });
      }
    }
  }

  const rejects = candidates.filter((e) => e.id !== pick?.id);
  return { pick, rejects };
}

/**
 * バッチ処理失敗時のフォールバック。セルごとにトランザクションを実行する。
 */
async function autoAdoptSequentialFallback(
  byCell: Map<string, StaleExpansion[]>,
  roomId: string
) {
  let changed = false;
  for (const [, candidates] of byCell) {
    const { pick, rejects } = decideExpansion(candidates);

    if (pick) {
      try {
        await prisma.$transaction([
          prisma.tile.create({
            data: {
              id: createId(),
              roomId: pick.roomId,
              x: pick.targetX,
              y: pick.targetY,
              imageUrl: pick.resultImageUrl!,
              createdByUserId: pick.createdByUserId,
            },
          }),
          // P1: レース対策 — status: "DONE" 条件を追加
          prisma.expansion.updateMany({
            where: { id: pick.id, status: "DONE" },
            data: { status: "ADOPTED" },
          }),
          ...(rejects.length > 0
            ? [
                prisma.expansion.updateMany({
                  where: { id: { in: rejects.map((e) => e.id) }, status: "DONE" },
                  data: { status: "REJECTED" },
                }),
              ]
            : []),
          prisma.lock.deleteMany({
            where: {
              roomId: pick.roomId,
              x: pick.targetX,
              y: pick.targetY,
            },
          }),
        ]);
        changed = true;
      } catch (err) {
        logger.warn(`[auto-adopt] expansion ${pick.id} fallback failed:`, err);
        // P2: リトライループ防止 — 失敗した全候補を REJECTED に更新
        await prisma.expansion
          .updateMany({
            where: { id: { in: candidates.map((e) => e.id) }, status: "DONE" },
            data: { status: "REJECTED" },
          })
          .catch((e2) => logger.warn(`[auto-adopt] fallback reject failed:`, e2));
      }
    } else {
      // 全却下
      try {
        await prisma.$transaction([
          prisma.expansion.updateMany({
            where: { id: { in: candidates.map((e) => e.id) }, status: "DONE" },
            data: { status: "REJECTED" },
          }),
          prisma.lock.deleteMany({
            where: {
              roomId: candidates[0].roomId,
              x: candidates[0].targetX,
              y: candidates[0].targetY,
            },
          }),
        ]);
        changed = true;
      } catch (err) {
        logger.warn(`[auto-adopt] all-reject for cell failed:`, err);
      }
    }
  }

  if (changed) {
    emitRoomEvent(roomId, "room_update");
  }
}
