"use client";

import { motion } from "framer-motion";
import { ImagePlus, Clipboard, MousePointerClick, Pen } from "lucide-react";

export function EmptyState({
  onPickFile,
  onFreeform,
  isDragging,
}: {
  onPickFile: () => void;
  onFreeform: () => void;
  isDragging: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
    >
      {/* Sketchy guide arrows pointing toward the drop zone */}
      <ArrowTopLeft />
      <ArrowTopRight />
      <ArrowBottomLeft />
      <ArrowBottomRight />

      {/* Drop area */}
      <motion.div
        animate={{
          scale: isDragging ? 1.02 : 1,
        }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        className="pointer-events-auto relative w-[520px] h-[340px]"
      >
        <div
          className="absolute inset-0 rounded-[14px] border-[1.5px] border-dashed transition-colors duration-200 ease-calm"
          style={{
            borderColor: isDragging ? "#1d4c4a" : "#d1d1d1",
            background: isDragging ? "rgba(254,245,222,0.5)" : "transparent",
          }}
        />
        <div className="relative w-full h-full flex flex-col items-center justify-center px-8">
          <div className="flex items-center justify-center mb-5">
            <img 
              src="/editss/logo.png" 
              alt="editss logo" 
              className="w-14 h-14 object-contain" 
            />
          </div>
          <h2 className="font-serif text-[28px] text-ink-black mb-2 leading-tight text-center">
            drop a screenshot
          </h2>
          <p className="text-slate-gray text-[14px] text-center mb-6 max-w-[320px]">
            drag an image into this canvas, or paste from clipboard.
            nothing leaves your browser.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onPickFile}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-petrol text-parchment text-[13px] hover:opacity-95 transition ease-calm duration-150"
            >
              <MousePointerClick className="w-3.5 h-3.5" strokeWidth={1.75} />
              choose file
            </button>
            <span className="px-3 py-2 rounded-[10px] border border-whisper-border text-[13px] text-slate-gray inline-flex items-center gap-2">
              <Clipboard className="w-3.5 h-3.5" strokeWidth={1.5} />
              or paste · <Kbd>⌘</Kbd>
              <Kbd>V</Kbd>
            </span>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-5 mb-4 w-48">
            <span className="flex-1 h-px bg-whisper-border" />
            <span className="text-[12px] text-ash-gray italic font-serif">or</span>
            <span className="flex-1 h-px bg-whisper-border" />
          </div>

          {/* Freeform button */}
          <button
            onClick={onFreeform}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-whisper-border text-[13px] text-slate-gray hover:bg-tool-hover hover:text-ink-black transition ease-calm duration-150"
          >
            <Pen className="w-3.5 h-3.5" strokeWidth={1.5} />
            freeform canvas
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-parchment border border-whisper-border text-ink-black leading-none">
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   Sketchy hand-drawn arrows à la Excalidraw, pointing to center
   ──────────────────────────────────────────────────────────── */

const ARROW_COLOR = "#8c8c8c";
const ARROW_STROKE = 1.4;

function ArrowTopLeft() {
  return (
    <motion.svg
      initial={{ opacity: 0, x: -12, y: -12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
      className="absolute left-[8%] top-[14%]"
      width="220"
      height="160"
      viewBox="0 0 220 160"
      fill="none"
    >
      <path
        d="M14 24 C 60 30, 120 60, 196 138"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M178 132 L198 142 L188 122"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="20"
        y="14"
        fill={ARROW_COLOR}
        fontFamily="Iowan Old Style, Georgia, serif"
        fontStyle="italic"
        fontSize="14"
      >
        drop here
      </text>
    </motion.svg>
  );
}

function ArrowTopRight() {
  return (
    <motion.svg
      initial={{ opacity: 0, x: 12, y: -12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="absolute right-[10%] top-[16%]"
      width="220"
      height="160"
      viewBox="0 0 220 160"
      fill="none"
    >
      <path
        d="M206 22 C 160 36, 100 64, 24 138"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 132 L22 142 L32 122"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="120"
        y="14"
        fill={ARROW_COLOR}
        fontFamily="Iowan Old Style, Georgia, serif"
        fontStyle="italic"
        fontSize="14"
      >
        or paste ⌘V
      </text>
    </motion.svg>
  );
}

function ArrowBottomLeft() {
  return (
    <motion.svg
      initial={{ opacity: 0, x: -12, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="absolute left-[10%] bottom-[14%]"
      width="200"
      height="120"
      viewBox="0 0 200 120"
      fill="none"
    >
      <path
        d="M14 96 C 50 80, 110 40, 188 12"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M170 8 L190 12 L182 30"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="20"
        y="114"
        fill={ARROW_COLOR}
        fontFamily="Iowan Old Style, Georgia, serif"
        fontStyle="italic"
        fontSize="14"
      >
        any image
      </text>
    </motion.svg>
  );
}

function ArrowBottomRight() {
  return (
    <motion.svg
      initial={{ opacity: 0, x: 12, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay: 0.37, ease: [0.32, 0.72, 0, 1] }}
      className="absolute right-[12%] bottom-[16%]"
      width="200"
      height="120"
      viewBox="0 0 200 120"
      fill="none"
    >
      <path
        d="M186 96 C 150 78, 90 38, 12 12"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 8 L10 12 L18 30"
        stroke={ARROW_COLOR}
        strokeWidth={ARROW_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="98"
        y="114"
        fill={ARROW_COLOR}
        fontFamily="Iowan Old Style, Georgia, serif"
        fontStyle="italic"
        fontSize="14"
      >
        png · jpg · webp
      </text>
    </motion.svg>
  );
}
