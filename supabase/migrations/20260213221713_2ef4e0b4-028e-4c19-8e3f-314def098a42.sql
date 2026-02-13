
-- Drop old unique constraint that prevents multiple journeys with same stage keys
DROP INDEX IF EXISTS idx_cs_journey_stages_tenant_key;

-- Create new unique constraint scoped to journey
CREATE UNIQUE INDEX idx_cs_journey_stages_journey_key ON public.cs_journey_stages (journey_id, stage_key);
