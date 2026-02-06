import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';

export interface SOSDetail {
  id: string;
  title: string;
  priority: string;
  category: string;
  mentoradoName: string;
  createdAt: string;
}

export interface AtRiskDetail {
  membershipId: string;
  name: string;
  lastActivityAt: string | null;
  daysSinceActivity: number;
}

export interface RecentWin {
  id: string;
  description: string;
  mentoradoName: string;
  timestamp: string;
}

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
  sosDetails: SOSDetail[];
  atRiskDetails: AtRiskDetail[];
  recentWins: RecentWin[];
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
  mentoradosCount: 0, activeMentoradosCount: 0, atRiskCount: 0, sosCount: 0,
  meetingsThisWeek: 0, engagementRate: 0, trailsCount: 0,
  recentActivity: [], topRanking: [], trailProgress: [],
  sosDetails: [], atRiskDetails: [], recentWins: [],
};

const EMPTY_MENTEE_STATS: MenteeDashboardStats = {
  rankingPosition: null, totalProspections: 0, monthlyProspections: 0,
  totalPoints: 0, nextMeeting: null, trailProgress: [],
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
      // Fetch mentee memberships
      const { data: menteeMemberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, status, user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee');

      if (membershipsError) throw membershipsError;

      const mentoradosCount = menteeMemberships?.length || 0;
      const activeMentoradosCount = menteeMemberships?.filter(m => m.status === 'active').length || 0;

      // Fetch trails, meetings, SOS in parallel
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const [trailsRes, meetingsRes, sosRes, sosDetailsRes, activityRes, winsRes] = await Promise.all([
        supabase.from('trails').select('id, title').eq('tenant_id', tenantId),
        supabase.from('meetings').select('id').eq('tenant_id', tenantId)
          .gte('scheduled_at', startOfWeek.toISOString()).lt('scheduled_at', endOfWeek.toISOString()),
        supabase.from('sos_requests').select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId).in('status', ['pending', 'in_progress']),
        supabase.from('sos_requests').select('id, title, priority, category, membership_id, created_at')
          .eq('tenant_id', tenantId).in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('activity_logs').select('id, action_type, action_description, created_at, membership_id')
          .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10),
        supabase.from('activity_logs').select('id, action_type, action_description, created_at, membership_id')
          .eq('tenant_id', tenantId)
          .in('action_type', ['lead_closed_won', 'deal_closed', 'trail_completed'])
          .order('created_at', { ascending: false }).limit(5),
      ]);

      const trailsCount = trailsRes.error ? 0 : (trailsRes.data?.length || 0);
      const meetingsThisWeek = meetingsRes.data?.length || 0;

      // Build ranking from memberships
      let topRanking: RankingItem[] = [];
      if (menteeMemberships && menteeMemberships.length > 0) {
        const membershipIds = menteeMemberships.map(m => m.id);
        const { data: rankingData } = await supabase
          .from('ranking_entries')
          .select('id, membership_id, mentorado_id, points')
          .or(`membership_id.in.(${membershipIds.join(',')}),mentorado_id.in.(${membershipIds.join(',')})`)
          .order('points', { ascending: false })
          .limit(5);

        if (rankingData && rankingData.length > 0) {
          const userIds = menteeMemberships.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);

          const membershipToUser = new Map(menteeMemberships.map(m => [m.id, m.user_id]));
          const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

          topRanking = rankingData.map((r, idx) => {
            const userId = membershipToUser.get(r.membership_id || r.mentorado_id || '') || '';
            return {
              position: idx + 1,
              name: profileMap.get(userId) || 'Sem nome',
              points: r.points || 0,
              mentoradoId: r.membership_id || r.mentorado_id || '',
            };
          });
        }
      }

      // Recent activity
      // Map activity types from action_type
      const mapActivityType = (actionType: string): ActivityItem['type'] => {
        if (actionType.includes('closed_won') || actionType.includes('trail_completed')) return 'trail_completed';
        if (actionType.includes('lead') || actionType.includes('prospection')) return 'prospection';
        if (actionType.includes('ranking')) return 'ranking_up';
        if (actionType.includes('trail_started')) return 'trail_started';
        if (actionType.includes('meeting')) return 'meeting';
        return 'prospection';
      };

      const recentActivity: ActivityItem[] = (activityRes.data || []).map(a => ({
        id: a.id,
        type: mapActivityType(a.action_type),
        title: a.action_description || a.action_type,
        timestamp: a.created_at,
      }));

      const engagementRate = mentoradosCount > 0 
        ? Math.round((activeMentoradosCount / mentoradosCount) * 100) : 0;

      // Calculate real trail progress from trail_progress table
      let trailProgress: TrailProgressItem[] = [];
      if (trailsRes.data && trailsRes.data.length > 0) {
        const trailIds = trailsRes.data.map(t => t.id);
        const { data: allModules } = await supabase
          .from('trail_modules').select('id, trail_id').in('trail_id', trailIds);
        
        if (allModules && allModules.length > 0) {
          const moduleIds = allModules.map(m => m.id);
          const { data: allLessons } = await supabase
            .from('trail_lessons').select('id, module_id').in('module_id', moduleIds);
          
          const { data: allProgress } = await supabase
            .from('trail_progress').select('lesson_id, completed')
            .eq('tenant_id', tenantId);
          
          const completedSet = new Set(
            (allProgress || []).filter(p => p.completed).map(p => p.lesson_id)
          );

          trailProgress = trailsRes.data.slice(0, 3).map(trail => {
            const trailModuleIds = (allModules || []).filter(m => m.trail_id === trail.id).map(m => m.id);
            const trailLessons = (allLessons || []).filter(l => trailModuleIds.includes(l.module_id));
            const totalLessons = trailLessons.length;
            const completedLessons = trailLessons.filter(l => completedSet.has(l.id)).length;
            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            return { id: trail.id, name: trail.title, progress };
          });
        } else {
          trailProgress = trailsRes.data.slice(0, 3).map(t => ({ id: t.id, name: t.title, progress: 0 }));
        }
      }

      // Build SOS details with mentorado names
      let sosDetails: SOSDetail[] = [];
      if (sosDetailsRes.data && sosDetailsRes.data.length > 0) {
        const sosMembershipIds = sosDetailsRes.data.map(s => s.membership_id).filter(Boolean) as string[];
        const { data: sosProfiles } = sosMembershipIds.length > 0
          ? await supabase.from('memberships').select('id, user_id').in('id', sosMembershipIds)
          : { data: [] };
        const sosUserIds = (sosProfiles || []).map(m => m.user_id);
        const { data: sosNames } = sosUserIds.length > 0
          ? await supabase.from('profiles').select('user_id, full_name').in('user_id', sosUserIds)
          : { data: [] };
        const memberToUser = new Map((sosProfiles || []).map(m => [m.id, m.user_id]));
        const userToName = new Map((sosNames || []).map(p => [p.user_id, p.full_name]));

        sosDetails = sosDetailsRes.data.map(s => ({
          id: s.id,
          title: s.title,
          priority: s.priority || 'medium',
          category: s.category || '',
          mentoradoName: userToName.get(memberToUser.get(s.membership_id || '') || '') || 'Mentorado',
          createdAt: s.created_at,
        }));
      }

      // Calculate at-risk mentorados (no activity in 3+ days)
      let atRiskDetails: AtRiskDetail[] = [];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      if (menteeMemberships && menteeMemberships.length > 0) {
        const membershipIds = menteeMemberships.filter(m => m.status === 'active').map(m => m.id);
        
        // Get last activity per membership
        const { data: lastActivities } = membershipIds.length > 0
          ? await supabase.from('activity_logs')
              .select('membership_id, created_at')
              .eq('tenant_id', tenantId)
              .in('membership_id', membershipIds)
              .order('created_at', { ascending: false })
          : { data: [] };

        const lastActivityMap = new Map<string, string>();
        (lastActivities || []).forEach(a => {
          if (a.membership_id && !lastActivityMap.has(a.membership_id)) {
            lastActivityMap.set(a.membership_id, a.created_at);
          }
        });

        // Find members with no activity or old activity
        const atRiskMembershipIds = membershipIds.filter(id => {
          const last = lastActivityMap.get(id);
          return !last || new Date(last) < threeDaysAgo;
        });

        if (atRiskMembershipIds.length > 0) {
          const riskUserIds = menteeMemberships
            .filter(m => atRiskMembershipIds.includes(m.id))
            .map(m => m.user_id);
          const { data: riskProfiles } = await supabase
            .from('profiles').select('user_id, full_name').in('user_id', riskUserIds);
          const riskProfileMap = new Map((riskProfiles || []).map(p => [p.user_id, p.full_name]));
          const userIdMap = new Map(menteeMemberships.map(m => [m.id, m.user_id]));

          atRiskDetails = atRiskMembershipIds.slice(0, 5).map(mid => {
            const lastAt = lastActivityMap.get(mid) || null;
            const days = lastAt 
              ? Math.floor((Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
              : 999;
            return {
              membershipId: mid,
              name: riskProfileMap.get(userIdMap.get(mid) || '') || 'Sem nome',
              lastActivityAt: lastAt,
              daysSinceActivity: days,
            };
          }).sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
        }
      }

      // Recent wins
      let recentWins: RecentWin[] = [];
      if (winsRes.data && winsRes.data.length > 0) {
        const winMembershipIds = winsRes.data.map(w => w.membership_id).filter(Boolean) as string[];
        const { data: winMemberships } = winMembershipIds.length > 0
          ? await supabase.from('memberships').select('id, user_id').in('id', winMembershipIds)
          : { data: [] };
        const winUserIds = (winMemberships || []).map(m => m.user_id);
        const { data: winProfiles } = winUserIds.length > 0
          ? await supabase.from('profiles').select('user_id, full_name').in('user_id', winUserIds)
          : { data: [] };
        const winMemberToUser = new Map((winMemberships || []).map(m => [m.id, m.user_id]));
        const winUserToName = new Map((winProfiles || []).map(p => [p.user_id, p.full_name]));

        recentWins = winsRes.data.map(w => ({
          id: w.id,
          description: w.action_description || w.action_type,
          mentoradoName: winUserToName.get(winMemberToUser.get(w.membership_id || '') || '') || 'Mentorado',
          timestamp: w.created_at,
        }));
      }

      const atRiskCount = atRiskDetails.length;

      setStats({
        mentoradosCount, activeMentoradosCount, atRiskCount,
        sosCount: sosRes.count || 0, meetingsThisWeek, engagementRate,
        trailsCount, recentActivity, topRanking, trailProgress,
        sosDetails, atRiskDetails, recentWins,
      });
    } catch (err) {
      console.error('Error fetching mentor dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      setStats(EMPTY_MENTOR_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [activeMembership?.tenant_id, user?.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
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
      let totalPoints = 0;
      let rankingPosition: number | null = null;

      // Try to get ranking from ranking_entries (check both membership_id and mentorado_id)
      const { data: rankingEntry } = await supabase
        .from('ranking_entries')
        .select('points')
        .or(`membership_id.eq.${membershipId},mentorado_id.eq.${membershipId}`)
        .order('points', { ascending: false })
        .limit(1)
        .maybeSingle();

      totalPoints = rankingEntry?.points || 0;

      // Calculate ranking position among all mentees in tenant
      const { data: allMenteeIds } = await supabase
        .from('memberships')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee');

      if (allMenteeIds && allMenteeIds.length > 0) {
        const ids = allMenteeIds.map(m => m.id);
        const { data: allRankings } = await supabase
          .from('ranking_entries')
          .select('membership_id, mentorado_id, points')
          .or(`membership_id.in.(${ids.join(',')}),mentorado_id.in.(${ids.join(',')})`)
          .order('points', { ascending: false });

        if (allRankings) {
          const idx = allRankings.findIndex(r => r.membership_id === membershipId || r.mentorado_id === membershipId);
          if (idx >= 0) rankingPosition = idx + 1;
        }
      }

      // Fetch prospections
      const { count: totalProspections } = await supabase
        .from('crm_prospections')
        .select('*', { count: 'exact', head: true })
        .eq('membership_id', membershipId);

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
        id: nextMeetingData.id, title: nextMeetingData.title,
        scheduledAt: nextMeetingData.scheduled_at,
        meetingUrl: nextMeetingData.meeting_url || undefined,
      } : null;

      // Trail progress - calculate real percentages
      let trailProgress: TrailProgressItem[] = [];
      const { data: progressData } = await supabase
        .from('trail_progress')
        .select('id, lesson_id, completed')
        .or(`membership_id.eq.${membershipId},mentorado_id.eq.${membershipId}`);

      if (progressData && progressData.length > 0) {
        const lessonIds = progressData.map(p => p.lesson_id);
        const { data: lessonsData } = await supabase.from('trail_lessons').select('id, module_id').in('id', lessonIds);
        if (lessonsData && lessonsData.length > 0) {
          const moduleIds = [...new Set(lessonsData.map(l => l.module_id))];
          const { data: modulesData } = await supabase.from('trail_modules').select('id, trail_id').in('id', moduleIds);
          if (modulesData && modulesData.length > 0) {
            const trailIds = [...new Set(modulesData.map(m => m.trail_id))];
            const { data: trailsData } = await supabase.from('trails').select('id, title').in('id', trailIds).eq('tenant_id', tenantId);
            
            // Get ALL lessons for these trails to calculate real progress
            const { data: allTrailLessons } = await supabase
              .from('trail_lessons').select('id, module_id')
              .in('module_id', moduleIds);

            const completedSet = new Set(
              progressData.filter(p => p.completed).map(p => p.lesson_id)
            );

            if (trailsData) {
              trailProgress = trailsData.map(trail => {
                const trailModuleIds = (modulesData || []).filter(m => m.trail_id === trail.id).map(m => m.id);
                const trailLessons = (allTrailLessons || []).filter(l => trailModuleIds.includes(l.module_id));
                const totalLessons = trailLessons.length;
                const completedLessons = trailLessons.filter(l => completedSet.has(l.id)).length;
                const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                return { id: trail.id, name: trail.title, progress };
              });
            }
          }
        }
      }

      setStats({
        rankingPosition, totalProspections: totalProspections || 0,
        monthlyProspections: monthlyProspections || 0, totalPoints,
        nextMeeting, trailProgress,
      });
    } catch (err) {
      console.error('Error fetching mentee dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      setStats(EMPTY_MENTEE_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [activeMembership?.id, activeMembership?.tenant_id, user?.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  return { stats, isLoading, error, refetch: fetchStats };
}
