
-- Table: meeting_transcripts
CREATE TABLE public.meeting_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  mentor_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL DEFAULT 'text' CHECK (input_type IN ('pdf', 'text')),
  file_url TEXT,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage transcripts for their mentorados"
ON public.meeting_transcripts FOR ALL
USING (mentor_membership_id IN (
  SELECT id FROM public.memberships WHERE user_id = auth.uid()
));

CREATE POLICY "Mentorados can view their own transcripts"
ON public.meeting_transcripts FOR SELECT
USING (mentorado_membership_id IN (
  SELECT id FROM public.memberships WHERE user_id = auth.uid()
));

-- Table: extracted_task_drafts
CREATE TABLE public.extracted_task_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcript_id UUID NOT NULL REFERENCES public.meeting_transcripts(id) ON DELETE CASCADE,
  mentorado_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  mentor_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'discarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extracted_task_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage task drafts"
ON public.extracted_task_drafts FOR ALL
USING (mentor_membership_id IN (
  SELECT id FROM public.memberships WHERE user_id = auth.uid()
));

-- Table: campan_tasks (final tasks)
CREATE TABLE public.campan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  created_by_membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  status_column TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status_column IN ('a_fazer', 'fazendo', 'feito')),
  source_transcript_id UUID REFERENCES public.meeting_transcripts(id),
  task_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campan_tasks ENABLE ROW LEVEL SECURITY;

-- Mentorados can see and update their own tasks
CREATE POLICY "Mentorados can view their tasks"
ON public.campan_tasks FOR SELECT
USING (mentorado_membership_id IN (
  SELECT id FROM public.memberships WHERE user_id = auth.uid()
));

CREATE POLICY "Mentorados can update their tasks"
ON public.campan_tasks FOR UPDATE
USING (mentorado_membership_id IN (
  SELECT id FROM public.memberships WHERE user_id = auth.uid()
));

-- Mentors can manage tasks they created or for mentorados in their tenant
CREATE POLICY "Mentors can manage tasks"
ON public.campan_tasks FOR ALL
USING (created_by_membership_id IN (
  SELECT id FROM public.memberships WHERE user_id = auth.uid()
));

-- Mentors can view tasks of mentorados in their tenant
CREATE POLICY "Mentors can view tenant tasks"
ON public.campan_tasks FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('mentor', 'admin', 'master_admin')
));

-- Unique constraint for deduplication
CREATE UNIQUE INDEX idx_campan_tasks_hash ON public.campan_tasks(task_hash) WHERE task_hash IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_campan_tasks_updated_at
BEFORE UPDATE ON public.campan_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extracted_task_drafts_updated_at
BEFORE UPDATE ON public.extracted_task_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
