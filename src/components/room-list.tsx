"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Layout, User, Calendar, ArrowUpRight, Inbox } from "lucide-react";
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
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="h-24 animate-pulse rounded-2xl" 
            style={{ background: "var(--color-surface-1)", opacity: 0.5 }} 
          />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
      >
        <div 
          className="w-16 h-16 mb-4 flex items-center justify-center rounded-full opacity-20"
          style={{ background: "var(--color-text-muted)" }}
        >
          <Inbox size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>ルームがありません</h3>
        <p className="text-sm max-w-xs leading-relaxed opacity-70" style={{ color: "var(--color-text-muted)" }}>
          まだルームがありません。最初のルームを作成して世界を広げましょう！
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4">
      <AnimatePresence mode="popLayout">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={`/room/${room.id}`}
              className="group block p-5 transition-all relative overflow-hidden"
              style={{
                background: "var(--color-surface-1)",
                borderRadius: "var(--radius-2xl)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
                style={{ background: "var(--color-accent)", opacity: 0.8 }}
              />
              
              <div className="flex justify-between items-start pl-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1.5 rounded-lg opacity-80"
                      style={{ background: "color-mix(in srgb, var(--color-accent) 10%, transparent)", color: "var(--color-accent)" }}
                    >
                      <Layout size={16} />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight group-hover:text-accent transition-colors" style={{ color: "var(--color-text-primary)" }}>
                      {room.name}
                    </h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium opacity-70" style={{ color: "var(--color-text-muted)" }}>
                      <User size={14} className="text-accent" />
                      <span>{room.owner.displayName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium opacity-70" style={{ color: "var(--color-text-muted)" }}>
                      <Calendar size={14} />
                      <span>{new Date(room.createdAt).toLocaleDateString("ja-JP")}</span>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0"
                  style={{ background: "color-mix(in srgb, var(--color-accent) 10%, transparent)", color: "var(--color-accent)" }}
                >
                  <ArrowUpRight size={20} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
