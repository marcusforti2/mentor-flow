
ALTER TABLE public.meeting_transcripts
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS meeting_title TEXT,
  ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tldv_meeting_id TEXT;

-- Index for deduplication of tl;dv meetings
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_tldv_id ON public.meeting_transcripts(tldv_meeting_id) WHERE tldv_meeting_id IS NOT NULL;
