"use client";

import { motion } from "framer-motion";
import {
  MousePointer2,
  Hand,
  Pen,
  MoveUpRight,
  Square,
  Circle,
  Triangle as TriangleIcon,
  Type,
  MessageCircle,
  Droplet,
  Highlighter,
  Crop,
  Eraser,
  Hash,
  Aperture,
  Sparkles,
  Paintbrush,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useEditor, type ToolId } from "@/lib/store";

type Tool = {
  id: ToolId;
  icon: LucideIcon;
  label: string;
  shortcut: string;
};

const GROUPS: Tool[][] = [
  [
    { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
    { id: "pan", icon: Hand, label: "Pan", shortcut: "H" },
  ],
  [
    { id: "pen", icon: Pen, label: "Pen", shortcut: "P" },
    { id: "arrow", icon: MoveUpRight, label: "Arrow", shortcut: "A" },
    { id: "rect", icon: Square, label: "Rectangle", shortcut: "R" },
    { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
    { id: "triangle", icon: TriangleIcon, label: "Triangle", shortcut: "Y" },
    { id: "text", icon: Type, label: "Text", shortcut: "T" },
    { id: "bubble", icon: MessageCircle, label: "Bubble", shortcut: "B" },
  ],
  [
    { id: "blur", icon: Droplet, label: "Blur", shortcut: "L" },
    { id: "highlight", icon: Highlighter, label: "Highlight", shortcut: "G" },
    { id: "spotlight", icon: Aperture, label: "Spotlight", shortcut: "S" },
    { id: "counter", icon: Hash, label: "Counter", shortcut: "N" },
    { id: "crop", icon: Crop, label: "Crop / Expand", shortcut: "C" },
  ],
  [{ id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" }],
];

export function Toolbar() {
  const activeTool = useEditor((s) => s.activeTool);
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const image = useEditor((s) => s.image);
  const freeform = useEditor((s) => s.freeform);

  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const removeObject = useEditor((s) => s.removeObject);
  const selectedId = useEditor((s) => s.selectedId);
  const clearAll = useEditor((s) => s.clearAll);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId) {
          e.preventDefault();
          removeObject(selectedId);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, duplicateSelected, removeObject, selectedId]);

  // Hide toolbar on empty state (no image and not in freeform mode)
  if (!image && !freeform) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 toolbar-surface rounded-[14px] py-2 px-1.5 flex flex-col items-center gap-0.5"
    >
      {/* AI Tool — Coming Soon */}
      <div className="relative group/ai">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center opacity-35 cursor-default"
        >
          <Sparkles
            className="w-[20px] h-[20px] text-ink-black"
            strokeWidth={1.5}
          />
        </div>
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-ink-black text-parchment text-[12px] whitespace-nowrap opacity-0 scale-95 group-hover/ai:opacity-100 group-hover/ai:scale-100 transition-all duration-200 ease-out">
          AI · coming soon
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-ink-black" />
        </div>
      </div>

      <div className="w-7 h-px bg-whisper-border my-1" />

      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {group.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              active={activeTool === tool.id}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}
          {gi < GROUPS.length - 1 && (
            <div className="my-1.5 mx-2 h-px bg-whisper-border" />
          )}
        </div>
      ))}

      {/* Clear All */}
      <div className="my-1.5 mx-2 h-px bg-whisper-border" />
      <button
        onClick={clearAll}
        className="w-10 h-10 rounded-[10px] flex items-center justify-center transition ease-calm duration-150 group hover:bg-red-50"
      >
        <Paintbrush
          className="w-[20px] h-[20px] text-ink-black group-hover:text-red-500 transition-colors duration-150"
          strokeWidth={1.5}
        />
      </button>
    </motion.aside>
  );
}

function ToolButton({
  tool,
  active,
  onClick,
}: {
  tool: Tool;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      title={`${tool.label} (${tool.shortcut})`}
      className={cn(
        "relative w-10 h-10 rounded-[10px] flex items-center justify-center transition ease-calm duration-150 group",
        active ? "bg-petrol" : "hover:bg-tool-hover"
      )}
    >
      <Icon
        className={cn(
          "w-[20px] h-[20px] transition-colors duration-150",
          active ? "text-parchment" : "text-ink-black"
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "absolute top-1 right-1 text-[9px] font-medium leading-none transition-colors duration-150",
          active ? "text-parchment/60" : "text-ash-gray"
        )}
      >
        {tool.shortcut}
      </span>
    </button>
  );
}
