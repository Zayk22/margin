import { describe, it } from "vitest";

type Rgb = { r: number; g: number; b: number };
type Rgba = Rgb & { a: number };

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbaToRgba(value: string): Rgba {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Invalid color: ${value}`);
  const parts = match[1].split(",").map((p) => parseFloat(p.trim()));
  return { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255, a: parts[3] ?? 1 };
}

function blend(fg: Rgba, bg: Rgb): Rgb {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
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

type Pair = { theme: string; label: string; fg: string; bg: string; required: number };

const pairs: Pair[] = [
  // Text pairs (4.5:1)
  { theme: "dark", label: "text on bg", fg: "#F2F1ED", bg: "#0F1110", required: 4.5 },
  { theme: "dark", label: "text-muted on bg", fg: "rgba(242, 241, 237, 0.62)", bg: "#0F1110", required: 4.5 },
  { theme: "dark", label: "text on surface", fg: "#F2F1ED", bg: "#171A18", required: 4.5 },
  { theme: "dark", label: "text-muted on surface", fg: "rgba(242, 241, 237, 0.62)", bg: "#171A18", required: 4.5 },
  { theme: "dark", label: "primary-text on primary", fg: "#0F1110", bg: "#F2F1ED", required: 4.5 },
  { theme: "dark", label: "primary-text on primary-hover", fg: "#0F1110", bg: "#E0DFD9", required: 4.5 },
  { theme: "dark", label: "success-strong on bg", fg: "#4CC9A0", bg: "#0F1110", required: 4.5 },
  { theme: "dark", label: "warn-strong on bg", fg: "#F2B544", bg: "#0F1110", required: 4.5 },
  { theme: "dark", label: "danger on bg", fg: "#F0705A", bg: "#0F1110", required: 4.5 },
  { theme: "dark", label: "primary-text on danger", fg: "#0F1110", bg: "#F0705A", required: 4.5 }, // NEW
  
  { theme: "light", label: "text on bg", fg: "#151715", bg: "#F6F5F1", required: 4.5 },
  { theme: "light", label: "text-muted on bg", fg: "rgba(21, 23, 21, 0.62)", bg: "#F6F5F1", required: 4.5 },
  { theme: "light", label: "text on surface", fg: "#151715", bg: "#FFFFFF", required: 4.5 },
  { theme: "light", label: "text-muted on surface", fg: "rgba(21, 23, 21, 0.62)", bg: "#FFFFFF", required: 4.5 },
  { theme: "light", label: "primary-text on primary", fg: "#F6F5F1", bg: "#151715", required: 4.5 },
  { theme: "light", label: "primary-text on primary-hover", fg: "#F6F5F1", bg: "#2C302C", required: 4.5 },
  { theme: "light", label: "success-strong on bg", fg: "#16795C", bg: "#F6F5F1", required: 4.5 },
  { theme: "light", label: "warn-strong on bg", fg: "#8A5A00", bg: "#F6F5F1", required: 4.5 },
  { theme: "light", label: "danger on bg", fg: "#C2412D", bg: "#F6F5F1", required: 4.5 },
  { theme: "light", label: "primary-text on danger", fg: "#F6F5F1", bg: "#C2412D", required: 4.5 }, // NEW

  // Non-text pairs (3:1)
  { theme: "dark", label: "success fill on bg", fg: "#4CC9A0", bg: "#0F1110", required: 3.0 },
  { theme: "dark", label: "success fill on track", fg: "#4CC9A0", bg: "#1E2220", required: 3.0 },
  { theme: "dark", label: "warn fill on bg", fg: "#F2B544", bg: "#0F1110", required: 3.0 },
  { theme: "dark", label: "danger fill on bg", fg: "#F0705A", bg: "#0F1110", required: 3.0 },
  { theme: "dark", label: "focus ring on bg", fg: "#F2F1ED", bg: "#0F1110", required: 3.0 },
  
  { theme: "light", label: "success fill on bg", fg: "#1E9E78", bg: "#F6F5F1", required: 3.0 },
  { theme: "light", label: "success fill on track", fg: "#1E9E78", bg: "#FBFAF7", required: 3.0 },
  { theme: "light", label: "warn fill on bg", fg: "#B7791F", bg: "#F6F5F1", required: 3.0 },
  { theme: "light", label: "danger fill on bg", fg: "#C2412D", bg: "#F6F5F1", required: 3.0 },
  { theme: "light", label: "focus ring on bg", fg: "#151715", bg: "#F6F5F1", required: 3.0 },
];

// Category colours as icon against 14% tint over surface
const catColorsDark = ["#7DA6D6", "#C9A27E", "#7EBBC9", "#9C94D1", "#9AA3AE", "#D08FA8", "#B58FC9", "#8FB3A1", "#A8A59C"];
const catColorsLight = ["#3F6FA8", "#8F6B45", "#3E8497", "#6A60A8", "#5F6872", "#A8566F", "#8A5AA0", "#4F7F69", "#6E6B63"];

catColorsDark.forEach((color, i) => {
  const surface = hexToRgb("#171A18");
  const tinted = blend({ ...hexToRgb(color), a: 0.14 }, surface);
  pairs.push({ theme: "dark", label: `cat-${i+1} on 14% tint`, fg: color, bg: rgbToHex(tinted), required: 3.0 });
});

catColorsLight.forEach((color, i) => {
  const surface = hexToRgb("#FFFFFF");
  const tinted = blend({ ...hexToRgb(color), a: 0.14 }, surface);
  pairs.push({ theme: "light", label: `cat-${i+1} on 14% tint`, fg: color, bg: rgbToHex(tinted), required: 3.0 });
});

describe("WCAG AA contrast", () => {
  it("prints the table and fails any pair below required ratio", () => {
    const rows = pairs.map((pair) => {
      const bg = hexToRgb(pair.bg);
      const fg = resolveForeground(pair.fg, bg);
      const ratio = contrastRatio(fg, bg);
      return {
        theme: pair.theme,
        pair: pair.label,
        ratio: Number(ratio.toFixed(2)),
        required: pair.required,
        pass: ratio >= pair.required ? "yes" : "NO",
      };
    });

    console.table(rows);

    for (const row of rows) {
      if (row.pass === "NO") {
        throw new Error(`${row.theme} / ${row.pair} is ${row.ratio}:1, below ${row.required}:1`);
      }
    }
  });
});