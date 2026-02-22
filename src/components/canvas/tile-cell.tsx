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
        className="relative border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
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
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
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
                className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-medium hover:bg-green-600"
              >
                採用
              </button>
              <button
                onClick={() => onReject(expansion)}
                className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600"
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
        className="relative border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950 flex flex-col items-center justify-center gap-2"
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
      >
        {expansion.status === "RUNNING" ? (
          <>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-600 dark:text-blue-400">生成中...</span>
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
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <span className="text-white text-xs font-medium">候補あり</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAdopt(expansion)}
                    className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg font-medium hover:bg-green-600"
                  >
                    採用
                  </button>
                  <button
                    onClick={() => onReject(expansion)}
                    className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600"
                  >
                    却下
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-500 dark:text-blue-400">待機中</span>
          </>
        )}
        <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
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
        className={`relative border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
          isLocked
            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 cursor-not-allowed"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
        }`}
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
        onClick={() => !isLocked && onExpand(x, y, adjacentTile)}
      >
        {isLocked ? (
          <div className="flex flex-col items-center gap-1 text-red-400">
            <span className="text-2xl">🔒</span>
            <span className="text-xs">ロック中</span>
          </div>
        ) : (
          <span className="text-4xl text-gray-400 dark:text-gray-600 hover:text-blue-500 select-none">
            +
          </span>
        )}
      </div>
    );
  }

  // 空セル（拡張不可）
  return (
    <div
      className="bg-gray-100 dark:bg-gray-800"
      style={{ width: CELL_SIZE, height: CELL_SIZE }}
    />
  );
}
