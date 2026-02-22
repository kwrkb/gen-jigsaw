"use client";

import { useState, FormEvent } from "react";
import type { Tile } from "@/types";

const DIRECTION_LABELS = {
  N: "上 (北)",
  S: "下 (南)",
  E: "右 (東)",
  W: "左 (西)",
};

interface ExpansionPanelProps {
  targetX: number;
  targetY: number;
  fromTile: Tile;
  roomId: string;
  userId: string;
  onComplete: () => void;
  onClose: () => void;
  onError: (msg: string) => void;
}

type Step = "input" | "generating" | "done";

export function ExpansionPanel({
  targetX,
  targetY,
  fromTile,
  roomId,
  userId,
  onComplete,
  onClose,
  onError,
}: ExpansionPanelProps) {
  const [promptText, setPromptText] = useState("");
  const [step, setStep] = useState<Step>("input");

  // 方向を自動判定
  const dx = targetX - fromTile.x;
  const dy = targetY - fromTile.y;
  let direction: "N" | "E" | "S" | "W";
  if (dx === 1) direction = "E";
  else if (dx === -1) direction = "W";
  else if (dy === -1) direction = "N";
  else direction = "S";

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!promptText.trim()) return;

    setStep("generating");

    try {
      // 1. ロック取得
      const lockRes = await fetch(`/api/rooms/${roomId}/locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: targetX, y: targetY, userId }),
      });

      if (!lockRes.ok) {
        const data = await lockRes.json().catch(() => ({}));
        onError(data.error ?? "ロックの取得に失敗しました");
        setStep("input");
        return;
      }

      // 2. Expansion作成
      const expRes = await fetch(`/api/rooms/${roomId}/expansions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromTileId: fromTile.id,
          targetX,
          targetY,
          direction,
          promptJson: { text: promptText.trim() },
          userId,
        }),
      });

      if (!expRes.ok) {
        const data = await expRes.json().catch(() => ({}));
        // ロック解放
        await fetch(`/api/rooms/${roomId}/locks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: targetX, y: targetY, userId }),
        });
        onError(data.error ?? "拡張の作成に失敗しました");
        setStep("input");
        return;
      }

      const expansion = await expRes.json();

      // 3. 実行
      const runRes = await fetch(`/api/expansions/${expansion.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!runRes.ok) {
        const data = await runRes.json().catch(() => ({}));
        // サーバー側でロック解放済みだが、念のためクライアントからも解放
        await fetch(`/api/rooms/${roomId}/locks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: targetX, y: targetY, userId }),
        }).catch(() => {});
        onError(data.error ?? "画像生成に失敗しました");
        setStep("input");
        return;
      }

      setStep("done");
      onComplete();
    } catch {
      onError("ネットワークエラーが発生しました");
      setStep("input");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              タイル拡張
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              位置: ({targetX}, {targetY}) — 方向: {DIRECTION_LABELS[direction]}
            </p>
          </div>
          {step !== "generating" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {step === "generating" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">画像を生成中...</p>
          </div>
        ) : step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-4xl">✅</div>
            <p className="text-gray-700 dark:text-gray-300 text-center">
              生成完了！ルームオーナーが候補を採用するまでお待ちください。
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                プロンプト
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="生成したい風景や画像の説明を入力..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!promptText.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                生成する
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
