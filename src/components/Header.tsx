"use client";

import { GitHubIcon, LeafCircuitIcon } from "@/lib/icons";
import LanguageSwitcher from "./LanguageSwitcher";
import { useT } from "./LocaleProvider";

// Public source-of-truth URL. Derived once from `git remote get-url origin`
// (https://github.com/r2itech/riksit.git) and pinned here — the project is
// open-source so the canonical web URL is stable.
const GITHUB_URL = "https://github.com/r2itech/riksit";

interface Props {
  live: boolean;
  regionLabel?: string;
}

export default function Header({ live, regionLabel }: Props) {
  const t = useT();
  return (
    <header className="shrink-0 z-30 backdrop-blur-md bg-riksit-bg/70 border-b border-riksit-border/50">
      <div className="mx-auto w-full px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-riksit-neon/15 text-riksit-neon ring-1 ring-riksit-neon/40 shadow-glow shrink-0">
            <LeafCircuitIcon size={18} />
          </span>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold tracking-[0.25em] text-riksit-ink text-base">RIKSIT</h1>
              <span className="hidden sm:inline text-[10px] font-mono text-riksit-muted uppercase">
                {t("header.subtitle")}
              </span>
            </div>
            {regionLabel ? (
              <p className="font-mono text-[10px] text-riksit-muted truncate max-w-[60vw] sm:max-w-md">
                {regionLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitcher />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("github.viewSource")}
            title={t("github.viewSource")}
            className="grid place-items-center w-7 h-7 rounded-full bg-black/40 border border-riksit-border/60 text-riksit-muted hover:text-riksit-neon hover:border-riksit-neon/40 transition-colors"
          >
            <GitHubIcon size={14} />
          </a>
          <div className="flex items-center gap-1.5">
            <span
              className="pulse-dot"
              style={live ? undefined : { animation: "none", opacity: 0.5 }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono text-riksit-muted">
              {live ? t("header.live") : t("header.standby")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
