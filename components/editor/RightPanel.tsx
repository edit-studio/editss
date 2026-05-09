"use client";

import { motion } from "framer-motion";
import {
  Pen as PenIcon,
  MoveUpRight,
  Square,
  Circle,
  Triangle as TriangleIcon,
  MessageCircle,
  Droplet,
  Highlighter,
  Eraser,
  Crop as CropIcon,
  Type as TypeIcon,
  Blend,
  Hash,
  Aperture,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  useEditor,
  type ToolId,
  type StrokeStyle,
  type BubbleShape,
  type Annotation,
  type FontFamilyId,
  type PenStroke,
  type ArrowShape,
  type HighlightStroke,
  type RectShape,
  type EllipseShape,
  type TriangleShape,
  type BlurRect,
  type TextObj,
  type CounterShape,
  type SpotlightShape,
  type SpotShape,
} from "@/lib/store";
import { FONT_OPTIONS } from "@/lib/fonts";

const COLORS = [
  { name: "red", value: "#fe0c01" },
  { name: "purple", value: "#7658ee" },
  { name: "yellow", value: "#ffdd2a" },
  { name: "pink", value: "#fa3d63" },
  { name: "teal", value: "#05a291" },
  { name: "blue", value: "#01afee" },
  { name: "navy", value: "#1c2b41" },
  { name: "cream", value: "#f7f5e7" },
];

const STROKES = [2, 4, 8];
const STYLES: StrokeStyle[] = ["solid", "dashed", "dotted"];

const TOOL_LABEL: Partial<Record<ToolId, { label: string; icon: LucideIcon }>> =
  {
    pen: { label: "Pen", icon: PenIcon },
    arrow: { label: "Arrow", icon: MoveUpRight },
    rect: { label: "Rectangle", icon: Square },
    ellipse: { label: "Ellipse", icon: Circle },
    triangle: { label: "Triangle", icon: TriangleIcon },
    bubble: { label: "Bubble", icon: MessageCircle },
    blur: { label: "Blur", icon: Droplet },
    highlight: { label: "Highlight", icon: Highlighter },
    eraser: { label: "Eraser", icon: Eraser },
    text: { label: "Text", icon: TypeIcon },
    crop: { label: "Crop", icon: CropIcon },
    counter: { label: "Counter", icon: Hash },
    spotlight: { label: "Spotlight", icon: Aperture },
  };

export function RightPanel() {
  const activeTool = useEditor((s) => s.activeTool);
  const selectedId = useEditor((s) => s.selectedId);
  const objects = useEditor((s) => s.objects);
  const image = useEditor((s) => s.image);

  const selectedObj = useMemo(
    () =>
      selectedId ? objects.find((o) => o.id === selectedId) ?? null : null,
    [selectedId, objects]
  );

  // Decide which panel to show:
  // — If something is selected, panel edits THAT object (regardless of active tool).
  // — Otherwise, if a creating tool is active, show its create-time panel.
  let currentBody: React.ReactNode = null;
  if (selectedObj) {
    currentBody = <SelectedPanel obj={selectedObj} />;
  } else if (activeTool !== "select" && activeTool !== "pan") {
    currentBody = <PanelForTool tool={activeTool} />;
  }

  // Preserve the last valid body for the exit animation
  const prevBody = useRef<React.ReactNode>(null);
  if (currentBody) {
    prevBody.current = currentBody;
  }

  const visible = !!image && currentBody !== null;
  const bodyToRender = currentBody || prevBody.current;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: visible ? 280 : 0,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className={cn(
        "shrink-0 bg-toolbar-bg overflow-hidden flex flex-col",
        visible ? "border-l border-whisper-border" : "border-none"
      )}
    >
      <div className="w-[280px] shrink-0 p-5 space-y-5">
        {bodyToRender}
      </div>
    </motion.aside>
  );
}

function SelectedPanel({ obj }: { obj: Annotation }) {
  switch (obj.type) {
    case "bubble":
      return <BubblePanel target={obj} />;
    case "rect":
    case "ellipse":
    case "triangle":
      return <ShapePanel tool={obj.type} target={obj} />;
    case "pen":
    case "arrow":
    case "highlight":
      return <StrokePanel tool={obj.type} target={obj} />;
    case "blur":
      return <BlurPanel target={obj} />;
    case "text":
      return <TextPanel target={obj} />;
    case "counter":
      return <CounterPanel target={obj} />;
    case "spotlight":
      return <SpotlightPanel target={obj} />;
    default:
      return null;
  }
}

