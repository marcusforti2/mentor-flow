import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SwitchContextPanel } from "@/components/SwitchContextPanel";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { Loader2 } from "lucide-react";

// Public Pages (keep static - entry points)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-loaded pages
const Setup = lazy(() => import("./pages/Setup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));

// Layouts (keep static - structural)
import { MasterLayout } from "@/components/layouts/MasterLayout";
import { MentorLayout } from "@/components/layouts/MentorLayout";
import { MentoradoLayout } from "@/components/layouts/MentoradoLayout";

// Master Pages
const MasterDashboard = lazy(() => import("./pages/master/MasterDashboard"));
const PreviewPage = lazy(() => import("./pages/master/PreviewPage"));
const TenantsPage = lazy(() => import("./pages/master/TenantsPage"));
const UsersPage = lazy(() => import("./pages/master/UsersPage"));
const ApresentacaoPage = lazy(() => import("./pages/master/ApresentacaoPage"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <ImpersonationProvider>
              <ImpersonationBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/setup" element={<Setup />} />
                  <Route path="/showcase" element={<ShowcasePage />} />

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
                    <Route path="config" element={<PlaceholderPage title="Configurações" />} />
                    <Route path="apresentacao" element={<ApresentacaoPage />} />
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
                    <Route path="crm" element={<CRMMentorados />} />
                    <Route path="trilhas" element={<AdminTrilhas />} />
                    <Route path="calendario" element={<Calendario />} />
                    <Route path="sos" element={<AdminCentroSOS />} />
                    <Route path="emails" element={<EmailMarketing />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="perfil" element={<MentorPerfil />} />
                    <Route path="devtools" element={<DevTools />} />
                    <Route path="propriedade-intelectual" element={<PropriedadeIntelectual />} />
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
                  </Route>

                  {/* Legacy route redirect */}
                  <Route path="/dashboard" element={<Navigate to="/mentor" replace />} />
                  <Route path="/admin/*" element={<Navigate to="/mentor" replace />} />
                  <Route path="/app/*" element={<Navigate to="/mentorado" replace />} />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <SwitchContextPanel />
            </ImpersonationProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

// Placeholder component for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">Esta página será implementada em breve.</p>
      </div>
    </div>
  );
}

export default App;
