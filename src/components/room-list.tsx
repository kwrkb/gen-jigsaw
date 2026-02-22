"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Room } from "@/types";

interface RoomWithOwner extends Room {
  owner: { displayName: string };
}

interface RoomListProps {
  refreshTrigger?: number;
}

export function RoomList({ refreshTrigger }: RoomListProps) {
  const [rooms, setRooms] = useState<RoomWithOwner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms, refreshTrigger]);

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>;
  }

  if (rooms.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-12">
        まだルームがありません。最初のルームを作成しましょう！
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {rooms.map((room) => (
        <Link
          key={room.id}
          href={`/room/${room.id}`}
          className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {room.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                by {room.owner.displayName}
              </p>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(room.createdAt).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
