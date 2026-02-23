"use client";

import { useState, FormEvent } from "react";

interface UserSetupProps {
  onSetup: (displayName: string) => Promise<void>;
}

export function UserSetup({ onSetup }: UserSetupProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSetup(name.trim());
    } catch {
      setError("ユーザー作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--color-surface-0)" }}
    >
      <div
        className="w-full max-w-sm p-10"
        style={{
          background: "var(--color-surface-1)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display), sans-serif", color: "var(--color-text-primary)" }}
        >
          Gen-Jigsaw
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
          タイルを繋いで、世界を広げよう
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              表示名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              maxLength={50}
              className="w-full px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: "var(--color-surface-0)",
                border: "1.5px solid var(--color-surface-3)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-3)")}
              disabled={loading}
              autoFocus
            />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              background: "var(--color-accent)",
              borderRadius: "var(--radius-md)",
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--color-accent-hover)"; }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
          >
            {loading ? "作成中..." : "はじめる"}
          </button>
        </form>
      </div>
    </div>
  );
}
