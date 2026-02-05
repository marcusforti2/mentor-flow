import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';

export interface MentorDashboardStats {
  mentoradosCount: number;
  activeMentoradosCount: number;
  atRiskCount: number;
  sosCount: number;
  meetingsThisWeek: number;
  engagementRate: number;
  trailsCount: number;
  recentActivity: ActivityItem[];
  topRanking: RankingItem[];
  trailProgress: TrailProgressItem[];
}

export interface MenteeDashboardStats {
  rankingPosition: number | null;
  totalProspections: number;
  monthlyProspections: number;
  totalPoints: number;
  nextMeeting: MeetingInfo | null;
  trailProgress: TrailProgressItem[];
}

export interface ActivityItem {
  id: string;
  type: 'trail_completed' | 'prospection' | 'ranking_up' | 'trail_started' | 'meeting';
  title: string;
  timestamp: string;
  mentoradoName?: string;
}

export interface RankingItem {
  position: number;
  name: string;
  points: number;
  mentoradoId: string;
}

export interface TrailProgressItem {
  id: string;
  name: string;
  progress: number;
}

export interface MeetingInfo {
  id: string;
  title: string;
  scheduledAt: string;
  meetingUrl?: string;
}

const EMPTY_MENTOR_STATS: MentorDashboardStats = {
  mentoradosCount: 0,
  activeMentoradosCount: 0,
  atRiskCount: 0,
  sosCount: 0,
  meetingsThisWeek: 0,
  engagementRate: 0,
  trailsCount: 0,
  recentActivity: [],
  topRanking: [],
  trailProgress: [],
};

const EMPTY_MENTEE_STATS: MenteeDashboardStats = {
  rankingPosition: null,
  totalProspections: 0,
  monthlyProspections: 0,
  totalPoints: 0,
  nextMeeting: null,
  trailProgress: [],
};

