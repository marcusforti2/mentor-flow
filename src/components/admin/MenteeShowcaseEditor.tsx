import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { toast } from 'sonner';
import { Loader2, Upload, Sparkles, Save, Camera, Wand2, ImageIcon } from 'lucide-react';

interface MenteeShowcaseEditorProps {
  membershipId: string;
  menteeName: string;
  businessInfo?: string;
  currentPhotoUrl?: string | null;
  currentBio?: string | null;
  onSaved?: () => void;
}

export function MenteeShowcaseEditor({
  membershipId,
  menteeName,
  businessInfo,
  currentPhotoUrl,
  currentBio,
  onSaved,
}: MenteeShowcaseEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [enhancedPhoto, setEnhancedPhoto] = useState<string | null>(null);
  const [savedPhoto, setSavedPhoto] = useState<string | null>(currentPhotoUrl || null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [mentorNotes, setMentorNotes] = useState('');
  const [showcaseBio, setShowcaseBio] = useState(currentBio || '');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSavedPhoto(currentPhotoUrl || null);
    setShowcaseBio(currentBio || '');
  }, [currentPhotoUrl, currentBio]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 10MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalPhoto(reader.result as string);
      setEnhancedPhoto(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEnhancePhoto = async () => {
    if (!originalPhoto) return;
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-showcase', {
        body: { type: 'portrait', imageBase64: originalPhoto },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar retrato');
      setEnhancedPhoto(data.imageUrl);
      toast.success('Retrato executivo gerado!');
    } catch (err: any) {
      console.error('Enhance error:', err);
      toast.error(err.message || 'Erro ao melhorar foto');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateBio = async () => {
    setIsGeneratingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-showcase', {
        body: {
          type: 'bio',
          name: menteeName,
          businessInfo: businessInfo || '',
          mentorNotes: mentorNotes.trim(),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar bio');
      setShowcaseBio(data.bio);
      toast.success('Apresentação gerada!');
    } catch (err: any) {
      console.error('Bio error:', err);
      toast.error(err.message || 'Erro ao gerar apresentação');
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const uploadBase64ToStorage = async (base64: string): Promise<string> => {
    const res = await fetch(base64);
    const blob = await res.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const path = `showcase/${membershipId}/portrait-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let photoUrl = savedPhoto;

      // Upload enhanced photo if available
      if (enhancedPhoto) {
        photoUrl = await uploadBase64ToStorage(enhancedPhoto);
      } else if (originalPhoto && !enhancedPhoto) {
        photoUrl = await uploadBase64ToStorage(originalPhoto);
      }

      const { error } = await supabase
        .from('mentee_profiles')
        .update({
          showcase_photo_url: photoUrl,
          showcase_bio: showcaseBio.trim() || null,
        } as any)
        .eq('membership_id', membershipId);

      if (error) throw error;

      setSavedPhoto(photoUrl);
      setOriginalPhoto(null);
      setEnhancedPhoto(null);
      toast.success('Vitrine salva com sucesso!');
      onSaved?.();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const displayPhoto = enhancedPhoto || originalPhoto || savedPhoto;
  const hasChanges = originalPhoto || enhancedPhoto || showcaseBio !== (currentBio || '');

  return (
    <div className="space-y-6">
      {/* Portrait Section */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5 text-primary" />
            Retrato Executivo
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Foto formato retrato. A IA transforma em um retrato profissional de estúdio.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Photo Preview */}
            <div className="relative">
              <AspectRatio ratio={3 / 4} className="bg-muted/30 rounded-lg overflow-hidden border border-border">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt="Retrato"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10 opacity-40" />
                    <span className="text-xs">Sem foto</span>
                  </div>
                )}
                {isEnhancing && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Gerando retrato executivo...</span>
                  </div>
                )}
              </AspectRatio>
              {enhancedPhoto && (
                <div className="absolute top-2 right-2">
                  <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    IA
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {originalPhoto ? 'Trocar foto' : 'Enviar foto'}
              </Button>
              <Button
                onClick={handleEnhancePhoto}
                disabled={!originalPhoto || isEnhancing}
                className="w-full justify-start bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
              >
                {isEnhancing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Melhorar com IA
              </Button>
              {enhancedPhoto && (
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Retrato profissional gerado. Ao salvar, será usado como foto de vitrine.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio Section */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Apresentação Executiva
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Escreva sua visão sobre o mentorado e clique em "Gerar com IA" para criar uma apresentação premium.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sua visão sobre o mentorado e o negócio</Label>
            <Textarea
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
              placeholder="Ex: João é um empreendedor nato que transformou uma ideia simples em uma empresa que fatura 200k/mês. Especialista em vendas high-ticket no mercado de consultoria..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <Button
            onClick={handleGenerateBio}
            disabled={isGeneratingBio || !mentorNotes.trim()}
            className="w-full justify-center bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
          >
            {isGeneratingBio ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando apresentação...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" />Gerar com IA</>
            )}
          </Button>

          {showcaseBio && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Apresentação final (editável)</Label>
                <span className={`text-[10px] ${showcaseBio.length > 900 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {showcaseBio.length}/900
                </span>
              </div>
              <Textarea
                value={showcaseBio}
                onChange={(e) => setShowcaseBio(e.target.value.slice(0, 900))}
                className="min-h-[120px] text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      {hasChanges && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium"
          size="lg"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Salvar Vitrine</>
          )}
        </Button>
      )}
    </div>
  );
}
