
-- Add cover_position column to playbook_folders
ALTER TABLE public.playbook_folders
ADD COLUMN cover_position text NOT NULL DEFAULT 'center';

-- Add cover_position column to playbooks
ALTER TABLE public.playbooks
ADD COLUMN cover_position text NOT NULL DEFAULT 'center';
