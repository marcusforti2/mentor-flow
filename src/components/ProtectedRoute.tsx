 import { Navigate, useLocation } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { useTenant, MembershipRole } from '@/contexts/TenantContext';
 import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
   allowedRoles?: MembershipRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
   const { user, isLoading: authLoading } = useAuth();
   const { activeMembership, isLoading: tenantLoading } = useTenant();
  const location = useLocation();

   const isLoading = authLoading || tenantLoading;
 
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

   // If no membership assigned yet, redirect to a waiting page or show message
   if (!activeMembership) {
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

   // Admin has full access to everything
   if (activeMembership.role === 'admin') {
    return <>{children}</>;
  }

  // Check if user has required role
   if (allowedRoles && !allowedRoles.includes(activeMembership.role)) {
    // Redirect to appropriate dashboard based on role
      const correctPath = activeMembership.role === 'master_admin' 
        ? '/master' 
        : activeMembership.role === 'mentee' 
          ? '/mentorado' 
          : '/mentor';
    return <Navigate to={correctPath} replace />;
  }

  return <>{children}</>;
}
