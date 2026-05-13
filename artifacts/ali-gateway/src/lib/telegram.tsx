import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { configureApi } from "./api";
import { setAuthHeaders } from "@workspace/api-client-react";

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
    setParams: (params: Record<string, any>) => void;
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
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

interface TelegramContextState {
  webApp?: WebApp;
  user?: TelegramUser;
}

const TelegramContext = createContext<TelegramContextState>({});

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  const [webApp, setWebApp] = useState<WebApp | undefined>();

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      app.enableClosingConfirmation();
      const userId = String(app.initDataUnsafe?.user?.id ?? "");
      configureApi(userId, app.initData);
      // Propagate auth headers to the generated API client fetcher
      const authHeaders: Record<string, string> = {};
      if (userId)         authHeaders["x-telegram-id"]        = userId;
      if (app.initData)   authHeaders["x-telegram-init-data"] = app.initData;
      setAuthHeaders(authHeaders);
      setWebApp(app);
    } else {
      console.warn("Telegram WebApp is not available.");
      // Fallback mock user for local development outside Telegram
      setWebApp({
        initData: "",
        initDataUnsafe: {
          user: {
            id: 123456789,
            first_name: "Test",
            last_name: "User",
            username: "testuser",
          },
        },
        version: "6.0",
        platform: "unknown",
        colorScheme: "dark",
        themeParams: {},
        isExpanded: true,
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        headerColor: "#000000",
        backgroundColor: "#000000",
        isClosingConfirmationEnabled: false,
        BackButton: { isVisible: false, onClick: () => {}, offClick: () => {}, show: () => {}, hide: () => {} },
        MainButton: { text: "", color: "", textColor: "", isVisible: false, isActive: false, isProgressVisible: false, setText: () => {}, onClick: () => {}, offClick: () => {}, show: () => {}, hide: () => {}, enable: () => {}, disable: () => {}, showProgress: () => {}, hideProgress: () => {}, setParams: () => {} },
        HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {}, selectionChanged: () => {} },
        ready: () => {},
        expand: () => {},
        close: () => {},
        enableClosingConfirmation: () => {},
        disableClosingConfirmation: () => {},
      });
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ webApp, user: webApp?.initDataUnsafe?.user }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
