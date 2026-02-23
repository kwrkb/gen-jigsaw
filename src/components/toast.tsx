"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import type { Toast } from "@/hooks/use-toast";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const TOAST_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const TOAST_COLORS: Record<string, string> = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  info: "var(--color-info)",
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={() => onRemove(toast.id)}
            className="pointer-events-auto cursor-pointer flex items-center gap-3 px-4 py-3.5 text-white text-sm min-w-[280px] max-w-sm shadow-xl"
            style={{
              background: TOAST_COLORS[toast.type] ?? "var(--color-info)",
              borderRadius: "var(--radius-xl)",
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex-shrink-0 opacity-90">
              {TOAST_ICONS[toast.type] ?? TOAST_ICONS.info}
            </div>
            <div className="flex-grow font-medium leading-tight">
              {toast.message}
            </div>
            <button 
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(toast.id);
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
