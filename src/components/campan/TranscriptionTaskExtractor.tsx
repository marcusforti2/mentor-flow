import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, Sparkles, Loader2, Trash2, Save, RefreshCw, 
  Calendar, AlertCircle, CheckCircle2, Plus, Upload
} from 'lucide-react';

interface ExtractedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  tags: string[];
  confidence: number;
  selected: boolean;
}

interface TranscriptionTaskExtractorProps {
  mentoradoMembershipId: string;
  mentorMembershipId: string;
  tenantId: string;
  onTasksSaved?: () => void;
}

type ExtractionState = 'idle' | 'reading' | 'extracting' | 'done' | 'error';

export function TranscriptionTaskExtractor({
  mentoradoMembershipId,
  mentorMembershipId,
  tenantId,
  onTasksSaved,
}: TranscriptionTaskExtractorProps) {
  const [transcription, setTranscription] = useState('');
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [state, setState] = useState<ExtractionState>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    
    setUploadedFile(file);
    setTranscription(''); // clear text when file is selected
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
        // Remove data:...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = async () => {
    const hasText = transcription.trim().length >= 20;
    const hasFile = !!uploadedFile;
    
    if (!hasText && !hasFile) {
      toast.error('Cole uma transcrição (mín. 20 chars) ou envie um arquivo PDF/Word.');
      return;
    }

    setState('reading');
    setErrorMsg('');

    try {
      // Save transcript
      const { data: transcript, error: txError } = await supabase
        .from('meeting_transcripts')
        .insert({
          mentorado_membership_id: mentoradoMembershipId,
          mentor_membership_id: mentorMembershipId,
          tenant_id: tenantId,
          input_type: hasFile ? 'file' : 'text',
          raw_text: hasText ? transcription.trim() : (uploadedFile?.name || null),
        })
        .select('id')
        .single();

      if (txError) {
        console.error('[Campan] Transcript save failed:', txError);
        throw new Error(`Erro ao salvar transcrição: ${txError.message}`);
      }
      setTranscriptId(transcript.id);

      setState('extracting');

      // Build request body
      let invokeBody: any = {};
      if (hasFile && uploadedFile) {
        const base64 = await fileToBase64(uploadedFile);
        invokeBody = {
          file_base64: base64,
          file_mime_type: uploadedFile.type || 'application/pdf',
        };
      } else {
        invokeBody = { transcription: transcription.trim() };
      }

      // Call AI
      const { data, error } = await supabase.functions.invoke('extract-tasks', {
        body: invokeBody,
      });

      if (error) {
        console.error('[Campan] AI call failed:', error);
        throw new Error(`Erro na IA: ${error.message}`);
      }
      if (data?.error) throw new Error(data.error);

      const extracted: ExtractedTask[] = (data?.tasks || []).map((t: any) => ({
        title: t.title || '',
        description: t.description || '',
        priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
        due_date: t.due_date || null,
        tags: Array.isArray(t.tags) ? t.tags : [],
        confidence: typeof t.confidence === 'number' ? t.confidence : 0.5,
        selected: true,
      }));

      if (extracted.length === 0) {
        toast.info('Nenhuma tarefa encontrada. Use "Adicionar tarefa manual".');
      }

      setTasks(extracted);

      // Save draft
      await supabase.from('extracted_task_drafts').insert([{
        transcript_id: transcript.id,
        mentorado_membership_id: mentoradoMembershipId,
        mentor_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        tasks_json: extracted as any,
        status: 'draft',
      }]);

      setState('done');
    } catch (err: any) {
      console.error('[Campan] Extract error:', err);
      setErrorMsg(err.message || 'Erro ao processar transcrição');
      toast.error(err.message || 'Erro ao processar transcrição');
      setState('error');
    }
  };

  const handleRegenerate = () => {
    setTasks([]);
    setState('idle');
    handleExtract();
  };

  const updateTask = (index: number, updates: Partial<ExtractedTask>) => {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const selected = tasks.filter(t => t.selected);
    if (selected.length === 0) {
      toast.error('Selecione pelo menos uma tarefa.');
      return;
    }

    setIsSaving(true);
    try {
      const inserts = selected.map(t => ({
        mentorado_membership_id: mentoradoMembershipId,
        created_by_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        title: t.title,
        description: t.description || null,
        priority: t.priority,
        due_date: t.due_date || null,
        tags: t.tags,
        status_column: 'a_fazer',
        source_transcript_id: transcriptId,
        task_hash: `${mentoradoMembershipId}_${transcriptId}_${t.title.toLowerCase().replace(/\s+/g, '_').slice(0, 50)}`,
      }));

      // Try batch insert first
      const { error } = await supabase.from('campan_tasks').insert(inserts);
      
      if (error) {
        console.warn('[Campan] Batch insert failed, trying individual:', error.message);
        // Fallback: insert individually
        let successCount = 0;
        let failedCount = 0;
        for (const insert of inserts) {
          const { error: indError } = await supabase.from('campan_tasks').insert(insert);
          if (indError) {
            console.error('[Campan] Individual insert failed:', indError.message);
            failedCount++;
          } else {
            successCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} tarefa(s) salva(s). ${failedCount > 0 ? `${failedCount} falharam.` : ''}`);
        } else {
          throw new Error(`Todas as ${failedCount} inserções falharam. Verifique permissões.`);
        }
      } else {
        toast.success(`${selected.length} tarefa(s) salva(s) no Campan!`);
      }

      // Update draft status
      if (transcriptId) {
        await supabase
          .from('extracted_task_drafts')
          .update({ status: 'saved' })
          .eq('transcript_id', transcriptId);
      }

      setTasks([]);
      setTranscription('');
      clearFile();
      setState('idle');
      setTranscriptId(null);
      onTasksSaved?.();
    } catch (err: any) {
      console.error('[Campan] Save error:', err);
      toast.error(err.message || 'Erro ao salvar tarefas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManual = async () => {
    if (!manualForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSavingManual(true);
    try {
      const { error } = await supabase.from('campan_tasks').insert({
        mentorado_membership_id: mentoradoMembershipId,
        created_by_membership_id: mentorMembershipId,
        tenant_id: tenantId,
        title: manualForm.title.trim(),
        description: manualForm.description.trim() || null,
        priority: manualForm.priority,
        due_date: manualForm.due_date || null,
        status_column: 'a_fazer',
        tags: [],
      });

      if (error) throw error;

      toast.success('Tarefa manual criada!');
      setShowManualModal(false);
      setManualForm({ title: '', description: '', priority: 'medium', due_date: '' });
      onTasksSaved?.();
    } catch (err: any) {
      console.error('[Campan] Manual task error:', err);
      toast.error(err.message || 'Erro ao criar tarefa manual');
    } finally {
      setIsSavingManual(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Transcrição → Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cole a transcrição ou envie um arquivo (PDF / Word)</Label>
            
            {/* File upload area */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={state === 'reading' || state === 'extracting'}
              >
                <Upload className="h-4 w-4 mr-2" />
                Enviar PDF / Word
              </Button>
              {uploadedFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate max-w-[200px]">{uploadedFile.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({(uploadedFile.size / 1024).toFixed(0)}KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={clearFile}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {!uploadedFile && (
              <Textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Ou cole aqui a transcrição da reunião com o mentorado..."
                className="min-h-[120px] bg-secondary/30"
                disabled={state === 'reading' || state === 'extracting'}
              />
            )}
          </div>

          {state === 'reading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando transcrição...
            </div>
          )}
          {state === 'extracting' && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Extraindo tarefas com IA...
            </div>
          )}
          {state === 'error' && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMsg}
              </div>
              <p className="text-xs text-muted-foreground">
                Use o botão "Adicionar tarefa manual" para criar tarefas sem IA.
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {(state === 'idle' || state === 'error') && (
              <Button 
                onClick={handleExtract} 
                disabled={!transcription.trim() && !uploadedFile}
                className="gradient-gold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar tarefas com IA
              </Button>
            )}
            {state === 'error' && (
              <Button variant="outline" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            )}
            {/* Always visible manual add button */}
            <Button variant="outline" onClick={() => setShowManualModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar tarefa manual
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task review */}
      {state === 'done' && tasks.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {tasks.length} tarefa(s) encontrada(s) — Revise antes de salvar
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRegenerate}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regerar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={isSaving || tasks.filter(t => t.selected).length === 0}
                  className="gradient-gold text-primary-foreground"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                  Salvar tarefas ({tasks.filter(t => t.selected).length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-all ${
                  task.selected 
                    ? 'bg-secondary/30 border-border' 
                    : 'bg-muted/20 border-transparent opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.selected}
                    onCheckedChange={(checked) => updateTask(idx, { selected: !!checked })}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(idx, { title: e.target.value })}
                      className="font-medium bg-transparent border-none p-0 h-auto text-sm focus-visible:ring-0"
                      placeholder="Título da tarefa"
                    />
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(idx, { description: e.target.value })}
                      className="bg-transparent border-none p-0 min-h-0 h-auto text-xs text-muted-foreground resize-none focus-visible:ring-0"
                      placeholder="Descrição (opcional)"
                      rows={1}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={task.priority}
                        onValueChange={(v) => updateTask(idx, { priority: v as any })}
                      >
                        <SelectTrigger className="w-[100px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Baixa</SelectItem>
                          <SelectItem value="medium">🟡 Média</SelectItem>
                          <SelectItem value="high">🔴 Alta</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="date"
                        value={task.due_date || ''}
                        onChange={(e) => updateTask(idx, { due_date: e.target.value || null })}
                        className="w-[140px] h-7 text-xs"
                      />

                      {task.tags.map((tag, ti) => (
                        <Badge key={ti} variant="outline" className="text-xs h-6">
                          {tag}
                        </Badge>
                      ))}

                      <Badge variant="outline" className="text-xs h-6 ml-auto">
                        {Math.round(task.confidence * 100)}% confiança
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTask(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual task modal */}
      <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar tarefa manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={manualForm.title}
                onChange={(e) => setManualForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Revisar proposta comercial"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={manualForm.description}
                onChange={(e) => setManualForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes opcionais..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={manualForm.priority} onValueChange={(v) => setManualForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={manualForm.due_date}
                  onChange={(e) => setManualForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveManual} disabled={isSavingManual || !manualForm.title.trim()}>
              {isSavingManual ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
