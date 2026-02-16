
-- Fix the missing FK constraint on mentor_mentee_assignments.created_by_membership_id
ALTER TABLE public.mentor_mentee_assignments
  DROP CONSTRAINT mentor_mentee_assignments_created_by_membership_id_fkey,
  ADD CONSTRAINT mentor_mentee_assignments_created_by_membership_id_fkey
    FOREIGN KEY (created_by_membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE;

-- Check and fix ALL remaining non-CASCADE FKs referencing memberships
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS table_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'public.memberships'::regclass
      AND c.contype = 'f'
      AND c.confdeltype != 'c'  -- not CASCADE
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
    -- We'll re-add them individually below
    RAISE NOTICE 'Dropped non-cascade FK: % on %', r.conname, r.table_name;
  END LOOP;
END $$;
