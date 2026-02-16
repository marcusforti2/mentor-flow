ALTER TABLE public.playbook_folders ADD COLUMN is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.playbooks ADD COLUMN is_pinned BOOLEAN DEFAULT false;