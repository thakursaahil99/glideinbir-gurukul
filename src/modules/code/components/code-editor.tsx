"use client";

import Editor, { loader, type Monaco, type OnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Served from our own origin (copied by scripts/copy-monaco.mjs), never a CDN. The URL must
// be absolute: Monaco's web workers can't resolve a root-relative path.
if (typeof window !== "undefined") loader.config({ paths: { vs: `${window.location.origin}/monaco/vs` } });

function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme("gurukul-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7d7a9c", fontStyle: "italic" },
      { token: "keyword", foreground: "c792ff" },
      { token: "string", foreground: "7ddc5a" },
      { token: "number", foreground: "ffb86b" },
    ],
    colors: {
      "editor.background": "#0f0d26",
      "editor.lineHighlightBackground": "#1b1840",
      "editorLineNumber.foreground": "#4b4870",
      "editorLineNumber.activeForeground": "#a8a4d8",
      "editor.selectionBackground": "#5b47ff55",
      "editorCursor.foreground": "#2ee6c5",
    },
  });
  monaco.editor.defineTheme("gurukul-light", { base: "vs", inherit: true, rules: [], colors: { "editor.background": "#ffffff" } });
}

const isDark = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");

export function CodeEditor({ value, onChange, language, height = "100%", onRun, onSubmit, readOnly }: { value: string; onChange: (v: string) => void; language: string; height?: string; onRun?: () => void; onSubmit?: () => void; readOnly?: boolean }) {
  const [theme, setTheme] = useState("gurukul-dark");
  // Latest handlers for the keyboard shortcuts (registered once on mount).
  const handlers = useRef({ onRun, onSubmit });
  useEffect(() => {
    handlers.current = { onRun, onSubmit };
  }, [onRun, onSubmit]);

  // Follow the app's light/dark toggle.
  useEffect(() => {
    const sync = () => setTheme(isDark() ? "gurukul-dark" : "gurukul-light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const mount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => handlers.current.onRun?.());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => handlers.current.onSubmit?.());
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={theme}
      beforeMount={defineThemes}
      onMount={mount}
      onChange={(v) => onChange(v ?? "")}
      loading={
        <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Loading editor…
        </div>
      }
      options={{
        readOnly,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 14, bottom: 14 },
        tabSize: 4,
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        renderLineHighlight: "all",
        wordWrap: "off",
      }}
    />
  );
}
