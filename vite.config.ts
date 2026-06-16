import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.VITE_HOST || "0.0.0.0";
  const port = Number(env.VITE_PORT || "5173");
  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_URL ||
    "http://localhost:5001";
  const hmrHost = env.VITE_HMR_HOST || undefined;
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT
    ? Number(env.VITE_HMR_CLIENT_PORT)
    : undefined;

  return {
    server: {
      host,
      port,
      strictPort: true,
      hmr:
        hmrHost || hmrClientPort
          ? {
              host: hmrHost,
              clientPort: hmrClientPort,
            }
          : undefined,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      mode === "development" &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
