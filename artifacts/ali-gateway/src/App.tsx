import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { TelegramProvider } from "@/lib/telegram";
import { ErrorBoundary } from "@/components/error-boundary";
import { ModelLoadingFallback } from "@/components/model-loading-fallback";
import { DevModelSwitcher } from "@/components/dev-model-switcher";
import Splash from "@/pages/splash";
import Onboarding from "@/pages/onboarding";

import { ACTIVE_MODEL } from "@/config/model";

// ── عزل النماذج: Dynamic Import يضمن أن النموذج غير النشط لا يُحمَّل أبداً ──
// Rollup/Vite ينشئ chunk منفصل لكل نموذج — المستخدم يحمّل chunk النموذج النشط
// فقط عند التنقل إلى /dashboard، مما يحسن وقت التحميل الأولي ويمنع تنفيذ
// أي كود للنموذج الآخر.
const DashboardComponent =
  ACTIVE_MODEL === "MODEL_2"
    ? lazy(() => import("@/pages/dashboard-model2"))
    : lazy(() => import("@/pages/dashboard"));

console.log(`[ALI] Active model: ${ACTIVE_MODEL}`);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // Exponential backoff: 800ms → 3.2s → max 8s
      retryDelay: (attempt) => Math.min(800 * Math.pow(2, attempt), 8_000),
      // Keep cached data for 3 minutes before re-fetching (helps on weak connections)
      staleTime: 180_000,
      // Keep data in memory for 10 minutes even if component unmounts
      gcTime: 600_000,
      // Don't re-fetch on window focus — reduces unnecessary requests on Telegram Mini App
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TelegramProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
            <DevModelSwitcher />
          </TelegramProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
