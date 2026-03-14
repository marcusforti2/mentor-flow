 import { Link, Navigate, useLocation } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { useTenant, MembershipRole } from '@/contexts/TenantContext';
 import { Loader2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';

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
   const { tenant, activeMembership, isLoading: tenantLoading } = useTenant();
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

    // Authenticated user without membership must not access protected areas yet
    if (!activeMembership) {
      const accessPath = tenant?.slug ? `/login/${tenant.slug}` : redirectTo;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Acesso pendente</h1>
            <p className="text-muted-foreground">
              Seu usuário está autenticado, mas ainda não possui um vínculo ativo com este ambiente.
              Peça a liberação do acesso ou entre novamente pelo tenant correto.
            </p>
            <Link to={accessPath} state={{ from: location }} replace>
              <Button>Voltar para o acesso</Button>
            </Link>
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
      const correctPath = activeMembership.role === 'master_admin' 
        ? '/master' 
        : activeMembership.role === 'mentee' 
          ? '/mentorado' 
          : '/mentor';
      return <Navigate to={correctPath} replace />;
    }

  return <>{children}</>;
}