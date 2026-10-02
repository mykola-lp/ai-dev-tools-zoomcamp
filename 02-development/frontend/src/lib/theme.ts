// Continuous theme: a single number 0 (dark) → 100 (light) written to the
// --theme CSS variable on <html>. All color tokens in styles.css derive from it.
import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "aeris.theme";
export const THEME_DEFAULT = 100;

export const clampTheme = (v: number) => (Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : THEME_DEFAULT);

export function applyTheme(value: number) {
  const v = clampTheme(value);
  const root = document.documentElement;
  root.style.setProperty("--theme", String(v));
  root.style.colorScheme = v < 50 ? "dark" : "light";
}

/** Inline script for <head>: applies the stored theme before first paint (no flash). */
export const themeBootScript = `(function(){try{var v=parseInt(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)}),10);if(!isNaN(v)){v=Math.min(100,Math.max(0,v));var r=document.documentElement;r.style.setProperty('--theme',String(v));r.style.colorScheme=v<50?'dark':'light';}}catch(e){}})();`;

export function useTheme() {
  const [value, setValue] = useState(THEME_DEFAULT);
  useEffect(() => {
    const stored = parseInt(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "", 10);
    if (!Number.isNaN(stored)) setValue(clampTheme(stored));
  }, []);
  const update = (v: number) => {
    const c = clampTheme(v);
    setValue(c);
    applyTheme(c);
    window.localStorage.setItem(THEME_STORAGE_KEY, String(c));
  };
  return [value, update] as const;
}
