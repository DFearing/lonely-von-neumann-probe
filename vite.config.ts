import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/lonely-von-neumann-probe/",
  plugins: [react()],
  build: {
    outDir: "dist",
    target: "es2022",
  },
});