function PanelForTool({ tool }: { tool: ToolId }) {
  switch (tool) {
    case "pen":
    case "arrow":
    case "highlight":
      return <StrokePanel tool={tool} />;
    case "rect":
    case "ellipse":
    case "triangle":
      return <ShapePanel tool={tool} />;
    case "bubble":
      return <BubblePanel />;
    case "blur":
      return <BlurPanel />;
    case "eraser":
      return <EraserPanel />;
    case "text":
      return <TextPanel />;
    case "crop":
      return <CropPanel />;
    case "counter":
      return <CounterPanel />;
    case "spotlight":
      return <SpotlightPanel />;
    default:
      return <ComingSoonPanel tool={tool} />;
  }
}

/* ── shared sub-controls ───────────────────────────────── */

function ColorRowCtl({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <Section title="Color">
      <SwatchRow value={value} onChange={onChange} />
    </Section>
  );
}

function StrokeWidthRowCtl({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (n: number) => void;
  color: string;
}) {
  return (
    <Section title="Stroke width">
      <div className="grid grid-cols-3 gap-2">
        {STROKES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "h-10 rounded-[8px] border flex items-center justify-center transition ease-calm duration-150",
              value === s
                ? "border-ink-black bg-tool-hover"
                : "border-whisper-border hover:bg-tool-hover"
            )}
          >
            <span
              className="w-5 rounded-full"
              style={{ height: `${s}px`, background: color }}
            />
          </button>
        ))}
      </div>
    </Section>
  );
}

function StyleRowCtl({
  value,
  onChange,
}: {
  value: StrokeStyle;
  onChange: (s: StrokeStyle) => void;
}) {
  return (
    <Section title="Style">
      <div className="grid grid-cols-3 gap-2">
        {STYLES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "h-9 rounded-[8px] border text-[12px] capitalize transition ease-calm duration-150",
              value === s
                ? "border-ink-black bg-tool-hover text-ink-black"
                : "border-whisper-border text-slate-gray hover:bg-tool-hover"
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </Section>
  );
}

function FillRowCtl({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <Section title="Fill">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange(false)}
          className={cn(
            "h-9 rounded-[8px] border text-[12px] transition ease-calm duration-150",
            !value
              ? "border-ink-black bg-tool-hover text-ink-black"
              : "border-whisper-border text-slate-gray hover:bg-tool-hover"
          )}
        >
          Outline
        </button>
        <button
          onClick={() => onChange(true)}
          className={cn(
            "h-9 rounded-[8px] border text-[12px] transition ease-calm duration-150",
            value
              ? "border-ink-black bg-tool-hover text-ink-black"
              : "border-whisper-border text-slate-gray hover:bg-tool-hover"
          )}
        >
          Filled
        </button>
      </div>
    </Section>
  );
}

/* ── tool-specific panels ──────────────────────────────── */

function StrokePanel({
  tool,
  target,
}: {
  tool: ToolId;
  target?: PenStroke | ArrowShape | HighlightStroke;
}) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);
  const activeColor = useEditor((s) => s.activeColor);
  const setActiveColor = useEditor((s) => s.setActiveColor);
  const activeStroke = useEditor((s) => s.activeStroke);
  const setActiveStroke = useEditor((s) => s.setActiveStroke);

  const color = target?.color ?? activeColor;
  const setColor = target
    ? (c: string) =>
        updateObject(target.id, (o) => ({ ...o, color: c }) as Annotation)
    : setActiveColor;
  const strokeW = target?.strokeWidth ?? activeStroke;
  const setStrokeW = target
    ? (n: number) =>
        updateObject(target.id, (o) => ({ ...o, strokeWidth: n }) as Annotation)
    : setActiveStroke;

  const meta = TOOL_LABEL[tool];
  const Icon = meta?.icon;
  return (
    <>
      <Header
        icon={Icon ? <Icon className="w-3.5 h-3.5" strokeWidth={1.5} /> : undefined}
      >
        {target ? `Selected ${meta?.label}` : meta?.label ?? capitalize(tool)}
      </Header>

      <ColorRowCtl value={color} onChange={setColor} />
      <Divider />
      <StrokeWidthRowCtl value={strokeW} onChange={setStrokeW} color={color} />
      <Divider />
      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Edits apply live to the selected object."
          : tool === "pen"
            ? "Click and drag to draw freehand."
            : tool === "arrow"
              ? <>Drag from start to end. Hold <Kbd>⇧</Kbd> to constrain to 8 directions.</>
              : "Drag to lay down a soft highlighter band over the screenshot."}
      </p>
    </>
  );
}

