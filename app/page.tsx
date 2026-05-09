import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-auto bg-parchment">
      <nav className="flex items-center justify-between px-10 py-6 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3">
          <img 
            src="/editss/logo.png" 
            alt="editss logo" 
            className="w-8 h-8 object-contain" 
          />
          <span className="font-serif text-[18px] text-ink-black">editss</span>
        </div>
        <div className="flex items-center gap-8 text-[14px]">
          <a className="text-ink-black hover:underline underline-offset-8 decoration-whisper-border">
            features
          </a>
          <a className="text-ink-black hover:underline underline-offset-8 decoration-whisper-border">
            shortcuts
          </a>
          <a className="text-ink-black hover:underline underline-offset-8 decoration-whisper-border">
            about
          </a>
          <Link
            href="/editor"
            className="px-[23px] py-[15px] rounded-[10px] border border-ghost-border text-ink-black text-[14px] hover:bg-tool-hover transition ease-calm duration-150"
          >
            open editor
          </Link>
        </div>
      </nav>

      <section className="max-w-[860px] mx-auto px-10 pt-20 pb-32 text-center flex flex-col items-center">
        <img 
          src="/editss/logo.png" 
          alt="editss logo" 
          className="w-20 h-20 object-contain mb-8 hover:scale-105 transition-transform duration-300" 
        />
        <p className="text-ash-gray text-[14px] tracking-wide uppercase mb-6">
          screenshot editor · no upload · all local
        </p>
        <h1 className="font-serif text-[64px] leading-[1.05] text-ink-black mb-8 tracking-tight">
          edit screenshots
          <br />
          <span className="text-petrol">in seconds.</span>
        </h1>
        <p className="text-slate-gray text-[18px] leading-[1.6] max-w-[560px] mx-auto mb-12">
          drop a screenshot, blur the secrets, draw the arrows, save it.
          calm canvas, sharp tools, nothing leaves your browser.
        </p>
        <Link
          href="/editor"
          className="inline-flex items-center gap-2 px-7 py-4 rounded-[10px] bg-petrol text-parchment text-[15px] hover:opacity-95 transition ease-calm duration-150"
        >
          try the editor
          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </Link>
      </section>

      <section className="max-w-[1100px] mx-auto px-10 pb-32 grid grid-cols-3 gap-6">
        {[
          {
            t: "drop or paste",
            d: "drag a screenshot in or hit ⌘V. nothing uploads — your image lives in the tab.",
          },
          {
            t: "calm tools",
            d: "blur, arrow, text, bubble, freehand. one accent color, restrained palette, no clutter.",
          },
          {
            t: "save and gone",
            d: "⌘S downloads a PNG. ⌘C copies to clipboard. close the tab and it's done.",
          },
        ].map((f) => (
          <div
            key={f.t}
            className="rounded-[10px] border border-whisper-border p-5 bg-parchment"
          >
            <h3 className="font-serif text-[24px] text-ink-black mb-2">
              {f.t}
            </h3>
            <p className="text-slate-gray text-[15px] leading-[1.55]">{f.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
