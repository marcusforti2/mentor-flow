import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MeetingVideoPlayer } from './MeetingVideoPlayer';
import { Video, FileText, Calendar, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  tenantId: string;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  tldv: { label: 'tl;dv', color: 'bg-blue-500' },
  google_drive: { label: 'Drive', color: 'bg-green-500' },
  youtube: { label: 'YouTube', color: 'bg-red-500' },
  manual: { label: 'Manual', color: 'bg-muted' },
};

export function MeetingHistoryList({ mentoradoMembershipId, tenantId }: MeetingHistoryListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transcriptModal, setTranscriptModal] = useState<Meeting | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, [mentoradoMembershipId]);

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
      {meetings.map((meeting) => {
        const source = SOURCE_LABELS[meeting.video_source || 'manual'] || SOURCE_LABELS.manual;
        const isExpanded = expandedId === meeting.id;
        const displayDate = meeting.meeting_date || meeting.created_at;

        return (
          <Card key={meeting.id} className="glass-card">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {meeting.meeting_title || 'Reunião'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(displayDate), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={`text-xs text-white border-0 ${source.color}`}>
                    {source.label}
                  </Badge>
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
      })}

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
    </div>
  );
}
