import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DevModeProvider } from "@/hooks/useDevMode";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";

// Layouts
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { MemberLayout } from "@/components/layouts/MemberLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Mentorados from "./pages/admin/Mentorados";
import AdminTrilhas from "./pages/admin/Trilhas";
import DevTools from "./pages/admin/DevTools";

// Member Pages
import MemberDashboard from "./pages/member/MemberDashboard";
import Trilhas from "./pages/member/Trilhas";
import MeuCRM from "./pages/member/MeuCRM";
import CentroSOS from "./pages/member/CentroSOS";
import Perfil from "./pages/member/Perfil";
import LojaPremios from "./pages/member/LojaPremios";
import FerramentasIA from "./pages/member/FerramentasIA";

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
          <DevModeProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />
            
            {/* Admin Routes (Mentor + Admin Master) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['mentor', 'admin_master']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="crm" element={<PlaceholderPage title="CRM" />} />
              <Route path="mentorados" element={<Mentorados />} />
              <Route path="trilhas" element={<AdminTrilhas />} />
              <Route path="calendario" element={<PlaceholderPage title="Calendário" />} />
              <Route path="sos" element={<AdminCentroSOS />} />
              <Route path="ranking" element={<PlaceholderPage title="Rankings" />} />
              <Route path="emails" element={<PlaceholderPage title="Email Marketing" />} />
              <Route path="relatorios" element={<PlaceholderPage title="Relatórios" />} />
              <Route path="devtools" element={<DevTools />} />
            </Route>

            {/* Member Routes (Mentorado + Admin Master) */}
            <Route
              path="/app"
              element={
                <ProtectedRoute allowedRoles={['mentorado', 'admin_master']}>
                  <MemberLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MemberDashboard />} />
              <Route path="trilhas" element={<Trilhas />} />
              <Route path="meu-crm" element={<MeuCRM />} />
              <Route path="calendario" element={<PlaceholderPage title="Calendário" />} />
              <Route path="ranking" element={<PlaceholderPage title="Ranking" />} />
              <Route path="sos" element={<CentroSOS />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="ferramentas" element={<FerramentasIA />} />
              <Route path="loja" element={<LojaPremios />} />
            </Route>

            {/* Legacy route redirect */}
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </DevModeProvider>
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
