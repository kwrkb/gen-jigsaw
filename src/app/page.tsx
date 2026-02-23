"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { UserSetup } from "@/components/user-setup";
import { RoomList } from "@/components/room-list";
import { CreateRoomForm } from "@/components/create-room-form";
import { ToastContainer } from "@/components/toast";

export default function Home() {
  const { user, loading, createUser, logout } = useUser();
  const { toasts, addToast, removeToast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  if (loading) {
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

  function handleRoomCreated(roomId: string) {
    setRefreshTrigger((n) => n + 1);
    addToast("ルームを作成しました！", "success");
    router.push(`/room/${roomId}`);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface-0)" }}>
      <header
        className="px-6 py-4"
        style={{
          background: "var(--color-surface-1)",
          boxShadow: "var(--shadow-sm)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display), sans-serif", color: "var(--color-text-primary)" }}
          >
            Gen-Jigsaw
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {user.displayName}
            </span>
            <button
              onClick={logout}
              className="text-sm transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            ルーム一覧
          </h2>
          <CreateRoomForm
            onCreated={handleRoomCreated}
            onError={(msg) => addToast(msg, "error")}
          />
        </div>
        <RoomList refreshTrigger={refreshTrigger} />
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
