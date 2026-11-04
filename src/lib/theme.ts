export type ThemeChoice = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
let mediaQuery: MediaQueryList | null = null;

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "system") {
    return prefersDark ? "dark" : "light";
  }
  return choice;
}

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem("margin-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch (e) {
    // Ignore storage access errors (e.g., blocked cookies)
  }
  return "system";
}

export function applyTheme(choice: ThemeChoice): void {
  if (typeof window === "undefined") return;

  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  // Clean up previous listener to avoid leaks
  if (mediaQuery && mediaQueryListener) {
    mediaQuery.removeEventListener("change", mediaQueryListener);
    mediaQuery = null;
    mediaQueryListener = null;
  }

  const updateDom = () => {
    const resolved = resolveTheme(choice, mq.matches);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  };

  // Apply immediately
  updateDom();

  // If the choice is "system", listen for OS changes
  if (choice === "system") {
    mediaQuery = mq;
    mediaQueryListener = () => updateDom();
    mq.addEventListener("change", mediaQueryListener);
  }
}

export function setTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem("margin-theme", choice);
  } catch (e) {
    // Ignore storage access errors
  }
  applyTheme(choice);
}