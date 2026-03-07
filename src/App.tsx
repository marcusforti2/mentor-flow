import { lazy, Suspense, useEffect, type ReactNode, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { useRouteChunkPrefetch } from "@/hooks/useRouteChunkPrefetch";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { Loader2 } from "lucide-react";

/**
 * Lazy import with automatic retry (up to 3 attempts).
 * Prevents stuck pages when a chunk fails to load due to network issues.
 */
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((err: Error) => {
            if (remaining <= 1) {
              reject(err);
              return;
            }
            setTimeout(() => attempt(remaining - 1), interval);
          });
      };
      attempt(retries);
    })
  );
}

// Public Pages
import Index from "./pages/Index";
const Auth = lazyRetry(() => import("./pages/Auth"));

// Lazy-loaded pages
// Setup page removed — legacy initial configuration no longer needed
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Onboarding = lazyRetry(() => import("./pages/Onboarding"));
const ShowcasePage = lazyRetry(() => import("./pages/ShowcasePage"));
const TenantLandingPage = lazyRetry(() => import("./pages/TenantLandingPage"));
const TenantAuthPage = lazyRetry(() => import("./pages/TenantAuthPage"));
const PublicPlaybookPage = lazyRetry(() => import("./pages/PublicPlaybookPage"));
const PublicFormPage = lazyRetry(() => import("./pages/PublicFormPage"));
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyRetry(() => import("./pages/TermsOfService"));

// Layouts (keep static - structural)
import { MasterLayout } from "@/components/layouts/MasterLayout";
import { MentorLayout } from "@/components/layouts/MentorLayout";
import { MentoradoLayout } from "@/components/layouts/MentoradoLayout";

// Master Pages
const MasterDashboard = lazyRetry(() => import("./pages/master/MasterDashboard"));
const PreviewPage = lazyRetry(() => import("./pages/master/PreviewPage"));
const TenantsPage = lazyRetry(() => import("./pages/master/TenantsPage"));
const UsersPage = lazyRetry(() => import("./pages/master/UsersPage"));

const ConfigPage = lazyRetry(() => import("./pages/master/ConfigPage"));
const BrandingPage = lazyRetry(() => import("./pages/master/BrandingPage"));
const DomainsPage = lazyRetry(() => import("./pages/master/DomainsPage"));

// Admin/Mentor Pages
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));
const Mentorados = lazyRetry(() => import("./pages/admin/Mentorados"));
const JornadaCS = lazyRetry(() => import("./pages/admin/JornadaCS"));
const AdminTrilhas = lazyRetry(() => import("./pages/admin/Trilhas"));
const DevTools = lazyRetry(() => import("./pages/admin/DevTools"));
const PropriedadeIntelectual = lazyRetry(() => import("./pages/admin/PropriedadeIntelectual"));
const EmailMarketing = lazyRetry(() => import("./pages/admin/EmailMarketing"));
const Calendario = lazyRetry(() => import("./pages/admin/Calendario"));
const CRMMentorados = lazyRetry(() => import("./pages/admin/CRMMentorados"));
const Relatorios = lazyRetry(() => import("./pages/admin/Relatorios"));
const MentorPerfil = lazyRetry(() => import("./pages/admin/MentorPerfil"));
const AdminCentroSOS = lazyRetry(() => import("./pages/admin/CentroSOS"));
// Agendamento removed — merged into Calendario
const PlaybooksHub = lazyRetry(() => import("./pages/admin/PlaybooksHub"));
const PlaybookEditorPage = lazyRetry(() => import("./pages/admin/PlaybookEditorPage"));
const MentoradoDetail = lazyRetry(() => import("./pages/admin/MentoradoDetail"));
const Automacoes = lazyRetry(() => import("./pages/admin/Automacoes"));
const Popups = lazyRetry(() => import("./pages/admin/Popups"));
const WhatsAppCampaigns = lazyRetry(() => import("./pages/admin/WhatsAppCampaigns"));
const FormulariosPage = lazyRetry(() => import("./pages/admin/OnboardingBuilder"));


