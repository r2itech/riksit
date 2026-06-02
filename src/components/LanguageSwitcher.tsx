"use client";

import { LOCALES, type Locale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

/**
 * Compact two-button toggle exposing both languages at once. Active locale
 * gets the neon ring; inactive stays muted. Click switches immediately and
 * the choice is persisted via LocaleProvider.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t("language.switcherAria")}
      className="inline-flex items-center rounded-full bg-black/40 border border-riksit-border/60 p-0.5"
    >
      {LOCALES.map((l) => (
        <LangButton
          key={l}
          locale={l}
          active={locale === l}
          onSelect={() => locale !== l && setLocale(l)}
        />
      ))}
    </div>
  );
}

function LangButton({
  locale,
  active,
  onSelect,
}: {
  locale: Locale;
  active: boolean;
  onSelect: () => void;
}) {
  const label = locale === "id-ID" ? "ID" : "EN";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={locale === "id-ID" ? "Bahasa Indonesia" : "English"}
      className={`
        px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider
        transition-colors min-w-[28px]
        ${
          active
            ? "bg-riksit-neon/20 text-riksit-neon ring-1 ring-riksit-neon/50 shadow-glow"
            : "text-riksit-muted hover:text-riksit-ink"
        }
      `}
    >
      {label}
    </button>
  );
}
