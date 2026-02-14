import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentUrl?: string | null;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  onUploaded?: (url: string) => void;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function AvatarUpload({ currentUrl, fallbackText = 'U', size = 'md', onUploaded }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentUrl || '';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onUploaded?.(publicUrl);
      toast.success('Avatar atualizado!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Erro ao enviar avatar');
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative group inline-block">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={displayUrl} />
        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
          {fallbackText}
        </AvatarFallback>
      </Avatar>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Camera className={iconSizes[size]} />
        )}
      </Button>
    </div>
  );
}