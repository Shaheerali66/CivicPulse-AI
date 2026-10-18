import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "CivicPulse AI",
    template: "%s | CivicPulse AI",
  },
  description:
    "AI-powered civic complaint management platform for Hyderabad, Sindh. Report and track local infrastructure issues.",
  keywords: ["civic", "complaints", "Hyderabad", "Pakistan", "infrastructure"],
  robots: "noindex, nofollow", // Demo platform — do not index
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
