import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "RIKSIT — AI Environmental Intelligence",
  description:
    "RIKSIT mengubah data lingkungan menjadi wawasan AI: cuaca BMKG, kualitas udara, gempa, dan peringatan dini Indonesia.",
  keywords: ["RIKSIT", "lingkungan", "AI", "BMKG", "cuaca", "kualitas udara", "Indonesia"],
  authors: [{ name: "RIKSIT" }],
};

export const viewport: Viewport = {
  themeColor: "#070d0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <div className="riksit-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
