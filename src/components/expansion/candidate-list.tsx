"use client";

import { memo } from "react";
import Image from "next/image";
import { Check, X, Loader2, ImageOff, Layers, MapPin } from "lucide-react";
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
    <div className="p-6 border-t" style={{ borderColor: "var(--color-surface-3)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
          <Layers size={14} className="text-accent" />
          Active Candidates
          <span 
            className="px-1.5 py-0.5 rounded-full text-[10px] bg-accent/10 text-accent"
            style={{ background: "color-mix(in srgb, var(--color-accent) 10%, transparent)", color: "var(--color-accent)" }}
          >
            {active.length}
          </span>
        </h3>
      </div>

      {active.length === 0 ? (
        <div
          className="p-8 text-center flex flex-col items-center gap-2"
          style={{
            background: "var(--color-surface-0)",
            borderRadius: "var(--radius-xl)",
            border: "1px dashed var(--color-surface-3)",
          }}
        >
          <div className="opacity-20">
            <Layers size={32} />
          </div>
          <p className="text-xs font-medium leading-relaxed opacity-60" style={{ color: "var(--color-text-muted)" }}>
            まだ候補はありません。<br />
            キャンバスの「+」から拡張を開始できます。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {active.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center gap-4 p-3 transition-all group"
              style={{
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <div className="relative flex-shrink-0">
                {exp.resultImageUrl ? (
                  <Image
                    src={exp.resultImageUrl}
                    alt="候補"
                    width={56}
                    height={56}
                    className="rounded-lg object-cover shadow-sm transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center bg-surface-3"
                    style={{ background: "var(--color-surface-3)" }}
                  >
                    {exp.status === "RUNNING" ? (
                      <Loader2 className="w-5 h-5 animate-spin text-accent" style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <ImageOff size={18} className="opacity-30" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                  <MapPin size={10} className="text-accent" />
                  <p className="text-[10px] font-bold uppercase tracking-tighter truncate" style={{ color: "var(--color-text-muted)" }}>
                    ({exp.targetX}, {exp.targetY}) • {exp.direction}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      background: exp.status === "DONE"
                        ? "color-mix(in srgb, var(--color-success) 10%, transparent)"
                        : exp.status === "RUNNING"
                        ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                        : "color-mix(in srgb, var(--color-text-muted) 10%, transparent)",
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
              </div>

              {isOwner && exp.status === "DONE" && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onAdopt(exp)}
                    className="p-2 text-white shadow-sm transition-all hover:scale-110 active:scale-95"
                    style={{ background: "var(--color-success)", borderRadius: "var(--radius-lg)" }}
                    aria-label={`候補(${exp.targetX}, ${exp.targetY})を採用`}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => onReject(exp)}
                    className="p-2 text-white shadow-sm transition-all hover:scale-110 active:scale-95"
                    style={{ background: "var(--color-error)", borderRadius: "var(--radius-lg)" }}
                    aria-label={`候補(${exp.targetX}, ${exp.targetY})を却下`}
                  >
                    <X size={16} />
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
