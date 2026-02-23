"use client";

import { useState, use } from "react";
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

  const isOwner = room.ownerUserId === user.id;

  function handleExpand(x: number, y: number, fromTile: Tile) {
    setExpandTarget({ x, y, fromTile });
  }

  async function handleAdopt(expansion: Expansion) {
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
      addToast("タイルを採用しました！", "success");
      refetch();
    } catch {
      addToast("ネットワークエラー", "error");
    }
  }

  async function handleRetryInitial() {
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
  }

  async function handleReject(expansion: Expansion) {
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
      addToast("候補を却下しました", "info");
      refetch();
    } catch {
      addToast("ネットワークエラー", "error");
    }
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
          className="w-72 flex flex-col overflow-hidden flex-shrink-0"
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
