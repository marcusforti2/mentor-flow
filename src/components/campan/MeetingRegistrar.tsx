import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Video, Calendar, Upload, FileText, Loader2, Trash2, Link as LinkIcon, Plus
} from 'lucide-react';

interface MeetingRegistrarProps {
  mentoradoMembershipId: string;
  mentorMembershipId: string;
  tenantId: string;
  onMeetingSaved?: () => void;
}

function detectVideoSource(url: string): string {
  if (!url) return 'manual';
  if (url.includes('tldv.io')) return 'tldv';
  if (url.includes('drive.google.com')) return 'google_drive';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function MeetingRegistrar({
  mentoradoMembershipId,
  mentorMembershipId,
  tenantId,
  onMeetingSaved,
}: MeetingRegistrarProps) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcription, setTranscription] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    setUploadedFile(file);
    setTranscription('');
    toast.success(`Arquivo "${file.name}" selecionado.`);
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    if (!meetingTitle.trim()) {
      toast.error('Título da reunião é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      // Read file content if uploaded
      let rawText = transcription.trim() || null;
      let fileUrl: string | null = null;
      let inputType = 'text';

      if (uploadedFile) {
        inputType = 'file';
        rawText = uploadedFile.name; // placeholder, actual content processed later via extract-tasks
        // Could upload to storage here if needed
      }

      const insertData = {
        mentorado_membership_id: mentoradoMembershipId,
        mentor_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        input_type: inputType,
        raw_text: rawText,
        video_url: videoUrl.trim() || null,
        video_source: detectVideoSource(videoUrl),
        meeting_title: meetingTitle.trim(),
        meeting_date: meetingDate || null,
      };

      const { error } = await supabase
        .from('meeting_transcripts')
        .insert(insertData);

      if (error) throw error;

      toast.success('Reunião registrada com sucesso!');
      
      // Reset form
      setMeetingTitle('');
      setMeetingDate('');
      setVideoUrl('');
      setTranscription('');
      clearFile();
      setIsExpanded(false);
      onMeetingSaved?.();
    } catch (err: any) {
      console.error('[MeetingRegistrar] Save error:', err);
      toast.error(err.message || 'Erro ao salvar reunião');
    } finally {
      setIsSaving(false);
    }
  };

  const detectedSource = detectVideoSource(videoUrl);
  const sourceLabel = detectedSource === 'tldv' ? 'tl;dv' : detectedSource === 'google_drive' ? 'Google Drive' : detectedSource === 'youtube' ? 'YouTube' : '';

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setIsExpanded(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Registrar Reunião
      </Button>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Registrar Reunião
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Title & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Título *</Label>
            <Input
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Ex: Reunião semanal"
              className="h-8 text-sm"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data/hora</Label>
            <Input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="h-8 text-sm"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Video URL */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1.5">
            <LinkIcon className="h-3 w-3" />
            Link do vídeo
            {sourceLabel && (
              <span className="text-primary text-[10px] font-medium ml-1">
                ({sourceLabel} detectado)
              </span>
            )}
          </Label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube, Google Drive, tl;dv ou qualquer link..."
            className="h-8 text-sm"
            disabled={isSaving}
          />
        </div>

        {/* Transcription */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Transcrição (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
            >
              <Upload className="h-3 w-3 mr-1" />
              PDF/Word
            </Button>
          </div>

          {uploadedFile ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="truncate flex-1">{uploadedFile.name}</span>
              <span className="text-muted-foreground text-xs">
                ({(uploadedFile.size / 1024).toFixed(0)}KB)
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearFile}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="Cole aqui a transcrição da reunião..."
              className="min-h-[80px] bg-secondary/30 text-sm"
              disabled={isSaving}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !meetingTitle.trim()}
            className="gradient-gold text-primary-foreground"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Video className="h-4 w-4 mr-1" />}
            Salvar Reunião
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
