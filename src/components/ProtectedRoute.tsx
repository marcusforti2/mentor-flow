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

    // If no membership yet, just render children
    if (!activeMembership) {
      return <>{children}</>;
    }

    // Admin has full access to everything
    if (activeMembership.role === 'admin') {
      return <>{children}</>;
    }

    // Check if user has required role
    if (allowedRoles && !allowedRoles.includes(activeMembership.role)) {
      const correctPath = activeMembership.role === 'master_admin' 
        ? '/master' 
        : activeMembership.role === 'mentee' 
          ? '/mentorado' 
          : '/mentor';
      return <Navigate to={correctPath} replace />;
    }

  return <>{children}</>;
}
