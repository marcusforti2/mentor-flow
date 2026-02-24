import { useState, useEffect } from 'react';
import { type TenantPopup } from '@/hooks/usePopups';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Sparkles, Upload, ImageIcon, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface PopupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  popup?: TenantPopup | null;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export function PopupFormDialog({ open, onOpenChange, popup, onSubmit, isSubmitting }: PopupFormDialogProps) {
  const { tenant, activeMembership } = useTenant();
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [displayMode, setDisplayMode] = useState('first_access');
  const [startsAt, setStartsAt] = useState<Date | undefined>();
  const [endsAt, setEndsAt] = useState<Date | undefined>();
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (popup) {
      setTitle(popup.title);
      setBodyHtml(popup.body_html);
      setBodyText(htmlToPlainText(popup.body_html));
      setImageUrl(popup.image_url || '');
      setCtaLabel(popup.cta_label || '');
      setCtaUrl(popup.cta_url || '');
      setDisplayMode(popup.display_mode);
      setStartsAt(popup.starts_at ? new Date(popup.starts_at) : undefined);
      setEndsAt(popup.ends_at ? new Date(popup.ends_at) : undefined);
    } else {
      setTitle('');
      setBodyText('');
      setBodyHtml('');
      setImageUrl('');
      setCtaLabel('');
      setCtaUrl('');
      setDisplayMode('first_access');
      setStartsAt(undefined);
      setEndsAt(undefined);
    }
    setAiPrompt('');
    setShowPreview(false);
  }, [popup, open]);

  function htmlToPlainText(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function plainTextToHtml(text: string): string {
    if (!text.trim()) return '';
    return text
      .split('\n\n')
      .map(p => `<p>${p.split('\n').join('<br/>')}</p>`)
      .join('');
  }

  const handleBodyTextChange = (text: string) => {
    setBodyText(text);
    setBodyHtml(plainTextToHtml(text));
  };

  const handleGenerateContent = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-popup', {
        body: { prompt: aiPrompt, generate_image: false },
      });
      if (error) throw error;
      if (data?.title) setTitle(data.title);
      if (data?.body_html) {
        setBodyHtml(data.body_html);
        setBodyText(htmlToPlainText(data.body_html));
      }
      if (data?.cta_label) setCtaLabel(data.cta_label);
      if (data?.cta_url) setCtaUrl(data.cta_url);
      toast.success('Conteúdo gerado pela IA!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar conteúdo com IA');
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!title.trim()) {
      toast.error('Preencha o título primeiro');
      return;
    }
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-popup', {
        body: { prompt: title, generate_image: true },
      });
      if (error) throw error;
      if (data?.image_url) {
        setImageUrl(data.image_url);
        toast.success('Imagem gerada!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${tenant!.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('popup-images')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('popup-images')
        .getPublicUrl(path);
      setImageUrl(urlData.publicUrl);
      toast.success('Imagem enviada!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !bodyText.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }
    onSubmit({
      tenant_id: tenant!.id,
      created_by: activeMembership!.id,
      title,
      body_html: bodyHtml,
      image_url: imageUrl || null,
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      display_mode: displayMode,
      starts_at: displayMode === 'date_range' ? startsAt?.toISOString() || null : null,
      ends_at: displayMode === 'date_range' ? endsAt?.toISOString() || null : null,
      is_active: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{popup ? 'Editar Popup' : 'Novo Popup'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* AI Generator */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
            <Label className="flex items-center gap-2 text-primary font-medium">
              <Sparkles className="h-4 w-4" />
              Criar com IA
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: popup convidando pro grupo do WhatsApp com link..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <Button
                onClick={handleGenerateContent}
                disabled={generatingContent || !aiPrompt.trim()}
                size="sm"
                className="shrink-0"
              >
                {generatingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do popup" />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Conteúdo *</Label>
            <Textarea
              value={bodyText}
              onChange={(e) => handleBodyTextChange(e.target.value)}
              placeholder="Escreva o conteúdo do popup aqui...&#10;&#10;Use linhas em branco para separar parágrafos."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">Separe parágrafos com uma linha em branco.</p>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Imagem do Banner (800×400px recomendado)</Label>
            {imageUrl && (
              <div className="rounded-lg overflow-hidden aspect-[2/1] bg-muted">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="relative" disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={generatingImage || !title.trim()}
              >
                {generatingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Gerar com IA
              </Button>
              {imageUrl && (
                <Button variant="ghost" size="sm" onClick={() => setImageUrl('')}>
                  Remover
                </Button>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Texto do Botão (CTA)</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Ex: Entrar no Grupo" />
            </div>
            <div className="space-y-2">
              <Label>Link do Botão</Label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Display Mode */}
          <div className="space-y-2">
            <Label>Modo de Exibição</Label>
            <Select value={displayMode} onValueChange={setDisplayMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_access">Primeiro acesso (1x por mentorado)</SelectItem>
                <SelectItem value="date_range">Período específico</SelectItem>
                <SelectItem value="always">Sempre (até fechar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          {displayMode === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left', !startsAt && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startsAt ? format(startsAt, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startsAt} onSelect={setStartsAt} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left', !endsAt && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endsAt ? format(endsAt, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endsAt} onSelect={setEndsAt} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && (
            <div className="rounded-xl border border-border bg-card p-0 overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground px-4 pt-3 pb-1">Pré-visualização</p>
              {imageUrl && (
                <div className="aspect-[2/1] bg-muted">
                  <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <h3 className="text-lg font-bold text-foreground">{title || 'Título do Popup'}</h3>
                <div
                  className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml || '<p>Conteúdo aparecerá aqui...</p>') }}
                />
                {ctaLabel && (
                  <Button size="sm" className="w-full mt-2">
                    {ctaLabel}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Ocultar Preview' : 'Visualizar'}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {popup ? 'Salvar' : 'Criar Popup'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
