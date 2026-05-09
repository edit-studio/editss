import { create } from "zustand";
import type {
  ToolId,
  Point,
  StrokeStyle,
  FontFamilyId,
  SpotShape,
  ImageObj,
  Annotation,
} from "./types";

// Re-export all types so existing imports from "@/lib/store" still work
export type {
  ToolId,
  Point,
  StrokeStyle,
  FontFamilyId,
  SpotShape,
  ImageObj,
  PenStroke,
  HighlightStroke,
  ArrowShape,
  RectShape,
  EllipseShape,
  TriangleShape,
  BubbleShape,
  BlurRect,
  TextObj,
  CounterShape,
  SpotlightShape,
  Annotation,
} from "./types";

interface EditorState {
  image: ImageObj | null;
  objects: Annotation[];
  activeTool: ToolId;
  activeColor: string;
  activeStroke: number;
  activeStyle: StrokeStyle;
  activeFill: boolean;
  activeBlur: number;
  activeBubbleText: string;
  activeBubbleTextColor: string;
  activeBubbleGradient: boolean;
  activeBubbleGradientTo: string;
  activeBubbleBgColor: string;
  activeBubbleBgGradient: boolean;
  activeBubbleBgGradientTo: string;
  activeBubbleFontFamily: FontFamilyId;
  activeBubbleFontSize: number;
  activeCounterColor: string;
  activeCounterSize: number;
  activeSpotShape: SpotShape;
  activeSpotDim: number;
  activeFontFamily: FontFamilyId;
  activeFontSize: number;
  editingId: string | null;
  selectedId: string | null;
  viewport: { x: number; y: number; scale: number };
  freeform: boolean;
  switchToSelectOnSameTypeClick: boolean;
  hoverColor: string | null;
  hoverColorCopied: boolean;

  setImage: (img: ImageObj | null) => void;
  addObject: (obj: Annotation) => void;
  updateObject: (id: string, updater: (o: Annotation) => Annotation) => void;
  removeObject: (id: string) => void;
  setActiveTool: (t: ToolId) => void;
  setActiveColor: (c: string) => void;
  setActiveStroke: (n: number) => void;
  setActiveStyle: (s: StrokeStyle) => void;
  setActiveFill: (f: boolean) => void;
  setActiveBlur: (n: number) => void;
  setActiveBubbleText: (t: string) => void;
  setActiveBubbleTextColor: (c: string) => void;
  setActiveBubbleGradient: (b: boolean) => void;
  setActiveBubbleGradientTo: (c: string) => void;
  setActiveBubbleBgColor: (c: string) => void;
  setActiveBubbleBgGradient: (b: boolean) => void;
  setActiveBubbleBgGradientTo: (c: string) => void;
  setActiveBubbleFontFamily: (f: FontFamilyId) => void;
  setActiveBubbleFontSize: (n: number) => void;
  setActiveCounterColor: (c: string) => void;
  setActiveCounterSize: (n: number) => void;
  setActiveSpotShape: (s: SpotShape) => void;
  setActiveSpotDim: (n: number) => void;
  setActiveFontFamily: (f: FontFamilyId) => void;
  setActiveFontSize: (n: number) => void;
  setEditing: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setViewport: (v: { x: number; y: number; scale: number }) => void;
  setFreeform: (b: boolean) => void;
  setSwitchToSelectOnSameTypeClick: (b: boolean) => void;
  setHoverColor: (c: string | null) => void;
  setHoverColorCopied: (v: boolean) => void;
  reset: () => void;

  // History & actions
  past: { image: ImageObj | null; objects: Annotation[] }[];
  future: { image: ImageObj | null; objects: Annotation[] }[];
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  updateObjectWithHistory: (id: string, updater: (o: Annotation) => Annotation) => void;
  clearAll: () => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  image: null,
  objects: [],
  activeTool: "select",
  activeColor: "#0a0a0a",
  activeStroke: 4,
  activeStyle: "solid",
  activeFill: false,
  activeBlur: 12,
  activeBubbleText: "ship it",
  activeBubbleTextColor: "#0a0a0a",
  activeBubbleGradient: false,
  activeBubbleGradientTo: "#d97a6a",
  activeBubbleBgColor: "#fffdf8",
  activeBubbleBgGradient: false,
  activeBubbleBgGradientTo: "#e8c890",
  activeBubbleFontFamily: "serif",
  activeBubbleFontSize: 18,
  activeCounterColor: "#fe0c01",
  activeCounterSize: 26,
  activeSpotShape: "ellipse",
  activeSpotDim: 0.55,
  activeFontFamily: "serif",
  activeFontSize: 20,
  editingId: null,
  selectedId: null,
  viewport: { x: 0, y: 0, scale: 1 },
  freeform: false,
  switchToSelectOnSameTypeClick: true,
  hoverColor: null,
  hoverColorCopied: false,

