"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Undo2,
  Redo2,
  Copy,
  Download,
  Check,
  FileImage,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEditor } from "@/lib/store";
import { computeFrame } from "@/lib/frame";
import {
  exportFrame,
  copyFrameToClipboard,
  snapshotFrameUrl,
  type ExportFormat,
} from "@/lib/export";

const FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "png", label: "PNG", hint: "lossless · transparency" },
  { id: "jpg", label: "JPG", hint: "smaller · solid bg" },
  { id: "webp", label: "WebP", hint: "best compression" },
];

export function Topbar() {
  const image = useEditor((s) => s.image);
  const objects = useEditor((s) => s.objects);
  const hoverColor = useEditor((s) => s.hoverColor);
  const hoverColorCopied = useEditor((s) => s.hoverColorCopied);
  
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  const frame = useMemo(() => computeFrame(image, objects), [image, objects]);
  const w = frame ? Math.round(frame.width) : 0;
  const h = frame ? Math.round(frame.height) : 0;

  const [filename, setFilename] = useState("screenshot");
  const [saveOpen, setSaveOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragUrl, setDragUrl] = useState<string | null>(null);
  const saveBtnRef = useRef<HTMLDivElement>(null);


  // Maintain a fresh PNG snapshot URL of the annotated frame for drag-out.
  // Re-renders are debounced so html2canvas doesn't run on every keystroke.
  useEffect(() => {
    if (!image) {
      if (dragUrl) URL.revokeObjectURL(dragUrl);
      setDragUrl(null);
      return;
    }
    const t = setTimeout(async () => {
      const root = document.querySelector(
        "[data-capture-root]"
      ) as HTMLElement | null;
      if (!root) return;
      const url = await snapshotFrameUrl(root);
      if (url) {
        setDragUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, objects]);

  // close popover on outside click
  useEffect(() => {
    if (!saveOpen) return;
    const onDown = (e: MouseEvent) => {
      if (saveBtnRef.current && !saveBtnRef.current.contains(e.target as Node)) {
        setSaveOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [saveOpen]);

  const getCaptureRoot = () =>
    document.querySelector("[data-capture-root]") as HTMLElement | null;

  const onSave = async () => {
    const root = getCaptureRoot();
    if (!root || busy) return;
    setBusy(true);
    try {
      await exportFrame(root, filename, format);
    } finally {
      setBusy(false);
      setSaveOpen(false);
    }
  };

  const onCopy = async () => {
    const root = getCaptureRoot();
    if (!root || busy) return;
    setBusy(true);
    const ok = await copyFrameToClipboard(root);
    setBusy(false);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <header className="h-14 shrink-0 border-b border-whisper-border bg-toolbar-bg flex items-center px-5 z-30">
      {/* Left: brand + filename */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <img 
            src="/editss/logo.png" 
            alt="editss logo" 
            className="w-7 h-7 object-contain group-hover:scale-105 transition-transform duration-200" 
          />
          <span className="font-serif text-[15px] text-ink-black group-hover:text-petrol transition-colors duration-200">editss</span>
        </Link>
        <span className="w-px h-5 bg-whisper-border shrink-0" />
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="bg-transparent text-[14px] text-ink-black w-56 px-2 py-1 rounded-[6px] outline-none border border-transparent hover:border-whisper-border focus:border-whisper-border focus:bg-parchment transition ease-calm duration-150"
        />
      </div>

      {/* Center: status pills + undo / redo */}
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-parchment transition-colors"
          style={{
            opacity: hoverColor ? 1 : 0.4,
            borderColor: hoverColorCopied
              ? "#1d4c4a"
              : "var(--color-whisper-border)",
            background: hoverColorCopied ? "#fef5de" : "var(--color-parchment)",
          }}
          title="Press Tab to copy"
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-ghost-border shrink-0"
            style={{ background: hoverColor ?? "#fafaf7" }}
          />
          <span className="text-[11px] tabular-nums uppercase text-ink-black font-mono">
            {hoverColorCopied ? "copied" : hoverColor ?? "—"}
          </span>
          <span className="text-ghost-border">|</span>
          <span className="text-[10px] text-ash-gray inline-flex items-center gap-1">
            <TabKeyIcon />
            <span style={{ fontFamily: "var(--font-suisseintl)" }}>
              tab to copy
            </span>
          </span>
        </div>

        <div
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-whisper-border bg-parchment"
          style={{ opacity: frame ? 1 : 0.4 }}
        >
          <span className="text-[11px] tabular-nums text-ash-gray font-mono">
            W
          </span>
          <span className="text-[11px] tabular-nums text-ink-black font-mono">
            {frame ? w : "—"}
          </span>
          <span className="text-[11px] text-ash-gray">·</span>
          <span className="text-[11px] tabular-nums text-ash-gray font-mono">
            H
          </span>
          <span className="text-[11px] tabular-nums text-ink-black font-mono">
            {frame ? h : "—"}
          </span>
        </div>

        <span className="w-px h-5 bg-whisper-border mx-1" />

        <IconButton
          label="Undo (⌘Z)"
          onClick={undo}
          disabled={past.length === 0}
        >
          <Undo2 className="w-4 h-4" strokeWidth={1.5} />
        </IconButton>
        <IconButton
          label="Redo (⌘⇧Z)"
          onClick={redo}
          disabled={future.length === 0}
        >
          <Redo2 className="w-4 h-4" strokeWidth={1.5} />
        </IconButton>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <DragOut url={dragUrl} filename={filename} disabled={!frame} />
        <button
          onClick={onCopy}
          disabled={!frame || busy}
          className="inline-flex items-center gap-2 px-[14px] py-[8px] rounded-[10px] border border-ghost-border text-ink-black text-[13px] hover:bg-tool-hover transition ease-calm duration-150 disabled:opacity-50"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
          ) : (
            <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          {copied ? "copied" : "copy"}
        </button>
        <div ref={saveBtnRef} className="relative">
          <button
            onClick={() => setSaveOpen((v) => !v)}
            disabled={!frame || busy}
            className="inline-flex items-center gap-2 px-[14px] py-[8px] rounded-[10px] bg-petrol text-parchment text-[13px] hover:opacity-95 transition ease-calm duration-150 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            save
          </button>

          <AnimatePresence>
            {saveOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                className="absolute right-0 top-full mt-2 w-[260px] rounded-[12px] border border-whisper-border bg-parchment p-4 z-40"
                style={{ boxShadow: "var(--shadow-menu)" }}
              >
                <div className="text-[11px] tracking-wider uppercase text-ash-gray mb-2">
                  Format
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      title={f.hint}
                      className={cn(
                        "h-9 rounded-[8px] border text-[12px] transition ease-calm duration-150 tabular-nums",
                        format === f.id
                          ? "border-ink-black bg-tool-hover text-ink-black"
                          : "border-whisper-border text-slate-gray hover:bg-tool-hover"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] tracking-wider uppercase text-ash-gray mb-2">
                  Filename
                </div>
                <div className="flex items-center h-9 rounded-[8px] border border-whisper-border bg-parchment px-2.5 mb-4">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[13px] text-ink-black"
                  />
                  <span className="text-[11px] text-ash-gray font-mono">
                    .{format}
                  </span>
                </div>

                <div className="text-[11px] text-ash-gray mb-3">
                  Exports the framed area at {w}×{h}px (×{Math.round((window?.devicePixelRatio ?? 1) * 10) / 10} DPR).
                </div>

                <button
                  onClick={onSave}
                  disabled={busy}
                  className="w-full h-10 rounded-[10px] bg-petrol text-parchment text-[13px] inline-flex items-center justify-center gap-2 hover:opacity-95 transition ease-calm duration-150 disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {busy ? "exporting…" : `save as ${format.toUpperCase()}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function DragOut({
  url,
  filename,
  disabled,
}: {
  url: string | null;
  filename: string;
  disabled: boolean;
}) {
  const onDragStart = (e: React.DragEvent) => {
    if (!url) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "copy";
    const safeName = `${filename || "screenshot"}.png`;
    e.dataTransfer.setData("text/uri-list", url);
    e.dataTransfer.setData("text/plain", url);
    // Chromium-only: enables drag-out as a file into Finder/Explorer
    e.dataTransfer.setData("DownloadURL", `image/png:${safeName}:${url}`);
    // Optional ghost image
    const ghost = new Image();
    ghost.src = url;
    e.dataTransfer.setDragImage(ghost, 16, 16);
  };
  return (
    <div
      draggable={!disabled && !!url}
      onDragStart={onDragStart}
      title={
        disabled
          ? "Drop a screenshot first"
          : "Drag out: hold and pull to any app"
      }
      className={cn(
        "inline-flex items-center gap-0.5 px-2 h-9 rounded-[10px] border border-ghost-border text-ink-black select-none cursor-grab active:cursor-grabbing transition ease-calm duration-150",
        disabled || !url
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-tool-hover"
      )}
    >
      <GripVertical className="w-3 h-3 text-ash-gray" strokeWidth={1.5} />
      <FileImage className="w-4 h-4 text-ink-black mx-0.5" strokeWidth={1.5} />
      <GripVertical className="w-3 h-3 text-ash-gray" strokeWidth={1.5} />
    </div>
  );
}

function TabKeyIcon() {
  return (
    <svg
      width="14"
      height="9"
      viewBox="0 0 16 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 5h9" />
      <path d="M7 1l3 4-3 4" />
      <path d="M14 1v8" />
    </svg>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-8 h-8 rounded-[8px] flex items-center justify-center text-ink-black hover:bg-tool-hover transition ease-calm duration-100",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}