export function useMentorDashboardStats() {
  const { activeMembership } = useTenant();
  const { user } = useAuth();
  const [stats, setStats] = useState<MentorDashboardStats>(EMPTY_MENTOR_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!activeMembership?.tenant_id || !user?.id) {
      setStats(EMPTY_MENTOR_STATS);
      setIsLoading(false);
      return;
    }

    const tenantId = activeMembership.tenant_id;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch mentee memberships for this tenant
      const { data: menteeMemberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, status, user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee');

      if (membershipsError) throw membershipsError;

      const mentoradosCount = menteeMemberships?.length || 0;
      const activeMentoradosCount = menteeMemberships?.filter(m => m.status === 'active').length || 0;

      // Fetch trails for this tenant
      const { data: trails, error: trailsError } = await supabase
        .from('trails')
        .select('id, title')
        .eq('tenant_id', tenantId);

      const trailsCount = trailsError ? 0 : (trails?.length || 0);

      // Fetch meetings this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', startOfWeek.toISOString())
        .lt('scheduled_at', endOfWeek.toISOString());

      const meetingsThisWeek = meetings?.length || 0;

      // Fetch SOS requests (pending/in_progress)
      const { count: sosCount } = await supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'in_progress']);

      const finalSosCount = sosCount || 0;

      // Get mentor_id for this user
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let topRanking: RankingItem[] = [];

      if (mentorData?.id) {
        // Fetch mentorados for this mentor
        const { data: mentoradosData } = await supabase
          .from('mentorados')
          .select('id, user_id')
          .eq('mentor_id', mentorData.id)
          .eq('status', 'active');

        if (mentoradosData && mentoradosData.length > 0) {
          const mentoradoIds = mentoradosData.map(m => m.id);
          
          // Fetch ranking entries for these mentorados
          const { data: rankingData } = await supabase
            .from('ranking_entries')
            .select('id, mentorado_id, points')
            .in('mentorado_id', mentoradoIds)
            .order('points', { ascending: false })
            .limit(5);

          if (rankingData && rankingData.length > 0) {
            // Get user_ids from mentorados
            const mentoradoMap = new Map(mentoradosData.map(m => [m.id, m.user_id]));
            const userIds = rankingData.map(r => mentoradoMap.get(r.mentorado_id)).filter(Boolean) as string[];
            
            // Get profile names
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', userIds);

            const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

            topRanking = rankingData.map((r, idx) => ({
              position: idx + 1,
              name: profileMap.get(mentoradoMap.get(r.mentorado_id) || '') || 'Sem nome',
              points: r.points || 0,
              mentoradoId: r.mentorado_id,
            }));
          }
        }
      }

      // Calculate engagement rate
      const engagementRate = mentoradosCount > 0 
        ? Math.round((activeMentoradosCount / mentoradosCount) * 100) 
        : 0;

      // Trail progress placeholder
      const trailProgress: TrailProgressItem[] = (trails || []).slice(0, 3).map(t => ({
        id: t.id,
        name: t.title,
        progress: 0,
      }));

      setStats({
        mentoradosCount,
        activeMentoradosCount,
        atRiskCount: 0,
        sosCount: finalSosCount,
        meetingsThisWeek,
        engagementRate,
        trailsCount,
        recentActivity: [],
        topRanking,
        trailProgress,
      });
    } catch (err) {
      console.error('Error fetching mentor dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      setStats(EMPTY_MENTOR_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [activeMembership?.tenant_id, user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}

export function useMenteeDashboardStats() {
  const { activeMembership } = useTenant();
  const { user } = useAuth();
  const [stats, setStats] = useState<MenteeDashboardStats>(EMPTY_MENTEE_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!activeMembership?.id || !activeMembership?.tenant_id || !user?.id) {
      setStats(EMPTY_MENTEE_STATS);
      setIsLoading(false);
      return;
    }

    const membershipId = activeMembership.id;
    const tenantId = activeMembership.tenant_id;
    setIsLoading(true);
    setError(null);

    try {
      // Get mentorado for this user
      const { data: mentoradoData } = await supabase
        .from('mentorados')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const mentoradoId = mentoradoData?.id;

      let totalPoints = 0;
      let rankingPosition: number | null = null;

      if (mentoradoId) {
        // Fetch ranking entry for this mentorado
        const { data: rankingEntry } = await supabase
          .from('ranking_entries')
          .select('points')
          .eq('mentorado_id', mentoradoId)
          .maybeSingle();

        totalPoints = rankingEntry?.points || 0;

        // Get mentor_id from mentorado
        const { data: mentoradoFull } = await supabase
          .from('mentorados')
          .select('mentor_id')
          .eq('id', mentoradoId)
          .single();

        if (mentoradoFull?.mentor_id) {
          // Get all mentorados for this mentor to calculate position
          const { data: allMentorados } = await supabase
            .from('mentorados')
            .select('id')
            .eq('mentor_id', mentoradoFull.mentor_id);

          if (allMentorados && allMentorados.length > 0) {
            const allMentoradoIds = allMentorados.map(m => m.id);
            
            const { data: allRankings } = await supabase
              .from('ranking_entries')
              .select('mentorado_id, points')
              .in('mentorado_id', allMentoradoIds)
              .order('points', { ascending: false });

            if (allRankings) {
              const idx = allRankings.findIndex(r => r.mentorado_id === mentoradoId);
              if (idx >= 0) {
                rankingPosition = idx + 1;
              }
            }
          }
        }
      }

      // Fetch prospections count
      const { count: totalProspections } = await supabase
        .from('crm_prospections')
        .select('*', { count: 'exact', head: true })
        .eq('membership_id', membershipId);

      // Monthly prospections
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyProspections } = await supabase
        .from('crm_prospections')
        .select('*', { count: 'exact', head: true })
        .eq('membership_id', membershipId)
        .gte('created_at', startOfMonth.toISOString());

      // Fetch next meeting
      const { data: nextMeetingData } = await supabase
        .from('meetings')
        .select('id, title, scheduled_at, meeting_url')
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const nextMeeting = nextMeetingData ? {
        id: nextMeetingData.id,
        title: nextMeetingData.title,
        scheduledAt: nextMeetingData.scheduled_at,
        meetingUrl: nextMeetingData.meeting_url || undefined,
      } : null;

      // Trail progress - use membership_id from trail_progress
      let trailProgress: TrailProgressItem[] = [];
      
      const { data: progressData } = await supabase
        .from('trail_progress')
        .select('id, lesson_id, progress_percent')
        .eq('membership_id', membershipId);

      if (progressData && progressData.length > 0) {
        // Get lesson -> trail mapping
        const lessonIds = progressData.map(p => p.lesson_id);
        const { data: lessonsData } = await supabase
          .from('trail_lessons')
          .select('id, module_id')
          .in('id', lessonIds);

        if (lessonsData && lessonsData.length > 0) {
          const moduleIds = [...new Set(lessonsData.map(l => l.module_id))];
          const { data: modulesData } = await supabase
            .from('trail_modules')
            .select('id, trail_id')
            .in('id', moduleIds);

          if (modulesData && modulesData.length > 0) {
            const trailIds = [...new Set(modulesData.map(m => m.trail_id))];
            const { data: trailsData } = await supabase
              .from('trails')
              .select('id, title')
              .in('id', trailIds)
              .eq('tenant_id', tenantId);

            if (trailsData) {
              // Calculate average progress per trail
              trailProgress = trailsData.map(trail => ({
                id: trail.id,
                name: trail.title,
                progress: 0, // Simplified - would need more complex calculation
              }));
            }
          }
        }
      }

      setStats({
        rankingPosition,
        totalProspections: totalProspections || 0,
        monthlyProspections: monthlyProspections || 0,
        totalPoints,
        nextMeeting,
        trailProgress,
      });
    } catch (err) {
      console.error('Error fetching mentee dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      setStats(EMPTY_MENTEE_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [activeMembership?.id, activeMembership?.tenant_id, user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}
