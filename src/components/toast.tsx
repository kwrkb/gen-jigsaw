"use client";

import type { Toast } from "@/hooks/use-toast";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const TOAST_COLORS: Record<string, string> = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  info: "var(--color-info)",
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onRemove(toast.id)}
          className="px-4 py-3 cursor-pointer text-white text-sm max-w-xs transition-all"
          style={{
            background: TOAST_COLORS[toast.type] ?? "var(--color-info)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
