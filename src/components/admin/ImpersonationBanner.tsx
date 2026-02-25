import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Eye, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const roleLabels: Record<string, string> = {
  master_admin: 'Master Admin',
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
    <>
      {/* Spacer to push page content below the banner */}
      <div className="h-12 w-full" />
      <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-black/20 rounded-full px-2.5 py-1">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Impersonation Ativo</span>
              </div>
              
              <div className="hidden sm:flex items-center gap-2">
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
              className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5 h-8 px-3 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voltar ao meu contexto</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
