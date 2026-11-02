import { describe, it } from "vitest";

type Rgb = { r: number; g: number; b: number };
type Rgba = Rgb & { a: number };

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

function rgbaToRgba(value: string): Rgba {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Invalid color: ${value}`);
  const parts = match[1].split(",").map((p) => parseFloat(p.trim()));
  return {
    r: parts[0] / 255,
    g: parts[1] / 255,
    b: parts[2] / 255,
    a: parts[3] ?? 1,
  };
}

function blend(fg: Rgba, bg: Rgb): Rgb {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveForeground(value: string, bg: Rgb): Rgb {
  return value.startsWith("rgba") ? blend(rgbaToRgba(value), bg) : hexToRgb(value);
}

type Pair = {
  theme: "dark" | "light";
  label: string;
  fg: string;
  bg: string;
};

const pairs: Pair[] = [
  { theme: "dark", label: "text on bg", fg: "#f2f1ed", bg: "#0f1110" },
  {
    theme: "dark",
    label: "text-muted on bg",
    fg: "rgba(242, 241, 237, 0.62)",
    bg: "#0f1110",
  },
  { theme: "dark", label: "accent on bg", fg: "#4cc9a0", bg: "#0f1110" },
  { theme: "dark", label: "accent-text on accent", fg: "#06130e", bg: "#4cc9a0" },
  { theme: "dark", label: "warn on bg", fg: "#f2b544", bg: "#0f1110" },
  { theme: "dark", label: "danger on bg", fg: "#f0705a", bg: "#0f1110" },
  { theme: "light", label: "text on bg", fg: "#151715", bg: "#f6f5f1" },
  {
    theme: "light",
    label: "text-muted on bg",
    fg: "rgba(21, 23, 21, 0.62)",
    bg: "#f6f5f1",
  },
  { theme: "light", label: "accent-strong on bg", fg: "#16795c", bg: "#f6f5f1" },
  { theme: "light", label: "accent-text on accent", fg: "#06130e", bg: "#1e9e78" },
  { theme: "light", label: "warn-strong on bg", fg: "#8a5a00", bg: "#f6f5f1" },
  { theme: "light", label: "danger on bg", fg: "#c2412d", bg: "#f6f5f1" },
];

describe("WCAG AA contrast", () => {
  it("prints the table and fails any normal-text pair below 4.5:1", () => {
    const rows = pairs.map((pair) => {
      const bg = hexToRgb(pair.bg);
      const fg = resolveForeground(pair.fg, bg);
      const ratio = contrastRatio(fg, bg);
      return {
        theme: pair.theme,
        pair: pair.label,
        ratio: Number(ratio.toFixed(2)),
        required: 4.5,
        pass: ratio >= 4.5 ? "yes" : "NO",
      };
    });

    console.table(rows);

    for (const row of rows) {
      if (row.pass === "NO") {
        throw new Error(
          `${row.theme} / ${row.pair} is ${row.ratio}:1, below 4.5:1`,
        );
      }
    }
  });
});