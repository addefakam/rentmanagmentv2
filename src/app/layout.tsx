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
  title: "Rent Control and Administration System - Phase 3 Console",
  description: "Phase 3: Environments and Seed Configuration for the Residential House Rent Control and Administration System (Proclamation 1320/2016). Trilingual: Amharic, English, Afan Oromo.",
  keywords: ["Rent Control", "Proclamation 1320/2016", "Ethiopia", "Addis Ababa", "Phase 3", "Seed Configuration"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Rent Control and Administration System - Phase 3 Console",
    description: "Environments, CI/CD pipeline and trilingual seed configuration (Gate G3)",
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
