import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Video, Calendar, Download, Key } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TldvMeeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  video_url: string;
  participants: string[];
}

interface TldvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { transcript: string; videoUrl: string; title: string; date: string; tldvMeetingId: string }) => void;
}

export function TldvImportModal({ open, onOpenChange, onImport }: TldvImportModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [meetings, setMeetings] = useState<TldvMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [step, setStep] = useState<'key' | 'list'>('key');
  const [loadingSavedKey, setLoadingSavedKey] = useState(false);

  // Load saved API key on open
  useEffect(() => {
    if (open) {
      loadSavedKey();
    }
  }, [open]);

  const loadSavedKey = async () => {
    setLoadingSavedKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('tldv_api_key')
        .eq('user_id', user.id)
        .single();

      if (data?.tldv_api_key) {
        setApiKey(data.tldv_api_key);
        setRememberKey(true);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSavedKey(false);
    }
  };

  const saveApiKey = async (key: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ tldv_api_key: key })
        .eq('user_id', user.id);
    } catch {
      // silent fail
    }
  };

  const clearSavedKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ tldv_api_key: null })
        .eq('user_id', user.id);
    } catch {
      // silent fail
    }
  };

  const fetchMeetings = async () => {
    if (!apiKey.trim()) {
      toast.error('Insira sua API Key do tl;dv');
      return;
    }

    setIsLoading(true);
    try {
      // Save or clear key based on checkbox
      if (rememberKey) {
        await saveApiKey(apiKey.trim());
      } else {
        await clearSavedKey();
      }

      const { data, error } = await supabase.functions.invoke('fetch-tldv-meetings', {
        body: { tldv_api_key: apiKey.trim(), limit: 20 },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setMeetings(data?.meetings || []);
      setStep('list');

      if ((data?.meetings || []).length === 0) {
        toast.info('Nenhuma reunião encontrada no tl;dv.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar reuniões do tl;dv');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (meeting: TldvMeeting) => {
    setIsImporting(meeting.id);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tldv-meetings', {
        body: { tldv_api_key: apiKey.trim(), meeting_id: meeting.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const m = data?.meeting;
      onImport({
        transcript: m?.transcript || '',
        videoUrl: m?.video_url || meeting.video_url,
        title: m?.title || meeting.title,
        date: m?.date || meeting.date,
        tldvMeetingId: meeting.id,
      });

      toast.success(`Reunião "${meeting.title}" importada!`);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar reunião');
    } finally {
      setIsImporting(null);
    }
  };

  const resetState = () => {
    setStep('key');
    setMeetings([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Importar do tl;dv
          </DialogTitle>
          <DialogDescription>
            {step === 'key'
              ? 'Insira sua API Key do tl;dv para listar reuniões recentes.'
              : `${meetings.length} reunião(ões) encontrada(s). Selecione uma para importar.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'key' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                API Key do tl;dv
              </Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={loadingSavedKey ? 'Carregando chave salva...' : 'Cole sua API Key aqui...'}
                disabled={loadingSavedKey}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-key"
                  checked={rememberKey}
                  onCheckedChange={(v) => setRememberKey(!!v)}
                />
                <label htmlFor="remember-key" className="text-xs text-muted-foreground cursor-pointer">
                  Lembrar esta chave
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtenha em{' '}
                <a href="https://tldv.io/app/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  tldv.io → Settings → API
                </a>
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={fetchMeetings} disabled={isLoading || !apiKey.trim() || loadingSavedKey}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Buscar reuniões
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-2">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium truncate">{meeting.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {meeting.date
                          ? format(new Date(meeting.date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })
                          : 'Data desconhecida'}
                        {meeting.participants.length > 0 && (
                          <span>• {meeting.participants.length} participante(s)</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImport(meeting)}
                      disabled={isImporting === meeting.id}
                    >
                      {isImporting === meeting.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      Importar
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('key')}>Voltar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
