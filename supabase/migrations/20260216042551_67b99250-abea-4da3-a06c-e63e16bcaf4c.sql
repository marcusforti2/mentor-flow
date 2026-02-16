
-- =============================================
-- PLAYBOOKS HUB - Schema
-- =============================================

-- Folders (containers for playbooks)
CREATE TABLE public.playbook_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  position INT NOT NULL DEFAULT 0,
  created_by_membership_id UUID NOT NULL REFERENCES public.memberships(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Playbooks (main content pages)
CREATE TABLE public.playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.playbook_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  content JSONB DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'mentor_only' CHECK (visibility IN ('mentor_only', 'all_mentees', 'specific_mentees', 'public')),
  position INT NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_by_membership_id UUID NOT NULL REFERENCES public.memberships(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Playbook Pages (subpages within a playbook)
CREATE TABLE public.playbook_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content JSONB DEFAULT '[]'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access rules (per-mentee visibility)
CREATE TABLE public.playbook_access_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playbook_id, membership_id)
);

-- Indexes
CREATE INDEX idx_playbook_folders_tenant ON public.playbook_folders(tenant_id);
CREATE INDEX idx_playbooks_tenant ON public.playbooks(tenant_id);
CREATE INDEX idx_playbooks_folder ON public.playbooks(folder_id);
CREATE INDEX idx_playbook_pages_playbook ON public.playbook_pages(playbook_id);
CREATE INDEX idx_playbook_access_rules_playbook ON public.playbook_access_rules(playbook_id);
CREATE INDEX idx_playbook_access_rules_membership ON public.playbook_access_rules(membership_id);

-- Updated_at triggers
CREATE TRIGGER update_playbook_folders_updated_at
  BEFORE UPDATE ON public.playbook_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_pages_updated_at
  BEFORE UPDATE ON public.playbook_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.playbook_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_access_rules ENABLE ROW LEVEL SECURITY;

-- FOLDERS: Staff can CRUD, mentees can read folders in their tenant
CREATE POLICY "Staff can manage folders"
  ON public.playbook_folders FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

CREATE POLICY "Mentees can view folders"
  ON public.playbook_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = auth.uid()
        AND tenant_id = playbook_folders.tenant_id
        AND status = 'active'
    )
  );

-- PLAYBOOKS: Staff can CRUD
CREATE POLICY "Staff can manage playbooks"
  ON public.playbooks FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

-- Mentees can view playbooks based on visibility
CREATE POLICY "Mentees can view allowed playbooks"
  ON public.playbooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = playbooks.tenant_id
        AND m.status = 'active'
        AND m.role = 'mentee'
    )
    AND (
      visibility = 'all_mentees'
      OR visibility = 'public'
      OR (
        visibility = 'specific_mentees'
        AND EXISTS (
          SELECT 1 FROM public.playbook_access_rules ar
          JOIN public.memberships m2 ON m2.id = ar.membership_id
          WHERE ar.playbook_id = playbooks.id
            AND m2.user_id = auth.uid()
            AND ar.can_view = true
        )
      )
    )
  );

-- PAGES: Staff can CRUD
CREATE POLICY "Staff can manage pages"
  ON public.playbook_pages FOR ALL
  USING (is_tenant_staff(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_staff(auth.uid(), tenant_id));

-- Mentees can view pages of accessible playbooks
CREATE POLICY "Mentees can view pages of accessible playbooks"
  ON public.playbook_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playbooks pb
      JOIN public.memberships m ON m.tenant_id = pb.tenant_id
      WHERE pb.id = playbook_pages.playbook_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role = 'mentee'
        AND (
          pb.visibility = 'all_mentees'
          OR pb.visibility = 'public'
          OR (
            pb.visibility = 'specific_mentees'
            AND EXISTS (
              SELECT 1 FROM public.playbook_access_rules ar
              JOIN public.memberships m2 ON m2.id = ar.membership_id
              WHERE ar.playbook_id = pb.id
                AND m2.user_id = auth.uid()
                AND ar.can_view = true
            )
          )
        )
    )
  );

-- ACCESS RULES: Staff can manage
CREATE POLICY "Staff can manage access rules"
  ON public.playbook_access_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.playbooks pb
      WHERE pb.id = playbook_access_rules.playbook_id
        AND is_tenant_staff(auth.uid(), pb.tenant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playbooks pb
      WHERE pb.id = playbook_access_rules.playbook_id
        AND is_tenant_staff(auth.uid(), pb.tenant_id)
    )
  );

-- Mentees can view their own access rules
CREATE POLICY "Mentees can view own access rules"
  ON public.playbook_access_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = playbook_access_rules.membership_id
        AND m.user_id = auth.uid()
    )
  );
