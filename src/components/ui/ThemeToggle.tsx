"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";

const ORDER: Theme[] = ["light", "dark", "system"];

/** Cycles light → dark → system. Icon shows the mode being switched to. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch theme (currently ${theme})`}
      title={`Theme: ${theme} — click for ${next}`}
      className={
        "rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white " +
        (className ?? "")
      }
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" aria-hidden />
      ) : theme === "light" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Monitor className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}