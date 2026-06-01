import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        riksit: {
          bg: "#070d0a",
          surface: "#0c1612",
          panel: "#0f1d18",
          border: "#1a3a2e",
          neon: "#00ff88",
          cyan: "#00e5ff",
          amber: "#ffb547",
          danger: "#ff5577",
          ink: "#cfece0",
          muted: "#7fa896",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-pulse":
          "linear-gradient(rgba(0,255,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(0,255,136,0.25)",
        "glow-cyan": "0 0 24px rgba(0,229,255,0.25)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        shimmer: "shimmer 1.8s linear infinite",
        drift: "drift 18s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "calc(200px + 100%) 0" },
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0)" },
          "100%": { transform: "translate3d(-48px,-48px,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