  past: [],
  future: [],

  saveHistory: () => {
    const s = get();
    // Do not save if objects and image haven't changed since last history
    const last = s.past[s.past.length - 1];
    if (last && last.image === s.image && last.objects === s.objects) return;
    
    set({
      past: [...s.past, { image: s.image, objects: s.objects }].slice(-50),
      future: [],
    });
  },

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const previous = s.past[s.past.length - 1];
    set({
      past: s.past.slice(0, -1),
      future: [{ image: s.image, objects: s.objects }, ...s.future],
      image: previous.image,
      objects: previous.objects,
      selectedId: null,
    });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0];
    set({
      past: [...s.past, { image: s.image, objects: s.objects }],
      future: s.future.slice(1),
      image: next.image,
      objects: next.objects,
      selectedId: null,
    });
  },

  duplicateSelected: () => {
    const s = get();
    if (!s.selectedId) return;
    const original = s.objects.find((o) => o.id === s.selectedId);
    if (!original) return;
    s.saveHistory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: any = { ...original, id: crypto.randomUUID() };
    if ('x' in newObj && 'y' in newObj) {
      newObj.x += 20;
      newObj.y += 20;
    } else if ('start' in newObj && 'end' in newObj) {
      newObj.start = { x: newObj.start.x + 20, y: newObj.start.y + 20 };
      newObj.end = { x: newObj.end.x + 20, y: newObj.end.y + 20 };
    } else if ('points' in newObj) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newObj.points = newObj.points.map((p: any) => ({ x: p.x + 20, y: p.y + 20 }));
    }
    set({
      objects: [...s.objects, newObj],
      selectedId: newObj.id,
      activeTool: "select"
    });
  },

  setImage: (img) => {
    get().saveHistory();
    set({ image: img });
  },
  addObject: (obj) => {
    get().saveHistory();
    set((s) => ({ objects: [...s.objects, obj] }));
  },
  updateObject: (id, updater) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? updater(o) : o)),
    })),
  updateObjectWithHistory: (id, updater) => {
    get().saveHistory();
    get().updateObject(id, updater);
  },
  removeObject: (id) => {
    get().saveHistory();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },
  clearAll: () => {
    const s = get();
    if (s.objects.length === 0) return;
    s.saveHistory();
    set({ objects: [], selectedId: null, editingId: null });
  },
  setActiveTool: (t) => set({ activeTool: t, selectedId: null }),
  setActiveColor: (c) => set({ activeColor: c }),
  setActiveStroke: (n) => set({ activeStroke: n }),
  setActiveStyle: (s) => set({ activeStyle: s }),
  setActiveFill: (f) => set({ activeFill: f }),
  setActiveBlur: (n) => set({ activeBlur: n }),
  setActiveBubbleText: (t) => set({ activeBubbleText: t }),
  setActiveBubbleTextColor: (c) => set({ activeBubbleTextColor: c }),
  setActiveBubbleGradient: (b) => set({ activeBubbleGradient: b }),
  setActiveBubbleGradientTo: (c) => set({ activeBubbleGradientTo: c }),
  setActiveBubbleBgColor: (c) => set({ activeBubbleBgColor: c }),
  setActiveBubbleBgGradient: (b) => set({ activeBubbleBgGradient: b }),
  setActiveBubbleBgGradientTo: (c) => set({ activeBubbleBgGradientTo: c }),
  setActiveBubbleFontFamily: (f) => set({ activeBubbleFontFamily: f }),
  setActiveBubbleFontSize: (n) => set({ activeBubbleFontSize: n }),
  setActiveCounterColor: (c) => set({ activeCounterColor: c }),
  setActiveCounterSize: (n) => set({ activeCounterSize: n }),
  setActiveSpotShape: (s) => set({ activeSpotShape: s }),
  setActiveSpotDim: (n) => set({ activeSpotDim: n }),
  setActiveFontFamily: (f) => set({ activeFontFamily: f }),
  setActiveFontSize: (n) => set({ activeFontSize: n }),
  setEditing: (id) => set({ editingId: id }),
  setSelected: (id) => set({ selectedId: id }),
  setViewport: (v) => set({ viewport: v }),
  setFreeform: (b) => set({ freeform: b, activeTool: b ? "pen" : "select" }),
  setSwitchToSelectOnSameTypeClick: (b) =>
    set({ switchToSelectOnSameTypeClick: b }),
  setHoverColor: (c) => set({ hoverColor: c }),
  setHoverColorCopied: (v) => set({ hoverColorCopied: v }),
  reset: () =>
    set({
      image: null,
      objects: [],
      selectedId: null,
      editingId: null,
      viewport: { x: 0, y: 0, scale: 1 },
      freeform: false,
    }),
}));
