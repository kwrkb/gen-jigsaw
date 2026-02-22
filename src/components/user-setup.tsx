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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Gen-Jigsaw
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          表示名を入力してください
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="あなたの名前"
            maxLength={50}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "作成中..." : "はじめる"}
          </button>
        </form>
      </div>
    </div>
  );
}
