import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tenant, TenantFormData } from '@/hooks/useTenants';
import { Building2, Loader2 } from 'lucide-react';

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
    primary_color: '',
    secondary_color: '',
    status: 'active',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url || '',
        primary_color: tenant.primary_color || '',
        secondary_color: tenant.secondary_color || '',
        status: tenant.status,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        logo_url: '',
        primary_color: '',
        secondary_color: '',
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
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant ? 'Editar Tenant' : 'Novo Tenant'}
          </SheetTitle>
          <SheetDescription>
            {tenant ? 'Atualize as informações do tenant.' : 'Preencha os dados para criar um novo tenant.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  value={formData.primary_color || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="#000000"
                />
                {formData.primary_color && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: formData.primary_color }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  value={formData.secondary_color || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                  placeholder="#ffffff"
                />
                {formData.secondary_color && (
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: formData.secondary_color }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tenant ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
