import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { TelegramProvider } from "@/lib/telegram";
import { ErrorBoundary } from "@/components/error-boundary";

import Splash from "@/pages/splash";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";             // Model 1 — classic
import DashboardModel2 from "@/pages/dashboard-model2"; // Model 2 — royal glassmorphism

import { CURRENT_MODEL } from "@/config/model";

console.log("[ALI] App Started — Telegram WebApp available:", !!window.Telegram?.WebApp);
console.log(`[ALI] Active model: ${CURRENT_MODEL}`);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(400 * (attempt + 1), 3000),
      staleTime: 120_000,
    },
  },
});

// Select dashboard component based on feature flag — no other code is affected
const DashboardComponent = CURRENT_MODEL === "model_2" ? DashboardModel2 : Dashboard;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={DashboardComponent} />
      <Route component={NotFound} />
    </Switch>
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
