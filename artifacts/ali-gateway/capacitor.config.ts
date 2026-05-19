import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the ALI Digital Gateway native apps (Android & iOS).
 *
 * Architecture notes:
 *
 * server.url is set to the production Replit Autoscale domain so that BOTH the web
 * app assets AND all API calls (`/api/...`) resolve to the same hosted origin.
 * This means:
 *   - No offline bundling is needed — updates to the web app instantly reach native users
 *   - CORS is never an issue (same origin)
 *   - Capacitor injects `window.Capacitor` even when using a remote URL, so
 *     `isNativePlatform()` returns true and the JWT auth path is used instead of
 *     Telegram initData
 *
 * To build with bundled assets instead (offline-capable), remove server.url and run
 * `pnpm --filter @workspace/ali-gateway run build && npx cap sync` before opening in
 * Android Studio / Xcode.
 */
const config: CapacitorConfig = {
  appId:   "com.ali.digitalgateway",
  appName: "ALI.MDD",

  // Points to the Vite build output — used when server.url is removed for offline builds
  webDir: "dist/public",

  server: {
    // Production URL: both web assets and /api/* calls resolve here
    url:        "https://secret-manager-alawiteliberati.replit.app",
    cleartext:  false, // HTTPS only — no plaintext HTTP allowed
  },

  android: {
    // Matches the dark background colour used throughout the app
    backgroundColor:           "#0b0b14",
    // Allow the web content to draw behind the status bar
    adjustMarginsForEdgeToEdge: true,
    // Mixed content is not needed (everything is HTTPS)
    allowMixedContent:          false,
  },

  ios: {
    backgroundColor:      "#0b0b14",
    // Scroll elasticity gives a more native feel
    scrollEnabled:        true,
    contentInset:         "always",
    // Limites WebView to HTTPS (ATS compliance)
    limitsNavigationsToAppBoundDomains: true,
  },

  plugins: {
    // Deep-link handling: allow the app to open t.me links internally if needed
    App: {
      launchUrl: "https://secret-manager-alawiteliberati.replit.app",
    },
  },
};

export default config;
