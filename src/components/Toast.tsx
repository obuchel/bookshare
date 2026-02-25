"use client";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type === "error" ? "toast-error" : "toast-success"}`}
        >
          {t.type === "success" ? "✓ " : "✕ "}
          {t.message}
        </div>
      ))}
    </div>
  );
}
