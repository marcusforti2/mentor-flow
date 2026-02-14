import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Eye, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const roleLabels: Record<string, string> = {
  master_admin: 'Master Admin',
  admin: 'Admin',
  ops: 'Ops',
  mentor: 'Mentor',
  mentee: 'Mentorado',
};

export function ImpersonationBanner() {
  const { isImpersonating, activeMembership, endImpersonation, tenant } = useTenant();

  if (!isImpersonating || !activeMembership) {
    return null;
  }

  const roleLabel = roleLabels[activeMembership.role] || activeMembership.role;
  const tenantName = tenant?.name || activeMembership.tenant_name || '';

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/20 rounded-full px-3 py-1">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Impersonation Ativo</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-3">
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-xs">
                {roleLabel}
              </Badge>

              {tenantName && (
                <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-xs">
                  {tenantName}
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={endImpersonation}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao meu contexto</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
