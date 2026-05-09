"use client";

import { motion } from "framer-motion";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { useEditor } from "@/lib/store";

const STEP = 1.2;
const MIN = 0.25;
const MAX = 4;

export function ZoomControl() {
  const image = useEditor((s) => s.image);
  const freeform = useEditor((s) => s.freeform);
  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);

  // Hide on empty state
  if (!image && !freeform) return null;

  const zoomBy = (factor: number) => {
    const newScale = Math.max(MIN, Math.min(MAX, viewport.scale * factor));
    // zoom around viewport center — keep middle stable
    // We don't have canvas size here; zoom in place is fine for buttons.
    setViewport({ ...viewport, scale: newScale });
  };

  const reset = () => setViewport({ x: 0, y: 0, scale: 1 });

  const pct = Math.round(viewport.scale * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
      className="absolute bottom-4 right-4 z-20 toolbar-surface rounded-full h-9 flex items-center px-1 gap-0.5"
    >
      <Btn onClick={() => zoomBy(1 / STEP)} title="Zoom out">
        <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
      </Btn>
      <span className="text-[12px] text-ink-black w-12 text-center tabular-nums">
        {pct}%
      </span>
      <Btn onClick={() => zoomBy(STEP)} title="Zoom in">
        <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
      </Btn>
      <span className="w-px h-4 bg-whisper-border mx-0.5" />
      <Btn onClick={reset} title="Reset (100%)">
        <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} />
      </Btn>
    </motion.div>
  );
}

function Btn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-full flex items-center justify-center text-ink-black hover:bg-tool-hover transition ease-calm duration-100"
    >
      {children}
    </button>
  );
}
