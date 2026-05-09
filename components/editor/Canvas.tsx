"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "./EmptyState";
import {
  useEditor,
  type PenStroke,
  type HighlightStroke,
  type ArrowShape,
  type RectShape,
  type EllipseShape,
  type TriangleShape,
  type BubbleShape,
  type BlurRect,
  type TextObj,
  type CounterShape,
  type SpotlightShape,
  type ImageObj,
  type Point,
  type Annotation,
  type StrokeStyle,
  type ToolId,
} from "@/lib/store";
import type { Rect } from "@/lib/types";
import { fontCss } from "@/lib/fonts";
import {
  FRAME_PADDING,
  HIT_PADDING,
  HIGHLIGHT_STROKE_MULT,
  MIN_SCALE,
  MAX_SCALE,
  FREEHAND_TOOLS,
  BOX_TOOLS,
  RESIZABLE,
  ERASER_CURSOR,
  EMPTY_HTML,
} from "@/lib/constants";
import { annotationBounds, rectFromPoints } from "@/lib/geometry/bounds";
import { hitTest, hitOfType } from "@/lib/geometry/hit-test";
import { pathFromPoints, dasharrayFor, rgbToHex } from "@/lib/geometry/math";

// ─── Canvas-local types ─────────────────────────────────────

type Draft =
  | { tool: "pen"; points: Point[] }
  | { tool: "highlight"; points: Point[] }
  | { tool: "arrow"; start: Point; end: Point }
  | { tool: "blur"; start: Point; end: Point }
  | { tool: "rect"; start: Point; end: Point }
  | { tool: "ellipse"; start: Point; end: Point }
  | { tool: "triangle"; start: Point; end: Point }
  | { tool: "bubble"; start: Point; end: Point }
  | { tool: "crop"; start: Point; end: Point }
  | { tool: "spotlight"; start: Point; end: Point };

type DragState = {
  id: string;
  startPointer: Point;
  original: Annotation;
};

type ResizeHandle =
  | "tl"
  | "tm"
  | "tr"
  | "ml"
  | "mr"
  | "bl"
  | "bm"
  | "br";

type ResizeState = {
  id: string;
  handle: ResizeHandle;
  original: Annotation & { x: number; y: number; width: number; height: number };
};

type ArrowEndDrag = {
  id: string;
  which: "start" | "end";
  original: ArrowShape;
};

type PanState = {
  startScreen: { x: number; y: number };
  startViewport: { x: number; y: number };
};

