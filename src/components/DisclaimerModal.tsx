"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { LeafCircuitIcon } from "@/lib/icons";
import { useT } from "./LocaleProvider";

export default function DisclaimerModal() {
  const t = useT();
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
            {t("disclaimer.title")}
          </h2>
        </div>

        <div className="text-sm text-riksit-ink space-y-3 mb-5 leading-relaxed">
          <p>{renderInlineBold(t("disclaimer.intro"))}</p>
          <p>{renderInlineBold(t("disclaimer.community"))}</p>
          <p>{renderInlineBold(t("disclaimer.warning"))}</p>
          <p className="text-riksit-muted">{renderInlineBold(t("disclaimer.emergency"))}</p>
        </div>

        <button
          ref={ackButtonRef}
          type="button"
          onClick={acknowledge}
          className="w-full rounded-xl bg-riksit-neon/20 hover:bg-riksit-neon/30 text-riksit-neon ring-1 ring-riksit-neon/50 px-4 py-2.5 font-semibold tracking-wide text-sm uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-riksit-neon"
        >
          {t("disclaimer.ack")}
        </button>
      </div>
    </div>
  );
}

/**
 * Render a string with `**bold**` segments as React nodes. Pure inline — no
 * DOM injection, no markdown library. Safe because input is dictionary-owned.
 */
function renderInlineBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}
