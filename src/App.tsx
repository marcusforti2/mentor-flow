import { lazy, Suspense, useEffect, type ReactNode } from "react";
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

// Public Pages
import Index from "./pages/Index";
const Auth = lazy(() => import("./pages/Auth"));

// Lazy-loaded pages
// Setup page removed — legacy initial configuration no longer needed
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));
const TenantLandingPage = lazy(() => import("./pages/TenantLandingPage"));
const PublicPlaybookPage = lazy(() => import("./pages/PublicPlaybookPage"));

// Layouts (keep static - structural)
import { MasterLayout } from "@/components/layouts/MasterLayout";
import { MentorLayout } from "@/components/layouts/MentorLayout";
import { MentoradoLayout } from "@/components/layouts/MentoradoLayout";

// Master Pages
const MasterDashboard = lazy(() => import("./pages/master/MasterDashboard"));
const PreviewPage = lazy(() => import("./pages/master/PreviewPage"));
const TenantsPage = lazy(() => import("./pages/master/TenantsPage"));
const UsersPage = lazy(() => import("./pages/master/UsersPage"));

const ConfigPage = lazy(() => import("./pages/master/ConfigPage"));
const BrandingPage = lazy(() => import("./pages/master/BrandingPage"));

// Admin/Mentor Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Mentorados = lazy(() => import("./pages/admin/Mentorados"));
const JornadaCS = lazy(() => import("./pages/admin/JornadaCS"));
const AdminTrilhas = lazy(() => import("./pages/admin/Trilhas"));
const DevTools = lazy(() => import("./pages/admin/DevTools"));
const PropriedadeIntelectual = lazy(() => import("./pages/admin/PropriedadeIntelectual"));
const EmailMarketing = lazy(() => import("./pages/admin/EmailMarketing"));
const Calendario = lazy(() => import("./pages/admin/Calendario"));
const CRMMentorados = lazy(() => import("./pages/admin/CRMMentorados"));
const Relatorios = lazy(() => import("./pages/admin/Relatorios"));
const MentorPerfil = lazy(() => import("./pages/admin/MentorPerfil"));
const AdminCentroSOS = lazy(() => import("./pages/admin/CentroSOS"));
// Agendamento removed — merged into Calendario
const PlaybooksHub = lazy(() => import("./pages/admin/PlaybooksHub"));
const PlaybookEditorPage = lazy(() => import("./pages/admin/PlaybookEditorPage"));
const MentoradoDetail = lazy(() => import("./pages/admin/MentoradoDetail"));
const Automacoes = lazy(() => import("./pages/admin/Automacoes"));
const Popups = lazy(() => import("./pages/admin/Popups"));
const WhatsAppCampaigns = lazy(() => import("./pages/admin/WhatsAppCampaigns"));

// Member Pages
const MemberDashboard = lazy(() => import("./pages/member/MemberDashboard"));
const Trilhas = lazy(() => import("./pages/member/Trilhas"));
const MeuCRM = lazy(() => import("./pages/member/MeuCRM"));
const CentroSOS = lazy(() => import("./pages/member/CentroSOS"));
const Perfil = lazy(() => import("./pages/member/Perfil"));
const FerramentasIA = lazy(() => import("./pages/member/FerramentasIA"));
const CalendarioMembro = lazy(() => import("./pages/member/Calendario"));
const MeusArquivos = lazy(() => import("./pages/member/MeusArquivos"));
const MinhasTarefas = lazy(() => import("./pages/member/MinhasTarefas"));
// AgendamentoMembro removed — merged into CalendarioMembro
const MentoradoPlaybooks = lazy(() => import("./pages/member/Playbooks"));
const MentoradoMetricas = lazy(() => import("./pages/member/Metricas"));
const CRMMobile = lazy(() => import("./pages/member/CRMMobile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
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
        <Route path="/p/:slug" element={<RouteFallback><PublicPlaybookPage /></RouteFallback>} />
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
