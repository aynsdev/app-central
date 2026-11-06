"use client"

import * as React from "react"

export type Theme = "system" | "light" | "dark"

const STORAGE_KEY = "theme"
const EVENT = "themechange"
const QUERY = "(prefers-color-scheme: dark)"

function getStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === "light" || v === "dark" ? v : "system"
  } catch {
    return "system"
  }
}

function systemDark() {
  return window.matchMedia(QUERY).matches
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark())
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

// Keeps every useTheme() in sync: the OS setting, this tab (custom event) and
// other tabs (storage).
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener("change", onChange)
  window.addEventListener(EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    mq.removeEventListener("change", onChange)
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

/**
 * Light / dark / system theme using the `.dark` class on <html> (the shadcn convention).
 * Already using next-themes? Keep it; this hook is for projects without it.
 *
 * Add this to <head> to avoid a flash before hydration:
 * <script>try{var t=localStorage.theme;if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}</script>
 */
export function useTheme() {
  const theme = React.useSyncExternalStore<Theme>(subscribe, getStored, () => "system")
  const isSystemDark = React.useSyncExternalStore(subscribe, systemDark, () => false)
  const resolvedTheme: "light" | "dark" =
    theme === "dark" || (theme === "system" && isSystemDark) ? "dark" : "light"

  React.useEffect(() => {
    apply(theme)
  }, [theme, isSystemDark])

  const setTheme = React.useCallback((next: Theme) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { theme, setTheme, resolvedTheme }
}
