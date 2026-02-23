"use client";

import { useState, FormEvent, useEffect } from "react";
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
  onComplete,
  onClose,
  onError,
}: ExpansionPanelProps) {
  const [promptText, setPromptText] = useState("");
  const [step, setStep] = useState<Step>("input");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "generating") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, step]);

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
        body: JSON.stringify({ x: targetX, y: targetY }),
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
        }),
      });

      if (!expRes.ok) {
        const data = await expRes.json().catch(() => ({}));
        // ロック解放
        await fetch(`/api/rooms/${roomId}/locks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: targetX, y: targetY }),
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
        body: JSON.stringify({}),
      });

      if (!runRes.ok) {
        const data = await runRes.json().catch(() => ({}));
        // サーバー側でロック解放済みだが、念のためクライアントからも解放
        await fetch(`/api/rooms/${roomId}/locks`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: targetX, y: targetY }),
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
    <div
      className="fixed inset-0 flex items-center justify-center z-40"
      style={{ background: "var(--color-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-label="タイル拡張ダイアログ"
    >
      <div
        className="w-full max-w-md mx-4 p-6"
        style={{
          background: "var(--color-surface-1)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display), sans-serif" }}
            >
              タイル拡張
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              位置: ({targetX}, {targetY}) — 方向: {DIRECTION_LABELS[direction]}
            </p>
          </div>
          {step !== "generating" && (
            <button
              onClick={onClose}
              className="text-xl leading-none transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              ×
            </button>
          )}
        </div>

        {step === "generating" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
            <p style={{ color: "var(--color-text-secondary)" }}>画像を生成中...</p>
          </div>
        ) : step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-4xl">✅</div>
            <p className="text-center" style={{ color: "var(--color-text-secondary)" }}>
              生成完了！ルームオーナーが候補を採用するまでお待ちください。
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 text-white transition-colors"
              style={{ background: "var(--color-accent)", borderRadius: "var(--radius-md)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
            >
              閉じる
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                プロンプト
              </label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="生成したい風景や画像の説明を入力..."
                rows={4}
                className="w-full px-3 py-2 text-sm resize-none outline-none transition-all"
                style={{
                  background: "var(--color-surface-0)",
                  border: "1.5px solid var(--color-surface-3)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-3)")}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm transition-colors"
                style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!promptText.trim()}
                className="px-6 py-2 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                style={{ background: "var(--color-accent)", borderRadius: "var(--radius-md)" }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--color-accent-hover)"; }}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
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
