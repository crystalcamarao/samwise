import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app is served from the tablet's local Termux server at localhost, which is
// a secure context so Web Bluetooth (printing) and the camera both work.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
  },
  preview: {
    host: true,
    port: 8080,
  },
});
