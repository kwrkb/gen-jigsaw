import { useState, useEffect, useCallback, useRef } from "react";
import type { RoomDetail } from "@/types";

const FALLBACK_POLL_INTERVAL = 3_000;

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
        setError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "Failed to fetch room");
      }
    } catch (err) {
      console.error("Failed to fetch room:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();

    // SSE setup
    const eventSource = new EventSource(`/api/rooms/${roomId}/events`);
    eventSourceRef.current = eventSource;

    // Fallback polling — only activated when SSE disconnects
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    eventSource.onopen = () => {
      stopPolling();
    };

    eventSource.addEventListener("room_update", () => {
      fetchRoom();
      stopPolling();
    });

    eventSource.onerror = () => {
      if (!pollTimer) {
        console.warn("SSE connection lost, falling back to polling");
        pollTimer = setInterval(fetchRoom, FALLBACK_POLL_INTERVAL);
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [roomId, fetchRoom]);

  return {
    room,
    loading,
    error,
    refetch: fetchRoom,
  };
}
