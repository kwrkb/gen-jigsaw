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

  function handleRoomCreated(roomId: string) {
    setRefreshTrigger((n) => n + 1);
    addToast("ルームを作成しました！", "success");
    router.push(`/room/${roomId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            🧩 Gen-Jigsaw
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.displayName}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            ルーム一覧
          </h2>
          <CreateRoomForm
            userId={user.id}
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
