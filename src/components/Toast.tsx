"use client";

import { useEffect, useState } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const bgClass =
    toast.type === "error"
      ? "bg-red-600"
      : toast.type === "info"
      ? "bg-blue-600"
      : "bg-ink";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${bgClass} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span>
        {toast.type === "error" ? "✕" : toast.type === "info" ? "ℹ" : "✓"}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
