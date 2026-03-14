import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

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

// ─── Activity type mapper (same logic as before) ────────────────
const mapActivityType = (actionType: string): ActivityItem['type'] => {
  if (actionType.includes('closed_won') || actionType.includes('trail_completed')) return 'trail_completed';
  if (actionType.includes('lead') || actionType.includes('prospection')) return 'prospection';
  if (actionType.includes('ranking')) return 'ranking_up';
  if (actionType.includes('trail_started')) return 'trail_started';
  if (actionType.includes('meeting')) return 'meeting';
  return 'prospection';
};

// ─── Mentor Dashboard (single RPC call) ─────────────────────────

async function fetchMentorStats(tenantId: string): Promise<MentorDashboardStats> {
  const { data, error } = await supabase.rpc('get_mentor_dashboard_stats', {
    _tenant_id: tenantId,
  });

  if (error) throw error;
  if (!data) return EMPTY_MENTOR_STATS;

  const raw = data as Record<string, any>;

  // Map recentActivity to apply the type mapper
  const recentActivity: ActivityItem[] = (raw.recentActivity || []).map((a: any) => ({
    id: a.id,
    type: mapActivityType(a.type || ''),
    title: a.title || '',
    timestamp: a.timestamp || '',
    mentoradoName: a.mentoradoName || undefined,
  }));

  return {
    mentoradosCount: raw.mentoradosCount || 0,
    activeMentoradosCount: raw.activeMentoradosCount || 0,
    atRiskCount: raw.atRiskCount || 0,
    sosCount: raw.sosCount || 0,
    meetingsThisWeek: raw.meetingsThisWeek || 0,
    engagementRate: raw.engagementRate || 0,
    trailsCount: raw.trailsCount || 0,
    recentActivity,
    topRanking: (raw.topRanking || []).map((r: any) => ({
      position: r.position || 0,
      name: r.name || 'Sem nome',
      points: r.points || 0,
      mentoradoId: r.mentoradoId || '',
    })),
    trailProgress: (raw.trailProgress || []).map((t: any) => ({
      id: t.id || '',
      name: t.name || '',
      progress: t.progress || 0,
    })),
    sosDetails: (raw.sosDetails || []).map((s: any) => ({
      id: s.id || '',
      title: s.title || '',
      priority: s.priority || 'medium',
      category: s.category || '',
      mentoradoName: s.mentoradoName || 'Mentorado',
      createdAt: s.createdAt || '',
    })),
    atRiskDetails: (raw.atRiskDetails || []).map((a: any) => ({
      membershipId: a.membershipId || '',
      name: a.name || 'Sem nome',
      lastActivityAt: a.lastActivityAt || null,
      daysSinceActivity: a.daysSinceActivity ?? 999,
    })),
    recentWins: (raw.recentWins || []).map((w: any) => ({
      id: w.id || '',
      description: w.description || '',
      mentoradoName: w.mentoradoName || 'Mentorado',
      timestamp: w.timestamp || '',
    })),
  };
}

export function useMentorDashboardStats() {
  const { activeMembership } = useTenant();
  const { user } = useAuth();
  const tenantId = activeMembership?.tenant_id;

  const { data: stats = EMPTY_MENTOR_STATS, isLoading, error, refetch } = useQuery({
    queryKey: ['mentor-dashboard-stats', tenantId],
    queryFn: () => fetchMentorStats(tenantId!),
    enabled: !!tenantId && !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return { stats, isLoading, error: error as Error | null, refetch };
}

// ─── Mentee Dashboard (single RPC call) ─────────────────────────

async function fetchMenteeStats(membershipId: string, tenantId: string): Promise<MenteeDashboardStats> {
  const { data, error } = await supabase.rpc('get_mentee_dashboard_stats', {
    _membership_id: membershipId,
    _tenant_id: tenantId,
  });

  if (error) throw error;
  if (!data) return EMPTY_MENTEE_STATS;

  const raw = data as Record<string, any>;

  return {
    rankingPosition: raw.rankingPosition ?? null,
    totalProspections: raw.totalProspections || 0,
    monthlyProspections: raw.monthlyProspections || 0,
    totalPoints: raw.totalPoints || 0,
    nextMeeting: raw.nextMeeting && raw.nextMeeting !== null ? {
      id: raw.nextMeeting.id || '',
      title: raw.nextMeeting.title || '',
      scheduledAt: raw.nextMeeting.scheduledAt || '',
      meetingUrl: raw.nextMeeting.meetingUrl || undefined,
    } : null,
    trailProgress: (raw.trailProgress || []).map((t: any) => ({
      id: t.id || '',
      name: t.name || '',
      progress: t.progress || 0,
    })),
  };
}

export function useMenteeDashboardStats() {
  const { activeMembership } = useTenant();
  const { user } = useAuth();
  const membershipId = activeMembership?.id;
  const tenantId = activeMembership?.tenant_id;

  const { data: stats = EMPTY_MENTEE_STATS, isLoading, error, refetch } = useQuery({
    queryKey: ['mentee-dashboard-stats', membershipId],
    queryFn: () => fetchMenteeStats(membershipId!, tenantId!),
    enabled: !!membershipId && !!tenantId && !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return { stats, isLoading, error: error as Error | null, refetch };
}
