import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
export type ThemeAccent = "blue" | "emerald" | "violet" | "rose" | "amber" | "cyan";

interface ThemeContextType {
  theme: ThemeMode;
  accent: ThemeAccent;
  toggleTheme: () => void;
  setAccent: (accent: ThemeAccent) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  accent: "blue",
  toggleTheme: () => {},
  setAccent: () => {},
});

const ACCENT_COLORS: Record<ThemeAccent, { primary: string; primaryDark: string; ring: string; ringDark: string }> = {
  blue: { primary: "210 100% 56%", primaryDark: "210 100% 56%", ring: "217 91% 60%", ringDark: "217 91% 60%" },
  emerald: { primary: "160 84% 39%", primaryDark: "160 84% 45%", ring: "160 84% 39%", ringDark: "160 84% 45%" },
  violet: { primary: "263 70% 58%", primaryDark: "263 70% 62%", ring: "263 70% 58%", ringDark: "263 70% 62%" },
  rose: { primary: "346 77% 50%", primaryDark: "346 77% 56%", ring: "346 77% 50%", ringDark: "346 77% 56%" },
  amber: { primary: "38 92% 50%", primaryDark: "38 92% 55%", ring: "38 92% 50%", ringDark: "38 92% 55%" },
  cyan: { primary: "192 91% 36%", primaryDark: "192 91% 45%", ring: "192 91% 36%", ringDark: "192 91% 45%" },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("zeno-theme") as ThemeMode) || "dark";
    }
    return "dark";
  });

  const [accent, setAccentState] = useState<ThemeAccent>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("zeno-accent") as ThemeAccent) || "blue";
    }
    return "blue";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("zeno-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accent];
    if (theme === "dark") {
      root.style.setProperty("--primary", colors.primaryDark);
      root.style.setProperty("--ring", colors.ringDark);
      root.style.setProperty("--sidebar-primary", colors.ringDark);
      root.style.setProperty("--sidebar-ring", colors.ringDark);
    } else {
      root.style.setProperty("--primary", colors.primary);
      root.style.setProperty("--ring", colors.ring);
      root.style.setProperty("--sidebar-primary", colors.ring);
      root.style.setProperty("--sidebar-ring", colors.ring);
    }
    localStorage.setItem("zeno-accent", accent);
  }, [accent, theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const setAccent = (a: ThemeAccent) => setAccentState(a);

  return (
    <ThemeContext.Provider value={{ theme, accent, toggleTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
