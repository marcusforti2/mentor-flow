import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Sparkles, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CoverImageUploadProps {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  folder?: string; // subfolder in bucket
  aspectRatio?: string;
}

export function CoverImageUpload({
  currentUrl,
  onUploaded,
  onRemoved,
  folder = 'general',
  aspectRatio = '16/9',
}: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentUrl;

  const uploadToStorage = async (file: File | Blob, ext: string): Promise<string> => {
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('playbook-covers')
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('playbook-covers')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 10MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const publicUrl = await uploadToStorage(file, ext);
      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
      toast.success('Capa enviada!');
    } catch (error: any) {
      console.error('Cover upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Digite uma descrição para a imagem');
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-cover', {
        body: { prompt: aiPrompt },
      });

      if (response.error) throw response.error;

      const imageUrl = response.data?.imageUrl;
      if (!imageUrl) throw new Error('Nenhuma imagem gerada');

      // Download the generated image and re-upload to our storage
      const imgResponse = await fetch(imageUrl);
      const blob = await imgResponse.blob();
      const publicUrl = await uploadToStorage(blob, 'webp');

      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
      setShowAiInput(false);
      setAiPrompt('');
      toast.success('Capa gerada com IA!');
    } catch (error: any) {
      console.error('AI cover generation error:', error);
      toast.error('Erro ao gerar imagem com IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onRemoved?.();
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div
        className="relative rounded-xl overflow-hidden border border-border bg-muted/50 group"
        style={{ aspectRatio }}
      >
        {displayUrl ? (
          <>
            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || generating}
              >
                <Upload className="h-4 w-4 mr-1" />
                Trocar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 py-8">
            <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Adicione uma imagem de capa</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || generating}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAiInput(!showAiInput)}
                disabled={uploading || generating}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Gerar com IA
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* AI Generation Input */}
      {showAiInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Descreva a imagem... Ex: visual moderno sobre vendas B2B"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
            disabled={generating}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAiGenerate}
            disabled={generating || !aiPrompt.trim()}
            className="shrink-0"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
