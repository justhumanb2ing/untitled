import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { intlayer, intlayerProxy } from "vite-intlayer";

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd());

  return {
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    build: {
      sourcemap: config.mode === "production",
      rollupOptions: config.isSsrBuild
        ? { input: "./server/app.ts" }
        : undefined,
    },
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      intlayer(),
      intlayerProxy(),
    ],
  };
});
