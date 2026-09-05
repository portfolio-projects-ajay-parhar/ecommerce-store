"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** The mode actually being displayed ("system" resolves to light/dark). */
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

// --- Persisted theme as an external store -----------------------------------
// Reading localStorage via useSyncExternalStore (instead of lazy useState
// init) keeps hydration consistent: React renders with the server snapshot
// ("system") and re-checks the client snapshot after mounting, so the
// ThemeToggle icon/labels never mismatch the server HTML.
const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function getThemeSnapshot(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "system";
}

function getServerThemeSnapshot(): Theme {
  return "system";
}

/** Subscribe to OS dark-mode changes (external store, no effects needed). */
function subscribeToMedia(onChange: () => void) {
  media().addEventListener("change", onChange);
  return () => media().removeEventListener("change", onChange);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const systemDark = useSyncExternalStore(
    subscribeToMedia,
    () => media().matches,
    () => false, // server snapshot; corrected after hydration if needed
  );

  // Derived, not synced — no setState-in-effect cascades
  const resolved: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Sync the DOM class (external system) — persistence happens in setTheme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setTheme = useCallback((t: Theme) => {
    if (t === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, t);
    themeListeners.forEach((notify) => notify());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}