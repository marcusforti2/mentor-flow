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

// Public Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";

// Layouts
 import { MasterLayout } from "@/components/layouts/MasterLayout";
 import { MentorLayout } from "@/components/layouts/MentorLayout";
 import { MentoradoLayout } from "@/components/layouts/MentoradoLayout";
 
// Master Pages
import MasterDashboard from "./pages/master/MasterDashboard";
import PreviewPage from "./pages/master/PreviewPage";
import TenantsPage from "./pages/master/TenantsPage";
import UsersPage from "./pages/master/UsersPage";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Mentorados from "./pages/admin/Mentorados";
import JornadaCS from "./pages/admin/JornadaCS";
import AdminTrilhas from "./pages/admin/Trilhas";
import DevTools from "./pages/admin/DevTools";
import PropriedadeIntelectual from "./pages/admin/PropriedadeIntelectual";
import EmailMarketing from "./pages/admin/EmailMarketing";
import Calendario from "./pages/admin/Calendario";
import CRMMentorados from "./pages/admin/CRMMentorados";
// Formularios is now embedded within Mentorados page

// Member Pages
import MemberDashboard from "./pages/member/MemberDashboard";
import Trilhas from "./pages/member/Trilhas";
import MeuCRM from "./pages/member/MeuCRM";
import CentroSOS from "./pages/member/CentroSOS";
import Perfil from "./pages/member/Perfil";
import LojaPremios from "./pages/member/LojaPremios";
import FerramentasIA from "./pages/member/FerramentasIA";
import CalendarioMembro from "./pages/member/Calendario";
import Comunidade from "./pages/member/Comunidade";
import MeusArquivos from "./pages/member/MeusArquivos";

// Admin Pages (additional)
import AdminCentroSOS from "./pages/admin/CentroSOS";

const queryClient = new QueryClient();

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
              <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/setup" element={<Setup />} />
            
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
             </Route>
 
             {/* Mentor Routes (Admin + Ops + Mentor) */}
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
               <Route path="ranking" element={<PlaceholderPage title="Rankings" />} />
               <Route path="emails" element={<EmailMarketing />} />
               <Route path="relatorios" element={<PlaceholderPage title="Relatórios" />} />
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
               <Route path="comunidade" element={<Comunidade />} />
               <Route path="calendario" element={<CalendarioMembro />} />
               <Route path="ranking" element={<PlaceholderPage title="Ranking" />} />
               <Route path="sos" element={<CentroSOS />} />
               <Route path="perfil" element={<Perfil />} />
               <Route path="ferramentas" element={<FerramentasIA />} />
               <Route path="loja" element={<LojaPremios />} />
               <Route path="meus-arquivos" element={<MeusArquivos />} />
            </Route>

            {/* Legacy route redirect */}
             <Route path="/dashboard" element={<Navigate to="/mentor" replace />} />
             <Route path="/admin/*" element={<Navigate to="/mentor" replace />} />
             <Route path="/app/*" element={<Navigate to="/mentorado" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
