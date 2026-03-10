
-- Task attachments
CREATE TABLE public.mentor_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom fields definition per project
CREATE TABLE public.mentor_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, number, select, url, date, checkbox
  options JSONB DEFAULT '[]',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom field values per task
CREATE TABLE public.mentor_task_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.mentor_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, field_id)
);

-- Task templates
CREATE TABLE public.mentor_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals / OKRs
CREATE TABLE public.mentor_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Key Results linked to tasks
CREATE TABLE public.mentor_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.mentor_goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  linked_task_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sprints
CREATE TABLE public.mentor_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning', -- planning, active, completed
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add sprint_id and recurrence to tasks
ALTER TABLE public.mentor_tasks
  ADD COLUMN sprint_id UUID REFERENCES public.mentor_sprints(id) ON DELETE SET NULL,
  ADD COLUMN recurrence_rule TEXT, -- cron-like: daily, weekly, monthly, or custom
  ADD COLUMN recurrence_end DATE,
  ADD COLUMN is_recurring BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX idx_mentor_task_attachments_task ON public.mentor_task_attachments(task_id);
CREATE INDEX idx_mentor_custom_fields_project ON public.mentor_custom_fields(project_id);
CREATE INDEX idx_mentor_task_field_values_task ON public.mentor_task_field_values(task_id);
CREATE INDEX idx_mentor_goals_tenant ON public.mentor_goals(tenant_id);
CREATE INDEX idx_mentor_sprints_project ON public.mentor_sprints(project_id);
CREATE INDEX idx_mentor_tasks_sprint ON public.mentor_tasks(sprint_id);

-- RLS
ALTER TABLE public.mentor_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sprints ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff manage attachments via task" ON public.mentor_task_attachments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_tasks t WHERE t.id = task_id AND is_tenant_staff(auth.uid(), t.tenant_id)
  ));

CREATE POLICY "Staff manage custom fields via project" ON public.mentor_custom_fields
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_projects p WHERE p.id = project_id AND is_tenant_staff(auth.uid(), p.tenant_id)
  ));

CREATE POLICY "Staff manage field values via task" ON public.mentor_task_field_values
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_tasks t WHERE t.id = task_id AND is_tenant_staff(auth.uid(), t.tenant_id)
  ));

CREATE POLICY "Staff manage templates" ON public.mentor_task_templates
  FOR ALL USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff manage goals" ON public.mentor_goals
  FOR ALL USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff manage key results via goal" ON public.mentor_key_results
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_goals g WHERE g.id = goal_id AND is_tenant_staff(auth.uid(), g.tenant_id)
  ));

CREATE POLICY "Staff manage sprints" ON public.mentor_sprints
  FOR ALL USING (is_tenant_staff(auth.uid(), tenant_id));

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

CREATE POLICY "Staff upload task attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND is_tenant_staff(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "Staff read task attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-attachments' AND is_tenant_staff(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "Staff delete task attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'task-attachments' AND is_tenant_staff(auth.uid(), (storage.foldername(name))[1]::uuid));

-- Triggers
CREATE TRIGGER update_mentor_goals_updated_at BEFORE UPDATE ON public.mentor_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_sprints_updated_at BEFORE UPDATE ON public.mentor_sprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