// Member Pages
const MemberDashboard = lazyRetry(() => import("./pages/member/MemberDashboard"));
const Trilhas = lazyRetry(() => import("./pages/member/Trilhas"));
const MeuCRM = lazyRetry(() => import("./pages/member/MeuCRM"));
const CentroSOS = lazyRetry(() => import("./pages/member/CentroSOS"));
const Perfil = lazyRetry(() => import("./pages/member/Perfil"));
const FerramentasIA = lazyRetry(() => import("./pages/member/FerramentasIA"));
const CalendarioMembro = lazyRetry(() => import("./pages/member/Calendario"));
const MeusArquivos = lazyRetry(() => import("./pages/member/MeusArquivos"));
const MinhasTarefas = lazyRetry(() => import("./pages/member/MinhasTarefas"));
// AgendamentoMembro removed — merged into CalendarioMembro
const MentoradoPlaybooks = lazyRetry(() => import("./pages/member/Playbooks"));
const MentoradoMetricas = lazyRetry(() => import("./pages/member/Metricas"));
const CRMMobile = lazyRetry(() => import("./pages/member/CRMMobile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on tab focus — reduces network churn
      retry: 1, // Single retry instead of 3 — faster failure feedback
    },
  },
});

// Export for use in auth hooks to invalidate cache on login/logout
export { queryClient };

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function RouteFallback({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  useRouteChunkPrefetch();

  return (
    <>
      <ScrollToTop />
      <ImpersonationBanner />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<RouteFallback><Auth /></RouteFallback>} />
        <Route path="/onboarding" element={<RouteFallback><Onboarding /></RouteFallback>} />
        <Route path="/setup" element={<Navigate to="/auth" replace />} />
        <Route path="/showcase" element={<RouteFallback><ShowcasePage /></RouteFallback>} />
        <Route path="/t/:slug" element={<RouteFallback><TenantLandingPage /></RouteFallback>} />
        <Route path="/login/:tenantSlug" element={<RouteFallback><TenantAuthPage /></RouteFallback>} />
        <Route path="/p/:slug" element={<RouteFallback><PublicPlaybookPage /></RouteFallback>} />
        <Route path="/f/:slug" element={<RouteFallback><PublicFormPage /></RouteFallback>} />
        <Route
          path="/crm-mobile"
          element={
            <RouteFallback>
              <ProtectedRoute allowedRoles={['master_admin', 'admin', 'ops', 'mentor', 'mentee']}>
                <CRMMobile />
              </ProtectedRoute>
            </RouteFallback>
          }
        />

        {/* Master Admin Routes */}
        <Route
          path="/master"
          element={
            <ProtectedRoute allowedRoles={['master_admin']}>
              <MasterLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MasterDashboard />} />
          <Route path="preview" element={<PreviewPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="domains" element={<DomainsPage />} />
        </Route>

        {/* Mentor Routes */}
        <Route
          path="/mentor"
          element={
            <ProtectedRoute allowedRoles={['master_admin', 'admin', 'ops', 'mentor']}>
              <MentorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="jornada-cs" element={<JornadaCS />} />
          <Route path="mentorados" element={<Mentorados />} />
          <Route path="mentorados/:id" element={<MentoradoDetail />} />
          <Route path="crm" element={<CRMMentorados />} />
          <Route path="trilhas" element={<AdminTrilhas />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="sos" element={<AdminCentroSOS />} />
          <Route path="emails" element={<EmailMarketing />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="perfil" element={<MentorPerfil />} />
          <Route path="devtools" element={<DevTools />} />
          <Route path="propriedade-intelectual" element={<PropriedadeIntelectual />} />
          <Route path="playbooks" element={<PlaybooksHub />} />
          <Route path="playbooks/:playbookId" element={<PlaybookEditorPage />} />
          <Route path="automacoes" element={<Automacoes />} />
          <Route path="popups" element={<Popups />} />
          <Route path="whatsapp" element={<WhatsAppCampaigns />} />
          <Route path="formularios" element={<FormulariosPage />} />
        </Route>

        {/* Mentorado Routes */}
        <Route
          path="/mentorado"
          element={
            <ProtectedRoute allowedRoles={['master_admin', 'admin', 'ops', 'mentor', 'mentee']}>
              <MentoradoLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MemberDashboard />} />
          <Route path="trilhas" element={<Trilhas />} />
          <Route path="meu-crm" element={<MeuCRM />} />
          <Route path="calendario" element={<CalendarioMembro />} />
          <Route path="sos" element={<CentroSOS />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="ferramentas" element={<FerramentasIA />} />
          <Route path="meus-arquivos" element={<MeusArquivos />} />
          <Route path="tarefas" element={<MinhasTarefas />} />
          <Route path="playbooks" element={<MentoradoPlaybooks />} />
          <Route path="metricas" element={<MentoradoMetricas />} />
        </Route>

        {/* Legacy route redirect */}
        <Route path="/dashboard" element={<Navigate to="/mentor" replace />} />
        <Route path="/admin/*" element={<Navigate to="/mentor" replace />} />
        <Route path="/app/*" element={<Navigate to="/mentorado" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<RouteFallback><NotFound /></RouteFallback>} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <AppRoutes />
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
