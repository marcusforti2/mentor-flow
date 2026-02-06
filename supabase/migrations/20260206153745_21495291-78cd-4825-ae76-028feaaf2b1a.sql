
-- Update status constraint to include 'new' and align with frontend
ALTER TABLE crm_prospections DROP CONSTRAINT crm_prospections_status_check;
ALTER TABLE crm_prospections ADD CONSTRAINT crm_prospections_status_check 
  CHECK (status = ANY (ARRAY['new', 'contacted', 'interested', 'meeting_scheduled', 'proposal_sent', 'closed_won', 'closed_lost']));

-- Update existing leads that might have old statuses
UPDATE crm_prospections SET status = 'closed_won' WHERE status = 'closed';
UPDATE crm_prospections SET status = 'closed_lost' WHERE status = 'lost';
