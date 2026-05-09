import type { ToolId, Annotation } from "./types";

// ─── Canvas Layout ──────────────────────────────────────────

export const FRAME_PADDING = 32;
export const HIT_PADDING = 6;
export const HIGHLIGHT_STROKE_MULT = 4;

// ─── Viewport Limits ────────────────────────────────────────

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

// ─── Tool Categories ────────────────────────────────────────

export const FREEHAND_TOOLS = new Set<ToolId>(["pen", "highlight"]);

export const BOX_TOOLS = new Set<ToolId>([
  "blur",
  "rect",
  "ellipse",
  "triangle",
  "arrow",
  "crop",
  "spotlight",
]);

/** Box-shaped annotation types that support resize handles */
export const RESIZABLE = new Set<Annotation["type"]>([
  "rect",
  "ellipse",
  "triangle",
  "bubble",
  "blur",
  "spotlight",
]);

// ─── Cursors ────────────────────────────────────────────────

export const ERASER_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23fffdf8' stroke='%230a0a0a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21'/><path d='m5.082 11.09 8.828 8.828' fill='none'/></svg>") 4 20, auto`;

// ─── Misc ───────────────────────────────────────────────────

/** Sentinel for uncontrolled contentEditable — React must not manage children. */
export const EMPTY_HTML = { __html: "" };
