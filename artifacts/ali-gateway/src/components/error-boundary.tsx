import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("ALI App error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center text-center p-8"
          style={{ background: "linear-gradient(135deg,#0a0a0f 0%,#001a0e 100%)" }}
        >
          <div
            className="text-5xl mb-6"
            style={{ filter: "drop-shadow(0 0 16px #d4af3780)" }}
          >
            ⚠️
          </div>
          <h1
            className="text-xl font-bold mb-3"
            style={{ color: "#d4af37", fontFamily: "Cairo, sans-serif" }}
          >
            حدث خطأ غير متوقع
          </h1>
          <p
            className="text-sm mb-6 opacity-60"
            style={{ color: "#e8d9a0", fontFamily: "Cairo, sans-serif" }}
          >
            يرجى إغلاق التطبيق وإعادة فتحه
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-full text-sm font-bold"
            style={{
              background: "linear-gradient(135deg,#d4af37,#b8960a)",
              color: "#0a0a0f",
              fontFamily: "Cairo, sans-serif",
            }}
          >
            إعادة التحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