function ShapePanel({
  tool,
  target,
}: {
  tool: ToolId;
  target?: RectShape | EllipseShape | TriangleShape;
}) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);
  const activeColor = useEditor((s) => s.activeColor);
  const setActiveColor = useEditor((s) => s.setActiveColor);
  const activeStroke = useEditor((s) => s.activeStroke);
  const setActiveStroke = useEditor((s) => s.setActiveStroke);
  const activeStyle = useEditor((s) => s.activeStyle);
  const setActiveStyle = useEditor((s) => s.setActiveStyle);
  const activeFill = useEditor((s) => s.activeFill);
  const setActiveFill = useEditor((s) => s.setActiveFill);

  const color = target?.color ?? activeColor;
  const setColor = target
    ? (c: string) => updateObject(target.id, (o) => ({ ...o, color: c }) as Annotation)
    : setActiveColor;
  const strokeW = target?.strokeWidth ?? activeStroke;
  const setStrokeW = target
    ? (n: number) =>
        updateObject(target.id, (o) => ({ ...o, strokeWidth: n }) as Annotation)
    : setActiveStroke;
  const style = target?.style ?? activeStyle;
  const setStyle = target
    ? (s: StrokeStyle) =>
        updateObject(target.id, (o) => ({ ...o, style: s }) as Annotation)
    : setActiveStyle;
  const fill = target?.fill ?? activeFill;
  const setFill = target
    ? (f: boolean) =>
        updateObject(target.id, (o) => ({ ...o, fill: f }) as Annotation)
    : setActiveFill;

  const meta = TOOL_LABEL[tool];
  const Icon = meta?.icon;
  return (
    <>
      <Header
        icon={Icon ? <Icon className="w-3.5 h-3.5" strokeWidth={1.5} /> : undefined}
      >
        {target ? `Selected ${meta?.label}` : meta?.label ?? capitalize(tool)}
      </Header>

      <ColorRowCtl value={color} onChange={setColor} />
      <Divider />
      <StrokeWidthRowCtl value={strokeW} onChange={setStrokeW} color={color} />
      <Divider />
      <StyleRowCtl value={style} onChange={setStyle} />
      <Divider />
      <FillRowCtl value={fill} onChange={setFill} />
      <Divider />
      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Edits apply live to the selected shape."
          : <>Click and drag to draw. Hold <Kbd>⇧</Kbd> for a perfect square.</>}
      </p>
    </>
  );
}

