import { useState, useEffect, useCallback } from "react";
import type { RoomDetail } from "@/types";

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "ルームの取得に失敗しました");
      }
    } catch {
      setError("ネットワークエラー");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();

    let interval: any;
    const eventSource = new EventSource(`/api/rooms/${roomId}/events`);

    eventSource.addEventListener("room_update", () => {
      fetchRoom();
    });

    eventSource.onerror = () => {
      eventSource.close();
      // Fallback to polling
      if (!interval) {
        interval = setInterval(fetchRoom, 3000);
      }
    };

    return () => {
      eventSource.close();
      if (interval) clearInterval(interval);
    };
  }, [roomId, fetchRoom]);

  return { room, loading, error, refetch: fetchRoom };
}
