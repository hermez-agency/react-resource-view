import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/setup" → src/setup.ts, as tsconfig.json's paths say.
    alias: { "@": "/src" },
  },
})
