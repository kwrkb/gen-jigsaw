"use client";

import { useState, FormEvent } from "react";

interface CreateRoomFormProps {
  onCreated: (roomId: string) => void;
  onError: (message: string) => void;
}

export function CreateRoomForm({ onCreated, onError }: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const canSubmit = name.trim() && promptText.trim() && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          prompt: { text: promptText.trim() },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError(data.error ?? "ルーム作成に失敗しました");
        return;
      }
      const room = await res.json();

      setName("");
      setPromptText("");
      setOpen(false);
      // ルームページへ遷移後、PENDING検知で生成が自動開始される
      onCreated(room.id);
    } catch {
      onError("ルーム作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-white font-medium transition-colors"
        style={{ background: "var(--color-accent)", borderRadius: "var(--radius-md)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
      >
        + 新しいルーム
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ルーム名"
        maxLength={100}
        autoFocus
        className="px-3 py-2 text-sm outline-none transition-all"
        style={{
          background: "var(--color-surface-1)",
          border: "1.5px solid var(--color-surface-3)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-3)")}
        disabled={loading}
      />
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        placeholder="初期タイルのプロンプト（例: 夕焼けの海辺の風景）"
        maxLength={500}
        rows={2}
        className="px-3 py-2 text-sm outline-none transition-all resize-none"
        style={{
          background: "var(--color-surface-1)",
          border: "1.5px solid var(--color-surface-3)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-3)")}
        disabled={loading}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 text-white font-medium disabled:opacity-50 transition-colors text-sm"
          style={{ background: "var(--color-accent)", borderRadius: "var(--radius-md)" }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--color-accent-hover)"; }}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
        >
          {loading ? "作成中..." : "作成"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-2 text-sm transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
