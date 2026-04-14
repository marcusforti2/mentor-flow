-- =====================================================
-- Security fix: validate caller belongs to tenant in RPCs
-- Prevents IDOR: any authenticated user was able to query
-- dashboard data of any tenant by passing an arbitrary _tenant_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_mentor_dashboard_stats(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result jsonb;
  v_caller_membership_id uuid;
  v_start_of_week timestamptz;
  v_end_of_week timestamptz;
  v_three_days_ago timestamptz;
  v_seven_days_ago timestamptz;
  v_mentorados_count int;
  v_active_count int;
  v_trails_count int;
  v_meetings_count int;
  v_sos_count int;
  v_engagement_rate int;
  v_recent_activity jsonb;
  v_top_ranking jsonb;
  v_trail_progress jsonb;
  v_sos_details jsonb;
  v_at_risk_details jsonb;
  v_recent_wins jsonb;
BEGIN
  -- ── SECURITY: verify caller is a staff member of _tenant_id ──────────────
  SELECT id INTO v_caller_membership_id
  FROM memberships
  WHERE user_id = auth.uid()
    AND tenant_id = _tenant_id
    AND role IN ('admin', 'ops', 'mentor', 'master_admin')
    AND status = 'active'
  LIMIT 1;

  IF v_caller_membership_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: caller is not a staff member of this tenant';
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  -- Time boundaries
  v_start_of_week := date_trunc('week', now());
  v_end_of_week := v_start_of_week + interval '7 days';
  v_three_days_ago := now() - interval '3 days';
  v_seven_days_ago := now() - interval '7 days';

  -- Counts
  SELECT count(*) INTO v_mentorados_count
  FROM memberships WHERE tenant_id = _tenant_id AND role = 'mentee' AND status = 'active';
  v_active_count := v_mentorados_count;

  SELECT count(*) INTO v_trails_count
  FROM trails WHERE tenant_id = _tenant_id;

  SELECT count(*) INTO v_meetings_count
  FROM meetings WHERE tenant_id = _tenant_id
    AND scheduled_at >= v_start_of_week AND scheduled_at < v_end_of_week;

  SELECT count(*) INTO v_sos_count
  FROM sos_requests WHERE tenant_id = _tenant_id AND status IN ('pending', 'in_progress');

  -- Engagement rate
  IF v_active_count > 0 THEN
    SELECT round(count(DISTINCT al.membership_id)::numeric / v_active_count * 100)::int
    INTO v_engagement_rate
    FROM activity_logs al
    JOIN memberships m ON m.id = al.membership_id
    WHERE al.tenant_id = _tenant_id
      AND al.created_at >= v_seven_days_ago
      AND m.role = 'mentee' AND m.status = 'active';
  ELSE
    v_engagement_rate := 0;
  END IF;

  -- Recent activity (last 10)
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_recent_activity
  FROM (
    SELECT al.id, al.action_type AS type,
      coalesce(al.action_description, al.action_type) AS title,
      al.created_at AS timestamp,
      p.full_name AS "mentoradoName"
    FROM activity_logs al
    LEFT JOIN memberships m ON m.id = al.membership_id
    LEFT JOIN profiles p ON p.user_id = m.user_id
    WHERE al.tenant_id = _tenant_id
    ORDER BY al.created_at DESC
    LIMIT 10
  ) t;

  -- Top ranking (top 5 by points)
  SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.points DESC), '[]'::jsonb)
  INTO v_top_ranking
  FROM (
    SELECT p.full_name AS name, coalesce(gs.total_points, 0) AS points, p.avatar_url AS avatar
    FROM memberships m
    LEFT JOIN profiles p ON p.user_id = m.user_id
    LEFT JOIN gamification_stats gs ON gs.membership_id = m.id
    WHERE m.tenant_id = _tenant_id AND m.role = 'mentee' AND m.status = 'active'
    ORDER BY points DESC
    LIMIT 5
  ) r;

  -- Trail progress summary
  SELECT coalesce(jsonb_agg(row_to_json(tp)::jsonb), '[]'::jsonb)
  INTO v_trail_progress
  FROM (
    SELECT t.title, count(DISTINCT tprog.membership_id) AS enrolled,
      round(avg(tprog.completion_percentage))::int AS avg_completion
    FROM trails t
    LEFT JOIN trail_progress tprog ON tprog.trail_id = t.id
    WHERE t.tenant_id = _tenant_id
    GROUP BY t.id, t.title
    ORDER BY enrolled DESC
    LIMIT 5
  ) tp;

  -- Open SOS details
  SELECT coalesce(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.created_at DESC), '[]'::jsonb)
  INTO v_sos_details
  FROM (
    SELECT sr.id, sr.title, sr.priority, sr.status, sr.created_at,
      p.full_name AS "mentoradoName"
    FROM sos_requests sr
    LEFT JOIN memberships m ON m.id = sr.mentee_membership_id
    LEFT JOIN profiles p ON p.user_id = m.user_id
    WHERE sr.tenant_id = _tenant_id AND sr.status IN ('pending', 'in_progress')
    ORDER BY sr.created_at DESC
    LIMIT 10
  ) s;

  -- At-risk mentees (inactive > 3 days)
  SELECT coalesce(jsonb_agg(row_to_json(ar)::jsonb), '[]'::jsonb)
  INTO v_at_risk_details
  FROM (
    SELECT m.id, p.full_name AS name, p.avatar_url AS avatar,
      max(al.created_at) AS last_active
    FROM memberships m
    LEFT JOIN profiles p ON p.user_id = m.user_id
    LEFT JOIN activity_logs al ON al.membership_id = m.id
    WHERE m.tenant_id = _tenant_id AND m.role = 'mentee' AND m.status = 'active'
    GROUP BY m.id, p.full_name, p.avatar_url
    HAVING max(al.created_at) < v_three_days_ago OR max(al.created_at) IS NULL
    LIMIT 10
  ) ar;

  -- Recent wins (certificates + high scores)
  SELECT coalesce(jsonb_agg(row_to_json(w)::jsonb ORDER BY w.created_at DESC), '[]'::jsonb)
  INTO v_recent_wins
  FROM (
    SELECT c.id, p.full_name AS name, t.title AS trail_title, c.created_at
    FROM certificates c
    JOIN memberships m ON m.id = c.membership_id
    JOIN profiles p ON p.user_id = m.user_id
    JOIN trails t ON t.id = c.trail_id
    WHERE c.tenant_id = _tenant_id
    ORDER BY c.created_at DESC
    LIMIT 5
  ) w;

  v_result := jsonb_build_object(
    'mentorados_count', v_mentorados_count,
    'active_count', v_active_count,
    'trails_count', v_trails_count,
    'meetings_count', v_meetings_count,
    'sos_count', v_sos_count,
    'engagement_rate', coalesce(v_engagement_rate, 0),
    'recent_activity', coalesce(v_recent_activity, '[]'::jsonb),
    'top_ranking', coalesce(v_top_ranking, '[]'::jsonb),
    'trail_progress', coalesce(v_trail_progress, '[]'::jsonb),
    'sos_details', coalesce(v_sos_details, '[]'::jsonb),
    'at_risk_details', coalesce(v_at_risk_details, '[]'::jsonb),
    'recent_wins', coalesce(v_recent_wins, '[]'::jsonb)
  );

  RETURN v_result;
END;
$function$;

-- Grant execute only to authenticated users (RLS + auth check inside handles the rest)
REVOKE ALL ON FUNCTION public.get_mentor_dashboard_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mentor_dashboard_stats(uuid) TO authenticated;
