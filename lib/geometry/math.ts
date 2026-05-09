import type { Point, StrokeStyle } from "../types";

/** Build a smooth SVG path string from freehand points */
export function pathFromPoints(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Get the SVG stroke-dasharray string for a given stroke style */
export function dasharrayFor(style: StrokeStyle, sw: number): string | undefined {
  if (style === "solid") return undefined;
  if (style === "dashed")
    return `${Math.max(6, sw * 2)} ${Math.max(4, sw * 1.5)}`;
  return `${Math.max(0.5, sw * 0.2)} ${Math.max(4, sw * 1.8)}`;
}

/** Convert RGB values to a hex color string */
export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
