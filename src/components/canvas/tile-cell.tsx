"use client";

import Image from "next/image";
import type { Tile, Expansion, Lock } from "@/types";

const CELL_SIZE = 256;

interface TileCellProps {
  x: number;
  y: number;
  tile?: Tile;
  lock?: Lock;
  expansion?: Expansion;
  isExpansionTarget?: boolean;
  userId: string;
  isOwner: boolean;
  onExpand: (x: number, y: number, fromTile: Tile) => void;
  onAdopt: (expansion: Expansion) => void;
  onReject: (expansion: Expansion) => void;
  adjacentTile?: Tile; // 拡張元タイル
}

export function TileCell({
  x,
  y,
  tile,
  lock,
  expansion,
  isExpansionTarget,
  userId,
  isOwner,
  onExpand,
  onAdopt,
  onReject,
  adjacentTile,
}: TileCellProps) {
  const now = new Date();
  const activeLock = lock && new Date(lock.expiresAt) > now;
  const isMyLock = activeLock && lock.lockedByUserId === userId;

  if (tile) {
    // タイルがある場合
    return (
      <div
        className="relative overflow-hidden"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: "1px solid var(--color-border)",
        }}
      >
        <Image
          src={tile.imageUrl}
          alt={`Tile (${x}, ${y})`}
          width={CELL_SIZE}
          height={CELL_SIZE}
          className="object-cover"
          unoptimized
        />
        {expansion && expansion.status === "DONE" && isOwner && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "var(--color-overlay)" }}
          >
            <Image
              src={expansion.resultImageUrl!}
              alt="候補"
              width={CELL_SIZE}
              height={CELL_SIZE}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              unoptimized
            />
            <div className="relative z-10 flex gap-2">
              <button
                onClick={() => onAdopt(expansion)}
                className="px-3 py-1 text-white text-xs font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--color-success)", borderRadius: "var(--radius-sm)" }}
              >
                採用
              </button>
              <button
                onClick={() => onReject(expansion)}
                className="px-3 py-1 text-white text-xs font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--color-error)", borderRadius: "var(--radius-sm)" }}
              >
                却下
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (expansion) {
    // 拡張中（ロック中 or 生成中）
    return (
      <div
        className="relative flex flex-col items-center justify-center gap-2"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: "1px solid var(--color-accent)",
          background: "var(--color-accent-light)",
        }}
      >
        {expansion.status === "RUNNING" ? (
          <>
            <div
              className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
            <span className="text-xs" style={{ color: "var(--color-accent)" }}>生成中...</span>
          </>
        ) : expansion.status === "DONE" ? (
          <>
            {expansion.resultImageUrl && (
              <Image
                src={expansion.resultImageUrl}
                alt="候補"
                width={CELL_SIZE}
                height={CELL_SIZE}
                className="absolute inset-0 w-full h-full object-cover"
                unoptimized
              />
            )}
            {isOwner && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: "var(--color-overlay)" }}
              >
                <span className="text-white text-xs font-medium">候補あり</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAdopt(expansion)}
                    className="px-3 py-1 text-white text-xs font-medium transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-success)", borderRadius: "var(--radius-sm)" }}
                  >
                    採用
                  </button>
                  <button
                    onClick={() => onReject(expansion)}
                    className="px-3 py-1 text-white text-xs font-medium transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-error)", borderRadius: "var(--radius-sm)" }}
                  >
                    却下
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>待機中</span>
          </>
        )}
        <div
          className="absolute top-1 right-1 text-white text-xs px-1 py-0.5"
          style={{ background: "var(--color-accent)", borderRadius: "var(--radius-sm)" }}
        >
          {isMyLock ? "自分" : "他"}
        </div>
      </div>
    );
  }

  if (isExpansionTarget && adjacentTile) {
    // 拡張可能な空きセル
    const isLocked = activeLock && !isMyLock;

    return (
      <div
        className="relative flex items-center justify-center cursor-pointer transition-all"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: isLocked
            ? "2px dashed var(--color-error)"
            : "2px dashed var(--color-text-muted)",
          background: isLocked
            ? "color-mix(in srgb, var(--color-error) 5%, transparent)"
            : "var(--color-canvas-expandable)",
          cursor: isLocked ? "not-allowed" : "pointer",
        }}
        onClick={() => !isLocked && onExpand(x, y, adjacentTile)}
        onMouseEnter={(e) => {
          if (!isLocked) {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.background = "var(--color-accent-light)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isLocked) {
            e.currentTarget.style.borderColor = "var(--color-text-muted)";
            e.currentTarget.style.background = "var(--color-canvas-expandable)";
          }
        }}
      >
        {isLocked ? (
          <div className="flex flex-col items-center gap-1" style={{ color: "var(--color-error)" }}>
            <span className="text-2xl">🔒</span>
            <span className="text-xs">ロック中</span>
          </div>
        ) : (
          <span
            className="text-4xl select-none transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            +
          </span>
        )}
      </div>
    );
  }

  // 空セル（拡張不可）
  return (
    <div
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        background: "var(--color-canvas-empty)",
      }}
    />
  );
}
