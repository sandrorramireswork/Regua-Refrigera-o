// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolve } from "node:path";

const pkceBrowserPath = resolve(process.cwd(), "node_modules/pkce-challenge/dist/index.browser.js");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // @ts-expect-error Nitro supports alias in runtime config but package types have a constrained schema
    alias: {
      "pkce-challenge": pkceBrowserPath,
    },
  },
  vite: {
    resolve: {
      alias: {
        "pkce-challenge": pkceBrowserPath,
      },
    },
  },
});

