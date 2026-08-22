"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Theme = "light" | "dark";

type ThemeToggleProps = {
  userId: string;
  initialTheme: Theme;
};

export default function ThemeToggle({
  userId,
  initialTheme,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [isPending, startTransition] = useTransition();

  // Change and save theme
  function toggleTheme() {
    const previousTheme = theme;
    const newTheme: Theme =
      theme === "light" ? "dark" : "light";

    // Update page immediately
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;

    // Save preference
    startTransition(async () => {
      const supabase = createClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          theme_preference: newTheme,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Restore previous theme on error
      if (error) {
        console.error("Failed to save theme preference:", error);

        setTheme(previousTheme);
        document.documentElement.dataset.theme = previousTheme;
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={isPending}
      aria-label={`Switch to ${
        theme === "light" ? "dark" : "light"
      } mode`}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Toggle track */}
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          theme === "dark"
            ? "bg-brand-600"
            : "bg-surface-soft"
        }`}
      >
        {/* Toggle circle */}
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ink transition-transform ${
          theme === "dark"
            ? "translate-x-4"
            : "translate-x-0"
        }`}
      />
      </span>

      {/* Toggle label */}
      <span>
        {theme === "dark" ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );
}