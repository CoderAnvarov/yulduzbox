import { CheckCircle2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  text: string;
}

const ToastContext = createContext<(kind: "success" | "error", text: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: "success" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl bg-navy-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
