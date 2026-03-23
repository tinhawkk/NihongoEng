import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Custom Vite plugin that mimics the Vercel /api/sheets serverless function
 * so that local dev can talk to Google Apps Script without CORS issues.
 */
function localSheetsProxy() {
  let webAppUrl = "";
  let webAppSecret = "";

  return {
    name: "local-sheets-proxy",
    configResolved() {
      webAppUrl =
        process.env.SHEETS_WEBAPP_URL ||
        process.env.VITE_WEBAPP_URL ||
        "";
      webAppSecret =
        process.env.SHEETS_API_SECRET ||
        process.env.VITE_WEBAPP_SECRET ||
        "";
      console.log("[proxy] WebApp URL configured:", webAppUrl ? "✅" : "❌ MISSING");
    },
    configureServer(server) {
      // IMPORTANT: must use server.middlewares.use with full path matching
      server.middlewares.use(async (req, res, next) => {
        // Only intercept /api/sheets requests
        if (!req.url || !req.url.startsWith("/api/sheets")) {
          return next();
        }

        if (!webAppUrl) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "SHEETS_WEBAPP_URL not configured" }));
          return;
        }

        try {
          if (req.method === "GET") {
            // Parse the full URL including query string
            const fullUrl = new URL(req.url, "http://localhost");
            const action = fullUrl.searchParams.get("action") || "list";
            const sheetName = fullUrl.searchParams.get("sheetName") || "";

            const sep = webAppUrl.includes("?") ? "&" : "?";
            const target = `${webAppUrl}${sep}action=${encodeURIComponent(action)}${sheetName ? "&sheetName=" + encodeURIComponent(sheetName) : ""}`;

            console.log("[proxy] GET →", target);
            const response = await fetch(target, {
              method: "GET",
              redirect: "follow",
            });
            const text = await response.text();
            console.log("[proxy] GET response:", response.status, text.slice(0, 200));

            res.statusCode = response.ok ? 200 : 502;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(text);
            return;
          }

          if (req.method === "POST") {
            // Read request body
            const bodyChunks = [];
            await new Promise((resolve, reject) => {
              req.on("data", (chunk) => bodyChunks.push(chunk));
              req.on("end", resolve);
              req.on("error", reject);
            });
            const bodyStr = Buffer.concat(bodyChunks).toString("utf-8");

            let payload = {};
            try {
              payload = JSON.parse(bodyStr);
            } catch (e) {
              // Ignore parse error, use empty object
            }
            // Inject secret server-side (same as Vercel function)
            payload.secret = webAppSecret;

            console.log("[proxy] POST →", webAppUrl, "action:", payload.action, "user:", payload.user?.Username);
            const response = await fetch(webAppUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              redirect: "follow",
            });
            const text = await response.text();
            console.log("[proxy] POST response:", response.status, text.slice(0, 300));

            res.statusCode = response.ok ? 200 : 502;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(text);
            return;
          }

          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 204;
            res.end();
            return;
          }

          // Other methods
          res.statusCode = 405;
          res.end("Method Not Allowed");
        } catch (err) {
          console.error("[proxy] Error:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ prefixed ones like SHEETS_WEBAPP_URL)
  const env = loadEnv(mode, process.cwd(), "");
  // Inject into process.env so the plugin can read them
  process.env.SHEETS_WEBAPP_URL = env.SHEETS_WEBAPP_URL || "";
  process.env.SHEETS_API_SECRET = env.SHEETS_API_SECRET || "";
  process.env.VITE_WEBAPP_URL = env.VITE_WEBAPP_URL || "";
  process.env.VITE_WEBAPP_SECRET = env.VITE_WEBAPP_SECRET || "";

  return {
    plugins: [react(), localSheetsProxy()],
    build: {
      rollupOptions: {
        external: [],
      },
    },
  };
});
