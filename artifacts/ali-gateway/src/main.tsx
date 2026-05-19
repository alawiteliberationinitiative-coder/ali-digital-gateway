import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── التقاط حدث تثبيت PWA مبكراً قبل React ────────────────────────────────────
// يُخزَّن على window حتى تتمكن أي مكوّن من استخدامه لاحقاً
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as Window & { __pwaPrompt?: BeforeInstallPromptEvent })
    .__pwaPrompt = e as BeforeInstallPromptEvent;
});

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
