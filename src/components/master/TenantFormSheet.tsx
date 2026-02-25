import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TenantFormData } from '@/hooks/useTenants';
import { Building2, Loader2, Sparkles, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Tenant } from '@/hooks/useTenants';

interface TenantFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  onSubmit: (data: TenantFormData) => void;
  isSubmitting?: boolean;
}

export function TenantFormSheet({ open, onOpenChange, tenant, onSubmit, isSubmitting }: TenantFormSheetProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    logo_url: '',
    favicon_url: '',
    custom_domain: '',
    status: 'active',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url || '',
        favicon_url: (tenant as any).favicon_url || '',
        custom_domain: (tenant as any).custom_domain || '',
        status: tenant.status,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        logo_url: '',
        favicon_url: '',
        custom_domain: '',
        status: 'active',
      });
    }
  }, [tenant, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant ? 'Editar Tenant' : 'Novo Tenant'}
          </SheetTitle>
          <SheetDescription>
            {tenant ? 'Atualize as informações do tenant.' : 'Preencha os dados básicos. O branding visual é configurado pelo AI Branding Engine.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <form id="tenant-form" onSubmit={handleSubmit} className="space-y-5 pb-6 pt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Informações Básicas
              </h3>

              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      slug: !tenant ? generateSlug(name) : prev.slug,
                    }));
                  }}
                  placeholder="Ex: Minha Empresa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="Ex: minha-empresa"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único para URLs. Apenas letras, números e hífens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon_url">URL do Favicon</Label>
                <Input
                  id="favicon_url"
                  value={formData.favicon_url || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, favicon_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_domain">Domínio Customizado</Label>
                <Input
                  id="custom_domain"
                  value={formData.custom_domain || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, custom_domain: e.target.value }))}
                  placeholder="Ex: sistema.learningbrand.com.br"
                />
                <p className="text-xs text-muted-foreground">
                  Domínio próprio do tenant. Configure o DNS apontando para o IP do Lovable (185.158.133.1).
                </p>
              </div>
            </div>

            {/* AI Branding CTA */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Branding Visual</p>
                <p className="text-xs text-muted-foreground">
                  Cores, fontes e identidade visual são configurados exclusivamente pelo{' '}
                  <Link to="/master/branding" className="text-primary underline font-medium" onClick={() => onOpenChange(false)}>
                    AI Branding Engine
                  </Link>
                  . Envie um logo ou print e a IA gera a paleta completa.
                </p>
              </div>
            </div>
          </form>
        </ScrollArea>

        <div className="p-4 border-t border-border flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" form="tenant-form" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tenant ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