export function Canvas() {
  const image = useEditor((s) => s.image);
  const setImage = useEditor((s) => s.setImage);
  const objects = useEditor((s) => s.objects);
  const addObject = useEditor((s) => s.addObject);
  const updateObject = useEditor((s) => s.updateObject);
  const removeObject = useEditor((s) => s.removeObject);
  const activeTool = useEditor((s) => s.activeTool);
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const activeColor = useEditor((s) => s.activeColor);
  const activeStroke = useEditor((s) => s.activeStroke);
  const activeStyle = useEditor((s) => s.activeStyle);
  const activeFill = useEditor((s) => s.activeFill);
  const activeBlur = useEditor((s) => s.activeBlur);
  const activeFontFamily = useEditor((s) => s.activeFontFamily);
  const activeFontSize = useEditor((s) => s.activeFontSize);
  const editingId = useEditor((s) => s.editingId);
  const setEditing = useEditor((s) => s.setEditing);
  const selectedId = useEditor((s) => s.selectedId);
  const setSelected = useEditor((s) => s.setSelected);
  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);
  const switchToSelectOnSameTypeClick = useEditor(
    (s) => s.switchToSelectOnSameTypeClick
  );
  const freeform = useEditor((s) => s.freeform);
  const setFreeform = useEditor((s) => s.setFreeform);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [arrowEndDrag, setArrowEndDrag] = useState<ArrowEndDrag | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const [panning, setPanning] = useState<PanState | null>(null);
  const setHoverColor = useEditor((s) => s.setHoverColor);
  const samplerRef = useRef<HTMLCanvasElement | null>(null);

  /* ── load file → image object centered in viewport ──────── */
  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const probe = new Image();
        probe.onload = () => {
          const maxW = 900;
          const ratio = probe.width > maxW ? maxW / probe.width : 1;
          const w = probe.width * ratio;
          const h = probe.height * ratio;
          const rect = canvasRef.current?.getBoundingClientRect();
          // center in current viewport (world coords)
          const cw = rect ? rect.width : w;
          const ch = rect ? rect.height : h;
          const cx =
            (cw / 2 - useEditor.getState().viewport.x) /
              useEditor.getState().viewport.scale -
            w / 2;
          const cy =
            (ch / 2 - useEditor.getState().viewport.y) /
              useEditor.getState().viewport.scale -
            h / 2;
          setImage({
            id: crypto.randomUUID(),
            type: "image",
            src,
            width: w,
            height: h,
            x: cx,
            y: cy,
          });
        };
        probe.src = src;
      };
      reader.readAsDataURL(file);
    },
    [setImage]
  );

  /* ── drag & drop file ───────────────────────────────────── */
  // Only react to OS-file drags (e.g. from Finder/Explorer/another app).
  // Internal drag-out (our own export drag) carries only text/uri-list +
  // DownloadURL — ignore so we don't tint the canvas with the drop overlay.
  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const onDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  /* ── color sampler — keep an offscreen canvas with the image ─ */
  useEffect(() => {
    if (!image) {
      samplerRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      samplerRef.current = c;
    };
    img.src = image.src;
  }, [image]);

  const sampleAt = useCallback(
    (worldP: Point): string | null => {
      const c = samplerRef.current;
      if (!image || !c) return null;
      if (
        worldP.x < image.x ||
        worldP.x >= image.x + image.width ||
        worldP.y < image.y ||
        worldP.y >= image.y + image.height
      )
        return null;
      const px = Math.floor(((worldP.x - image.x) / image.width) * c.width);
      const py = Math.floor(((worldP.y - image.y) / image.height) * c.height);
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      try {
        const d = ctx.getImageData(px, py, 1, 1).data;
        return rgbToHex(d[0], d[1], d[2]);
      } catch {
        return null;
      }
    },
    [image]
  );

  /* ── window-level paste ─────────────────────────────────── */
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) loadFile(file);
          return;
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [loadFile]);

  /* ── coord conversion (screen <→ world) ─────────────────── */
  const getScreenPoint = (e: React.PointerEvent | PointerEvent | WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const screenToWorld = (sp: Point): Point => ({
    x: (sp.x - viewport.x) / viewport.scale,
    y: (sp.y - viewport.y) / viewport.scale,
  });
  const getWorldPoint = (e: React.PointerEvent | PointerEvent): Point =>
    screenToWorld(getScreenPoint(e));

  /* ── wheel zoom (around cursor) ─────────────────────────── */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Allow ctrl/cmd+wheel to zoom; plain wheel also zooms (this is a canvas)
      e.preventDefault();
      const sp = getScreenPoint(e);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, viewport.scale * factor)
      );
      const wx = (sp.x - viewport.x) / viewport.scale;
      const wy = (sp.y - viewport.y) / viewport.scale;
      setViewport({
        scale: newScale,
        x: sp.x - wx * newScale,
        y: sp.y - wy * newScale,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewport.x, viewport.y, viewport.scale, setViewport]);

  /* ── pointer interaction ────────────────────────────────── */
  const handlePointerDown = (e: React.PointerEvent) => {
    // commit any open text editor when clicking outside it
    if (editingId) {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-editing-id="${editingId}"]`)) {
        setEditing(null);
      }
    }

    const sp = getScreenPoint(e);
    const wp = screenToWorld(sp);

    // Save history before any interaction that might mutate objects
    useEditor.getState().saveHistory();

    // PAN tool
    if (activeTool === "pan") {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      setPanning({
        startScreen: sp,
        startViewport: { x: viewport.x, y: viewport.y },
      });
      return;
    }

    // SELECT tool
    if (activeTool === "select") {
      const hitId = hitTest(objects, wp);
      if (hitId) {
        canvasRef.current?.setPointerCapture(e.pointerId);
        setSelected(hitId);
        const original = objects.find((o) => o.id === hitId)!;
        setDragging({ id: hitId, startPointer: wp, original });
      } else {
        setSelected(null);
      }
      return;
    }

    // ERASER
    if (activeTool === "eraser") {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      setErasing(true);
      const id = hitTest(objects, wp);
      if (id) removeObject(id);
      return;
    }

    // Click-to-select on same-type
    if (switchToSelectOnSameTypeClick) {
      const sameTypeMap: Partial<Record<ToolId, Annotation["type"]>> = {
        rect: "rect",
        ellipse: "ellipse",
        triangle: "triangle",
        bubble: "bubble",
        blur: "blur",
        text: "text",
        arrow: "arrow",
      };
      const matchingType = sameTypeMap[activeTool];
      if (matchingType) {
        const hitId = hitOfType(objects, wp, matchingType);
        if (hitId) {
          if (matchingType === "arrow") {
            // Arrow: switch to V (select tool) + select the arrow
            setActiveTool("select");
            setSelected(hitId);
          } else if (matchingType === "bubble" || matchingType === "text") {
            setSelected(hitId);
            setEditing(hitId);
          } else {
            // Shapes & blur: stay in tool, just select
            setSelected(hitId);
          }
          return;
        }
      }
    }

    // TEXT tool
    if (activeTool === "text") {
      e.preventDefault();
      const id = crypto.randomUUID();
      const fontSize = activeFontSize;
      addObject({
        id,
        type: "text",
        x: wp.x,
        y: wp.y,
        width: 80,
        height: fontSize * 1.4,
        text: "",
        color: activeColor,
        fontFamily: activeFontFamily,
        fontSize,
      } satisfies TextObj);
      setSelected(id);
      setEditing(id);
      return;
    }

    // BUBBLE tool — drag to create
    if (activeTool === "bubble") {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      setDraft({ tool: "bubble", start: wp, end: wp });
      return;
    }

    // CROP
    if (activeTool === "crop") {
      if (!image) return;
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      setDraft({ tool: "crop", start: wp, end: wp });
      return;
    }

    // COUNTER — single-click placement
    if (activeTool === "counter") {
      e.preventDefault();
      const st = useEditor.getState();
      const max = st.objects.reduce(
        (m, o) => (o.type === "counter" ? Math.max(m, o.n) : m),
        0
      );
      const id = crypto.randomUUID();
      addObject({
        id,
        type: "counter",
        x: wp.x,
        y: wp.y,
        n: max + 1,
        color: st.activeCounterColor,
        size: st.activeCounterSize,
      } satisfies CounterShape);
      setSelected(id);
      return;
    }

    // FREEHAND
    if (FREEHAND_TOOLS.has(activeTool)) {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      setDraft({ tool: activeTool as "pen" | "highlight", points: [wp] });
      return;
    }

    // BOX
    if (BOX_TOOLS.has(activeTool)) {
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDraft({ tool: activeTool as any, start: wp, end: wp });
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const sp = getScreenPoint(e);
    const wp = screenToWorld(sp);

    // pixel color sampling (only when not actively drawing/dragging)
    if (!draft && !dragging && !resizing && !panning && !erasing) {
      setHoverColor(sampleAt(wp));
    }

    // PAN
    if (panning) {
      setViewport({
        ...viewport,
        x: panning.startViewport.x + (sp.x - panning.startScreen.x),
        y: panning.startViewport.y + (sp.y - panning.startScreen.y),
      });
      return;
    }

    // RESIZE
    if (resizing) {
      const next = applyResize(resizing.original, resizing.handle, wp, e.shiftKey);
      updateObject(resizing.id, () => next);
      return;
    }

    // ARROW endpoint drag
    if (arrowEndDrag) {
      let p = wp;
      if (e.shiftKey) {
        // 8-direction snap from the OTHER endpoint
        const anchor =
          arrowEndDrag.which === "start"
            ? arrowEndDrag.original.end
            : arrowEndDrag.original.start;
        const dx = p.x - anchor.x;
        const dy = p.y - anchor.y;
        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 4;
        const snapped = Math.round(angle / step) * step;
        const len = Math.hypot(dx, dy);
        p = {
          x: anchor.x + Math.cos(snapped) * len,
          y: anchor.y + Math.sin(snapped) * len,
        };
      }
      updateObject(arrowEndDrag.id, (o) => {
        const a = o as ArrowShape;
        return arrowEndDrag.which === "start"
          ? { ...a, start: p }
          : { ...a, end: p };
      });
      return;
    }

    if (activeTool === "select" && !dragging && !draft) {
      const id = hitTest(objects, wp);
      if (id !== hoverId) setHoverId(id);
    }

    if (erasing) {
      const id = hitTest(objects, wp);
      if (id) removeObject(id);
      return;
    }

    if (dragging) {
      const dx = wp.x - dragging.startPointer.x;
      const dy = wp.y - dragging.startPointer.y;
      updateObject(dragging.id, (o) => translate(dragging.original, dx, dy, o));
      return;
    }

    if (!draft) return;

    if (draft.tool === "pen" || draft.tool === "highlight") {
      setDraft({ tool: draft.tool, points: [...draft.points, wp] });
      return;
    }

    if (draft.tool === "arrow") {
      let end = wp;
      if (e.shiftKey) {
        const dx = wp.x - draft.start.x;
        const dy = wp.y - draft.start.y;
        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 4;
        const snapped = Math.round(angle / step) * step;
        const len = Math.hypot(dx, dy);
        end = {
          x: draft.start.x + Math.cos(snapped) * len,
          y: draft.start.y + Math.sin(snapped) * len,
        };
      }
      setDraft({ tool: "arrow", start: draft.start, end });
      return;
    }

    let end = wp;
    if (e.shiftKey) {
      const dx = wp.x - draft.start.x;
      const dy = wp.y - draft.start.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      end = {
        x: draft.start.x + Math.sign(dx || 1) * side,
        y: draft.start.y + Math.sign(dy || 1) * side,
      };
    }
    setDraft({ ...draft, end });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    canvasRef.current?.releasePointerCapture?.(e.pointerId);

    if (panning) {
      setPanning(null);
      return;
    }
    if (resizing) {
      setResizing(null);
      return;
    }
    if (arrowEndDrag) {
      setArrowEndDrag(null);
      return;
    }
    if (erasing) {
      setErasing(false);
      return;
    }
    if (dragging) {
      setDragging(null);
      return;
    }
    if (!draft) return;

    if (draft.tool === "pen") {
      if (draft.points.length > 1) {
        addObject({
          id: crypto.randomUUID(),
          type: "pen",
          points: draft.points,
          color: activeColor,
          strokeWidth: activeStroke,
        } satisfies PenStroke);
      }
    } else if (draft.tool === "highlight") {
      if (draft.points.length > 1) {
        addObject({
          id: crypto.randomUUID(),
          type: "highlight",
          points: draft.points,
          color: activeColor,
          strokeWidth: activeStroke * HIGHLIGHT_STROKE_MULT,
        } satisfies HighlightStroke);
      }
    } else if (draft.tool === "arrow") {
      const dx = draft.end.x - draft.start.x;
      const dy = draft.end.y - draft.start.y;
      if (Math.hypot(dx, dy) > 4) {
        addObject({
          id: crypto.randomUUID(),
          type: "arrow",
          start: draft.start,
          end: draft.end,
          color: activeColor,
          strokeWidth: activeStroke,
        } satisfies ArrowShape);
      }
    } else if (
      draft.tool === "rect" ||
      draft.tool === "ellipse" ||
      draft.tool === "triangle"
    ) {
      const r = rectFromPoints(draft.start, draft.end);
      if (r.width > 4 && r.height > 4) {
        const base = {
          id: crypto.randomUUID(),
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          color: activeColor,
          strokeWidth: activeStroke,
          style: activeStyle,
          fill: activeFill,
        };
        if (draft.tool === "rect")
          addObject({ ...base, type: "rect" } satisfies RectShape);
        else if (draft.tool === "ellipse")
          addObject({ ...base, type: "ellipse" } satisfies EllipseShape);
        else
          addObject({ ...base, type: "triangle" } satisfies TriangleShape);
      }
    } else if (draft.tool === "bubble") {
      const r = rectFromPoints(draft.start, draft.end);
      if (r.width > 20 && r.height > 16) {
        const id = crypto.randomUUID();
        const st = useEditor.getState();
        addObject({
          id,
          type: "bubble",
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          color: activeColor,
          strokeWidth: 1.5,
          text: "",
          textColor: st.activeBubbleTextColor,
          textGradient: st.activeBubbleGradient
            ? { from: st.activeBubbleTextColor, to: st.activeBubbleGradientTo }
            : undefined,
          bgColor: st.activeBubbleBgColor,
          bgGradient: st.activeBubbleBgGradient
            ? { from: st.activeBubbleBgColor, to: st.activeBubbleBgGradientTo }
            : undefined,
          fontFamily: st.activeBubbleFontFamily,
          fontSize: st.activeBubbleFontSize,
        } satisfies BubbleShape);
        setSelected(id);
        setEditing(id);
      }
    } else if (draft.tool === "crop") {
      if (image) {
        const r = rectFromPoints(draft.start, draft.end);
        const cx = Math.max(image.x, r.x);
        const cy = Math.max(image.y, r.y);
        const cex = Math.min(image.x + image.width, r.x + r.width);
        const cey = Math.min(image.y + image.height, r.y + r.height);
        const cw = cex - cx;
        const ch = cey - cy;
        if (cw > 8 && ch > 8) {
          cropImage(image, { x: cx, y: cy, width: cw, height: ch }).then(
            (next) => {
              setImage(next);
              setActiveTool("select");
            }
          );
        } else {
          setActiveTool("select");
        }
      }
    } else if (draft.tool === "blur") {
      const r = rectFromPoints(draft.start, draft.end);
      if (r.width > 6 && r.height > 6) {
        addObject({
          id: crypto.randomUUID(),
          type: "blur",
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          intensity: activeBlur,
        } satisfies BlurRect);
      }
    } else if (draft.tool === "spotlight") {
      const r = rectFromPoints(draft.start, draft.end);
      if (r.width > 8 && r.height > 8) {
        const st = useEditor.getState();
        addObject({
          id: crypto.randomUUID(),
          type: "spotlight",
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          shape: st.activeSpotShape,
          dim: st.activeSpotDim,
        } satisfies SpotlightShape);
      }
    }
    setDraft(null);
  };

  /* ── insertion-order rendering ──────────────────────────── */
  const orderedObjects = objects;

  const frame = useMemo(() => {
    const hasContent = !!image || objects.length > 0 || !!draft;
    if (!hasContent) {
      return null;
    }

    // Compute tight union of committed content (image + objects)
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    if (image) {
      minX = Math.min(minX, image.x);
      minY = Math.min(minY, image.y);
      maxX = Math.max(maxX, image.x + image.width);
      maxY = Math.max(maxY, image.y + image.height);
    }
    for (const obj of objects) {
      const b = annotationBounds(obj);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }

    // Expand with active draft bounds
    if (draft) {
      const db = draftBounds(draft, activeStroke);
      if (db) {
        minX = Math.min(minX, db.minX);
        minY = Math.min(minY, db.minY);
        maxX = Math.max(maxX, db.maxX);
        maxY = Math.max(maxY, db.maxY);
      }
    }

    if (!isFinite(minX)) return null;

    return {
      x: minX - FRAME_PADDING,
      y: minY - FRAME_PADDING,
      width: maxX - minX + FRAME_PADDING * 2,
      height: maxY - minY + FRAME_PADDING * 2,
    };
  }, [image, objects, draft, activeStroke, viewport.scale]);

  const cursorClass = panning
    ? "cursor-grabbing"
    : activeTool === "pan"
      ? "cursor-grab"
      : activeTool === "eraser"
        ? ""
        : activeTool === "select"
          ? dragging || resizing
            ? "cursor-grabbing"
            : hoverId
              ? "cursor-move"
              : ""
          : "cursor-crosshair";
  const cursorStyle: React.CSSProperties =
    activeTool === "eraser" ? { cursor: ERASER_CURSOR } : {};

  // selected resizable shape (for resize handles — visible in any tool)
  const selectedShape = useMemo(() => {
    if (!selectedId) return null;
    const o = objects.find((o) => o.id === selectedId);
    if (!o || !RESIZABLE.has(o.type)) return null;
    return o as RectShape | EllipseShape | TriangleShape | BubbleShape | BlurRect;
  }, [selectedId, objects]);

  // selected arrow (for endpoint handles)
  const selectedArrow = useMemo(() => {
    if (!selectedId) return null;
    const o = objects.find((o) => o.id === selectedId);
    if (!o || o.type !== "arrow") return null;
    return o as ArrowShape;
  }, [selectedId, objects]);

  // selected box-like (resizable + text) for floating drag/edit actions
  const selectedBox = useMemo(() => {
    if (!selectedId) return null;
    const o = objects.find((o) => o.id === selectedId);
    if (!o) return null;
    if (RESIZABLE.has(o.type) || o.type === "text") {
      return o as
        | RectShape
        | EllipseShape
        | TriangleShape
        | BubbleShape
        | BlurRect
        | TextObj;
    }
    return null;
  }, [selectedId, objects]);

  return (
    <div
      ref={canvasRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setHoverColor(null)}
      className={`flex-1 relative canvas-grid overflow-hidden ${cursorClass}`}
      style={cursorStyle}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadFile(f);
        }}
      />

      <AnimatePresence mode="wait">
        {!image && !freeform && (
          <EmptyState
            key="empty"
            onPickFile={() => fileInputRef.current?.click()}
            onFreeform={() => setFreeform(true)}
            isDragging={isDragging}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {image && isDragging && (
          <motion.div
            key="drop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-6 rounded-[14px] border-[1.5px] border-dashed border-petrol pointer-events-none z-30"
            style={{ background: "rgba(254,245,222,0.4)" }}
          />
        )}
      </AnimatePresence>

      {/* === TRANSFORMED CONTENT (pan/zoom) ============================== */}
      <div
        data-capture-root
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          width: "100%",
          height: "100%",
        }}
      >
        {frame && (
          <div
            data-frame-chrome
            className="absolute rounded-[12px] bg-parchment border border-whisper-border pointer-events-none"
            style={{
              left: frame.x,
              top: frame.y,
              width: frame.width,
              height: frame.height,
              boxShadow: "var(--shadow-object)",
            }}
          />
        )}

        {image && (
          <motion.img
            key={image.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            src={image.src}
            alt="screenshot"
            draggable={false}
            className="absolute rounded-[6px] select-none pointer-events-none"
            style={{
              left: image.x,
              top: image.y,
              width: image.width,
              height: image.height,
            }}
          />
        )}

        {/* Spotlight aggregated overlay (above image, below annotations) */}
        <SpotlightOverlay
          spots={objects.filter(
            (o): o is SpotlightShape => o.type === "spotlight"
          )}
          draftRect={
            draft?.tool === "spotlight"
              ? rectFromPoints(draft.start, draft.end)
              : null
          }
          frameBounds={frame}
        />

        {/* === Annotations rendered in pure insertion order =========== */}
        {orderedObjects.map((obj, idx) => (
          <div
            key={obj.id}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 100 + idx }}
          >
            {obj.id === selectedId && (
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                width="100%"
                height="100%"
              >
                <Halo obj={obj} />
              </svg>
            )}
            <ObjectRender
              obj={obj}
              isEditing={editingId === obj.id}
              isSelected={selectedId === obj.id}
              onChange={(patch) =>
                updateObject(obj.id, (o) => ({ ...o, ...patch }) as Annotation)
              }
              onCommit={() => {
                setEditing(null);
                if (obj.type === "text") {
                  const cur = useEditor
                    .getState()
                    .objects.find((o) => o.id === obj.id) as TextObj | undefined;
                  if (cur && cur.text.trim() === "") removeObject(obj.id);
                }
              }}
            />
          </div>
        ))}

        {/* === Drafts (top-most while drawing) ======================= */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 9000 }}
        >
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width="100%"
          height="100%"
        >
          {draft?.tool === "highlight" && draft.points.length > 1 && (
            <HighlightPath
              stroke={{
                id: "draft",
                type: "highlight",
                points: draft.points,
                color: activeColor,
                strokeWidth: activeStroke * HIGHLIGHT_STROKE_MULT,
              }}
            />
          )}
          {draft?.tool === "pen" && draft.points.length > 1 && (
            <PenPath
              stroke={{
                id: "draft",
                type: "pen",
                points: draft.points,
                color: activeColor,
                strokeWidth: activeStroke,
              }}
            />
          )}
          {draft?.tool === "arrow" && (
            <ArrowPath
              arrow={{
                id: "draft",
                type: "arrow",
                start: draft.start,
                end: draft.end,
                color: activeColor,
                strokeWidth: activeStroke,
              }}
            />
          )}
          {draft?.tool === "rect" &&
            (() => {
              const r = rectFromPoints(draft.start, draft.end);
              return (
                <RectShapeNode
                  shape={{
                    id: "draft",
                    type: "rect",
                    ...r,
                    color: activeColor,
                    strokeWidth: activeStroke,
                    style: activeStyle,
                    fill: activeFill,
                  }}
                />
              );
            })()}
          {draft?.tool === "ellipse" &&
            (() => {
              const r = rectFromPoints(draft.start, draft.end);
              return (
                <EllipseShapeNode
                  shape={{
                    id: "draft",
                    type: "ellipse",
                    ...r,
                    color: activeColor,
                    strokeWidth: activeStroke,
                    style: activeStyle,
                    fill: activeFill,
                  }}
                />
              );
            })()}
          {draft?.tool === "triangle" &&
            (() => {
              const r = rectFromPoints(draft.start, draft.end);
              return (
                <TriangleShapeNode
                  shape={{
                    id: "draft",
                    type: "triangle",
                    ...r,
                    color: activeColor,
                    strokeWidth: activeStroke,
                    style: activeStyle,
                    fill: activeFill,
                  }}
                />
              );
            })()}
        </svg>
        {/* HTML drafts */}
        {draft?.tool === "blur" &&
          (() => {
            const r = rectFromPoints(draft.start, draft.end);
            if (r.width < 2 || r.height < 2) return null;
            return (
              <div
                className="absolute pointer-events-none rounded-[4px] border-[1.5px] border-dashed border-petrol"
                style={{
                  left: r.x,
                  top: r.y,
                  width: r.width,
                  height: r.height,
                  backdropFilter: `blur(${activeBlur}px)`,
                  WebkitBackdropFilter: `blur(${activeBlur}px)`,
                }}
              />
            );
          })()}
        {draft?.tool === "rect" &&
          (() => {
            const r = rectFromPoints(draft.start, draft.end);
            return (
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                width="100%"
                height="100%"
              >
                <RectShapeNode
                  shape={{
                    id: "draft",
                    type: "rect",
                    ...r,
                    color: activeColor,
                    strokeWidth: activeStroke,
                    style: activeStyle,
                    fill: activeFill,
                  }}
                />
              </svg>
            );
          })()}
        {draft?.tool === "ellipse" &&
          (() => {
            const r = rectFromPoints(draft.start, draft.end);
            return (
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                width="100%"
                height="100%"
              >
                <EllipseShapeNode
                  shape={{
                    id: "draft",
                    type: "ellipse",
                    ...r,
                    color: activeColor,
                    strokeWidth: activeStroke,
                    style: activeStyle,
                    fill: activeFill,
                  }}
                />
              </svg>
            );
          })()}
        {draft?.tool === "triangle" &&
          (() => {
            const r = rectFromPoints(draft.start, draft.end);
            return (
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
                width="100%"
                height="100%"
              >
                <TriangleShapeNode
                  shape={{
                    id: "draft",
                    type: "triangle",
                    ...r,
                    color: activeColor,
                    strokeWidth: activeStroke,
                    style: activeStyle,
                    fill: activeFill,
                  }}
                />
              </svg>
            );
          })()}
        {draft?.tool === "bubble" &&
          (() => {
            const r = rectFromPoints(draft.start, draft.end);
            if (r.width < 2 || r.height < 2) return null;
            return (
              <BubbleSvg
                shape={{
                  id: "draft",
                  type: "bubble",
                  ...r,
                  color: activeColor,
                  strokeWidth: 1.5,
                  text: "",
                  textColor: "#0a0a0a",
                  bgColor: "#fffdf8",
                }}
              />
            );
          })()}
        </div>
      </div>
      {/* === END TRANSFORMED ============================================ */}

      {/* Arrow endpoint handles */}
      {selectedArrow && (
        <ArrowEndpoints
          arrow={selectedArrow}
          viewport={viewport}
          onStart={(which, e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasRef.current?.setPointerCapture(e.pointerId);
            setArrowEndDrag({
              id: selectedArrow.id,
              which,
              original: selectedArrow,
            });
          }}
        />
      )}

      {/* Resize handles (screen-space, fixed size regardless of zoom) */}
      {selectedShape && (
        <ResizeHandles
          shape={selectedShape}
          viewport={viewport}
          onStart={(handle, original) => setResizing({ id: original.id, handle, original })}
        />
      )}

      {/* Floating actions (move + edit) below the selected shape */}
      {selectedBox && !editingId && (
        <FloatingActions
          shape={selectedBox}
          viewport={viewport}
          showEdit={selectedBox.type === "bubble" || selectedBox.type === "text"}
          onMoveStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasRef.current?.setPointerCapture(e.pointerId);
            setDragging({
              id: selectedBox.id,
              startPointer: getWorldPoint(e),
              original: selectedBox,
            });
          }}
          onEdit={() => setEditing(selectedBox.id)}
        />
      )}

      {/* Crop preview (screen-space; converted from world) */}
      {draft?.tool === "crop" &&
        (() => {
          const r = rectFromPoints(draft.start, draft.end);
          if (r.width < 4 || r.height < 4) return null;
          const sx = r.x * viewport.scale + viewport.x;
          const sy = r.y * viewport.scale + viewport.y;
          const sw = r.width * viewport.scale;
          const sh = r.height * viewport.scale;
          const dim = "rgba(10,10,10,0.42)";
          return (
            <>
              <div className="absolute pointer-events-none" style={{ left: 0, top: 0, right: 0, height: sy, background: dim }} />
              <div className="absolute pointer-events-none" style={{ left: 0, top: sy, width: sx, height: sh, background: dim }} />
              <div className="absolute pointer-events-none" style={{ left: sx + sw, top: sy, right: 0, height: sh, background: dim }} />
              <div className="absolute pointer-events-none" style={{ left: 0, top: sy + sh, right: 0, bottom: 0, background: dim }} />
              <div
                className="absolute pointer-events-none border-[1.5px] border-dashed border-petrol"
                style={{ left: sx, top: sy, width: sw, height: sh }}
              />
              {[
                [sx, sy],
                [sx + sw, sy],
                [sx, sy + sh],
                [sx + sw, sy + sh],
              ].map(([cx, cy], i) => (
                <div
                  key={i}
                  className="absolute pointer-events-none w-2.5 h-2.5 bg-parchment border-[1.5px] border-petrol rounded-[2px]"
                  style={{ left: cx - 5, top: cy - 5 }}
                />
              ))}
            </>
          );
        })()}
    </div>
  );
}

/* ── Arrow endpoint handles (screen-space) ─────────────── */

function ArrowEndpoints({
  arrow,
  viewport,
  onStart,
}: {
  arrow: ArrowShape;
  viewport: { x: number; y: number; scale: number };
  onStart: (which: "start" | "end", e: React.PointerEvent) => void;
}) {
  const sx1 = arrow.start.x * viewport.scale + viewport.x;
  const sy1 = arrow.start.y * viewport.scale + viewport.y;
  const sx2 = arrow.end.x * viewport.scale + viewport.x;
  const sy2 = arrow.end.y * viewport.scale + viewport.y;
  const handleStyle =
    "absolute z-30 w-3 h-3 bg-parchment border-[1.5px] border-petrol rounded-full cursor-grab hover:scale-110 transition";
  return (
    <>
      <div
        onPointerDown={(e) => onStart("start", e)}
        title="Drag to reposition start"
        className={handleStyle}
        style={{ left: sx1 - 6, top: sy1 - 6 }}
      />
      <div
        onPointerDown={(e) => onStart("end", e)}
        title="Drag to reposition end"
        className={handleStyle}
        style={{ left: sx2 - 6, top: sy2 - 6 }}
      />
    </>
  );
}

/* ── Floating actions: move + edit (screen-space) ──────── */

function FloatingActions({
  shape,
  viewport,
  showEdit,
  onMoveStart,
  onEdit,
}: {
  shape: { x: number; y: number; width: number; height: number; type: string };
  viewport: { x: number; y: number; scale: number };
  showEdit: boolean;
  onMoveStart: (e: React.PointerEvent) => void;
  onEdit: () => void;
}) {
  const tail = shape.type === "bubble" ? 14 : 0;
  const cx = (shape.x + shape.width / 2) * viewport.scale + viewport.x;
  const cy = (shape.y + shape.height + tail) * viewport.scale + viewport.y + 16;
  return (
    <div
      className="absolute z-30 flex gap-1.5 -translate-x-1/2"
      style={{ left: cx, top: cy }}
    >
      <button
        type="button"
        onPointerDown={onMoveStart}
        title="Drag to move"
        className="w-7 h-7 rounded-full bg-parchment border border-whisper-border flex items-center justify-center hover:bg-tool-hover transition ease-calm duration-100 cursor-grab active:cursor-grabbing"
        style={{ boxShadow: "var(--shadow-toolbar)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0a0a0a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 9l-3 3 3 3" />
          <path d="M9 5l3-3 3 3" />
          <path d="M15 19l-3 3-3-3" />
          <path d="M19 9l3 3-3 3" />
          <path d="M2 12h20" />
          <path d="M12 2v20" />
        </svg>
      </button>
      {showEdit && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit text"
          className="w-7 h-7 rounded-full bg-parchment border border-whisper-border flex items-center justify-center hover:bg-tool-hover transition ease-calm duration-100"
          style={{ boxShadow: "var(--shadow-toolbar)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Resize handles (screen-space) ─────────────────────── */

function ResizeHandles({
  shape,
  viewport,
  onStart,
}: {
  shape: RectShape | EllipseShape | TriangleShape | BubbleShape | BlurRect;
  viewport: { x: number; y: number; scale: number };
  onStart: (
    handle: ResizeHandle,
    original: RectShape | EllipseShape | TriangleShape | BubbleShape | BlurRect
  ) => void;
}) {
  const sx = shape.x * viewport.scale + viewport.x;
  const sy = shape.y * viewport.scale + viewport.y;
  const sw = shape.width * viewport.scale;
  const sh = shape.height * viewport.scale;
  const handles: { name: ResizeHandle; x: number; y: number; cursor: string }[] =
    [
      { name: "tl", x: sx, y: sy, cursor: "nwse-resize" },
      { name: "tm", x: sx + sw / 2, y: sy, cursor: "ns-resize" },
      { name: "tr", x: sx + sw, y: sy, cursor: "nesw-resize" },
      { name: "ml", x: sx, y: sy + sh / 2, cursor: "ew-resize" },
      { name: "mr", x: sx + sw, y: sy + sh / 2, cursor: "ew-resize" },
      { name: "bl", x: sx, y: sy + sh, cursor: "nesw-resize" },
      { name: "bm", x: sx + sw / 2, y: sy + sh, cursor: "ns-resize" },
      { name: "br", x: sx + sw, y: sy + sh, cursor: "nwse-resize" },
    ];
  return (
    <>
      {handles.map((h) => (
        <div
          key={h.name}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onStart(h.name, shape);
          }}
          className="absolute z-30 w-2.5 h-2.5 bg-parchment border-[1.5px] border-petrol rounded-[2px]"
          style={{
            left: h.x - 5,
            top: h.y - 5,
            cursor: h.cursor,
          }}
        />
      ))}
    </>
  );
}

function applyResize(
  original: Annotation,
  handle: ResizeHandle,
  pointer: Point,
  preserveAspect: boolean
): Annotation {
  if (
    original.type !== "rect" &&
    original.type !== "ellipse" &&
    original.type !== "triangle" &&
    original.type !== "bubble" &&
    original.type !== "blur" &&
    original.type !== "spotlight"
  ) {
    return original;
  }
  let { x, y, width, height } = original;
  const right = x + width;
  const bottom = y + height;

  let nx = x,
    ny = y,
    nw = width,
    nh = height;
  if (handle.includes("l")) {
    nx = Math.min(pointer.x, right - 4);
    nw = right - nx;
  }
  if (handle.includes("r")) {
    nw = Math.max(4, pointer.x - x);
  }
  if (handle.startsWith("t")) {
    ny = Math.min(pointer.y, bottom - 4);
    nh = bottom - ny;
  }
  if (handle.startsWith("b")) {
    nh = Math.max(4, pointer.y - y);
  }

  if (preserveAspect && handle.length === 2) {
    // corner resize with shift → square
    const side = Math.max(nw, nh);
    if (handle === "tl") {
      nx = right - side;
      ny = bottom - side;
    } else if (handle === "tr") {
      ny = bottom - side;
    } else if (handle === "bl") {
      nx = right - side;
    }
    nw = side;
    nh = side;
  }

  return { ...original, x: nx, y: ny, width: nw, height: nh } as Annotation;
}

/* ── Per-object render (insertion order — each obj gets own SVG/HTML) ── */

type ObjPatch = Partial<Annotation>;
function ObjectRender({
  obj,
  isEditing,
  isSelected,
  onChange,
  onCommit,
}: {
  obj: Annotation;
  isEditing: boolean;
  isSelected: boolean;
  onChange: (patch: ObjPatch) => void;
  onCommit: () => void;
}) {
  if (obj.type === "blur") {
    return (
      <div
        className="absolute pointer-events-none rounded-[4px]"
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          backdropFilter: `blur(${obj.intensity}px)`,
          WebkitBackdropFilter: `blur(${obj.intensity}px)`,
        }}
      />
    );
  }
  if (obj.type === "highlight") {
    return (
      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        width="100%"
        height="100%"
        style={{ mixBlendMode: "multiply" }}
      >
        <HighlightPath stroke={obj} />
      </svg>
    );
  }
  if (
    obj.type === "pen" ||
    obj.type === "arrow" ||
    obj.type === "rect" ||
    obj.type === "ellipse" ||
    obj.type === "triangle"
  ) {
    return (
      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        width="100%"
        height="100%"
      >
        {obj.type === "pen" && <PenPath stroke={obj} />}
        {obj.type === "arrow" && <ArrowPath arrow={obj} />}
        {obj.type === "rect" && <RectShapeNode shape={obj} />}
        {obj.type === "ellipse" && <EllipseShapeNode shape={obj} />}
        {obj.type === "triangle" && <TriangleShapeNode shape={obj} />}
      </svg>
    );
  }
  if (obj.type === "bubble") {
    return (
      <>
        <BubbleSvg shape={obj} />
        <BubbleTextNode
          bubble={obj}
          isEditing={isEditing}
          onChange={(t) => onChange({ text: t } as ObjPatch)}
          onCommit={onCommit}
        />
      </>
    );
  }
  if (obj.type === "text") {
    return (
      <TextNode
        text={obj}
        isEditing={isEditing}
        isSelected={isSelected}
        onChange={(t, w, h) =>
          onChange({ text: t, width: w, height: h } as ObjPatch)
        }
        onCommit={onCommit}
      />
    );
  }
  if (obj.type === "counter") {
    return <CounterNode counter={obj} />;
  }
  if (obj.type === "spotlight") {
    // visual handled by SpotlightOverlay; nothing per-obj
    return null;
  }
  return null;
}

function CounterNode({ counter }: { counter: CounterShape }) {
  const { x, y, n, color, size } = counter;
  return (
    <div
      className="absolute pointer-events-none rounded-full flex items-center justify-center"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        background: color,
        color: "#ffffff",
        fontFamily: "var(--font-suisseintl)",
        fontWeight: 600,
        fontSize: size * 0.5,
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        lineHeight: 1,
      }}
    >
      {n}
    </div>
  );
}

function SpotlightOverlay({
  spots,
  draftRect,
  frameBounds,
}: {
  spots: SpotlightShape[];
  draftRect: Rect | null;
  frameBounds: { x: number; y: number; width: number; height: number } | null;
}) {
  const activeSpotShape = useEditor((s) => s.activeSpotShape);
  const activeSpotDim = useEditor((s) => s.activeSpotDim);
  const allSpots = [...spots];
  if (draftRect && draftRect.width > 2 && draftRect.height > 2) {
    allSpots.push({
      id: "draft-spot",
      type: "spotlight",
      x: draftRect.x,
      y: draftRect.y,
      width: draftRect.width,
      height: draftRect.height,
      shape: activeSpotShape,
      dim: activeSpotDim,
    });
  }
  if (allSpots.length === 0 || !frameBounds) return null;
  const dim = Math.max(...allSpots.map((s) => s.dim));
  const maskId = `spot-mask`;
  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      width="100%"
      height="100%"
      style={{ zIndex: 50 }}
    >
      <defs>
        <mask id={maskId}>
          {/* visible (white) over the entire frame bounds */}
          <rect
            x={frameBounds.x}
            y={frameBounds.y}
            width={frameBounds.width}
            height={frameBounds.height}
            fill="white"
          />
          {/* spotlight cutouts → transparent */}
          {allSpots.map((s) =>
            s.shape === "ellipse" ? (
              <ellipse
                key={s.id}
                cx={s.x + s.width / 2}
                cy={s.y + s.height / 2}
                rx={s.width / 2}
                ry={s.height / 2}
                fill="black"
              />
            ) : (
              <rect
                key={s.id}
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                rx={6}
                ry={6}
                fill="black"
              />
            )
          )}
        </mask>
      </defs>
      <rect
        x={frameBounds.x}
        y={frameBounds.y}
        width={frameBounds.width}
        height={frameBounds.height}
        fill="black"
        fillOpacity={dim}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

/* ── HTML overlay nodes ────────────────────────────────── */

function BubbleTextNode({
  bubble,
  isEditing,
  onChange,
  onCommit,
}: {
  bubble: BubbleShape;
  isEditing: boolean;
  onChange: (text: string) => void;
  onCommit: () => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync DOM text from state ONLY when not focused (avoids cursor jumps).
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerText !== bubble.text) el.innerText = bubble.text;
  }, [bubble.text]);

  // On entering edit mode → focus + place caret at end.
  useEffect(() => {
    if (isEditing && innerRef.current) {
      const el = innerRef.current;
      if (el.innerText !== bubble.text) el.innerText = bubble.text;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Auto-fit text within bubble — only when not editing.
  // While editing we let it grow naturally so caret doesn't jump around.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    const cont = containerRef.current;
    if (!inner || !cont) return;
    if (isEditing) {
      inner.style.transform = "";
      return;
    }
    inner.style.transform = "scale(1)";
    const cRect = cont.getBoundingClientRect();
    const iRect = inner.getBoundingClientRect();
    if (cRect.width <= 0 || cRect.height <= 0) return;
    if (iRect.width <= 0 || iRect.height <= 0) return;
    const sx = cRect.width / iRect.width;
    const sy = cRect.height / iRect.height;
    const s = Math.min(1, sx, sy);
    if (s < 1) inner.style.transform = `scale(${s})`;
  }, [bubble.text, bubble.width, bubble.height, isEditing]);

  const baseFont =
    bubble.fontSize ?? Math.max(12, Math.min(22, bubble.height * 0.42));
  const familyCss = fontCss(bubble.fontFamily ?? "serif");
  const useGradient = !!bubble.textGradient;
  const textStyle: React.CSSProperties = useGradient
    ? {
        backgroundImage: `linear-gradient(90deg, ${bubble.textGradient!.from}, ${bubble.textGradient!.to})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }
    : { color: bubble.textColor || "#0a0a0a" };

  return (
    <div
      ref={containerRef}
      data-editing-id={isEditing ? bubble.id : undefined}
      onPointerDown={(e) => {
        if (isEditing) e.stopPropagation();
      }}
      className={`absolute ${
        isEditing
          ? ""
          : "flex items-center justify-center overflow-hidden pointer-events-none"
      }`}
      style={{
        left: bubble.x,
        top: bubble.y,
        width: bubble.width,
        height: bubble.height,
        padding: "6px 10px",
        direction: "ltr",
      }}
    >
      <div
        ref={innerRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        dir="ltr"
        onInput={(e) =>
          onChange((e.currentTarget.innerText ?? "").replace(/\n$/, ""))
        }
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            innerRef.current?.blur();
          }
        }}
        className="outline-none max-w-full"
        style={{
          ...textStyle,
          fontFamily: familyCss,
          fontSize: baseFont,
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          transformOrigin: "top center",
          direction: "ltr",
          textAlign: "center",
          unicodeBidi: "plaintext",
          width: "100%",
        }}
        // Initial DOM text set imperatively in useEffect; React must NOT touch
        // children, otherwise it overwrites on every keystroke and the caret
        // jumps to the start (causing reversed-looking input).
        dangerouslySetInnerHTML={EMPTY_HTML}
      />
    </div>
  );
}

