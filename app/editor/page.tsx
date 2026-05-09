import { Topbar } from "@/components/editor/Topbar";
import { Toolbar } from "@/components/editor/Toolbar";
import { Canvas } from "@/components/editor/Canvas";
import { RightPanel } from "@/components/editor/RightPanel";
import { ZoomControl } from "@/components/editor/ZoomControl";
import { KeyboardShortcuts } from "@/components/editor/KeyboardShortcuts";

export default function EditorPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-parchment">
      <KeyboardShortcuts />
      <Topbar />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative flex">
          <Toolbar />
          <Canvas />
          <ZoomControl />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
