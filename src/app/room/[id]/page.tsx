"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 dark:text-gray-400">
          {error ?? "ルームが見つかりません"}
        </p>
        <Link
          href="/"
          className="text-blue-600 hover:underline"
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
        >
          ← 戻る
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 truncate">
          {room.name}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {isOwner && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
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
        />

        {/* サイドパネル */}
        <aside className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              タイル数: {room.tiles.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              拡張数: {room.expansions.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
