import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Owner-directed typography refresh (Task 37): Inter carries the UI body,
// Sora gives headings a distinctive, professional voice, JetBrains Mono
// serves the staff/contract codes, and Noto Sans Ethiopic renders the
// Amharic surface properly (the previous latin-only Geist stack left
// Ethiopic script to inconsistent system fallbacks).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const ethiopic = Noto_Sans_Ethiopic({ subsets: ["ethiopic"], variable: "--font-ethiopic", display: "swap" });

export const metadata: Metadata = {
  title: "Rent Control and Administration System - Phase 4 Platform",
  description: "Incremental module construction (Sprints S1-S7) for the Residential House Rent Control and Administration System (Proclamation 1320/2016, Directive 7/2016). Trilingual: Amharic, English, Afan Oromo.",
  keywords: ["Rent Control", "Proclamation 1320/2016", "Ethiopia", "Addis Ababa", "Phase 4", "Registration", "Penalties"],
  // Favicon: src/app/favicon.ico is picked up automatically by the Next.js
  // app-router file convention (served at /favicon.ico) — no external CDN.
  openGraph: {
    title: "Rent Control and Administration System - Phase 4 Platform",
    description: "Thirteen modules across seven sprint increments (Gate G4)",
    siteName: "Rent Control and Administration System",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sora.variable} ${jetbrains.variable} ${ethiopic.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
