import type { FontFamilyId } from "./store";

export const FONT_OPTIONS: {
  id: FontFamilyId;
  label: string;
  cssVar: string;
  sample: string;
}[] = [
  { id: "serif", label: "Serif", cssVar: "var(--font-anno-serif)", sample: "Aa" },
  { id: "sans", label: "Sans", cssVar: "var(--font-anno-sans)", sample: "Aa" },
  {
    id: "caveat",
    label: "Caveat",
    cssVar: "var(--font-anno-caveat)",
    sample: "Aa",
  },
  {
    id: "hand",
    label: "Patrick",
    cssVar: "var(--font-anno-hand)",
    sample: "Aa",
  },
  {
    id: "marker",
    label: "Marker",
    cssVar: "var(--font-anno-marker)",
    sample: "Aa",
  },
  {
    id: "mono",
    label: "Mono",
    cssVar: "var(--font-anno-mono)",
    sample: "Aa",
  },
];

export function fontCss(id: FontFamilyId): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.cssVar ?? FONT_OPTIONS[0].cssVar;
}
