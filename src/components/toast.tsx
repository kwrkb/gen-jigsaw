"use client";

import type { Toast } from "@/hooks/use-toast";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onRemove(toast.id)}
          className={`px-4 py-3 rounded-lg shadow-lg cursor-pointer text-white text-sm max-w-xs transition-all ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
