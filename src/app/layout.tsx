import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
