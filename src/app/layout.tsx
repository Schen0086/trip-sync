import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TripSync",
  description: "Plan and organise trips with your friends.",
};

type Theme = "light" | "dark";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme: Theme = "light";

  // Check signed-in user
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  // Load saved theme
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("theme_preference")
      .eq("id", userId)
      .single();

    if (profile?.theme_preference === "dark") {
      theme = "dark";
    }
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}