function useBubbleController(target?: BubbleShape) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);

  const activeColor = useEditor((s) => s.activeColor);
  const setActiveColor = useEditor((s) => s.setActiveColor);

  const activeBubbleTextColor = useEditor((s) => s.activeBubbleTextColor);
  const setActiveBubbleTextColor = useEditor((s) => s.setActiveBubbleTextColor);
  const activeBubbleGradient = useEditor((s) => s.activeBubbleGradient);
  const setActiveBubbleGradient = useEditor((s) => s.setActiveBubbleGradient);
  const activeBubbleGradientTo = useEditor((s) => s.activeBubbleGradientTo);
  const setActiveBubbleGradientTo = useEditor(
    (s) => s.setActiveBubbleGradientTo
  );

  const activeBubbleBgColor = useEditor((s) => s.activeBubbleBgColor);
  const setActiveBubbleBgColor = useEditor((s) => s.setActiveBubbleBgColor);
  const activeBubbleBgGradient = useEditor((s) => s.activeBubbleBgGradient);
  const setActiveBubbleBgGradient = useEditor(
    (s) => s.setActiveBubbleBgGradient
  );
  const activeBubbleBgGradientTo = useEditor(
    (s) => s.activeBubbleBgGradientTo
  );
  const setActiveBubbleBgGradientTo = useEditor(
    (s) => s.setActiveBubbleBgGradientTo
  );

  const activeBubbleFontFamily = useEditor((s) => s.activeBubbleFontFamily);
  const setActiveBubbleFontFamily = useEditor(
    (s) => s.setActiveBubbleFontFamily
  );
  const activeBubbleFontSize = useEditor((s) => s.activeBubbleFontSize);
  const setActiveBubbleFontSize = useEditor((s) => s.setActiveBubbleFontSize);

  if (target) {
    const upd = (patch: Partial<BubbleShape>) =>
      updateObject(target.id, (o) => ({ ...(o as BubbleShape), ...patch }));
    const bgGradTo = target.bgGradient?.to ?? activeBubbleBgGradientTo;
    const txtGradTo = target.textGradient?.to ?? activeBubbleGradientTo;
    return {
      borderColor: target.color,
      setBorderColor: (c: string) => upd({ color: c }),
      bgColor: target.bgColor,
      setBgColor: (c: string) =>
        upd({
          bgColor: c,
          bgGradient: target.bgGradient ? { from: c, to: bgGradTo } : undefined,
        }),
      bgGradient: !!target.bgGradient,
      setBgGradient: (on: boolean) =>
        upd({
          bgGradient: on ? { from: target.bgColor, to: bgGradTo } : undefined,
        }),
      bgGradientTo: bgGradTo,
      setBgGradientTo: (c: string) =>
        upd({ bgGradient: { from: target.bgColor, to: c } }),
      textColor: target.textColor,
      setTextColor: (c: string) =>
        upd({
          textColor: c,
          textGradient: target.textGradient
            ? { from: c, to: txtGradTo }
            : undefined,
        }),
      textGradient: !!target.textGradient,
      setTextGradient: (on: boolean) =>
        upd({
          textGradient: on
            ? { from: target.textColor, to: txtGradTo }
            : undefined,
        }),
      textGradientTo: txtGradTo,
      setTextGradientTo: (c: string) =>
        upd({ textGradient: { from: target.textColor, to: c } }),
      fontFamily: target.fontFamily ?? activeBubbleFontFamily,
      setFontFamily: (f: FontFamilyId) => upd({ fontFamily: f }),
      fontSize: target.fontSize ?? activeBubbleFontSize,
      setFontSize: (n: number) => upd({ fontSize: n }),
    };
  }

  return {
    borderColor: activeColor,
    setBorderColor: setActiveColor,
    bgColor: activeBubbleBgColor,
    setBgColor: setActiveBubbleBgColor,
    bgGradient: activeBubbleBgGradient,
    setBgGradient: setActiveBubbleBgGradient,
    bgGradientTo: activeBubbleBgGradientTo,
    setBgGradientTo: setActiveBubbleBgGradientTo,
    textColor: activeBubbleTextColor,
    setTextColor: setActiveBubbleTextColor,
    textGradient: activeBubbleGradient,
    setTextGradient: setActiveBubbleGradient,
    textGradientTo: activeBubbleGradientTo,
    setTextGradientTo: setActiveBubbleGradientTo,
    fontFamily: activeBubbleFontFamily,
    setFontFamily: setActiveBubbleFontFamily,
    fontSize: activeBubbleFontSize,
    setFontSize: setActiveBubbleFontSize,
  };
}

