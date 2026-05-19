import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { configureApi, configureApiNative, clearApiAuth } from "./api";
import { setAuthHeaders } from "@workspace/api-client-react";
import { isTelegramEnv, isNativeContext } from "./env";
import {
  hasValidNativeToken, getNativeToken, getNativeTelegramId,
  storeNativeToken, clearNativeToken,
} from "./native-auth";

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

interface WebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: string;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: string;
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
    setParams: (params: Record<string, unknown>) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  openTelegramLink: (url: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: WebApp };
  }
}

/** Minimal stub WebApp for native / dev contexts — UI calls are no-ops. */
function makeStubWebApp(userId: number, firstName: string): WebApp {
  return {
    initData: "",
    initDataUnsafe: { user: { id: userId, first_name: firstName } },
    version: "6.0",
    platform: "native",
    colorScheme: "dark",
    themeParams: {},
    isExpanded: true,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 800,
    viewportStableHeight: typeof window !== "undefined" ? window.innerHeight : 800,
    headerColor: "#000000",
    backgroundColor: "#000000",
    isClosingConfirmationEnabled: false,
    BackButton:  { isVisible: false, onClick: () => {}, offClick: () => {}, show: () => {}, hide: () => {} },
    MainButton:  {
      text: "", color: "", textColor: "", isVisible: false, isActive: false, isProgressVisible: false,
      setText: () => {}, onClick: () => {}, offClick: () => {}, show: () => {}, hide: () => {},
      enable: () => {}, disable: () => {}, showProgress: () => {}, hideProgress: () => {}, setParams: () => {},
    },
    HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} },
    ready: () => {}, expand: () => {}, close: () => {},
    enableClosingConfirmation: () => {}, disableClosingConfirmation: () => {},
    setHeaderColor: () => {}, setBackgroundColor: () => {}, setBottomBarColor: () => {},
    openTelegramLink: (url) => { window.open(url, "_blank"); },
    openLink: (url) => { window.open(url, "_blank"); },
  };
}

interface TelegramContextState {
  webApp?:         WebApp;
  user?:           TelegramUser;
  /** true when running in Capacitor native wrapper without Telegram */
  isNativeMode:    boolean;
  /** true when the user is authenticated (Telegram initData OR native JWT) */
  isAuthenticated: boolean;
  /** Called by NativeLoginScreen after successful code exchange */
  loginNative:     (token: string, telegramId: string) => void;
  /** Clears native JWT — forces re-login screen */
  logoutNative:    () => void;
}

const TelegramContext = createContext<TelegramContextState>({
  isNativeMode:    false,
  isAuthenticated: false,
  loginNative:     () => {},
  logoutNative:    () => {},
});

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  const [webApp,        setWebApp]        = useState<WebApp | undefined>();
  const [nativeUser,    setNativeUser]    = useState<TelegramUser | undefined>();
  const [authed,        setAuthed]        = useState(false);
  const native = isNativeContext();

  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;

    // ── Path 1: Running inside Telegram ──────────────────────────────────────
    if (isTelegramEnv() && tgApp) {
      const userId = String(tgApp.initDataUnsafe.user!.id);
      configureApi(userId, tgApp.initData);
      setAuthHeaders({
        "x-telegram-id":        userId,
        "x-telegram-init-data": tgApp.initData,
      });
      setWebApp(tgApp);
      setAuthed(true);
      try { tgApp.enableClosingConfirmation(); } catch { /* unsupported */ }
      try {
        const BG = "#001a10";
        tgApp.setHeaderColor(BG);
        tgApp.setBackgroundColor(BG);
        if (typeof (tgApp as unknown as Record<string, unknown>).setBottomBarColor === "function")
          tgApp.setBottomBarColor(BG);
      } catch { /* unsupported */ }
      return;
    }

    // ── Path 2: Native Capacitor context ─────────────────────────────────────
    if (native) {
      console.log("[ALI] Native mode — checking stored JWT");
      if (hasValidNativeToken()) {
        const jwt = getNativeToken()!;
        const tid = getNativeTelegramId()!;
        configureApiNative(jwt);
        const user: TelegramUser = {
          id:         Number(tid),
          first_name: "User",
        };
        setNativeUser(user);
        setWebApp(makeStubWebApp(Number(tid), "User"));
        setAuthed(true);
      } else {
        // No valid JWT — NativeAuthGate will show login screen
        setAuthed(false);
      }
      return;
    }

    // ── Path 3: Browser dev / preview fallback ────────────────────────────────
    console.warn("[ALI] Telegram WebApp is not available — using dev mock");
    setWebApp(makeStubWebApp(123456789, "Test User"));
    setAuthed(true);
  }, [native]);

  const loginNative = useCallback((token: string, telegramId: string) => {
    storeNativeToken(token, telegramId);
    configureApiNative(token);
    const user: TelegramUser = { id: Number(telegramId), first_name: "User" };
    setNativeUser(user);
    setWebApp(makeStubWebApp(Number(telegramId), "User"));
    setAuthed(true);
  }, []);

  const logoutNative = useCallback(() => {
    clearNativeToken();
    clearApiAuth();
    setNativeUser(undefined);
    setWebApp(undefined);
    setAuthed(false);
  }, []);

  const user = webApp?.initDataUnsafe?.user ?? nativeUser;

  return (
    <TelegramContext.Provider value={{
      webApp,
      user,
      isNativeMode:    native,
      isAuthenticated: authed,
      loginNative,
      logoutNative,
    }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
