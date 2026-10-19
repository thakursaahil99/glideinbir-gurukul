// Copies Monaco's prebuilt files into public/ so the code editor loads from our own
// origin instead of a CDN. Runs on install, dev and build; the output is git-ignored.
import { cpSync, existsSync } from "node:fs";

const from = "node_modules/monaco-editor/min/vs";
const to = "public/monaco/vs";
if (!existsSync(from)) {
  console.warn("[copy-monaco] monaco-editor is not installed, skipping");
} else if (!existsSync(`${to}/loader.js`)) {
  cpSync(from, to, { recursive: true });
  console.log("[copy-monaco] copied Monaco to public/monaco");
}
