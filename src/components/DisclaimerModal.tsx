"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LeafCircuitIcon } from "@/lib/icons";

export default function DisclaimerModal() {
  const [open, setOpen] = useState(true);
  const ackButtonRef = useRef<HTMLButtonElement | null>(null);

  const acknowledge = useCallback(() => {
    setOpen(false);
  }, []);

  // Lock page scroll + focus the CTA + Esc-to-acknowledge while the modal is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ackButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") acknowledge();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, acknowledge]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="riksit-disclaimer-title"
      className="fixed inset-0 z-[2000] grid place-items-center bg-black/75 backdrop-blur-sm animate-fade-in p-4"
    >
      <div className="glass-strong neon-border relative max-w-md w-full p-6 sm:p-7 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-riksit-neon/15 text-riksit-neon ring-1 ring-riksit-neon/40 shadow-glow shrink-0">
            <LeafCircuitIcon size={22} />
          </span>
          <h2
            id="riksit-disclaimer-title"
            className="text-base sm:text-lg font-semibold tracking-wide text-riksit-ink uppercase"
          >
            Selamat Datang di RIKSIT
          </h2>
        </div>

        <div className="text-sm text-riksit-ink space-y-3 mb-5 leading-relaxed">
          <p>
            RIKSIT menggunakan <strong>AI generatif</strong> untuk merangkum data lingkungan dari{" "}
            <strong>BMKG</strong>, <strong>Open-Meteo</strong>, dan sumber publik lainnya menjadi
            wawasan singkat dalam Bahasa Indonesia.
          </p>
          <p>
            Wawasan AI <strong>tidak selalu 100% akurat</strong> dan tidak menggantikan informasi
            resmi dari <strong>BMKG</strong>, <strong>BPBD</strong>, atau otoritas setempat. Gunakan
            sebagai pendamping, bukan satu-satunya rujukan untuk keputusan penting.
          </p>
          <p className="text-riksit-muted">
            Untuk keadaan darurat, hubungi <strong>112</strong> atau kanal resmi BPBD setempat.
          </p>
        </div>

        <button
          ref={ackButtonRef}
          type="button"
          onClick={acknowledge}
          className="w-full rounded-xl bg-riksit-neon/20 hover:bg-riksit-neon/30 text-riksit-neon ring-1 ring-riksit-neon/50 px-4 py-2.5 font-semibold tracking-wide text-sm uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-riksit-neon"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
}
