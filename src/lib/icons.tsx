// Inline SVG icon set — nature-meets-tech aesthetic. Keep small and tree-shakable.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps) {
  const { size = 18, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export function LeafCircuitIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M3 12c0-5 4-9 9-9 5 0 9 4 9 9 0 5-4 9-9 9-3 0-5-1.5-6-3" />
      <path d="M12 3v18" />
      <circle cx="6" cy="15" r="1.2" />
      <circle cx="18" cy="9" r="1.2" />
      <path d="M6 15h3M18 9h-3" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.7 1.5A3.5 3.5 0 0 0 6.5 18Z" />
    </svg>
  );
}

export function RainIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M17 15a4 4 0 0 0 0-8 6 6 0 0 0-11.7 1.5A3.5 3.5 0 0 0 6.5 15" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </svg>
  );
}

export function ThunderIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M17 13a4 4 0 0 0 0-8 6 6 0 0 0-11.7 1.5A3.5 3.5 0 0 0 6.5 13" />
      <path d="M11 14l-2 4h3l-1 4 3-5h-3l2-3z" />
    </svg>
  );
}

export function HazeIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <circle cx="12" cy="9" r="3" />
      <path d="M3 15h18M5 18h14M7 21h10" />
    </svg>
  );
}

export function WindIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M3 8h13a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h10" />
    </svg>
  );
}

export function DropIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
    </svg>
  );
}

export function ThermometerIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0z" />
    </svg>
  );
}

export function WaveIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0 2 0 2 0" />
    </svg>
  );
}

export function PulseIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" />
      <path d="M9 3v16M15 5v16" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 15 2-5 5-2-2 5z" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

/** Pick a representative icon for a BMKG weather code. */
export function pickWeatherIcon(
  code: number,
  desc: string | undefined,
): (p: IconProps) => JSX.Element {
  const d = (desc ?? "").toLowerCase();
  if (/petir|thunder|badai/.test(d)) return ThunderIcon;
  if (/hujan|rain/.test(d)) return RainIcon;
  if (/kabut|asap|haze|fog/.test(d)) return HazeIcon;
  if (/berawan|cloud/.test(d)) return CloudIcon;
  if (/cerah|clear|sunny/.test(d)) return SunIcon;
  // Fallback by BMKG code ranges (very rough)
  if (code >= 60 && code <= 99) return RainIcon;
  if (code >= 1 && code <= 3) return CloudIcon;
  return SunIcon;
}
