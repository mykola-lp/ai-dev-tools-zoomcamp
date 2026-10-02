import { describe, expect, it } from "vitest";
import { applyTheme, clampTheme } from "./theme";

describe("theme", () => {
  it("clamps values to 0..100", () => {
    expect(clampTheme(-5)).toBe(0);
    expect(clampTheme(140)).toBe(100);
    expect(clampTheme(42.6)).toBe(43);
    expect(clampTheme(NaN)).toBe(100);
  });
  it("writes the --theme variable on the root element", () => {
    applyTheme(30);
    expect(document.documentElement.style.getPropertyValue("--theme")).toBe("30");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    applyTheme(80);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
