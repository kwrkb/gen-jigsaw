"use client";

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
  REJECTED: "却下",
  ADOPTED: "採用済",
};

export function CandidateList({
  expansions,
  isOwner,
  onAdopt,
  onReject,
}: CandidateListProps) {
  const active = expansions.filter((e) =>
    ["QUEUED", "RUNNING", "DONE"].includes(e.status)
  );

  if (active.length === 0) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        候補一覧 ({active.length}件)
      </h3>
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {active.map((exp) => (
          <div
            key={exp.id}
            className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-2"
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
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                {exp.status === "RUNNING" ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                ({exp.targetX}, {exp.targetY}) — {exp.direction}方向
              </p>
              <span
                className={`text-xs font-medium ${
                  exp.status === "DONE"
                    ? "text-green-600 dark:text-green-400"
                    : exp.status === "RUNNING"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500"
                }`}
              >
                {STATUS_LABELS[exp.status] ?? exp.status}
              </span>
            </div>
            {isOwner && exp.status === "DONE" && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onAdopt(exp)}
                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  採用
                </button>
                <button
                  onClick={() => onReject(exp)}
                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  却下
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
