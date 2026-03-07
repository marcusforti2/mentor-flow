import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  MessageSquare, Loader2, Send, Sparkles, RefreshCw, Edit2
} from 'lucide-react';
import type { Trail, TrailModule, TrailLesson } from '@/hooks/useTrails';

interface TrailScriptSenderProps {
  trail: Trail;
  module?: TrailModule;
  lessons: TrailLesson[];
}

export function TrailScriptSender({ trail, module, lessons }: TrailScriptSenderProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);

  const [equipment, setEquipment] = useState('celular');
  const [recordStyle, setRecordStyle] = useState('talking_head');
  const [videoDuration, setVideoDuration] = useState('5-10');
  const [extraNotes, setExtraNotes] = useState('');

  const handlePreview = async () => {
    setGeneratingMsg(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-trail-scripts', {
        body: {
          mentorName: mentorName || 'Mentor',
          trailTitle: trail.title,
          moduleTitle: module?.title || 'Módulo único',
          lessons: lessons.map(l => ({ title: l.title, description: l.description })),
          equipment,
          recordStyle,
          videoDuration,
          extraNotes: extraNotes || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedMsg(data.message || '');
      setEditingMsg(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar mensagem');
    }
    setGeneratingMsg(false);
  };

  const handleSend = async () => {
    if (!phone.trim()) { toast.error('Informe o telefone'); return; }
    if (!generatedMsg) { toast.error('Gere a mensagem primeiro'); return; }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone: phone.trim(), message: generatedMsg },
      });
      if (error) throw error;
      toast.success('Roteiro enviado via WhatsApp! 🚀');
      setOpen(false);
      setGeneratedMsg('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar');
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setGeneratedMsg(''); setEditingMsg(false); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/20 hover:text-primary" title="Enviar roteiro via WhatsApp">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-primary" />
            Enviar Roteiro via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs">
            Trilha "{trail.title}" {module ? `— Módulo "${module.title}"` : ''} ({lessons.length} aulas)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[65vh]">
          <div className="space-y-3 pt-1 pr-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">Nome do destinatário</label>
                <Input value={mentorName} onChange={e => { setMentorName(e.target.value); setGeneratedMsg(''); }} placeholder="Ex: João" className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">WhatsApp</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5511999999999" className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">Equipamento</label>
                <Select value={equipment} onValueChange={(v) => { setEquipment(v); setGeneratedMsg(''); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celular">📱 Celular</SelectItem>
                    <SelectItem value="webcam">💻 Webcam</SelectItem>
                    <SelectItem value="camera_pro">🎥 Câmera Pro</SelectItem>
                    <SelectItem value="tela">🖥️ Tela</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">Estilo</label>
                <Select value={recordStyle} onValueChange={(v) => { setRecordStyle(v); setGeneratedMsg(''); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="talking_head">🗣️ Talking Head</SelectItem>
                    <SelectItem value="tela_narrada">🖥️ Screencast</SelectItem>
                    <SelectItem value="roleplay">🎭 Roleplay</SelectItem>
                    <SelectItem value="slides">📊 Slides</SelectItem>
                    <SelectItem value="misto">🔀 Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground mb-1 block">Duração</label>
                <Select value={videoDuration} onValueChange={(v) => { setVideoDuration(v); setGeneratedMsg(''); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-5">3-5 min</SelectItem>
                    <SelectItem value="5-10">5-10 min</SelectItem>
                    <SelectItem value="10-20">10-20 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-foreground mb-1 block">Observações extras (opcional)</label>
              <Input
                value={extraNotes}
                onChange={e => { setExtraNotes(e.target.value); setGeneratedMsg(''); }}
                placeholder="Ex: usar fundo branco, gravar em ambiente silencioso..."
                className="h-8 text-xs"
              />
            </div>

            {!generatedMsg ? (
              <Button
                onClick={handlePreview}
                disabled={generatingMsg}
                variant="outline"
                className="w-full gap-2 h-9 text-xs border-primary/30 text-primary hover:bg-primary/10"
              >
                {generatingMsg ? <><Loader2 className="h-3 w-3 animate-spin" /> Gerando mensagem com IA...</> : <><Sparkles className="h-3 w-3" /> Gerar mensagem com IA</>}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-primary" /> Prévia da mensagem
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingMsg(!editingMsg)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                      <Edit2 className="h-2 w-2" /> {editingMsg ? 'Visualizar' : 'Editar'}
                    </button>
                    <button onClick={() => { setGeneratedMsg(''); handlePreview(); }} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 ml-2">
                      <RefreshCw className="h-2 w-2" /> Regerar
                    </button>
                  </div>
                </div>
                {editingMsg ? (
                  <Textarea
                    value={generatedMsg}
                    onChange={e => setGeneratedMsg(e.target.value)}
                    rows={12}
                    className="text-[10px] font-mono leading-relaxed"
                  />
                ) : (
                  <div className="bg-secondary/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-[10px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{generatedMsg}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 text-xs h-9">Cancelar</Button>
              <Button
                onClick={handleSend}
                disabled={sending || !generatedMsg || !phone.trim()}
                className="flex-1 gap-1.5 text-xs h-9"
              >
                {sending ? <><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</> : <><Send className="h-3 w-3" /> Enviar</>}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
