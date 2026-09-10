import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
const commit = execSync("git rev-parse HEAD").toString().trim();
const dirty = Boolean(execSync("git status --porcelain").toString().trim());
export default defineConfig({
  plugins: [react()],
  define: {
    __CODE_COMMIT__: JSON.stringify(commit),
    __CODE_DIRTY__: JSON.stringify(dirty),
  },
});
