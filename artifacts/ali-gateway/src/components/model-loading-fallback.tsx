/**
 * شاشة التحميل المؤقتة التي تظهر أثناء تحميل النموذج النشط (Lazy chunk).
 * تتطابق مع ألوان النموذج الثاني لتجنب الوميض المرئي.
 */
export function ModelLoadingFallback() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #020e04 0%, #061409 50%, #020e04 100%)",
      }}
    >
      <style>{`
        @keyframes ali-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "3px solid rgba(212,175,55,0.15)",
          borderTopColor: "#d4af37",
          animation: "ali-spin 0.75s linear infinite",
        }}
      />
    </div>
  );
}
