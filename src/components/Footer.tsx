import { LeafCircuitIcon } from "@/lib/icons";

export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-riksit-border/40">
      <div className="mx-auto w-full px-3 sm:px-4 py-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[10px] text-riksit-muted">
        <div className="flex items-center gap-2">
          <LeafCircuitIcon size={12} className="text-riksit-neon" />
          <span className="font-mono tracking-wider uppercase text-riksit-ink/80">
            Observe. Understand. Act.
          </span>
        </div>
        <div className="font-mono">
          Data: <span className="text-riksit-neon">BMKG</span> ·{" "}
          <span className="text-riksit-neon">Open-Meteo</span> ·{" "}
          <span className="text-riksit-neon">wilayah.id</span> ·{" "}
          <span className="text-riksit-neon">OSM</span>
          <span className="hidden md:inline text-riksit-muted/70">
            {" "}
            · © {new Date().getFullYear()} RIKSIT
          </span>
        </div>
      </div>
    </footer>
  );
}
