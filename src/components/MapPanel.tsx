"use client";

import dynamic from "next/dynamic";
import { MapIcon } from "@/lib/icons";
import { Skeleton } from "./Skeleton";
import RegionSelector, {
  type RegionIds,
  type RegionResolved,
} from "./RegionSelector";
import type { EnvironmentalSnapshot } from "@/lib/types";

const RegionMap = dynamic(() => import("./RegionMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface CommonProps {
  snapshot: EnvironmentalSnapshot | null;
  loading: boolean;
  onPick?: (lat: number, lon: number) => void;
  resolving?: boolean;
}

interface WithSelectorProps extends CommonProps {
  variant?: "withSelector";
  initial?: Partial<RegionIds>;
  selected?: Partial<RegionIds>;
  onRegion: (region: RegionResolved) => void;
}

interface BareProps extends CommonProps {
  variant: "bare";
}

type Props = WithSelectorProps | BareProps;

export default function MapPanel(props: Props) {
  const { snapshot, loading, onPick, resolving } = props;
  const isBare = props.variant === "bare";

  const mapNode =
    loading || !snapshot ? (
      <Skeleton className="h-full min-h-[220px] w-full" />
    ) : (
      <RegionMap snapshot={snapshot} onPick={onPick} resolving={resolving} />
    );

  if (isBare) {
    // No chrome at all — the map fills its parent rectangle. Used when the
    // map IS the canvas and other elements float on top.
    //
    // `isolate` is critical: Leaflet's internal panes use z-indexes up to
    // ~1000, and without our own stacking context they would punch through
    // the floating overlay panels above them. `isolate` traps those
    // z-indexes inside this wrapper.
    return (
      <div className="isolate relative h-full w-full rounded-xl overflow-hidden border border-riksit-border/60 z-0">
        {mapNode}
      </div>
    );
  }

  return (
    <section className="glass-strong neon-border relative animate-fade-in flex flex-col min-h-0 h-full overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 shrink-0">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-riksit-neon">
          <MapIcon size={14} />
          Wilayah &amp; Peta
        </h2>
        <span className="text-[10px] font-mono text-riksit-muted">OSM • CARTO</span>
      </header>

      <div className="px-4 pb-3 shrink-0 border-b border-riksit-border/40">
        <RegionSelector
          initial={props.initial}
          selected={props.selected}
          onChange={props.onRegion}
        />
      </div>

      <div className="flex-1 min-h-0 relative">{mapNode}</div>
    </section>
  );
}
