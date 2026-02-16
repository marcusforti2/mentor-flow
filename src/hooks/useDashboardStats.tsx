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
      // Don't set isLoading to false if we're still waiting for context
      return;
    }

    const tenantId = activeMembership.tenant_id;
    setIsLoading(true);
    setError(null);

    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      // BATCH 1: All independent queries in parallel
      const [membershipsRes, trailsRes, meetingsRes, sosRes, sosDetailsRes, activityRes, winsRes] = await Promise.all([
        supabase.from('memberships').select('id, status, user_id').eq('tenant_id', tenantId).eq('role', 'mentee'),
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

      if (membershipsRes.error) throw membershipsRes.error;
      const menteeMemberships = membershipsRes.data || [];
      const mentoradosCount = menteeMemberships.length;
      const activeMentoradosCount = menteeMemberships.filter(m => m.status === 'active').length;
      const trailsCount = trailsRes.error ? 0 : (trailsRes.data?.length || 0);
      const meetingsThisWeek = meetingsRes.data?.length || 0;
      const engagementRate = mentoradosCount > 0 ? Math.round((activeMentoradosCount / mentoradosCount) * 100) : 0;

      // Map activity
      const mapActivityType = (actionType: string): ActivityItem['type'] => {
        if (actionType.includes('closed_won') || actionType.includes('trail_completed')) return 'trail_completed';
        if (actionType.includes('lead') || actionType.includes('prospection')) return 'prospection';
        if (actionType.includes('ranking')) return 'ranking_up';
        if (actionType.includes('trail_started')) return 'trail_started';
        if (actionType.includes('meeting')) return 'meeting';
        return 'prospection';
      };

      const recentActivity: ActivityItem[] = (activityRes.data || []).map(a => {
        const userId = membershipToUser.get(a.membership_id || '') || '';
        const name = profileMap.get(userId) || '';
        return {
          id: a.id, type: mapActivityType(a.action_type),
          title: a.action_description || a.action_type, timestamp: a.created_at,
          mentoradoName: name || undefined,
        };
      });

      // BATCH 2: Dependent queries - ranking, trail progress, SOS details, at-risk, wins - ALL in parallel
      const membershipIds = menteeMemberships.map(m => m.id);
      const activeMembershipIds = menteeMemberships.filter(m => m.status === 'active').map(m => m.id);
      const allUserIds = menteeMemberships.map(m => m.user_id);
      const trailIds = (trailsRes.data || []).map(t => t.id);
      const sosMembershipIds = (sosDetailsRes.data || []).map(s => s.membership_id).filter(Boolean) as string[];
      const winMembershipIds = (winsRes.data || []).map(w => w.membership_id).filter(Boolean) as string[];

      // Fetch all profiles at once (needed by ranking, SOS, at-risk, wins)
      const [profilesRes, rankingRes, trailModulesRes, atRiskActivityRes] = await Promise.all([
        allUserIds.length > 0
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', allUserIds)
          : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
        membershipIds.length > 0
          ? supabase.from('ranking_entries').select('id, membership_id, points')
              .in('membership_id', membershipIds)
              .order('points', { ascending: false }).limit(5)
          : Promise.resolve({ data: [] as any[] }),
        trailIds.length > 0
          ? supabase.from('trail_modules').select('id, trail_id').in('trail_id', trailIds)
          : Promise.resolve({ data: [] as any[] }),
        activeMembershipIds.length > 0
          ? supabase.from('activity_logs').select('membership_id, created_at')
              .eq('tenant_id', tenantId).in('membership_id', activeMembershipIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map<string, string>(((profilesRes as any).data || []).map((p: any) => [p.user_id, p.full_name]));
      const membershipToUser = new Map(menteeMemberships.map(m => [m.id, m.user_id]));

      // Build ranking
      let topRanking: RankingItem[] = [];
      const rankingData = (rankingRes as any).data || [];
      if (rankingData.length > 0) {
        topRanking = rankingData.map((r: any, idx: number) => {
          const userId = membershipToUser.get(r.membership_id || '') || '';
          return {
            position: idx + 1, name: profileMap.get(userId) || 'Sem nome',
            points: r.points || 0, mentoradoId: r.membership_id || '',
          };
        });
      }

      // Trail progress - BATCH 3: lessons query depends on modules
      let trailProgress: TrailProgressItem[] = [];
      const allModules = (trailModulesRes as any).data || [];
      if (allModules.length > 0) {
        const moduleIds = allModules.map((m: any) => m.id);
        const [lessonsRes, progressRes] = await Promise.all([
          supabase.from('trail_lessons').select('id, module_id').in('module_id', moduleIds),
          supabase.from('trail_progress').select('lesson_id, completed').eq('tenant_id', tenantId),
        ]);
        const allLessons = lessonsRes.data || [];
        const completedSet = new Set((progressRes.data || []).filter((p: any) => p.completed).map((p: any) => p.lesson_id));

        trailProgress = (trailsRes.data || []).slice(0, 3).map(trail => {
          const trailModuleIds = allModules.filter((m: any) => m.trail_id === trail.id).map((m: any) => m.id);
          const trailLessons = allLessons.filter((l: any) => trailModuleIds.includes(l.module_id));
          const totalLessons = trailLessons.length;
          const completedLessons = trailLessons.filter((l: any) => completedSet.has(l.id)).length;
          return { id: trail.id, name: trail.title, progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0 };
        });
      } else if (trailsRes.data) {
        trailProgress = trailsRes.data.slice(0, 3).map(t => ({ id: t.id, name: t.title, progress: 0 }));
      }

      // SOS details
      let sosDetails: SOSDetail[] = [];
      if (sosDetailsRes.data && sosDetailsRes.data.length > 0) {
        sosDetails = sosDetailsRes.data.map(s => ({
          id: s.id, title: s.title, priority: s.priority || 'medium',
          category: s.category || '',
          mentoradoName: profileMap.get(membershipToUser.get(s.membership_id || '') || '') || 'Mentorado',
          createdAt: s.created_at,
        }));
      }

      // At-risk
      let atRiskDetails: AtRiskDetail[] = [];
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const lastActivityMap = new Map<string, string>();
      ((atRiskActivityRes as any).data || []).forEach((a: any) => {
        if (a.membership_id && !lastActivityMap.has(a.membership_id)) {
          lastActivityMap.set(a.membership_id, a.created_at);
        }
      });
      const atRiskMembershipIds = activeMembershipIds.filter(id => {
        const last = lastActivityMap.get(id);
        return !last || new Date(last) < threeDaysAgo;
      });
      atRiskDetails = atRiskMembershipIds.slice(0, 5).map(mid => {
        const lastAt = lastActivityMap.get(mid) || null;
        const days = lastAt ? Math.floor((Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        return {
          membershipId: mid,
          name: profileMap.get(membershipToUser.get(mid) || '') || 'Sem nome',
          lastActivityAt: lastAt, daysSinceActivity: days,
        };
      }).sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

      // Recent wins
      let recentWins: RecentWin[] = [];
      if (winsRes.data && winsRes.data.length > 0) {
        recentWins = winsRes.data.map(w => ({
          id: w.id, description: w.action_description || w.action_type,
          mentoradoName: profileMap.get(membershipToUser.get(w.membership_id || '') || '') || 'Mentorado',
          timestamp: w.created_at,
        }));
      }

      setStats({
        mentoradosCount, activeMentoradosCount, atRiskCount: atRiskDetails.length,
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
      // Don't set isLoading to false if we're still waiting for context
      return;
    }

    const membershipId = activeMembership.id;
    const tenantId = activeMembership.tenant_id;
    setIsLoading(true);
    setError(null);

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // BATCH 1: All independent queries in parallel
      const [rankingEntryRes, allMenteeIdsRes, totalProspRes, monthlyProspRes, nextMeetingRes, progressRes] = await Promise.all([
        supabase.from('ranking_entries').select('points')
          .eq('membership_id', membershipId)
          .order('points', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('memberships').select('id').eq('tenant_id', tenantId).eq('role', 'mentee'),
        supabase.from('crm_prospections').select('*', { count: 'exact', head: true })
          .eq('membership_id', membershipId),
        supabase.from('crm_prospections').select('*', { count: 'exact', head: true })
          .eq('membership_id', membershipId)
          .gte('created_at', startOfMonth.toISOString()),
        supabase.from('meetings').select('id, title, scheduled_at, meeting_url')
          .eq('tenant_id', tenantId).gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('trail_progress').select('id, lesson_id, completed')
          .eq('membership_id', membershipId),
      ]);

      const totalPoints = rankingEntryRes.data?.points || 0;
      const totalProspections = totalProspRes.count || 0;
      const monthlyProspections = monthlyProspRes.count || 0;
      const nextMeeting = nextMeetingRes.data ? {
        id: nextMeetingRes.data.id, title: nextMeetingRes.data.title,
        scheduledAt: nextMeetingRes.data.scheduled_at,
        meetingUrl: nextMeetingRes.data.meeting_url || undefined,
      } : null;

      // Ranking position
      let rankingPosition: number | null = null;
      const allMenteeIds = allMenteeIdsRes.data || [];
      if (allMenteeIds.length > 0) {
        const ids = allMenteeIds.map(m => m.id);
        const { data: allRankings } = await supabase
          .from('ranking_entries').select('membership_id, points')
          .in('membership_id', ids)
          .order('points', { ascending: false });
        if (allRankings) {
          const idx = allRankings.findIndex(r => r.membership_id === membershipId);
          if (idx >= 0) rankingPosition = idx + 1;
        }
      }

      // Trail progress
      let trailProgress: TrailProgressItem[] = [];
      const progressData = progressRes.data || [];
      if (progressData.length > 0) {
        const lessonIds = progressData.map(p => p.lesson_id);
        const { data: lessonsData } = await supabase.from('trail_lessons').select('id, module_id').in('id', lessonIds);
        if (lessonsData && lessonsData.length > 0) {
          const moduleIds = [...new Set(lessonsData.map(l => l.module_id))];
          const [modulesRes, allTrailLessonsRes] = await Promise.all([
            supabase.from('trail_modules').select('id, trail_id').in('id', moduleIds),
            supabase.from('trail_lessons').select('id, module_id').in('module_id', moduleIds),
          ]);
          const modulesData = modulesRes.data || [];
          if (modulesData.length > 0) {
            const trailIds = [...new Set(modulesData.map(m => m.trail_id))];
            const { data: trailsData } = await supabase.from('trails').select('id, title').in('id', trailIds).eq('tenant_id', tenantId);
            const completedSet = new Set(progressData.filter(p => p.completed).map(p => p.lesson_id));
            const allTrailLessons = allTrailLessonsRes.data || [];

            if (trailsData) {
              trailProgress = trailsData.map(trail => {
                const trailModuleIds = modulesData.filter(m => m.trail_id === trail.id).map(m => m.id);
                const trailLessons = allTrailLessons.filter(l => trailModuleIds.includes(l.module_id));
                const totalLessons = trailLessons.length;
                const completedLessons = trailLessons.filter(l => completedSet.has(l.id)).length;
                return { id: trail.id, name: trail.title, progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0 };
              });
            }
          }
        }
      }

      setStats({
        rankingPosition, totalProspections, monthlyProspections, totalPoints,
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
