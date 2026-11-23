"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LogOut, HelpCircle } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = tombol merah (hapus/keluar), primary = hijau tema */
  variant?: "danger" | "primary";
  icon?: "warning" | "logout" | "question";
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let push: ((r: Request) => void) | null = null;

/** Tampilkan dialog konfirmasi bertema. Resolve true bila user menekan tombol konfirmasi. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) return resolve(window.confirm(options.title));
    push({ ...options, resolve });
  });
}

const icons = { warning: AlertTriangle, logout: LogOut, question: HelpCircle };

/** Pasang sekali di root layout. */
export function ConfirmDialogHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [visible, setVisible] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    push = (r) => {
      setReq(r);
      requestAnimationFrame(() => setVisible(true));
    };
    return () => {
      push = null;
    };
  }, []);

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setVisible(false);
    setTimeout(() => setReq(null), 150);
  };

  useEffect(() => {
    if (!req) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;

  const danger = (req.variant ?? "danger") === "danger";
  const Icon = icons[req.icon ?? (danger ? "warning" : "question")];

  return (
    <div
      role="presentation"
      onMouseDown={() => close(false)}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl transition-all duration-150 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            danger ? "bg-red-50 text-red-500" : "bg-jax-lime/10 text-jax-lime"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div id="confirm-title" className="mt-4 text-lg font-semibold text-gray-900">
          {req.title}
        </div>
        {req.description && <p className="mt-1 text-sm text-gray-500">{req.description}</p>}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="h-10 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {req.cancelLabel ?? "Batal"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={`h-10 rounded-lg text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              danger ? "bg-red-500 hover:bg-red-600 focus:ring-red-300" : "bg-jax-lime hover:bg-jax-limeDark focus:ring-jax-lime/40"
            }`}
          >
            {req.confirmLabel ?? "Ya"}
          </button>
        </div>
      </div>
    </div>
  );
}
