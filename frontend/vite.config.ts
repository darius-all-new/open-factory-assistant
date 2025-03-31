import { defineConfig } from "vite";
import fs from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import type { ServerOptions } from "vite";

// Use path.join for cross-platform compatibility
const certsDir = path.join(__dirname, "..", "certs");
const keyPath = path.join(certsDir, "localhost-key.pem");
const certPath = path.join(certsDir, "localhost.pem");

// HTTPS configuration with error handling
const getHttpsConfig = (): ServerOptions["https"] => {
  try {
    // Ensure certs directory exists
    if (!fs.existsSync(certsDir)) {
      console.warn("Certs directory not found:", certsDir);
      return undefined;
    }

    // Check if cert files exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.warn("SSL certificates not found. Check that both files exist:", {
        keyPath,
        certPath,
      });
      return undefined;
    }

    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } catch (error) {
    console.error("Error loading SSL certificates:", error);
    return undefined;
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: getHttpsConfig(),
    port: 3001,
    host: "0.0.0.0",
  },
});
