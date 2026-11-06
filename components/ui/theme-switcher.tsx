"use client"

import * as React from "react"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { useTheme, type Theme } from "@/hooks/use-theme"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"

/** System / Light / Dark. The selection always reflects the stored choice, including System. */
function ThemeSwitcher({ showLabels = false, size = "sm" }: { showLabels?: boolean; size?: "sm" | "default" }) {
  const { theme, setTheme } = useTheme()
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: "System", icon: <MonitorIcon /> },
    { value: "light", label: "Light", icon: <SunIcon /> },
    { value: "dark", label: "Dark", icon: <MoonIcon /> },
  ]
  return (
    <SegmentedControl aria-label="Theme" size={size} value={theme} onValueChange={(v) => setTheme(v as Theme)}>
      {options.map((o) => (
        <SegmentedControlItem key={o.value} value={o.value} aria-label={showLabels ? undefined : o.label}>
          {o.icon}
          {showLabels && o.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

export { ThemeSwitcher }
