
-- =====================================================
-- RPC: get_mentor_dashboard_stats
-- Consolidates all mentor dashboard data in one call
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
  -- Time boundaries
  v_start_of_week := date_trunc('week', now());
  v_end_of_week := v_start_of_week + interval '7 days';
  v_three_days_ago := now() - interval '3 days';
  v_seven_days_ago := now() - interval '7 days';

  -- Counts
  SELECT count(*) INTO v_mentorados_count
  FROM memberships WHERE tenant_id = _tenant_id AND role = 'mentee' AND status = 'active';
  v_active_count := v_mentorados_count; -- all active by definition

  SELECT count(*) INTO v_trails_count
  FROM trails WHERE tenant_id = _tenant_id;

  SELECT count(*) INTO v_meetings_count
  FROM meetings WHERE tenant_id = _tenant_id
    AND scheduled_at >= v_start_of_week AND scheduled_at < v_end_of_week;

  SELECT count(*) INTO v_sos_count
  FROM sos_requests WHERE tenant_id = _tenant_id AND status IN ('pending', 'in_progress');

  -- Engagement rate: mentees with activity in last 7 days / total active
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
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.position), '[]'::jsonb)
  INTO v_top_ranking
  FROM (
    SELECT
      row_number() OVER (ORDER BY re.points DESC NULLS LAST)::int AS position,
      coalesce(p.full_name, 'Sem nome') AS name,
      coalesce(re.points, 0) AS points,
      re.membership_id AS "mentoradoId"
    FROM ranking_entries re
    JOIN memberships m ON m.id = re.membership_id
    LEFT JOIN profiles p ON p.user_id = m.user_id
    WHERE m.tenant_id = _tenant_id AND m.role = 'mentee'
    ORDER BY re.points DESC NULLS LAST
    LIMIT 5
  ) t;

  -- Trail progress (first 3 trails)
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_trail_progress
  FROM (
    SELECT tr.id, tr.title AS name,
      CASE WHEN count(tl.id) = 0 THEN 0
        ELSE round(count(tp.id) FILTER (WHERE tp.completed = true)::numeric / count(tl.id) * 100)::int
      END AS progress
    FROM trails tr
    LEFT JOIN trail_modules tm ON tm.trail_id = tr.id
    LEFT JOIN trail_lessons tl ON tl.module_id = tm.id
    LEFT JOIN trail_progress tp ON tp.lesson_id = tl.id AND tp.tenant_id = _tenant_id
    WHERE tr.tenant_id = _tenant_id
    GROUP BY tr.id, tr.title
    ORDER BY tr.created_at
    LIMIT 3
  ) t;

  -- SOS details (last 5 pending)
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t."createdAt" DESC), '[]'::jsonb)
  INTO v_sos_details
  FROM (
    SELECT sr.id, sr.title,
      coalesce(sr.priority, 'medium') AS priority,
      coalesce(sr.category, '') AS category,
      coalesce(p.full_name, 'Mentorado') AS "mentoradoName",
      sr.created_at AS "createdAt"
    FROM sos_requests sr
    LEFT JOIN memberships m ON m.id = sr.membership_id
    LEFT JOIN profiles p ON p.user_id = m.user_id
    WHERE sr.tenant_id = _tenant_id AND sr.status IN ('pending', 'in_progress')
    ORDER BY sr.created_at DESC
    LIMIT 5
  ) t;

  -- At-risk mentees (no activity in 3+ days, top 5)
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t."daysSinceActivity" DESC), '[]'::jsonb)
  INTO v_at_risk_details
  FROM (
    SELECT m.id AS "membershipId",
      coalesce(p.full_name, 'Sem nome') AS name,
      last_act.last_at AS "lastActivityAt",
      CASE
        WHEN last_act.last_at IS NULL THEN 999
        ELSE extract(epoch FROM (now() - last_act.last_at))::int / 86400
      END AS "daysSinceActivity"
    FROM memberships m
    LEFT JOIN profiles p ON p.user_id = m.user_id
    LEFT JOIN LATERAL (
      SELECT max(al.created_at) AS last_at
      FROM activity_logs al
      WHERE al.membership_id = m.id AND al.tenant_id = _tenant_id
    ) last_act ON true
    WHERE m.tenant_id = _tenant_id AND m.role = 'mentee' AND m.status = 'active'
      AND (last_act.last_at IS NULL OR last_act.last_at < v_three_days_ago)
    ORDER BY CASE WHEN last_act.last_at IS NULL THEN 0 ELSE 1 END, last_act.last_at
    LIMIT 5
  ) t;

  -- Recent wins (last 5)
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.timestamp DESC), '[]'::jsonb)
  INTO v_recent_wins
  FROM (
    SELECT al.id,
      coalesce(al.action_description, al.action_type) AS description,
      coalesce(p.full_name, 'Mentorado') AS "mentoradoName",
      al.created_at AS timestamp
    FROM activity_logs al
    LEFT JOIN memberships m ON m.id = al.membership_id
    LEFT JOIN profiles p ON p.user_id = m.user_id
    WHERE al.tenant_id = _tenant_id
      AND al.action_type IN ('lead_closed_won', 'deal_closed', 'trail_completed')
    ORDER BY al.created_at DESC
    LIMIT 5
  ) t;

  -- Build result
  v_result := jsonb_build_object(
    'mentoradosCount', v_mentorados_count,
    'activeMentoradosCount', v_active_count,
    'atRiskCount', coalesce(jsonb_array_length(v_at_risk_details), 0),
    'sosCount', v_sos_count,
    'meetingsThisWeek', v_meetings_count,
    'engagementRate', v_engagement_rate,
    'trailsCount', v_trails_count,
    'recentActivity', v_recent_activity,
    'topRanking', v_top_ranking,
    'trailProgress', v_trail_progress,
    'sosDetails', v_sos_details,
    'atRiskDetails', v_at_risk_details,
    'recentWins', v_recent_wins
  );

  RETURN v_result;
