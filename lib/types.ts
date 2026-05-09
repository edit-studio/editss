// ─── Primitive Types ────────────────────────────────────────

export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; width: number; height: number };

export type StrokeStyle = "solid" | "dashed" | "dotted";

export type FontFamilyId =
  | "serif"
  | "sans"
  | "caveat"
  | "hand"
  | "marker"
  | "mono";

export type SpotShape = "rect" | "ellipse";

// ─── Tool Identifiers ───────────────────────────────────────

export type ToolId =
  | "select"
  | "pan"
  | "pen"
  | "arrow"
  | "rect"
  | "ellipse"
  | "triangle"
  | "text"
  | "bubble"
  | "blur"
  | "highlight"
  | "crop"
  | "eraser"
  | "counter"
  | "spotlight";

// ─── Annotation Shapes ──────────────────────────────────────

export type ImageObj = {
  id: string;
  type: "image";
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type PenStroke = {
  id: string;
  type: "pen";
  points: Point[];
  color: string;
  strokeWidth: number;
};

export type HighlightStroke = {
  id: string;
  type: "highlight";
  points: Point[];
  color: string;
  strokeWidth: number;
};

export type ArrowShape = {
  id: string;
  type: "arrow";
  start: Point;
  end: Point;
  color: string;
  strokeWidth: number;
};

export type RectShape = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  style: StrokeStyle;
  fill: boolean;
};

export type EllipseShape = {
  id: string;
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  style: StrokeStyle;
  fill: boolean;
};

export type TriangleShape = {
  id: string;
  type: "triangle";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  style: StrokeStyle;
  fill: boolean;
};

export type BubbleShape = {
  id: string;
  type: "bubble";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  text: string;
  textColor: string;
  textGradient?: { from: string; to: string };
  bgColor: string;
  bgGradient?: { from: string; to: string };
  fontFamily?: FontFamilyId;
  fontSize?: number;
};

export type BlurRect = {
  id: string;
  type: "blur";
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
};

export type TextObj = {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  fontFamily: FontFamilyId;
  fontSize: number;
};

export type CounterShape = {
  id: string;
  type: "counter";
  x: number; // center
  y: number; // center
  n: number;
  color: string;
  size: number; // diameter
};

export type SpotlightShape = {
  id: string;
  type: "spotlight";
  x: number;
  y: number;
  width: number;
  height: number;
  shape: SpotShape;
  dim: number; // 0..1
};

// ─── Union Type ─────────────────────────────────────────────

export type Annotation =
  | PenStroke
  | HighlightStroke
  | ArrowShape
  | RectShape
  | EllipseShape
  | TriangleShape
  | BubbleShape
  | BlurRect
  | TextObj
  | CounterShape
  | SpotlightShape;
