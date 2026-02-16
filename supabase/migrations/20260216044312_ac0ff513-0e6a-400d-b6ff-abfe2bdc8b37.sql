-- Allow anonymous read of pages for public playbooks
CREATE POLICY "Anyone can view pages of public playbooks"
ON public.playbook_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playbooks
    WHERE playbooks.id = playbook_pages.playbook_id
    AND playbooks.visibility = 'public'
    AND playbooks.public_slug IS NOT NULL
  )
);