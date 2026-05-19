import { lazy, Suspense, ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { TelegramProvider, useTelegram } from "@/lib/telegram";
import { ErrorBoundary } from "@/components/error-boundary";
import { ModelLoadingFallback } from "@/components/model-loading-fallback";
import { DevModelSwitcher } from "@/components/dev-model-switcher";
import Splash from "@/pages/splash";
import Onboarding from "@/pages/onboarding";
import NativeLoginScreen from "@/pages/NativeLoginScreen";

import { ACTIVE_MODEL } from "@/config/model";

const DashboardComponent =
  ACTIVE_MODEL === "MODEL_2"
    ? lazy(() => import("@/pages/dashboard-model2"))
    : lazy(() => import("@/pages/dashboard"));

console.log(`[ALI] Active model: ${ACTIVE_MODEL}`);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(800 * Math.pow(2, attempt), 8_000),
      staleTime: 180_000,
      gcTime: 600_000,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Suspense fallback={<ModelLoadingFallback />}>
      <Switch>
        <Route path="/" component={Splash} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/dashboard" component={DashboardComponent} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/**
 * In native (Capacitor) context, show the login screen until the user has
 * authenticated via a one-time code from the Telegram bot. In Telegram and
 * dev/browser contexts this gate is transparent.
 */
function NativeAuthGate({ children }: { children: ReactNode }) {
  const { isNativeMode, isAuthenticated } = useTelegram();
  if (isNativeMode && !isAuthenticated) {
    return <NativeLoginScreen />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TelegramProvider>
            <NativeAuthGate>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </NativeAuthGate>
            <Toaster />
            <DevModelSwitcher />
          </TelegramProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
