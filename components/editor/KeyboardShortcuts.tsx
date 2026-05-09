"use client";

import { useEffect } from "react";
import { useEditor, type ToolId } from "@/lib/store";

const KEY_TO_TOOL: Record<string, ToolId> = {
  v: "select",
  h: "pan",
  p: "pen",
  a: "arrow",
  r: "rect",
  o: "ellipse",
  y: "triangle",
  t: "text",
  b: "bubble",
  l: "blur",
  g: "highlight",
  c: "crop",
  e: "eraser",
  n: "counter",
  s: "spotlight",
};

export function KeyboardShortcuts() {
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const removeObject = useEditor((s) => s.removeObject);
  const setSelected = useEditor((s) => s.setSelected);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to bubble for the text editor's own handling
        return;
      }

      // Delete / Backspace removes selection (only when not editing)
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId, editingId } = useEditor.getState();
        if (editingId) return;
        if (selectedId) {
          e.preventDefault();
          removeObject(selectedId);
        }
        return;
      }

      // Tab — copy hovered pixel color (Shottr-style)
      if (e.key === "Tab") {
        const { hoverColor, setHoverColorCopied } = useEditor.getState();
        if (hoverColor) {
          e.preventDefault();
          navigator.clipboard?.writeText(hoverColor).catch(() => {});
          setHoverColorCopied(true);
          setTimeout(() => useEditor.getState().setHoverColorCopied(false), 1200);
        }
        return;
      }

      // Escape clears selection and deactivates tool
      if (e.key === "Escape") {
        e.preventDefault();
        setSelected(null);
        setActiveTool("select");
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const tool = KEY_TO_TOOL[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        setActiveTool(tool);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTool, removeObject, setSelected]);

  return null;
}
