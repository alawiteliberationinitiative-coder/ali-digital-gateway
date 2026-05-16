import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { TelegramProvider } from "@/lib/telegram";
import { ErrorBoundary } from "@/components/error-boundary";
import { ModelLoadingFallback } from "@/components/model-loading-fallback";
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
      retryDelay: (attempt) => Math.min(400 * (attempt + 1), 3000),
      staleTime: 120_000,
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
          </TelegramProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
