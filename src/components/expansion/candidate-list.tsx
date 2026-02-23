"use client";

import { memo } from "react";
import Image from "next/image";
import type { Expansion } from "@/types";

interface CandidateListProps {
  expansions: Expansion[];
  isOwner: boolean;
  onAdopt: (expansion: Expansion) => void;
  onReject: (expansion: Expansion) => void;
}

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "待機中",
  RUNNING: "生成中",
  DONE: "完了",
  FAILED: "失敗",
  REJECTED: "却下",
  ADOPTED: "採用済",
};

export const CandidateList = memo(function CandidateList({
  expansions,
  isOwner,
  onAdopt,
  onReject,
}: CandidateListProps) {
  const active = expansions.filter((e) =>
    ["QUEUED", "RUNNING", "DONE"].includes(e.status)
  );

  return (
    <div className="p-4" style={{ borderTop: "1px solid var(--color-border)" }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>候補一覧 ({active.length}件)</h3>
      {active.length === 0 ? (
        <div
          className="p-4 text-sm"
          style={{
            background: "var(--color-surface-2)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)",
          }}
        >
          まだ候補はありません。キャンバスの「+」から拡張を開始できます。
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {active.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center gap-3 p-2"
              style={{
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {exp.resultImageUrl ? (
                <Image
                  src={exp.resultImageUrl}
                  alt="候補"
                  width={48}
                  height={48}
                  className="rounded object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div
                  className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-surface-3)" }}
                >
                  {exp.status === "RUNNING" ? (
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <span style={{ color: "var(--color-text-muted)" }} className="text-xs">—</span>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  ({exp.targetX}, {exp.targetY}) — {exp.direction}方向
                </p>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: exp.status === "DONE"
                      ? "var(--color-success)"
                      : exp.status === "RUNNING"
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {STATUS_LABELS[exp.status] ?? exp.status}
                </span>
              </div>
              {isOwner && exp.status === "DONE" && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => onAdopt(exp)}
                    className="px-2 py-1 text-white text-xs transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-success)", borderRadius: "var(--radius-sm)" }}
                    aria-label={`候補(${exp.targetX}, ${exp.targetY})を採用`}
                  >
                    採用
                  </button>
                  <button
                    onClick={() => onReject(exp)}
                    className="px-2 py-1 text-white text-xs transition-opacity hover:opacity-90"
                    style={{ background: "var(--color-error)", borderRadius: "var(--radius-sm)" }}
                    aria-label={`候補(${exp.targetX}, ${exp.targetY})を却下`}
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
