import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // jsPDF is ~300 KB — split it out so the main bundle stays fast.
          jspdf: ["jspdf"],
          // Vendor chunk for React + ReactDOM.
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});
