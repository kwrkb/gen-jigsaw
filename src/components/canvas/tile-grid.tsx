"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { RoomDetail, Tile, Expansion, Lock } from "@/types";
import { TileCell } from "./tile-cell";

const CELL_SIZE = 256;
const PADDING = 1; // グリッドの外側に追加するパディング（セル数）

interface TileGridProps {
  room: RoomDetail;
  userId: string;
  isOwner: boolean;
  onExpand: (x: number, y: number, fromTile: Tile) => void;
  onAdopt: (expansion: Expansion) => void;
  onReject: (expansion: Expansion) => void;
}

interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function getGridBounds(tiles: Tile[]): GridBounds {
  if (tiles.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  return {
    minX: Math.min(...tiles.map((t) => t.x)) - PADDING,
    maxX: Math.max(...tiles.map((t) => t.x)) + PADDING,
    minY: Math.min(...tiles.map((t) => t.y)) - PADDING,
    maxY: Math.max(...tiles.map((t) => t.y)) + PADDING,
  };
}

// 隣接するタイルがあるか確認（拡張可能な空きセル判定）
function getAdjacentTile(
  x: number,
  y: number,
  tileMap: Map<string, Tile>
): Tile | undefined {
  const neighbors = [
    [x, y - 1],
    [x, y + 1],
    [x - 1, y],
    [x + 1, y],
  ];
  for (const [nx, ny] of neighbors) {
    const tile = tileMap.get(`${nx},${ny}`);
    if (tile) return tile;
  }
  return undefined;
}

export function TileGrid({
  room,
  userId,
  isOwner,
  onExpand,
  onAdopt,
  onReject,
}: TileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const bounds = getGridBounds(room.tiles);
  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxY - bounds.minY + 1;

  // タイルマップ
  const tileMap = new Map<string, Tile>(
    room.tiles.map((t) => [`${t.x},${t.y}`, t])
  );

  // ロックマップ
  const now = new Date();
  const lockMap = new Map<string, Lock>(
    room.locks
      .filter((l) => new Date(l.expiresAt) > now)
      .map((l) => [`${l.x},${l.y}`, l])
  );

  // 進行中のExpansionマップ（QUEUED/RUNNING/DONE）
  const expansionMap = new Map<string, Expansion>();
  for (const exp of room.expansions) {
    if (["QUEUED", "RUNNING", "DONE"].includes(exp.status)) {
      const key = `${exp.targetX},${exp.targetY}`;
      // 最新のexpansionを優先
      const existing = expansionMap.get(key);
      if (!existing || exp.createdAt > existing.createdAt) {
        expansionMap.set(key, exp);
      }
    }
  }

  // 初期オフセット（グリッドを中央に）
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const gridW = cols * CELL_SIZE * scale;
      const gridH = rows * CELL_SIZE * scale;
      setOffset({
        x: (rect.width - gridW) / 2,
        y: (rect.height - gridH) / 2,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ

  // パン操作
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ズーム操作
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.3), 3));
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-gray-100 dark:bg-gray-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        style={{
          position: "absolute",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "top left",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
          gap: 0,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {Array.from({ length: rows }, (_, rowIdx) =>
          Array.from({ length: cols }, (_, colIdx) => {
            const x = bounds.minX + colIdx;
            const y = bounds.minY + rowIdx;
            const key = `${x},${y}`;
            const tile = tileMap.get(key);
            const lock = lockMap.get(key);
            const expansion = expansionMap.get(key);
            const adjacentTile = !tile ? getAdjacentTile(x, y, tileMap) : undefined;

            return (
              <TileCell
                key={key}
                x={x}
                y={y}
                tile={tile}
                lock={lock}
                expansion={expansion}
                isExpansionTarget={!!adjacentTile}
                userId={userId}
                isOwner={isOwner}
                onExpand={onExpand}
                onAdopt={onAdopt}
                onReject={onReject}
                adjacentTile={adjacentTile}
              />
            );
          })
        )}
      </div>

      {/* ズームコントロール */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
          className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={() => setScale(1)}
          className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow flex items-center justify-center text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          1x
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.3))}
          className="w-8 h-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          -
        </button>
      </div>
    </div>
  );
}
