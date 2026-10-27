import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";
export type ThemeColor = "yellow" | "blue" | "green" | "default";

export interface ColorOption {
  id: ThemeColor;
  label: string;
  code: string;
  bgHex: string;
  textColor: string;
  description: string;
}

export const THEME_COLOR_OPTIONS: ColorOption[] = [
  {
    id: "yellow",
    label: "Light Yellow & White",
    code: "#EAB308",
    bgHex: "#FACC15",
    textColor: "#1c1917",
    description: "White & Light Yellow (Default)",
  },
  {
    id: "blue",
    label: "Cyan Blue",
    code: "#25A7DA",
    bgHex: "#25A7DA",
    textColor: "#ffffff",
    description: "Cyan Blue (#25A7DA)",
  },
  {
    id: "green",
    label: "Lime Green",
    code: "#7CFC00",
    bgHex: "#7CFC00",
    textColor: "#090d16",
    description: "Lime Green (#7CFC00)",
  },
  {
    id: "default",
    label: "PW Blue",
    code: "#2563eb",
    bgHex: "#2563eb",
    textColor: "#ffffff",
    description: "Official PW Blue (#2563eb)",
  },
];

export function applyColorToDOM(color: ThemeColor) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-color", color);

  if (color === "yellow") {
    root.style.setProperty("--primary", "#eab308");
    root.style.setProperty("--pw-blue", "#eab308");
    root.style.setProperty("--ring", "#eab308");
    root.style.setProperty("--primary-foreground", "#1c1917");
  } else if (color === "blue") {
    root.style.setProperty("--primary", "#25A7DA");
    root.style.setProperty("--pw-blue", "#25A7DA");
    root.style.setProperty("--ring", "#25A7DA");
    root.style.setProperty("--primary-foreground", "#ffffff");
  } else if (color === "green") {
    root.style.setProperty("--primary", "#7CFC00");
    root.style.setProperty("--pw-blue", "#7CFC00");
    root.style.setProperty("--ring", "#7CFC00");
    root.style.setProperty("--primary-foreground", "#090d16");
  } else {
    root.style.setProperty("--primary", "#2563eb");
    root.style.setProperty("--pw-blue", "#2563eb");
    root.style.setProperty("--ring", "#2563eb");
    root.style.setProperty("--primary-foreground", "#ffffff");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [colorScheme, setColorSchemeState] = useState<ThemeColor>("yellow");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read theme mode
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");

    // Read stored UI color
    try {
      const storedColor = localStorage.getItem("ui-color") as ThemeColor;
      if (
        storedColor &&
        (storedColor === "yellow" ||
          storedColor === "blue" ||
          storedColor === "green" ||
          storedColor === "default")
      ) {
        setColorSchemeState(storedColor);
        applyColorToDOM(storedColor);
      } else {
        const existing = document.documentElement.getAttribute("data-color") as ThemeColor;
        if (
          existing &&
          (existing === "yellow" ||
            existing === "blue" ||
            existing === "green" ||
            existing === "default")
        ) {
          setColorSchemeState(existing);
        } else {
          setColorSchemeState("yellow");
          applyColorToDOM("yellow");
        }
      }
    } catch {
      // ignore
    }

    const observer = new MutationObserver(() => {
      setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
      const c = document.documentElement.getAttribute("data-color") as ThemeColor;
      if (c && (c === "yellow" || c === "blue" || c === "green" || c === "default")) {
        setColorSchemeState(c);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-color"],
    });

    return () => observer.disconnect();
  }, []);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        // ignore
      }
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        // ignore
      }
    }
  };

  const toggleTheme = () => {
    const currentTheme = mounted ? theme : "light";
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const setColorScheme = (color: ThemeColor) => {
    setColorSchemeState(color);
    applyColorToDOM(color);
    try {
      localStorage.setItem("ui-color", color);
    } catch {
      // ignore
    }
  };

  return {
    theme,
    isDark: mounted && theme === "dark",
    toggleTheme,
    setTheme,
    colorScheme,
    setColorScheme,
    mounted,
  };
}
