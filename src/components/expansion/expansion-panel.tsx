"use client";

import { useState, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Loader2, Sparkles } from "lucide-react";
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
      className="fixed inset-0 flex items-center justify-center z-40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="タイル拡張ダイアログ"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: "var(--color-overlay)" }}
        onClick={step !== "generating" ? onClose : undefined}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md overflow-hidden"
        style={{
          background: "var(--color-surface-1)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-2xl)",
        }}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2
                className="text-xl font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display), sans-serif" }}
              >
                タイル拡張
              </h2>
              <p className="text-xs mt-1 font-medium tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                位置: ({targetX}, {targetY}) • 方向: {DIRECTION_LABELS[direction]}
              </p>
            </div>
            {step !== "generating" && (
              <button
                onClick={onClose}
                className="p-1 rounded-full transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {step === "generating" ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: "var(--color-accent)" }} />
                <p className="font-medium" style={{ color: "var(--color-text-secondary)" }}>画像を生成中...</p>
              </motion.div>
            ) : step === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 py-8 text-center"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--color-success-subtle)" }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: "var(--color-success)" }} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>生成完了！</h3>
                  <p className="text-sm px-4" style={{ color: "var(--color-text-secondary)" }}>
                    ルームオーナーが候補を採用するまでお待ちください。
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-4 px-8 py-2.5 text-white font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
                  style={{ background: "var(--color-accent)", borderRadius: "var(--radius-lg)" }}
                >
                  閉じる
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleGenerate}
                className="flex flex-col gap-5"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    <Sparkles size={14} className="text-accent" />
                    プロンプト
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="生成したい風景や画像の説明を入力..."
                    rows={4}
                    className="w-full px-4 py-3 text-sm resize-none outline-none transition-all"
                    style={{
                      background: "var(--color-surface-0)",
                      border: "2px solid var(--color-surface-3)",
                      borderRadius: "var(--radius-lg)",
                      color: "var(--color-text-primary)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-3)")}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end items-center pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={!promptText.trim()}
                    className="px-8 py-2.5 text-white font-bold disabled:opacity-30 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ background: "var(--color-accent)", borderRadius: "var(--radius-lg)" }}
                  >
                    生成する
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