function BubblePanel({ target }: { target?: BubbleShape }) {
  const ctrl = useBubbleController(target);

  return (
    <>
      <Header
        icon={<MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />}
      >
        {target ? "Selected Bubble" : "Bubble"}
      </Header>

      <Section title="Border">
        <SwatchRow value={ctrl.borderColor} onChange={ctrl.setBorderColor} />
      </Section>

      <Divider />

      <Section
        title="Background"
        right={
          <GradientToggle
            active={ctrl.bgGradient}
            onChange={ctrl.setBgGradient}
          />
        }
      >
        <SwatchRowExt value={ctrl.bgColor} onChange={ctrl.setBgColor} />
        {ctrl.bgGradient && (
          <>
            <div
              className="h-6 rounded-[6px] mt-2.5 border border-whisper-border"
              style={{
                background: `linear-gradient(135deg, ${ctrl.bgColor}, ${ctrl.bgGradientTo})`,
              }}
            />
            <div className="text-[10px] text-ash-gray mt-2.5 mb-1.5">To</div>
            <SwatchRowExt
              value={ctrl.bgGradientTo}
              onChange={ctrl.setBgGradientTo}
            />
          </>
        )}
      </Section>

      <Divider />

      <Section title="Font">
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => ctrl.setFontFamily(f.id)}
              className={cn(
                "h-12 rounded-[8px] border flex flex-col items-center justify-center gap-0 transition ease-calm duration-150 leading-none",
                ctrl.fontFamily === f.id
                  ? "border-ink-black bg-tool-hover"
                  : "border-whisper-border hover:bg-tool-hover"
              )}
              style={{ fontFamily: f.cssVar }}
            >
              <span className="text-[18px] text-ink-black leading-none">
                {f.sample}
              </span>
              <span
                className="text-[10px] text-ash-gray mt-0.5"
                style={{ fontFamily: "var(--font-suisseintl)" }}
              >
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      <Section title="Size">
        <div className="grid grid-cols-5 gap-1.5">
          {[14, 18, 24, 32, 48].map((s) => (
            <button
              key={s}
              onClick={() => ctrl.setFontSize(s)}
              className={cn(
                "h-9 rounded-[8px] border text-[12px] tabular-nums transition ease-calm duration-150",
                ctrl.fontSize === s
                  ? "border-ink-black bg-tool-hover text-ink-black"
                  : "border-whisper-border text-slate-gray hover:bg-tool-hover"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      <Section
        title="Text color"
        right={
          <GradientToggle
            active={ctrl.textGradient}
            onChange={ctrl.setTextGradient}
          />
        }
      >
        <SwatchRow value={ctrl.textColor} onChange={ctrl.setTextColor} />
        {ctrl.textGradient && (
          <>
            <div
              className="h-6 rounded-[6px] mt-2.5 mb-1 flex items-center justify-center font-serif text-[13px]"
              style={{
                backgroundImage: `linear-gradient(90deg, ${ctrl.textColor}, ${ctrl.textGradientTo})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              gradient text
            </div>
            <div className="text-[10px] text-ash-gray mt-2.5 mb-1.5">To</div>
            <SwatchRow
              value={ctrl.textGradientTo}
              onChange={ctrl.setTextGradientTo}
            />
          </>
        )}
      </Section>

      <Divider />

      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Edits apply live to the selected bubble."
          : "Drag a rectangle, type immediately. New bubbles use the styles above."}
      </p>
    </>
  );
}

function GradientToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      title={active ? "Use solid fill" : "Use gradient fill"}
      className={cn(
        "w-7 h-7 rounded-[8px] border flex items-center justify-center shrink-0 transition ease-calm duration-150",
        active
          ? "border-ink-black bg-tool-hover text-ink-black"
          : "border-whisper-border text-slate-gray hover:bg-tool-hover hover:text-ink-black"
      )}
    >
      <Blend className="w-3.5 h-3.5" strokeWidth={1.5} />
    </button>
  );
}

const BG_COLORS = [
  { name: "parchment", value: "#fffdf8" },
  { name: "cream", value: "#f7f5e7" },
  { name: "yellow", value: "#ffdd2a" },
  { name: "pink", value: "#fa3d63" },
  { name: "teal", value: "#05a291" },
  { name: "blue", value: "#01afee" },
  { name: "purple", value: "#7658ee" },
  { name: "navy", value: "#1c2b41" },
];

function SwatchRowExt({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {BG_COLORS.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          title={c.name}
          className="relative w-7 h-7 rounded-[8px] border border-ghost-border transition ease-calm duration-150 hover:scale-105"
          style={{ background: c.value }}
        >
          {value === c.value && (
            <span className="absolute -inset-[3px] rounded-[10px] border-[1.5px] border-ink-black pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
}

function SwatchRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {COLORS.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          title={c.name}
          className="relative w-7 h-7 rounded-[8px] border border-ghost-border transition ease-calm duration-150 hover:scale-105"
          style={{ background: c.value }}
        >
          {value === c.value && (
            <span className="absolute -inset-[3px] rounded-[10px] border-[1.5px] border-ink-black pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
}

function CounterPanel({ target }: { target?: CounterShape }) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);
  const removeObject = useEditor((s) => s.removeObject);
  const objects = useEditor((s) => s.objects);
  const activeColor = useEditor((s) => s.activeCounterColor);
  const setActiveColor = useEditor((s) => s.setActiveCounterColor);
  const activeSize = useEditor((s) => s.activeCounterSize);
  const setActiveSize = useEditor((s) => s.setActiveCounterSize);

  const color = target?.color ?? activeColor;
  const setColor = target
    ? (c: string) =>
        updateObject(target.id, (o) => ({ ...o, color: c }) as Annotation)
    : setActiveColor;
  const size = target?.size ?? activeSize;
  const setSize = target
    ? (n: number) =>
        updateObject(target.id, (o) => ({ ...o, size: n }) as Annotation)
    : setActiveSize;

  const counters = objects.filter((o) => o.type === "counter");

  return (
    <>
      <Header icon={<Hash className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        {target ? `Counter ${target.n}` : "Counter"}
      </Header>

      <ColorRowCtl value={color} onChange={setColor} />

      <Divider />

      <Section title="Size">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={16}
            max={56}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="flex-1 accent-petrol"
          />
          <span className="text-[13px] text-slate-gray w-10 text-right tabular-nums">
            {size}px
          </span>
        </div>
      </Section>

      {!target && counters.length > 0 && (
        <>
          <Divider />
          <button
            onClick={() => {
              for (const c of counters) removeObject(c.id);
            }}
            className="w-full h-9 rounded-[8px] border border-whisper-border text-[12px] text-slate-gray hover:bg-tool-hover transition ease-calm duration-150"
          >
            Clear all ({counters.length})
          </button>
        </>
      )}

      <Divider />

      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Edits apply live to the selected counter."
          : "Click anywhere to drop a numbered marker. Numbers auto-increment."}
      </p>
    </>
  );
}

function SpotlightPanel({ target }: { target?: SpotlightShape }) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);
  const activeShape = useEditor((s) => s.activeSpotShape);
  const setActiveShape = useEditor((s) => s.setActiveSpotShape);
  const activeDim = useEditor((s) => s.activeSpotDim);
  const setActiveDim = useEditor((s) => s.setActiveSpotDim);

  const shape = target?.shape ?? activeShape;
  const setShape = target
    ? (s: SpotShape) =>
        updateObject(target.id, (o) => ({ ...o, shape: s }) as Annotation)
    : setActiveShape;
  const dim = target?.dim ?? activeDim;
  const setDim = target
    ? (n: number) =>
        updateObject(target.id, (o) => ({ ...o, dim: n }) as Annotation)
    : setActiveDim;

  return (
    <>
      <Header icon={<Aperture className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        {target ? "Selected Spotlight" : "Spotlight"}
      </Header>

      <Section title="Shape">
        <div className="grid grid-cols-2 gap-2">
          {(["ellipse", "rect"] as SpotShape[]).map((s) => (
            <button
              key={s}
              onClick={() => setShape(s)}
              className={cn(
                "h-9 rounded-[8px] border text-[12px] capitalize transition ease-calm duration-150",
                shape === s
                  ? "border-ink-black bg-tool-hover text-ink-black"
                  : "border-whisper-border text-slate-gray hover:bg-tool-hover"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      <Section title="Dim">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.1}
            max={0.85}
            step={0.05}
            value={dim}
            onChange={(e) => setDim(Number(e.target.value))}
            className="flex-1 accent-petrol"
          />
          <span className="text-[13px] text-slate-gray w-12 text-right tabular-nums">
            {Math.round(dim * 100)}%
          </span>
        </div>
      </Section>

      <Divider />

      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Inside stays clear; outside is dimmed live."
          : "Drag a region to keep clear. Outside that region is dimmed for focus."}
      </p>
    </>
  );
}

function CropPanel() {
  return (
    <>
      <Header icon={<CropIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        Crop
      </Header>
      <p className="text-[13px] text-slate-gray leading-relaxed mt-3">
        Drag a rectangle over the screenshot to keep just that area.
        Pixels outside the rectangle are removed from the image. Annotations
        stay where they are.
      </p>
    </>
  );
}

function BlurPanel({ target }: { target?: BlurRect }) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);
  const activeBlur = useEditor((s) => s.activeBlur);
  const setActiveBlur = useEditor((s) => s.setActiveBlur);

  const intensity = target?.intensity ?? activeBlur;
  const setIntensity = target
    ? (n: number) =>
        updateObject(target.id, (o) => ({ ...o, intensity: n }) as Annotation)
    : setActiveBlur;

  return (
    <>
      <Header icon={<Droplet className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        {target ? "Selected Blur" : "Blur"}
      </Header>

      <Section title="Intensity">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={2}
            max={40}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="flex-1 accent-petrol"
          />
          <span className="text-[13px] text-slate-gray w-10 text-right tabular-nums">
            {intensity}px
          </span>
        </div>
      </Section>

      <Divider />

      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Edits apply live to the selected blur patch."
          : <>Drag a rectangle over anything you&rsquo;d like to obscure. Hold <Kbd>⇧</Kbd> for a square.</>}
      </p>
    </>
  );
}

const FONT_SIZES = [14, 18, 24, 32, 48];

function TextPanel({ target }: { target?: TextObj }) {
  const updateObject = useEditor((s) => s.updateObjectWithHistory);
  const activeFontFamily = useEditor((s) => s.activeFontFamily);
  const setActiveFontFamily = useEditor((s) => s.setActiveFontFamily);
  const activeFontSize = useEditor((s) => s.activeFontSize);
  const setActiveFontSize = useEditor((s) => s.setActiveFontSize);
  const activeColor = useEditor((s) => s.activeColor);
  const setActiveColor = useEditor((s) => s.setActiveColor);

  const fontFamily = target?.fontFamily ?? activeFontFamily;
  const setFontFamily = target
    ? (f: FontFamilyId) =>
        updateObject(target.id, (o) => ({ ...o, fontFamily: f }) as Annotation)
    : setActiveFontFamily;
  const fontSize = target?.fontSize ?? activeFontSize;
  const setFontSize = target
    ? (n: number) =>
        updateObject(target.id, (o) => ({ ...o, fontSize: n }) as Annotation)
    : setActiveFontSize;
  const color = target?.color ?? activeColor;
  const setColor = target
    ? (c: string) =>
        updateObject(target.id, (o) => ({ ...o, color: c }) as Annotation)
    : setActiveColor;

  return (
    <>
      <Header icon={<TypeIcon className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        {target ? "Selected Text" : "Text"}
      </Header>

      <Section title="Font">
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontFamily(f.id)}
              className={cn(
                "h-12 rounded-[8px] border flex flex-col items-center justify-center gap-0 transition ease-calm duration-150 leading-none",
                fontFamily === f.id
                  ? "border-ink-black bg-tool-hover"
                  : "border-whisper-border hover:bg-tool-hover"
              )}
              style={{ fontFamily: f.cssVar }}
            >
              <span className="text-[18px] text-ink-black leading-none">
                {f.sample}
              </span>
              <span
                className="text-[10px] text-ash-gray mt-0.5"
                style={{ fontFamily: "var(--font-suisseintl)" }}
              >
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      <Section title="Size">
        <div className="grid grid-cols-5 gap-1.5">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={cn(
                "h-9 rounded-[8px] border text-[12px] tabular-nums transition ease-calm duration-150",
                fontSize === s
                  ? "border-ink-black bg-tool-hover text-ink-black"
                  : "border-whisper-border text-slate-gray hover:bg-tool-hover"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      <ColorRowCtl value={color} onChange={setColor} />

      <Divider />

      <p className="text-[12px] text-ash-gray leading-relaxed">
        {target
          ? "Edits apply live to the selected text."
          : <>Click on the canvas to start typing. <Kbd>Esc</Kbd> commits. Empty text is removed.</>}
      </p>
    </>
  );
}

function EraserPanel() {
  return (
    <>
      <Header icon={<Eraser className="w-3.5 h-3.5" strokeWidth={1.5} />}>
        Eraser
      </Header>
      <p className="text-[13px] text-slate-gray leading-relaxed mt-3">
        Click or drag across any annotation to remove it. The screenshot
        itself is safe.
      </p>
    </>
  );
}

function ComingSoonPanel({ tool }: { tool: string }) {
  return (
    <div>
      <Header>{capitalize(tool)}</Header>
      <p className="text-[13px] text-slate-gray leading-relaxed mt-3">
        Coming next.
      </p>
    </div>
  );
}

/* ── primitives ────────────────────────────────────────── */

function Header({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-wider uppercase text-ash-gray mb-1 flex items-center gap-1.5">
        {icon}
        Active tool
      </div>
      <div className="font-serif text-[20px] text-ink-black">{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-wider uppercase text-ash-gray mb-2.5 flex items-center justify-between gap-2">
        <span>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-whisper-border" />;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-parchment border border-whisper-border text-ink-black leading-none">
      {children}
    </span>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
