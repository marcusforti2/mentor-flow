import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MeetingVideoPlayer } from './MeetingVideoPlayer';
import { TaskExtractionModal } from './TaskExtractionModal';
import { Video, FileText, Calendar, ChevronDown, ChevronUp, Loader2, Search, CheckCircle2, Clock, AlertCircle, ListTodo, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  meeting_title: string | null;
  meeting_date: string | null;
  video_url: string | null;
  video_source: string | null;
  raw_text: string | null;
  input_type: string;
  created_at: string;
}

interface MeetingHistoryListProps {
  mentoradoMembershipId: string;
  mentorMembershipId?: string;
  tenantId: string;
  refreshKey?: number;
  onTasksSaved?: () => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  tldv: { label: 'tl;dv', color: 'bg-blue-500' },
  google_drive: { label: 'Drive', color: 'bg-green-500' },
  youtube: { label: 'YouTube', color: 'bg-red-500' },
  manual: { label: 'Manual', color: 'bg-muted' },
};

const SOURCE_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'tldv', label: 'tl;dv' },
  { key: 'google_drive', label: 'Drive' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'manual', label: 'Manual' },
];

const PAGE_SIZE = 10;

function detectVideoSource(url: string): string {
  if (!url) return 'manual';
  if (url.includes('tldv.io')) return 'tldv';
  if (url.includes('drive.google.com')) return 'google_drive';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

export function MeetingHistoryList({ mentoradoMembershipId, mentorMembershipId, tenantId, refreshKey, onTasksSaved }: MeetingHistoryListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transcriptModal, setTranscriptModal] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [extractionMeeting, setExtractionMeeting] = useState<Meeting | null>(null);

  // Edit state
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState({ title: '', date: '', videoUrl: '', rawText: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMentor = !!mentorMembershipId;

  useEffect(() => {
    fetchMeetings();
    fetchTaskCounts();
  }, [mentoradoMembershipId, refreshKey]);

  const fetchMeetings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('meeting_transcripts')
      .select('id, meeting_title, meeting_date, video_url, video_source, raw_text, input_type, created_at')
      .eq('mentorado_membership_id', mentoradoMembershipId)
      .eq('tenant_id', tenantId)
      .order('meeting_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMeetings(data as Meeting[]);
    }
    setIsLoading(false);
  };

  const fetchTaskCounts = async () => {
    const { data } = await supabase
      .from('campan_tasks')
      .select('source_transcript_id')
      .eq('mentorado_membership_id', mentoradoMembershipId)
      .eq('tenant_id', tenantId)
      .not('source_transcript_id', 'is', null);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((t) => {
        const id = t.source_transcript_id!;
        counts[id] = (counts[id] || 0) + 1;
      });
      setTaskCounts(counts);
    }
  };

  const filteredMeetings = useMemo(() => {
    let result = meetings;
    if (sourceFilter !== 'all') {
      result = result.filter((m) => (m.video_source || 'manual') === sourceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => (m.meeting_title || '').toLowerCase().includes(q));
    }
    return result;
  }, [meetings, sourceFilter, searchQuery]);

  const visibleMeetings = filteredMeetings.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMeetings.length;

  const getProcessingStatus = (meeting: Meeting) => {
    const count = taskCounts[meeting.id] || 0;
    if (count > 0) return { label: 'Processada', icon: CheckCircle2, className: 'text-green-500' };
    if (meeting.raw_text && meeting.raw_text.length > 50) return { label: 'Pendente', icon: Clock, className: 'text-yellow-500' };
    return { label: 'Sem transcrição', icon: AlertCircle, className: 'text-muted-foreground' };
  };

  const handleTasksSaved = () => {
    fetchTaskCounts();
    onTasksSaved?.();
  };

  // Edit handlers
  const openEdit = (meeting: Meeting) => {
    setEditForm({
      title: meeting.meeting_title || '',
      date: meeting.meeting_date ? meeting.meeting_date.slice(0, 16) : '',
      videoUrl: meeting.video_url || '',
      rawText: meeting.raw_text || '',
    });
    setEditingMeeting(meeting);
  };

  const handleSaveEdit = async () => {
    if (!editingMeeting || !editForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('meeting_transcripts')
        .update({
          meeting_title: editForm.title.trim(),
          meeting_date: editForm.date || null,
          video_url: editForm.videoUrl.trim() || null,
          video_source: detectVideoSource(editForm.videoUrl),
          raw_text: editForm.rawText.trim() || null,
        })
        .eq('id', editingMeeting.id);

      if (error) throw error;
      toast.success('Reunião atualizada!');
      setEditingMeeting(null);
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deletingMeeting) return;
    setIsDeleting(true);
    try {
      // Delete related tasks first
      await supabase
        .from('campan_tasks')
        .delete()
        .eq('source_transcript_id', deletingMeeting.id);

      // Delete related drafts
      await supabase
        .from('extracted_task_drafts')
        .delete()
        .eq('transcript_id', deletingMeeting.id);

      const { error } = await supabase
        .from('meeting_transcripts')
        .delete()
        .eq('id', deletingMeeting.id);

      if (error) throw error;
      toast.success('Reunião excluída!');
      setDeletingMeeting(null);
      fetchMeetings();
      fetchTaskCounts();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Nenhuma reunião registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar reunião..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SOURCE_FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={sourceFilter === f.key ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => { setSourceFilter(f.key); setVisibleCount(PAGE_SIZE); }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Meeting list */}
      {visibleMeetings.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">Nenhuma reunião encontrada.</p>
      ) : (
        visibleMeetings.map((meeting) => {
          const source = SOURCE_LABELS[meeting.video_source || 'manual'] || SOURCE_LABELS.manual;
          const isExpanded = expandedId === meeting.id;
          const displayDate = meeting.meeting_date || meeting.created_at;
          const status = getProcessingStatus(meeting);
          const StatusIcon = status.icon;
          const taskCount = taskCounts[meeting.id] || 0;
          const canExtract = mentorMembershipId && meeting.raw_text && meeting.raw_text.length > 50 && taskCount === 0;

          return (
            <Card key={meeting.id} className="glass-card">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {meeting.meeting_title || 'Reunião'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(displayDate), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className={`flex items-center gap-1 ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      {taskCount > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <ListTodo className="h-3 w-3" />
                          {taskCount} tarefa{taskCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-xs text-white border-0 ${source.color}`}>
                      {source.label}
                    </Badge>
                    {canExtract && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => setExtractionMeeting(meeting)}
                      >
                        <Sparkles className="h-3 w-3" />
                        Gerar Tarefas
                      </Button>
                    )}
                    {isMentor && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(meeting)}
                          title="Editar reunião"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingMeeting(meeting)}
                          title="Excluir reunião"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {meeting.video_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                    {meeting.raw_text && meeting.raw_text.length > 50 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setTranscriptModal(meeting)}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && meeting.video_url && (
                  <MeetingVideoPlayer videoUrl={meeting.video_url} videoSource={meeting.video_source || undefined} />
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Carregar mais ({filteredMeetings.length - visibleCount} restantes)
        </Button>
      )}

      {/* Transcript modal */}
      <Dialog open={!!transcriptModal} onOpenChange={() => setTranscriptModal(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{transcriptModal?.meeting_title || 'Transcrição'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground p-4">
              {transcriptModal?.raw_text}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit meeting modal */}
      <Dialog open={!!editingMeeting} onOpenChange={(open) => { if (!open) setEditingMeeting(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Título da reunião"
              />
            </div>
            <div className="space-y-2">
              <Label>Data/hora</Label>
              <Input
                type="datetime-local"
                value={editForm.date}
                onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Link do vídeo</Label>
              <Input
                value={editForm.videoUrl}
                onChange={(e) => setEditForm(f => ({ ...f, videoUrl: e.target.value }))}
                placeholder="YouTube, Google Drive, tl;dv..."
              />
            </div>
            <div className="space-y-2">
              <Label>Transcrição</Label>
              <Textarea
                value={editForm.rawText}
                onChange={(e) => setEditForm(f => ({ ...f, rawText: e.target.value }))}
                placeholder="Texto da transcrição..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMeeting(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editForm.title.trim()}>
              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingMeeting} onOpenChange={(open) => { if (!open) setDeletingMeeting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              A reunião "{deletingMeeting?.meeting_title || 'Reunião'}" será excluída permanentemente, junto com as tarefas vinculadas a ela. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Extraction Modal */}
      {extractionMeeting && mentorMembershipId && (
        <TaskExtractionModal
          open={!!extractionMeeting}
          onOpenChange={(open) => { if (!open) setExtractionMeeting(null); }}
          transcriptId={extractionMeeting.id}
          rawText={extractionMeeting.raw_text || ''}
          meetingTitle={extractionMeeting.meeting_title || 'Reunião'}
          mentoradoMembershipId={mentoradoMembershipId}
          mentorMembershipId={mentorMembershipId}
          tenantId={tenantId}
          onTasksSaved={handleTasksSaved}
        />
      )}
    </div>
  );
}
