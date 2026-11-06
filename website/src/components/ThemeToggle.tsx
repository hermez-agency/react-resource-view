import { useCallback, useEffect, useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"

export const THEME_STORAGE_KEY = "rrv-docs-theme"

export type Theme = "light" | "dark"

/**
 * Runs before the first paint, so the page never flashes the wrong theme.
 *
 * It is inlined into the document head as a blocking script rather than an
 * effect: an effect runs after hydration, which is several frames too late for
 * a background colour.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`

/**
 * The theme in force, as a store rather than component state.
 *
 * Keeping it outside React is what makes the toggle impossible to desync. The
 * class on <html> is written before hydration by the script above, and can also
 * be rewritten by another tab, by the reader's system preference, or by React
 * itself if it ever re-creates the document element after a recoverable error.
 * A component that remembered its own boolean would keep answering with a value
 * none of those events went through; a store that reads the DOM on every
 * notification cannot.
 */
const theme = {
  /** The browser's answer. Read from the DOM, which is what the CSS matches. */
  current(): Theme {
    return document.documentElement.classList.contains("dark") ? "dark" : "light"
  },

  /** What the reader chose, if they chose. */
  stored(): Theme | null {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY)
      return value === "dark" || value === "light" ? value : null
    } catch {
      // Private browsing: no choice was ever persisted.
      return null
    }
  },

  /** The system preference, used until the reader overrides it. */
  preferred(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  },

  /** Writes the theme to the document, which is the only place the CSS looks. */
  apply(next: Theme): void {
    document.documentElement.classList.toggle("dark", next === "dark")
    listeners.forEach((listener) => listener())
  },

  set(next: Theme): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private browsing: the choice simply does not survive the session.
    }
    theme.apply(next)
  },
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  // Another tab of the site toggling the theme, and the system preference
  // changing under a reader who never picked one, both have to reach this tab.
  const media = window.matchMedia("(prefers-color-scheme: dark)")

  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return
    theme.apply(theme.stored() ?? theme.preferred())
  }

  function onSystemChange() {
    if (theme.stored()) return
    theme.apply(theme.preferred())
  }

  window.addEventListener("storage", onStorage)
  media.addEventListener("change", onSystemChange)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
    media.removeEventListener("change", onSystemChange)
  }
}

/**
 * The theme the document is in.
 *
 * The server has no reader to ask, so it answers "light" — the same answer the
 * browser gives on its first render, which is what keeps hydration honest. The
 * real value arrives with the first subscription, one frame later.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => theme.current(),
    () => "light" as const
  )
}

export function ThemeToggle() {
  const current = useTheme()
  const dark = current === "dark"

  // The class was written by the inline script, before React existed. Reading
  // the stored choice back on mount repairs the document if anything since —
  // a hydration recovery, an extension, a bfcache restore — has dropped it.
  useEffect(() => {
    theme.apply(theme.stored() ?? theme.preferred())
  }, [])

  const toggle = useCallback(() => {
    theme.set(theme.current() === "dark" ? "light" : "dark")
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
      aria-pressed={dark}
      className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  )
}
