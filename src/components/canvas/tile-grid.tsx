"use client";

import { useRef, useState, useCallback, useEffect, useMemo, memo } from "react";
import type { RoomDetail, Tile, Expansion, Lock, InitialTileStatus } from "@/types";
import { TileCell } from "./tile-cell";

const CELL_SIZE = 256;
const PADDING = 1; // グリッドの外側に追加するパディング（セル数）

interface TileGridProps {
  room: RoomDetail & { initialTileStatus: InitialTileStatus; initialPrompt?: string | null };
  userId: string;
  isOwner: boolean;
  onExpand: (x: number, y: number, fromTile: Tile) => void;
  onAdopt: (expansion: Expansion) => void;
  onReject: (expansion: Expansion) => void;
  onRetryInitial?: () => void;
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
  let minX = tiles[0].x;
  let maxX = tiles[0].x;
  let minY = tiles[0].y;
  let maxY = tiles[0].y;
  for (let i = 1; i < tiles.length; i++) {
    const { x, y } = tiles[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    minX: minX - PADDING,
    maxX: maxX + PADDING,
    minY: minY - PADDING,
    maxY: maxY + PADDING,
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

export const TileGrid = memo(function TileGrid({
  room,
  userId,
  isOwner,
  onExpand,
  onAdopt,
  onReject,
  onRetryInitial,
}: TileGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const lastPos = useRef({ x: 0, y: 0 });

  const bounds = useMemo(() => getGridBounds(room.tiles), [room.tiles]);
  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxY - bounds.minY + 1;

  const tileMap = useMemo(
    () => new Map<string, Tile>(room.tiles.map((t) => [`${t.x},${t.y}`, t])),
    [room.tiles]
  );

  const lockMap = useMemo(() => {
    const now = new Date();
    return new Map<string, Lock>(
      room.locks
        .filter((l) => new Date(l.expiresAt) > now)
        .map((l) => [`${l.x},${l.y}`, l])
    );
  }, [room.locks]);

  const expansionMap = useMemo(() => {
    const map = new Map<string, Expansion>();
    for (const exp of room.expansions) {
      if (["QUEUED", "RUNNING", "DONE"].includes(exp.status)) {
        const key = `${exp.targetX},${exp.targetY}`;
        const existing = map.get(key);
        if (!existing || exp.createdAt > existing.createdAt) {
          map.set(key, exp);
        }
      }
    }
    return map;
  }, [room.expansions]);

  const fitToView = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const padding = 32;
      const nextScale = Math.min(
        1.4,
        Math.max(
          0.3,
          Math.min(
            (rect.width - padding * 2) / (cols * CELL_SIZE),
            (rect.height - padding * 2) / (rows * CELL_SIZE)
          )
        )
      );
      const gridW = cols * CELL_SIZE * nextScale;
      const gridH = rows * CELL_SIZE * nextScale;
      setScale(nextScale);
      setOffset({
        x: (rect.width - gridW) / 2,
        y: (rect.height - gridH) / 2,
      });
    }
  }, [cols, rows]);

  // 初期オフセット（グリッドを中央に）— 初回マウント時のみ
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (!hasFittedRef.current) {
      hasFittedRef.current = true;
      fitToView();
    }
  }, [fitToView]);

  const beginPan = useCallback((clientX: number, clientY: number) => {
    lastPos.current = { x: clientX, y: clientY };
  }, []);

  const movePan = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - lastPos.current.x;
    const dy = clientY - lastPos.current.y;
    lastPos.current = { x: clientX, y: clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 子要素のボタン/リンクのクリックを奪わないよう、インタラクティブ要素は除外
    if (pointerIdRef.current !== null) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [role='button']")) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    beginPan(e.clientX, e.clientY);
  }, [beginPan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    movePan(e.clientX, e.clientY);
  }, [movePan]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // ズーム操作
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.3), 3));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOffset((prev) => ({ ...prev, y: prev.y + 32 }));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOffset((prev) => ({ ...prev, y: prev.y - 32 }));
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setOffset((prev) => ({ ...prev, x: prev.x + 32 }));
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setOffset((prev) => ({ ...prev, x: prev.x - 32 }));
      return;
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setScale((prev) => Math.min(prev + 0.1, 3));
      return;
    }
    if (e.key === "-") {
      e.preventDefault();
      setScale((prev) => Math.max(prev - 0.1, 0.3));
      return;
    }
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      fitToView();
    }
  }, [fitToView]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
      style={{ background: "var(--color-canvas-bg)", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="タイルキャンバス。ドラッグまたは矢印キーで移動、ホイールか+/-でズーム、Fキーで全体表示します。"
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
            const isOriginTile = x === 0 && y === 0;
            const isGeneratingInitial = isOriginTile && room.initialTileStatus === "GENERATING";
            const isFailedInitial = isOriginTile && room.initialTileStatus === "FAILED";
            // 初期タイル生成が完了していない間は隣接セルの "+" を抑制
            const suppressExpand = room.initialPrompt && room.initialTileStatus !== "DONE";

            return (
              <TileCell
                key={key}
                x={x}
                y={y}
                tile={tile}
                lock={lock}
                expansion={expansion}
                isExpansionTarget={!suppressExpand && !!adjacentTile}
                userId={userId}
                isOwner={isOwner}
                onExpand={onExpand}
                onAdopt={onAdopt}
                onReject={onReject}
                adjacentTile={adjacentTile}
                isGeneratingInitial={isGeneratingInitial}
                isFailedInitial={isFailedInitial}
                onRetryInitial={isFailedInitial ? onRetryInitial : undefined}
              />
            );
          })
        )}
      </div>

      {/* ズームコントロール */}
      <div
        className="absolute bottom-4 right-4 flex items-center gap-2 p-2"
        style={{
          background: "color-mix(in srgb, var(--color-surface-1) 92%, transparent)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <button
          onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
          }}
          aria-label="ズームイン"
        >
          +
        </button>
        <input
          type="range"
          min={0.3}
          max={3}
          step={0.1}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-20"
          aria-label="ズーム倍率"
        />
        <button
          onClick={fitToView}
          className="h-8 px-2 flex items-center justify-center text-xs transition-colors"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
          }}
          aria-label="全体表示"
        >
          Fit
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-secondary)",
          }}
          aria-label="ズームアウト"
        >
          -
        </button>
        <span className="text-xs tabular-nums min-w-10 text-right" style={{ color: "var(--color-text-muted)" }}>
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
});
