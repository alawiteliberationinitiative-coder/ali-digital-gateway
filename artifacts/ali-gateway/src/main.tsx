import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── أول شيء: أخبر Telegram أن التطبيق محمّل ──────────────────────────────────
// يجب استدعاؤها قبل React لإخفاء شاشة تحميل Telegram الأصلية فوراً
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

console.log(
  "[ALI] Boot —",
  "Telegram:", !!window.Telegram?.WebApp,
  "| initData:", !!(window.Telegram?.WebApp?.initData),
  "| user:", !!(window.Telegram?.WebApp?.initDataUnsafe?.user),
);

createRoot(document.getElementById("root")!).render(<App />);
