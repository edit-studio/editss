import type { Annotation, ImageObj } from "./store";

export const FRAME_PADDING = 32;

export type FrameBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function computeFrame(
  image: ImageObj | null,
  objects: Annotation[]
) {
  const has = !!image || objects.length > 0;
  if (!has) return null;
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
  return {
    x: minX - FRAME_PADDING,
    y: minY - FRAME_PADDING,
    width: maxX - minX + FRAME_PADDING * 2,
    height: maxY - minY + FRAME_PADDING * 2,
  };
}

export function annotationBounds(obj: Annotation) {
  if (obj.type === "pen" || obj.type === "highlight") {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of obj.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = obj.strokeWidth;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }
  if (obj.type === "arrow") {
    const minX = Math.min(obj.start.x, obj.end.x);
    const minY = Math.min(obj.start.y, obj.end.y);
    const maxX = Math.max(obj.start.x, obj.end.x);
    const maxY = Math.max(obj.start.y, obj.end.y);
    const pad = Math.max(8, obj.strokeWidth * 4);
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }
  if (obj.type === "counter") {
    const r = obj.size / 2;
    return {
      minX: obj.x - r,
      minY: obj.y - r,
      maxX: obj.x + r,
      maxY: obj.y + r,
    };
  }
  const tail = obj.type === "bubble" ? 14 : 0;
  return {
    minX: obj.x,
    minY: obj.y,
    maxX: obj.x + obj.width,
    maxY: obj.y + obj.height + tail,
  };
}
