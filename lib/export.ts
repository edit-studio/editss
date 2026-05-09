import html2canvas from "html2canvas-pro";
import { useEditor } from "./store";
import { computeFrame } from "./frame";

export type ExportFormat = "png" | "jpg" | "webp";

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

const EXT: Record<ExportFormat, string> = {
  png: "png",
  jpg: "jpg",
  webp: "webp",
};

export async function exportFrame(
  captureRoot: HTMLElement,
  filename: string,
  format: ExportFormat,
  options: { quality?: number; download?: boolean } = {}
): Promise<Blob | null> {
  const { quality = 0.92, download = true } = options;
  const st = useEditor.getState();
  const frame = computeFrame(st.image, st.objects);
  if (!frame) return null;

  try {
    const canvas = await html2canvas(captureRoot, {
      // White background for all formats; frame chrome hidden so no parchment.
      backgroundColor: "#ffffff",
      x: frame.x,
      y: frame.y,
      width: Math.round(frame.width),
      height: Math.round(frame.height),
      scale: window.devicePixelRatio || 1,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        // Hide frame chrome in the clone so export is clean
        const chrome = doc.querySelector("[data-frame-chrome]") as HTMLElement | null;
        if (chrome) chrome.style.visibility = "hidden";
        
        // Reset viewport in the clone so it renders at 100% scale without pan offset
        const root = doc.querySelector("[data-capture-root]") as HTMLElement | null;
        if (root) {
          root.style.transform = `translate(0px, 0px) scale(1)`;
        }
      }
    });

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(
        (b) => resolve(b),
        MIME[format],
        format === "png" ? undefined : quality
      )
    );

    if (blob && download) {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${filename || "screenshot"}.${EXT[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return blob;
  } catch (err) {
    console.error("Export failed", err);
    return null;
  }
}

export async function copyFrameToClipboard(
  captureRoot: HTMLElement
): Promise<boolean> {
  const blob = await exportFrame(captureRoot, "_copy", "png", {
    download: false,
  });
  if (!blob) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** Render annotated frame to a Blob URL (for drag-out & similar). */
export async function snapshotFrameUrl(
  captureRoot: HTMLElement
): Promise<string | null> {
  const blob = await exportFrame(captureRoot, "_drag", "png", {
    download: false,
  });
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
