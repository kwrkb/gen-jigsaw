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
    return <p style={{ color: "var(--color-text-muted)" }}>読み込み中...</p>;
  }

  if (rooms.length === 0) {
    return (
      <p className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
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
          className="block p-4 transition-all"
          style={{
            background: "var(--color-surface-1)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid var(--color-border)",
            borderLeft: "4px solid transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
            e.currentTarget.style.borderLeftColor = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            e.currentTarget.style.borderLeftColor = "transparent";
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {room.name}
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                by {room.owner.displayName}
              </p>
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {new Date(room.createdAt).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
