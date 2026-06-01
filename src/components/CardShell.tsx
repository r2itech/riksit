import type { ReactNode } from "react";

interface Props {
  title: string;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  /** When true, the body area scrolls internally instead of overflowing. */
  scrollBody?: boolean;
  children: ReactNode;
}

export default function CardShell({
  title,
  icon,
  hint,
  className,
  scrollBody = false,
  children,
}: Props) {
  return (
    <section
      className={`glass neon-border relative animate-fade-in flex flex-col min-h-0 h-full overflow-hidden ${className ?? ""}`}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-2 pb-1.5 shrink-0">
        <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-riksit-neon">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {hint ? (
          <span className="text-[9px] font-mono text-riksit-muted truncate ml-2">{hint}</span>
        ) : null}
      </header>
      <div
        className={`flex-1 min-h-0 px-3 pb-3 ${scrollBody ? "overflow-y-auto riksit-thin-scroll" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
