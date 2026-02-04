import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'mentor' | 'mentorado' | 'admin_master';

const DEV_MODE_KEY = 'dev_mode_role_override';

// Função helper para ler override do localStorage de forma segura
function getDevModeOverride(): AppRole | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(DEV_MODE_KEY);
  if (stored === 'mentor' || stored === 'mentorado') {
    return stored;
  }
  return null;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  const { user, role: realRole, isLoading } = useAuth();
  const location = useLocation();
  
  // Role efetiva: override do DevMode tem prioridade (lido do localStorage)
  const overrideRole = getDevModeOverride();
  const role = overrideRole || realRole;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If no role assigned yet, redirect to a waiting page or show message
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Aguardando aprovação</h1>
          <p className="text-muted-foreground">
            Sua conta ainda não foi configurada. Entre em contato com o mentor.
          </p>
        </div>
      </div>
    );
  }

  // Admin master has full access to everything
  if (role === 'admin_master') {
    return <>{children}</>;
  }

  // Check if user has required role
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const correctPath = role === 'mentor' ? '/admin' : '/app';
    return <Navigate to={correctPath} replace />;
  }

  return <>{children}</>;
}
