/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Math Master",
        short_name: "Math Master",
        description: "Math practice for kids, with combos, goals and a parent dashboard.",
        theme_color: "#6d28d9",
        background_color: "#faf5ff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Precache is what every install downloads on first run, so the parent
        // dashboard stays out of it and is fetched the first time a parent
        // actually opens it — then kept, because the second visit is usually
        // from the same laptop.
        // The admin page likewise: only the owner ever opens it.
        globIgnores: ["**/parent-*.js", "**/admin-*.js"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/parent-[^/]+\.js$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "parent-dashboard" },
          },
        ],
        // The Convex websocket must never be intercepted by the service worker;
        // offline durability is handled by the Dexie outbox, not by caching.
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        /**
         * Split so that a deploy re-downloads only what changed.
         *
         * One 730 KiB bundle meant every push to the game re-sent React,
         * Convex and the animation runtime with it. These three barely change
         * between releases, so as their own chunks they stay in the browser
         * cache and on the CDN edge across deploys — and the dashboard's chunk
         * is never sent to a child's tablet at all.
         */
        manualChunks(id: string) {
          if (id.includes("/src/parent/")) return "parent";
          // A stable name, so the precache can leave the owner's page out.
          if (id.includes("/src/admin/")) return "admin";
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id))
            return "react";
          if (id.includes("node_modules/convex")) return "convex";
          if (id.includes("node_modules/motion")) return "motion";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@convex": fileURLToPath(new URL("./convex", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
