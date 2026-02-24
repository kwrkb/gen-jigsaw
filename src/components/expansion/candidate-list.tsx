"use client";

import { memo, useEffect, useMemo, useState } from "react";
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

type CandidateTab = "active" | "ready" | "history";
type StatusFilter = "ALL" | Expansion["status"];

const TAB_CONFIG: Record<CandidateTab, { label: string; statuses: Expansion["status"][] }> = {
  active: { label: "進行中", statuses: ["QUEUED", "RUNNING", "DONE"] },
  ready: { label: "採用待ち", statuses: ["DONE"] },
  history: { label: "履歴", statuses: ["ADOPTED", "REJECTED", "FAILED"] },
};

export const CandidateList = memo(function CandidateList({
  expansions,
  isOwner,
  onAdopt,
  onReject,
}: CandidateListProps) {
  const [tab, setTab] = useState<CandidateTab>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const sorted = useMemo(
    () =>
      [...expansions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [expansions]
  );

  const tabbed = useMemo(
    () => sorted.filter((exp) => TAB_CONFIG[tab].statuses.includes(exp.status)),
    [sorted, tab]
  );

  const filtered = useMemo(
    () =>
      statusFilter === "ALL" ? tabbed : tabbed.filter((exp) => exp.status === statusFilter),
    [statusFilter, tabbed]
  );

  const availableStatuses = useMemo(
    () => [...new Set(tabbed.map((exp) => exp.status))],
    [tabbed]
  );

  useEffect(() => {
    setStatusFilter("ALL");
  }, [tab]);

  const activeCount = sorted.filter((exp) =>
    TAB_CONFIG.active.statuses.includes(exp.status)
  ).length;

  const getEmptyMessage = () => {
    if (tab === "history") {
      return "まだ履歴はありません。採用・却下・失敗した候補がここに表示されます。";
    }
    if (tab === "ready") {
      return "採用待ちの候補はまだありません。生成完了まで少し待ってください。";
    }
    return "まだ候補はありません。キャンバスの「+」から拡張を開始できます。";
  };

  return (
    <div className="p-6 border-t" style={{ borderColor: "var(--color-surface-3)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
          <Layers size={14} className="text-accent" />
          候補一覧
          <span 
            className="px-1.5 py-0.5 rounded-full text-[10px]"
            style={{ background: "color-mix(in srgb, var(--color-accent) 10%, transparent)", color: "var(--color-accent)" }}
          >
            {activeCount}
          </span>
        </h3>
      </div>

      <div className="mb-3 flex items-center gap-2">
        {(Object.entries(TAB_CONFIG) as [CandidateTab, { label: string; statuses: Expansion["status"][] }][]).map(([key, config]) => {
          const count = sorted.filter((exp) => config.statuses.includes(exp.status)).length;
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="px-2.5 py-1 text-[11px] font-bold tracking-wide transition-colors"
              style={{
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--color-border)",
                background: isActive
                  ? "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface-1))"
                  : "var(--color-surface-1)",
                color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
              aria-label={`候補タブ: ${config.label}`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {availableStatuses.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className="px-2 py-0.5 text-[10px] font-bold tracking-wide transition-colors"
            style={{
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--color-border)",
              background: statusFilter === "ALL"
                ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface-1))"
                : "var(--color-surface-1)",
              color: statusFilter === "ALL" ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
            aria-label="ステータスフィルタ: すべて"
          >
            すべて
          </button>
          {availableStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className="px-2 py-0.5 text-[10px] font-bold tracking-wide transition-colors"
              style={{
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--color-border)",
                background: statusFilter === status
                  ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-surface-1))"
                  : "var(--color-surface-1)",
                color: statusFilter === status ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
              aria-label={`ステータスフィルタ: ${STATUS_LABELS[status] ?? status}`}
            >
              {STATUS_LABELS[status] ?? status}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
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
            {getEmptyMessage()}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map((exp) => (
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

              {exp.status === "DONE" && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onAdopt(exp)}
                    className="p-2 text-white shadow-sm transition-all hover:scale-110 active:scale-95 flex items-center gap-1"
                    style={{ background: "var(--color-success)", borderRadius: "var(--radius-lg)" }}
                    aria-label={`候補(${exp.targetX}, ${exp.targetY})を採用に投票`}
                  >
                    <Check size={16} />
                    {(exp.votes?.filter((v) => v.vote === "ADOPT").length ?? 0) > 0 && (
                      <span className="text-[10px] font-bold">
                        {exp.votes!.filter((v) => v.vote === "ADOPT").length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onReject(exp)}
                    className="p-2 text-white shadow-sm transition-all hover:scale-110 active:scale-95 flex items-center gap-1"
                    style={{ background: "var(--color-error)", borderRadius: "var(--radius-lg)" }}
                    aria-label={`候補(${exp.targetX}, ${exp.targetY})を却下に投票`}
                  >
                    <X size={16} />
                    {(exp.votes?.filter((v) => v.vote === "REJECT").length ?? 0) > 0 && (
                      <span className="text-[10px] font-bold">
                        {exp.votes!.filter((v) => v.vote === "REJECT").length}
                      </span>
                    )}
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