END;
$function$;

-- =====================================================
-- RPC: get_mentee_dashboard_stats
-- Consolidates all mentee dashboard data in one call
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_mentee_dashboard_stats(_membership_id uuid, _tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result jsonb;
  v_total_prospections int;
  v_monthly_prospections int;
  v_total_points int;
  v_ranking_position int;
  v_next_meeting jsonb;
  v_trail_progress jsonb;
  v_start_of_month timestamptz;
BEGIN
  v_start_of_month := date_trunc('month', now());

  -- Total prospections
  SELECT count(*) INTO v_total_prospections
  FROM crm_prospections WHERE membership_id = _membership_id;

  -- Monthly prospections
  SELECT count(*) INTO v_monthly_prospections
  FROM crm_prospections WHERE membership_id = _membership_id
    AND created_at >= v_start_of_month;

  -- Total points
  SELECT coalesce(max(re.points), 0) INTO v_total_points
  FROM ranking_entries re WHERE re.membership_id = _membership_id;

  -- Ranking position
  SELECT pos INTO v_ranking_position
  FROM (
    SELECT re.membership_id,
      row_number() OVER (ORDER BY re.points DESC NULLS LAST)::int AS pos
    FROM ranking_entries re
    JOIN memberships m ON m.id = re.membership_id
    WHERE m.tenant_id = _tenant_id AND m.role = 'mentee'
  ) ranked
  WHERE ranked.membership_id = _membership_id;

  -- Next meeting
  SELECT to_jsonb(t) INTO v_next_meeting
  FROM (
    SELECT mt.id, mt.title,
      mt.scheduled_at AS "scheduledAt",
      mt.meeting_url AS "meetingUrl"
    FROM meetings mt
    WHERE mt.tenant_id = _tenant_id AND mt.scheduled_at >= now()
    ORDER BY mt.scheduled_at
    LIMIT 1
  ) t;

  -- Trail progress (all trails with progress for this membership)
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_trail_progress
  FROM (
    SELECT tr.id, tr.title AS name,
      CASE WHEN count(tl.id) = 0 THEN 0
        ELSE round(
          count(tp.id) FILTER (WHERE tp.completed = true AND tp.membership_id = _membership_id)::numeric
          / count(tl.id) * 100
        )::int
      END AS progress
    FROM trails tr
    JOIN trail_modules tm ON tm.trail_id = tr.id
    JOIN trail_lessons tl ON tl.module_id = tm.id
    LEFT JOIN trail_progress tp ON tp.lesson_id = tl.id AND tp.membership_id = _membership_id
    WHERE tr.tenant_id = _tenant_id
    GROUP BY tr.id, tr.title
    HAVING count(tp.id) FILTER (WHERE tp.membership_id = _membership_id) > 0
    ORDER BY max(tp.created_at) DESC NULLS LAST
  ) t;

  v_result := jsonb_build_object(
    'rankingPosition', v_ranking_position,
    'totalProspections', v_total_prospections,
    'monthlyProspections', v_monthly_prospections,
    'totalPoints', v_total_points,
    'nextMeeting', coalesce(v_next_meeting, 'null'::jsonb),
    'trailProgress', v_trail_progress
  );

  RETURN v_result;
END;
$function$;
