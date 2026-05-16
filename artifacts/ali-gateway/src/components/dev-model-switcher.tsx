/**
 * زر تبديل النموذج العائم — يظهر في بيئة التطوير (Replit) فقط.
 * في الإنتاج (Publishing) يُزال تلقائياً من الكود ولا يظهر للمستخدمين.
 */
import { ACTIVE_MODEL, DEV_STORAGE_KEY } from "@/config/model";

export function DevModelSwitcher() {
  if (!import.meta.env.DEV) return null;

  const isModel2 = ACTIVE_MODEL === "MODEL_2";

  function switchModel() {
    localStorage.setItem(DEV_STORAGE_KEY, isModel2 ? "MODEL_1" : "MODEL_2");
    window.location.reload();
  }

  return (
    <button
      onClick={switchModel}
      title={`التبديل إلى ${isModel2 ? "النموذج الأول" : "النموذج الثاني"}`}
      style={{
        position: "fixed",
        bottom: 88,
        left: 12,
        zIndex: 99999,
        background: isModel2
          ? "linear-gradient(135deg,#1a3a2a,#0d2018)"
          : "linear-gradient(135deg,#d4af37,#b8960a)",
        color: isModel2 ? "#d4af37" : "#0a0a0f",
        border: isModel2 ? "1.5px solid #d4af3760" : "none",
        borderRadius: 28,
        padding: "9px 13px",
        fontSize: 11,
        fontWeight: "bold",
        fontFamily: "Cairo, sans-serif",
        cursor: "pointer",
        boxShadow: isModel2
          ? "0 4px 18px rgba(212,175,55,0.25)"
          : "0 4px 18px rgba(212,175,55,0.50)",
        direction: "rtl",
        display: "flex",
        alignItems: "center",
        gap: 5,
        lineHeight: 1,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: 13 }}>⚡</span>
      {isModel2 ? "تجربة النموذج ١" : "تجربة النموذج ٢"}
    </button>
  );
}
