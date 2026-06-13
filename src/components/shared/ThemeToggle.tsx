"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const COOKIE = "xplosale-theme";
const MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function getTheme(): Theme {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|;\s*)xplosale-theme=([^;]+)/);
  const val = match?.[1];
  return val === "light" || val === "dark" ? val : "system";
}

function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    document.cookie = `${COOKIE}=; max-age=0; path=/; SameSite=Lax`;
  } else {
    root.setAttribute("data-theme", theme);
    document.cookie = `${COOKIE}=${theme}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
  }
}

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(getTheme());
  }, []);

  function cycle() {
    const next: Theme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      aria-label={`Switch theme (current: ${theme})`}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px",
        borderRadius: 8,
        color: "var(--ink-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-soft)"; }}
    >
      {theme === "dark" ? (
        /* Moon — dark mode active */
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : theme === "light" ? (
        /* Sun — light mode active */
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Computer — system mode active */
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )}
    </button>
  );
}