function TextNode({
  text,
  isEditing,
  isSelected,
  onChange,
  onCommit,
}: {
  text: TextObj;
  isEditing: boolean;
  isSelected: boolean;
  onChange: (text: string, width: number, height: number) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync DOM text from state ONLY when not focused.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerText !== text.text) el.innerText = text.text;
  }, [text.text]);

  useEffect(() => {
    if (isEditing && ref.current) {
      const el = ref.current;
      if (el.innerText !== text.text) el.innerText = text.text;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // r is in screen-space; account for current viewport scale via ownerDocument transform — we passed unscaled width to store, so reverse-scale if needed.
    // Since the parent uses CSS transform, getBoundingClientRect gives scaled size. For text bounds we need world-space dimensions. We'll back out the scale.
    const scale = useEditor.getState().viewport.scale;
    const w = r.width / scale;
    const h = r.height / scale;
    if (Math.abs(w - text.width) > 1 || Math.abs(h - text.height) > 1) {
      onChange(text.text, w, h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text.text, text.fontFamily, text.fontSize]);

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    const t = (e.currentTarget.innerText ?? "").replace(/\n$/, "");
    const r = e.currentTarget.getBoundingClientRect();
    const scale = useEditor.getState().viewport.scale;
    onChange(t, r.width / scale, r.height / scale);
  };

  return (
    <div
      ref={ref}
      data-editing-id={isEditing ? text.id : undefined}
      contentEditable={isEditing}
      suppressContentEditableWarning
      dir="ltr"
      onInput={onInput}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      onPointerDown={(e) => {
        if (isEditing) e.stopPropagation();
      }}
      className={`absolute outline-none whitespace-pre ${
        isEditing ? "cursor-text" : "pointer-events-none"
      } ${isSelected && !isEditing ? "ring-2 ring-petrol/60 ring-offset-2 ring-offset-transparent rounded-[2px]" : ""}`}
      style={{
        left: text.x,
        top: text.y,
        color: text.color,
        fontFamily: fontCss(text.fontFamily),
        fontSize: text.fontSize,
        lineHeight: 1.2,
        minWidth: isEditing ? 12 : undefined,
        direction: "ltr",
        textAlign: "left",
        unicodeBidi: "plaintext",
      }}
      // Uncontrolled — React must not touch children while user types.
      dangerouslySetInnerHTML={EMPTY_HTML}
    />
  );
}

/* ── SVG renderers ─────────────────────────────────────── */

function PenPath({ stroke }: { stroke: PenStroke }) {
  if (stroke.points.length < 2) return null;
  return (
    <path
      d={pathFromPoints(stroke.points)}
      stroke={stroke.color}
      strokeWidth={stroke.strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function HighlightPath({ stroke }: { stroke: HighlightStroke }) {
  if (stroke.points.length < 2) return null;
  return (
    <path
      d={pathFromPoints(stroke.points)}
      stroke={stroke.color}
      strokeWidth={stroke.strokeWidth}
      strokeOpacity={0.45}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function ArrowPath({ arrow }: { arrow: ArrowShape }) {
  const { start, end, color, strokeWidth } = arrow;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = Math.max(12, strokeWidth * 4);
  const angle = Math.PI / 7;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const leftX = end.x + headLen * (-ux * cos + uy * sin);
  const leftY = end.y + headLen * (-uy * cos - ux * sin);
  const rightX = end.x + headLen * (-ux * cos - uy * sin);
  const rightY = end.y + headLen * (-uy * cos + ux * sin);
  const inset = strokeWidth * 0.5;
  const lineEndX = end.x - ux * inset;
  const lineEndY = end.y - uy * inset;
  const d = `M ${start.x} ${start.y} L ${lineEndX} ${lineEndY} M ${leftX} ${leftY} L ${end.x} ${end.y} L ${rightX} ${rightY}`;
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function RectShapeNode({ shape }: { shape: RectShape }) {
  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={4}
      ry={4}
      stroke={shape.color}
      strokeWidth={shape.strokeWidth}
      fill={shape.fill ? shape.color : "none"}
      fillOpacity={shape.fill ? 0.15 : 0}
      strokeLinejoin="round"
      strokeDasharray={dasharrayFor(shape.style, shape.strokeWidth)}
      strokeLinecap={shape.style === "dotted" ? "round" : "butt"}
    />
  );
}

function EllipseShapeNode({ shape }: { shape: EllipseShape }) {
  return (
    <ellipse
      cx={shape.x + shape.width / 2}
      cy={shape.y + shape.height / 2}
      rx={shape.width / 2}
      ry={shape.height / 2}
      stroke={shape.color}
      strokeWidth={shape.strokeWidth}
      fill={shape.fill ? shape.color : "none"}
      fillOpacity={shape.fill ? 0.15 : 0}
      strokeDasharray={dasharrayFor(shape.style, shape.strokeWidth)}
      strokeLinecap={shape.style === "dotted" ? "round" : "butt"}
    />
  );
}

function TriangleShapeNode({ shape }: { shape: TriangleShape }) {
  const { x, y, width, height } = shape;
  const points = `${x + width / 2},${y} ${x},${y + height} ${x + width},${y + height}`;
  return (
    <polygon
      points={points}
      stroke={shape.color}
      strokeWidth={shape.strokeWidth}
      fill={shape.fill ? shape.color : "none"}
      fillOpacity={shape.fill ? 0.15 : 0}
      strokeLinejoin="round"
      strokeDasharray={dasharrayFor(shape.style, shape.strokeWidth)}
      strokeLinecap={shape.style === "dotted" ? "round" : "butt"}
    />
  );
}

function bubblePath(shape: BubbleShape): string {
  const { x, y, width, height } = shape;
  const tailW = 14;
  const tailH = 10;
  const r = 10;
  const tailX = Math.min(x + 28, x + width - 30);
  return `M ${x + r} ${y} L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${y + r} L ${x + width} ${y + height - r} Q ${x + width} ${y + height} ${x + width - r} ${y + height} L ${tailX + tailW} ${y + height} L ${tailX + tailW * 0.4} ${y + height + tailH} L ${tailX} ${y + height} L ${x + r} ${y + height} Q ${x} ${y + height} ${x} ${y + height - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

/** Single SVG with own defs+gradient → reliable cross-browser. */
function BubbleSvg({ shape }: { shape: BubbleShape }) {
  const path = bubblePath(shape);
  const grad = shape.bgGradient;
  const useGrad =
    !!grad &&
    typeof grad.from === "string" &&
    typeof grad.to === "string" &&
    grad.from.length > 0 &&
    grad.to.length > 0;
  const id = `bg-${shape.id}`;
  const fillSolid = shape.bgColor || "#fffdf8";
  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      width="100%"
      height="100%"
    >
      {useGrad && (
        <defs>
          <linearGradient
            id={id}
            gradientUnits="userSpaceOnUse"
            x1={shape.x}
            y1={shape.y}
            x2={shape.x + shape.width}
            y2={shape.y + shape.height}
          >
            <stop offset="0%" stopColor={grad!.from} />
            <stop offset="100%" stopColor={grad!.to} />
          </linearGradient>
        </defs>
      )}
      <path
        d={path}
        fill={useGrad ? `url(#${id})` : fillSolid}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Halo({ obj }: { obj: Annotation }) {
  const haloColor = "#1d4c4a";
  const haloOpacity = 0.32;
  const haloExtra = 8;

  if (obj.type === "pen" || obj.type === "highlight") {
    if (obj.points.length < 2) return null;
    return (
      <path
        d={pathFromPoints(obj.points)}
        stroke={haloColor}
        strokeOpacity={haloOpacity}
        strokeWidth={obj.strokeWidth + haloExtra}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (obj.type === "arrow") {
    return (
      <line
        x1={obj.start.x}
        y1={obj.start.y}
        x2={obj.end.x}
        y2={obj.end.y}
        stroke={haloColor}
        strokeOpacity={haloOpacity}
        strokeWidth={obj.strokeWidth + haloExtra}
        strokeLinecap="round"
      />
    );
  }
  if (
    obj.type === "rect" ||
    obj.type === "ellipse" ||
    obj.type === "triangle" ||
    obj.type === "bubble" ||
    obj.type === "blur" ||
    obj.type === "text" ||
    obj.type === "spotlight"
  ) {
    const tailExtra = obj.type === "bubble" ? 12 : 0;
    return (
      <rect
        x={obj.x - 3}
        y={obj.y - 3}
        width={obj.width + 6}
        height={obj.height + 6 + tailExtra}
        rx={6}
        ry={6}
        fill="none"
        stroke={haloColor}
        strokeWidth={2}
        strokeOpacity={0.85}
      />
    );
  }
  if (obj.type === "counter") {
    return (
      <circle
        cx={obj.x}
        cy={obj.y}
        r={obj.size / 2 + 3}
        fill="none"
        stroke={haloColor}
        strokeWidth={2}
        strokeOpacity={0.85}
      />
    );
  }
  return null;
}

/* ── draft bounds (for frame expansion during drawing) ──── */

function draftBounds(
  d: Draft,
  strokeWidth: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (d.tool === "pen" || d.tool === "highlight") {
    if (d.points.length === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of d.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = d.tool === "highlight" ? strokeWidth * 4 : strokeWidth;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }
  // All other drafts have start/end
  const r = rectFromPoints(d.start, d.end);
  if (d.tool === "arrow") {
    const pad = Math.max(8, strokeWidth * 4);
    return { minX: r.x - pad, minY: r.y - pad, maxX: r.x + r.width + pad, maxY: r.y + r.height + pad };
  }
  return { minX: r.x, minY: r.y, maxX: r.x + r.width, maxY: r.y + r.height };
}

/* ── translate helper ─────────────────────────────────────── */

function translate(
  original: Annotation,
  dx: number,
  dy: number,
  current: Annotation
): Annotation {
  if (original.type !== current.type) return current;
  if (original.type === "pen" || original.type === "highlight") {
    return {
      ...original,
      points: original.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    };
  }
  if (original.type === "arrow") {
    return {
      ...original,
      start: { x: original.start.x + dx, y: original.start.y + dy },
      end: { x: original.end.x + dx, y: original.end.y + dy },
    };
  }
  return {
    ...(original as
      | RectShape
      | EllipseShape
      | TriangleShape
      | BubbleShape
      | BlurRect
      | TextObj
      | CounterShape
      | SpotlightShape),
    x: original.x + dx,
    y: original.y + dy,
  } as Annotation;
}

/* ── crop helper ──────────────────────────────────────────── */

async function cropImage(image: ImageObj, rect: Rect): Promise<ImageObj> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = image.src;
  });
  const ratioX = img.naturalWidth / image.width;
  const ratioY = img.naturalHeight / image.height;
  const sx = Math.max(0, (rect.x - image.x) * ratioX);
  const sy = Math.max(0, (rect.y - image.y) * ratioY);
  const sw = Math.min(img.naturalWidth - sx, rect.width * ratioX);
  const sh = Math.min(img.naturalHeight - sy, rect.height * ratioY);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL("image/png");
  return {
    ...image,
    id: crypto.randomUUID(),
    src: dataURL,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

