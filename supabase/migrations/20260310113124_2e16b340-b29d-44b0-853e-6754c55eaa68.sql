
-- Projects/Spaces
CREATE TABLE public.mentor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task statuses per project
CREATE TABLE public.mentor_task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  status_key TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks with hierarchy
CREATE TABLE public.mentor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID REFERENCES public.mentor_task_statuses(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  start_date DATE,
  estimated_minutes INT,
  actual_minutes INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklists inside tasks
CREATE TABLE public.mentor_task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dependencies between tasks
CREATE TABLE public.mentor_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Task comments
CREATE TABLE public.mentor_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time tracking entries
CREATE TABLE public.mentor_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mentor_tasks(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  minutes INT NOT NULL,
  description TEXT,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task automations
CREATE TABLE public.mentor_task_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.mentor_projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_mentor_tasks_project ON public.mentor_tasks(project_id);
CREATE INDEX idx_mentor_tasks_status ON public.mentor_tasks(status_id);
CREATE INDEX idx_mentor_tasks_parent ON public.mentor_tasks(parent_task_id);
CREATE INDEX idx_mentor_tasks_membership ON public.mentor_tasks(membership_id);
CREATE INDEX idx_mentor_projects_membership ON public.mentor_projects(membership_id);
CREATE INDEX idx_mentor_task_checklists_task ON public.mentor_task_checklists(task_id);

-- RLS
ALTER TABLE public.mentor_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_task_automations ENABLE ROW LEVEL SECURITY;

-- RLS policies - Staff can CRUD their own data within tenant
CREATE POLICY "Staff manage own projects" ON public.mentor_projects
  FOR ALL USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff manage statuses via project" ON public.mentor_task_statuses
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_projects p WHERE p.id = project_id AND is_tenant_staff(auth.uid(), p.tenant_id)
  ));

CREATE POLICY "Staff manage own tasks" ON public.mentor_tasks
  FOR ALL USING (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Staff manage checklists via task" ON public.mentor_task_checklists
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_tasks t WHERE t.id = task_id AND is_tenant_staff(auth.uid(), t.tenant_id)
  ));

CREATE POLICY "Staff manage dependencies via task" ON public.mentor_task_dependencies
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_tasks t WHERE t.id = task_id AND is_tenant_staff(auth.uid(), t.tenant_id)
  ));

CREATE POLICY "Staff manage comments via task" ON public.mentor_task_comments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_tasks t WHERE t.id = task_id AND is_tenant_staff(auth.uid(), t.tenant_id)
  ));

CREATE POLICY "Staff manage time entries via task" ON public.mentor_time_entries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.mentor_tasks t WHERE t.id = task_id AND is_tenant_staff(auth.uid(), t.tenant_id)
  ));

CREATE POLICY "Staff manage automations" ON public.mentor_task_automations
  FOR ALL USING (is_tenant_staff(auth.uid(), tenant_id));

-- Updated_at triggers
CREATE TRIGGER update_mentor_projects_updated_at BEFORE UPDATE ON public.mentor_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_tasks_updated_at BEFORE UPDATE ON public.mentor_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_task_automations_updated_at BEFORE UPDATE ON public.mentor_task_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_tasks;
