import { useState } from 'react';
import { useTenants } from '@/hooks/useTenants';
import { useTenant } from '@/contexts/TenantContext';
import { TenantBrandingPanel } from '@/components/admin/TenantBrandingPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Building2 } from 'lucide-react';

export default function BrandingPage() {
  const { tenants, isLoading } = useTenants();
  const { realMembership } = useTenant();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';
  const filteredTenants = tenants.filter(t => t.id !== SANDBOX_TENANT_ID);
  const selectedTenant = filteredTenants.find(t => t.id === selectedTenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-100">AI Branding Engine</h1>
        <p className="text-slate-400">Analise a marca do cliente e gere o branding completo do sistema</p>
      </div>

      {/* Tenant Selector */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
            <Building2 className="h-4 w-4" />
            Selecionar Tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTenantId || ''}
            onValueChange={(val) => setSelectedTenantId(val)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600">
              <SelectValue placeholder="Escolha um tenant para configurar o branding..." />
            </SelectTrigger>
            <SelectContent>
              {filteredTenants.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-slate-600"
                      style={{ backgroundColor: t.primary_color || '#666' }}
                    />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Branding Panel */}
      {selectedTenantId && selectedTenant ? (
        <TenantBrandingPanel
          tenantId={selectedTenantId}
          tenantName={selectedTenant.name}
          membershipId={realMembership?.id}
        />
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Palette className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Selecione um tenant para começar a análise de branding</p>
        </div>
      )}
    </div>
  );
}
