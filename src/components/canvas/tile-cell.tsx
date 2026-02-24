"use client";

import { memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Lock as LockIcon, Plus, Loader2, Check, X, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import type { Tile, Expansion, Lock as LockType } from "@/types";

const CELL_SIZE = 256;

interface TileCellProps {
  x: number;
  y: number;
  tile?: Tile;
  lock?: LockType;
  expansion?: Expansion;
  isExpansionTarget?: boolean;
  userId: string;
  isOwner: boolean;
  onExpand: (x: number, y: number, fromTile: Tile) => void;
  onAdopt: (expansion: Expansion) => void;
  onReject: (expansion: Expansion) => void;
  adjacentTile?: Tile; // 拡張元タイル
  isGeneratingInitial?: boolean;
  isFailedInitial?: boolean;
  onRetryInitial?: () => void;
}

export const TileCell = memo(function TileCell({
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
  isGeneratingInitial,
  isFailedInitial,
  onRetryInitial,
}: TileCellProps) {
  const now = new Date();
  const activeLock = lock && new Date(lock.expiresAt) > now;
  const isMyLock = activeLock && lock.lockedByUserId === userId;

  if (tile) {
    // タイルがある場合
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden group"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: "1px solid color-mix(in srgb, var(--color-border) 88%, var(--color-surface-3))",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, white 24%, transparent), 0 10px 24px color-mix(in srgb, black 14%, transparent)",
        }}
      >
        <Image
          src={tile.imageUrl}
          alt={`Tile (${x}, ${y})`}
          width={CELL_SIZE}
          height={CELL_SIZE}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(158deg, color-mix(in srgb, white 10%, transparent) 0%, transparent 46%, color-mix(in srgb, black 8%, transparent) 100%)",
          }}
        />
        <AnimatePresence>
          {isGeneratingInitial && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20"
              style={{ background: "var(--color-overlay)" }}
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-accent)" }} />
              <span className="text-xs text-white font-medium">初期画像を生成中...</span>
            </motion.div>
          )}
          {isFailedInitial && onRetryInitial && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20"
              style={{ background: "var(--color-overlay)" }}
            >
              <span className="text-xs text-white font-medium">生成に失敗しました</span>
              <button
                onClick={onRetryInitial}
                className="px-3 py-1.5 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                style={{ background: "var(--color-accent)", borderRadius: "var(--radius-md)" }}
              >
                <RefreshCw size={14} />
                リトライ
              </button>
            </motion.div>
          )}
          {expansion && expansion.status === "DONE" && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30"
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
                  className="px-4 py-2 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg"
                  style={{ background: "var(--color-success)", borderRadius: "var(--radius-md)" }}
                >
                  <Check size={16} />
                  採用に投票
                  {(expansion.votes?.filter((v) => v.vote === "ADOPT").length ?? 0) > 0 && (
                    <span className="ml-0.5 opacity-80">
                      {expansion.votes!.filter((v) => v.vote === "ADOPT").length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onReject(expansion)}
                  className="px-4 py-2 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg"
                  style={{ background: "var(--color-error)", borderRadius: "var(--radius-md)" }}
                >
                  <X size={16} />
                  却下に投票
                  {(expansion.votes?.filter((v) => v.vote === "REJECT").length ?? 0) > 0 && (
                    <span className="ml-0.5 opacity-80">
                      {expansion.votes!.filter((v) => v.vote === "REJECT").length}
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (expansion) {
    // 拡張中（ロック中 or 生成中）
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative flex flex-col items-center justify-center gap-2 overflow-hidden"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: "1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-border))",
          background: "linear-gradient(145deg, color-mix(in srgb, var(--color-accent-light) 70%, white) 0%, var(--color-accent-light) 42%, color-mix(in srgb, var(--color-canvas-bg) 75%, var(--color-accent-light)) 100%)",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, white 24%, transparent)",
        }}
      >
        <motion.div
          className="absolute inset-6 rounded-2xl pointer-events-none"
          style={{ border: "1px dashed color-mix(in srgb, var(--color-accent) 45%, transparent)" }}
          animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {expansion.status === "RUNNING" ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-accent)" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>生成中</span>
          </div>
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
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
                style={{ background: "var(--color-overlay)" }}
              >
                <span className="text-white text-xs font-bold uppercase tracking-widest">候補あり</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAdopt(expansion)}
                    className="px-4 py-2 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg"
                    style={{ background: "var(--color-success)", borderRadius: "var(--radius-md)" }}
                  >
                    <Check size={16} />
                    採用に投票
                    {(expansion.votes?.filter((v) => v.vote === "ADOPT").length ?? 0) > 0 && (
                      <span className="ml-0.5 opacity-80">
                        {expansion.votes!.filter((v) => v.vote === "ADOPT").length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onReject(expansion)}
                    className="px-4 py-2 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg"
                    style={{ background: "var(--color-error)", borderRadius: "var(--radius-md)" }}
                  >
                    <X size={16} />
                    却下に投票
                    {(expansion.votes?.filter((v) => v.vote === "REJECT").length ?? 0) > 0 && (
                      <span className="ml-0.5 opacity-80">
                        {expansion.votes!.filter((v) => v.vote === "REJECT").length}
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin opacity-50" style={{ color: "var(--color-accent)" }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>待機中</span>
          </div>
        )}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm uppercase tracking-tighter"
          style={{ background: "var(--color-accent)", borderRadius: "var(--radius-full)" }}
        >
          {isMyLock ? "自分" : "他"}
        </motion.div>
      </motion.div>
    );
  }

  if (isExpansionTarget && adjacentTile) {
    // 拡張可能な空きセル
    const isLocked = activeLock && !isMyLock;

    return (
      <motion.div
        whileHover={!isLocked ? { scale: 0.98 } : {}}
        whileTap={!isLocked ? { scale: 0.95 } : {}}
        role="button"
        tabIndex={0}
        className="relative flex items-center justify-center cursor-pointer transition-all duration-300 group overflow-hidden"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: isLocked
            ? "2px dashed var(--color-error)"
            : "2px dashed var(--color-border)",
          background: isLocked
            ? "color-mix(in srgb, var(--color-error) 5%, transparent)"
            : "var(--color-canvas-expandable)",
          cursor: isLocked ? "not-allowed" : "pointer",
        }}
        onClick={() => !isLocked && onExpand(x, y, adjacentTile)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if ((e.key === "Enter" || e.key === " ") && !isLocked) {
            e.preventDefault();
            onExpand(x, y, adjacentTile);
          }
        }}
        onMouseEnter={(e) => {
          if (!isLocked) {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.background = "var(--color-accent-light)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isLocked) {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.background = "var(--color-canvas-expandable)";
          }
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
          style={{ background: "var(--color-accent)" }}
        />
        
        {isLocked ? (
          <div className="flex flex-col items-center gap-2" style={{ color: "var(--color-error)" }}>
            <LockIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">ロック中</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 transition-all duration-300 group-hover:scale-110" style={{ color: "var(--color-text-muted)" }}>
            <motion.div
              className="absolute inset-7 rounded-2xl pointer-events-none"
              style={{ border: "1px dashed color-mix(in srgb, var(--color-accent) 40%, transparent)" }}
              animate={{ opacity: [0.12, 0.45, 0.12], scale: [0.95, 1.03, 0.95] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Wand2 className="w-6 h-6 transition-colors" style={{ color: "var(--color-accent)" }} />
              <Sparkles className="w-3.5 h-3.5 absolute -top-0.5 -right-1" style={{ color: "var(--color-accent)" }} />
            </div>
            <div className="flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--color-text-muted)" }}>拡張</span>
            </div>
          </div>
        )}
      </motion.div>
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
});
