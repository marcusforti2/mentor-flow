
-- Fix FK constraints on mentee_behavioral_analyses to allow membership deletion
ALTER TABLE public.mentee_behavioral_analyses
  DROP CONSTRAINT mentee_behavioral_analyses_generated_by_fkey,
  ADD CONSTRAINT mentee_behavioral_analyses_generated_by_fkey
    FOREIGN KEY (generated_by) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.mentee_behavioral_analyses
  DROP CONSTRAINT mentee_behavioral_analyses_membership_id_fkey,
  ADD CONSTRAINT mentee_behavioral_analyses_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

-- Also fix other tables that reference memberships to prevent future issues
ALTER TABLE public.mentor_mentee_assignments
  DROP CONSTRAINT IF EXISTS mentor_mentee_assignments_mentor_membership_id_fkey,
  ADD CONSTRAINT mentor_mentee_assignments_mentor_membership_id_fkey
    FOREIGN KEY (mentor_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.mentor_mentee_assignments
  DROP CONSTRAINT IF EXISTS mentor_mentee_assignments_mentee_membership_id_fkey,
  ADD CONSTRAINT mentor_mentee_assignments_mentee_membership_id_fkey
    FOREIGN KEY (mentee_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.impersonation_logs
  DROP CONSTRAINT impersonation_logs_admin_membership_id_fkey,
  ADD CONSTRAINT impersonation_logs_admin_membership_id_fkey
    FOREIGN KEY (admin_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.impersonation_logs
  DROP CONSTRAINT impersonation_logs_target_membership_id_fkey,
  ADD CONSTRAINT impersonation_logs_target_membership_id_fkey
    FOREIGN KEY (target_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.activity_logs
  DROP CONSTRAINT activity_logs_membership_id_fkey,
  ADD CONSTRAINT activity_logs_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.campan_tasks
  DROP CONSTRAINT campan_tasks_created_by_membership_id_fkey,
  ADD CONSTRAINT campan_tasks_created_by_membership_id_fkey
    FOREIGN KEY (created_by_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.campan_tasks
  DROP CONSTRAINT campan_tasks_mentorado_membership_id_fkey,
  ADD CONSTRAINT campan_tasks_mentorado_membership_id_fkey
    FOREIGN KEY (mentorado_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.extracted_task_drafts
  DROP CONSTRAINT extracted_task_drafts_mentor_membership_id_fkey,
  ADD CONSTRAINT extracted_task_drafts_mentor_membership_id_fkey
    FOREIGN KEY (mentor_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.extracted_task_drafts
  DROP CONSTRAINT extracted_task_drafts_mentorado_membership_id_fkey,
  ADD CONSTRAINT extracted_task_drafts_mentorado_membership_id_fkey
    FOREIGN KEY (mentorado_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_transcripts
  DROP CONSTRAINT meeting_transcripts_mentor_membership_id_fkey,
  ADD CONSTRAINT meeting_transcripts_mentor_membership_id_fkey
    FOREIGN KEY (mentor_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_transcripts
  DROP CONSTRAINT meeting_transcripts_mentorado_membership_id_fkey,
  ADD CONSTRAINT meeting_transcripts_mentorado_membership_id_fkey
    FOREIGN KEY (mentorado_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;
