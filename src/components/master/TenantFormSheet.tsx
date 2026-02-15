import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TenantFormData } from '@/hooks/useTenants';
import { Building2, Loader2, Palette, Sparkles, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Tenant } from '@/hooks/useTenants';

interface BrandAttributes {
  background?: string;
  foreground?: string;
  card?: string;
  card_foreground?: string;
  muted?: string;
  muted_foreground?: string;
  border?: string;
}

interface TenantFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  onSubmit: (data: TenantFormData) => void;
  isSubmitting?: boolean;
}

function ColorField({ label, value, onChange, placeholder = '#000000' }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-xs font-mono"
        />
      </div>
    </div>
  );
}

export function TenantFormSheet({ open, onOpenChange, tenant, onSubmit, isSubmitting }: TenantFormSheetProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    logo_url: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    font_family: '',
    favicon_url: '',
    status: 'active',
    brand_attributes: {},
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url || '',
        primary_color: tenant.primary_color || '',
        secondary_color: tenant.secondary_color || '',
        accent_color: (tenant as any).accent_color || '',
        font_family: (tenant as any).font_family || '',
        favicon_url: (tenant as any).favicon_url || '',
        status: tenant.status,
        brand_attributes: ((tenant as any).brand_attributes as Record<string, string>) || {},
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        logo_url: '',
        primary_color: '#16a34a',
        secondary_color: '#1e293b',
        accent_color: '#eab308',
        font_family: '',
        favicon_url: '',
        status: 'active',
        brand_attributes: {},
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

  const updateBrandAttr = (key: keyof BrandAttributes, value: string) => {
    setFormData(prev => ({
      ...prev,
      brand_attributes: { ...prev.brand_attributes, [key]: value },
    }));
  };

  const brandAttrs = (formData.brand_attributes || {}) as BrandAttributes;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {tenant ? 'Editar Tenant' : 'Novo Tenant'}
          </SheetTitle>
          <SheetDescription>
            {tenant ? 'Atualize informações e branding do tenant.' : 'Preencha os dados e configure o branding visual.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <form id="tenant-form" onSubmit={handleSubmit} className="space-y-5 pb-6 pt-4">
            {/* === BASIC INFO === */}
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
                <Label htmlFor="font_family">Fonte Personalizada</Label>
                <Input
                  id="font_family"
                  value={formData.font_family || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, font_family: e.target.value }))}
                  placeholder="Ex: Poppins, Montserrat..."
                />
                <p className="text-xs text-muted-foreground">Fonte Google Fonts para títulos e corpo.</p>
              </div>
            </div>

            <Separator />

            {/* === MAIN COLORS === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" />
                Cores Principais
              </h3>
              <p className="text-xs text-muted-foreground">
                Definem botões, links, destaques e acentos em todo o sistema.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <ColorField
                  label="Primária"
                  value={formData.primary_color || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, primary_color: v }))}
                />
                <ColorField
                  label="Secundária"
                  value={formData.secondary_color || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, secondary_color: v }))}
                />
                <ColorField
                  label="Destaque"
                  value={formData.accent_color || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, accent_color: v }))}
                />
              </div>
            </div>

            <Separator />

            {/* === ADVANCED BRANDING === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Branding Avançado
              </h3>
              <p className="text-xs text-muted-foreground">
                Controle fino de fundos, cards e textos. Afeta a visão do Mentor e Mentorado.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Fundo (Background)"
                  value={brandAttrs.background || ''}
                  onChange={(v) => updateBrandAttr('background', v)}
                />
                <ColorField
                  label="Texto Principal"
                  value={brandAttrs.foreground || ''}
                  onChange={(v) => updateBrandAttr('foreground', v)}
                />
                <ColorField
                  label="Cards"
                  value={brandAttrs.card || ''}
                  onChange={(v) => updateBrandAttr('card', v)}
                />
                <ColorField
                  label="Texto dos Cards"
                  value={brandAttrs.card_foreground || ''}
                  onChange={(v) => updateBrandAttr('card_foreground', v)}
                />
                <ColorField
                  label="Muted (Fundo Suave)"
                  value={brandAttrs.muted || ''}
                  onChange={(v) => updateBrandAttr('muted', v)}
                />
                <ColorField
                  label="Texto Muted"
                  value={brandAttrs.muted_foreground || ''}
                  onChange={(v) => updateBrandAttr('muted_foreground', v)}
                />
                <ColorField
                  label="Bordas"
                  value={brandAttrs.border || ''}
                  onChange={(v) => updateBrandAttr('border', v)}
                />
              </div>
            </div>

            {/* AI Branding CTA */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Quer automatizar?</p>
                <p className="text-xs text-muted-foreground">
                  Use o <Link to="/master/branding" className="text-primary underline font-medium" onClick={() => onOpenChange(false)}>AI Branding Engine</Link> para gerar a identidade visual completa a partir de um print ou logo.
                </p>
              </div>
            </div>

            {/* === PREVIEW === */}
            {(formData.primary_color || formData.accent_color) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                  <div
                    className="rounded-lg p-4 border"
                    style={{ backgroundColor: brandAttrs.background || '#0a0a14' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {formData.logo_url && (
                        <img src={formData.logo_url} alt="Logo" className="h-8 w-8 object-contain rounded" />
                      )}
                      <span
                        className="font-bold text-sm"
                        style={{ color: brandAttrs.foreground || '#fafafa' }}
                      >
                        {formData.name || 'Nome da Empresa'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="h-8 px-3 rounded-md flex items-center text-xs font-medium text-white"
                        style={{ backgroundColor: formData.primary_color || '#16a34a' }}
                      >
                        Primária
                      </div>
                      <div
                        className="h-8 px-3 rounded-md flex items-center text-xs font-medium"
                        style={{ backgroundColor: formData.secondary_color || '#1e293b', color: '#fafafa' }}
                      >
                        Secundária
                      </div>
                      <div
                        className="h-8 px-3 rounded-md flex items-center text-xs font-bold"
                        style={{ backgroundColor: formData.accent_color || '#eab308', color: '#0a0a14' }}
                      >
                        Destaque
                      </div>
                    </div>
                    {(brandAttrs.card) && (
                      <div
                        className="mt-3 rounded-md p-3 border text-xs"
                        style={{
                          backgroundColor: brandAttrs.card,
                          borderColor: brandAttrs.border || '#333',
                          color: brandAttrs.card_foreground || '#fafafa',
                        }}
                      >
                        Preview de card com as cores configuradas
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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
