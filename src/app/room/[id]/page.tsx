"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useRoom } from "@/hooks/use-room";
import { useToast } from "@/hooks/use-toast";
import { UserSetup } from "@/components/user-setup";
import { TileGrid } from "@/components/canvas/tile-grid";
import { ExpansionPanel } from "@/components/expansion/expansion-panel";
import { CandidateList } from "@/components/expansion/candidate-list";
import { ToastContainer } from "@/components/toast";
import type { Tile, Expansion } from "@/types";

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = use(params);
  const { user, loading: userLoading, createUser } = useUser();
  const { room, loading: roomLoading, error, refetch } = useRoom(roomId);
  const { toasts, addToast, removeToast } = useToast();
  const [expandTarget, setExpandTarget] = useState<{
    x: number;
    y: number;
    fromTile: Tile;
  } | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const isOwner = !!(room && user && room.ownerUserId === user.id);

  // PENDING 状態の初期タイルを自動トリガー（オーナーのみ）
  const initialTriggerFired = useRef(false);
  useEffect(() => {
    if (
      isOwner &&
      room?.initialTileStatus === "PENDING" &&
      room?.initialPrompt &&
      !initialTriggerFired.current
    ) {
      initialTriggerFired.current = true;
      fetch(`/api/rooms/${roomId}/generate-initial`, { method: "POST" })
        .then((res) => {
          if (res.ok) refetch();
        })
        .catch(() => {
          initialTriggerFired.current = false;
          refetch();
        });
    }
  }, [isOwner, room?.initialTileStatus, room?.initialPrompt, roomId, refetch]);

  const handleExpand = useCallback((x: number, y: number, fromTile: Tile) => {
    setExpandTarget({ x, y, fromTile });
  }, []);

  const handleAdopt = useCallback(async (expansion: Expansion) => {
    try {
      const res = await fetch(`/api/expansions/${expansion.id}/adopt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error ?? "採用に失敗しました", "error");
        return;
      }
      addToast("採用に投票しました", "success");
      refetch();
    } catch {
      addToast("ネットワークエラー", "error");
    }
  }, [addToast, refetch]);

  const handleRetryInitial = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/generate-initial`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error ?? "リトライに失敗しました", "error");
        return;
      }
      addToast("初期画像を再生成しています...", "info");
      refetch();
    } catch {
      addToast("ネットワークエラー", "error");
    }
  }, [roomId, addToast, refetch]);

  const handleReject = useCallback(async (expansion: Expansion) => {
    try {
      const res = await fetch(`/api/expansions/${expansion.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error ?? "却下に失敗しました", "error");
        return;
      }
      addToast("却下に投票しました", "info");
      refetch();
    } catch {
      addToast("ネットワークエラー", "error");
    }
  }, [addToast, refetch]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <UserSetup
        onSetup={async (name) => {
          await createUser(name);
        }}
      />
    );
  }

  if (roomLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: "var(--color-text-secondary)" }}>
          {error ?? "ルームが見つかりません"}
        </p>
        <Link
          href="/"
          className="hover:underline"
          style={{ color: "var(--color-accent)" }}
        >
          ← ルーム一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--color-surface-0)" }}>
      {/* ヘッダー */}
      <header
        className="px-4 py-3 flex items-center gap-4 flex-shrink-0"
        style={{
          background: "var(--color-surface-1)",
          boxShadow: "var(--shadow-sm)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Link
          href="/"
          className="text-sm transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
        >
          ← 戻る
        </Link>
        <h1
          className="text-lg font-semibold flex-1 truncate"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display), sans-serif" }}
        >
          {room.name}
        </h1>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <button
            type="button"
            onClick={() => setIsMobilePanelOpen(true)}
            className="md:hidden px-2 py-1 text-xs"
            style={{
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-0)",
            }}
            aria-label="候補パネルを開く"
          >
            候補
          </button>
          {isOwner && (
            <span
              className="px-2 py-0.5 text-xs font-medium"
              style={{
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              オーナー
            </span>
          )}
          <span>{user.displayName}</span>
        </div>
      </header>

      {/* メインエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* キャンバス */}
        <TileGrid
          room={room}
          userId={user.id}
          isOwner={isOwner}
          onExpand={handleExpand}
          onAdopt={handleAdopt}
          onReject={handleReject}
          onRetryInitial={handleRetryInitial}
        />

        {/* サイドパネル */}
        <aside
          className="hidden md:flex w-72 flex-col overflow-hidden flex-shrink-0"
          style={{
            background: "var(--color-surface-1)",
            borderLeft: "1px solid var(--color-border)",
          }}
        >
          <div className="p-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              タイル数: {room.tiles.length}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              拡張数: {room.expansions.length}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              隣接する「+」をクリックして世界を拡張できます
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CandidateList
              expansions={room.expansions}
              isOwner={isOwner}
              onAdopt={handleAdopt}
              onReject={handleReject}
            />
          </div>
        </aside>
      </div>

      {/* モバイル候補パネル */}
      {isMobilePanelOpen && (
        <div className="md:hidden fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="候補パネル">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: "var(--color-overlay)" }}
            onClick={() => setIsMobilePanelOpen(false)}
            aria-label="候補パネルを閉じる"
          />
          <aside
            className="absolute bottom-0 left-0 right-0 max-h-[70vh] flex flex-col"
            style={{
              background: "var(--color-surface-1)",
              borderTop: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-xl)",
              borderTopLeftRadius: "var(--radius-xl)",
              borderTopRightRadius: "var(--radius-xl)",
            }}
          >
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                タイル {room.tiles.length} / 拡張 {room.expansions.length}
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePanelOpen(false)}
                className="px-2 py-1 text-xs"
                style={{ color: "var(--color-text-secondary)" }}
                aria-label="候補パネルを閉じる"
              >
                閉じる
              </button>
            </div>
            <div className="overflow-y-auto">
              <CandidateList
                expansions={room.expansions}
                isOwner={isOwner}
                onAdopt={handleAdopt}
                onReject={handleReject}
              />
            </div>
          </aside>
        </div>
      )}

      {/* 拡張パネル */}
      {expandTarget && (
        <ExpansionPanel
          targetX={expandTarget.x}
          targetY={expandTarget.y}
          fromTile={expandTarget.fromTile}
          roomId={roomId}
          onComplete={() => {
            addToast("生成完了！オーナーの採用を待ちます", "success");
            refetch();
          }}
          onClose={() => setExpandTarget(null)}
          onError={(msg) => addToast(msg, "error")}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
