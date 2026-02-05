import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface MentorReportStats {
  totalMentorados: number;
  activeMentorados: number;
  totalLeads: number;
  leadsThisMonth: number;
  totalActivities: number;
  activitiesThisWeek: number;
  trailCompletionRate: number;
  avgLeadsPerMentorado: number;
}

export interface ActivityByDay {
  date: string;
  count: number;
}

export interface LeadsByStatus {
  status: string;
  count: number;
}

export interface TopPerformer {
  mentoradoId: string;
  name: string;
  avatar: string | null;
  leadsCount: number;
  activitiesCount: number;
  points: number;
}

export function useMentorReports() {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;

  const statsQuery = useQuery({
    queryKey: ['mentor-reports-stats', tenantId],
    queryFn: async (): Promise<MentorReportStats> => {
      if (!tenantId) throw new Error('No tenant');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

      // Get memberships for this tenant (mentees)
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, user_id, status')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee');

      const membershipIds = memberships?.map(m => m.id) || [];
      const totalMentorados = memberships?.length || 0;
      const activeMentorados = memberships?.filter(m => m.status === 'active').length || 0;

      // Get leads owned by these memberships
      const { data: leads } = await supabase
        .from('crm_prospections')
        .select('id, created_at, status')
        .eq('tenant_id', tenantId);

      const totalLeads = leads?.length || 0;
      const leadsThisMonth = leads?.filter(l => l.created_at && l.created_at >= startOfMonth).length || 0;

      // Get activities
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('id, created_at')
        .eq('tenant_id', tenantId);

      const totalActivities = activities?.length || 0;
      const activitiesThisWeek = activities?.filter(a => a.created_at >= startOfWeek).length || 0;

      // Calculate averages
      const avgLeadsPerMentorado = totalMentorados > 0 ? totalLeads / totalMentorados : 0;

      // Trail completion (simplified - based on lesson progress)
      const { data: progress } = await supabase
        .from('trail_progress')
        .select('completed')
        .eq('tenant_id', tenantId);

      const completedLessons = progress?.filter(p => p.completed).length || 0;
      const totalProgress = progress?.length || 0;
      const trailCompletionRate = totalProgress > 0 ? (completedLessons / totalProgress) * 100 : 0;

      return {
        totalMentorados,
        activeMentorados,
        totalLeads,
        leadsThisMonth,
        totalActivities,
        activitiesThisWeek,
        trailCompletionRate,
        avgLeadsPerMentorado,
      };
    },
    enabled: !!tenantId,
  });

  const activityByDayQuery = useQuery({
    queryKey: ['mentor-reports-activity-by-day', tenantId],
    queryFn: async (): Promise<ActivityByDay[]> => {
      if (!tenantId) throw new Error('No tenant');

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const { data: activities } = await supabase
        .from('activity_logs')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', last7Days[0]);

      const countByDay: Record<string, number> = {};
      last7Days.forEach(d => countByDay[d] = 0);

      activities?.forEach(a => {
        const day = a.created_at.split('T')[0];
        if (countByDay[day] !== undefined) {
          countByDay[day]++;
        }
      });

      return last7Days.map(date => ({
        date,
        count: countByDay[date],
      }));
    },
    enabled: !!tenantId,
  });

  const leadsByStatusQuery = useQuery({
    queryKey: ['mentor-reports-leads-by-status', tenantId],
    queryFn: async (): Promise<LeadsByStatus[]> => {
      if (!tenantId) throw new Error('No tenant');

      const { data: leads } = await supabase
        .from('crm_prospections')
        .select('status')
        .eq('tenant_id', tenantId);

      const statusMap: Record<string, number> = {};
      leads?.forEach(l => {
        const status = l.status || 'novo';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });

      return Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
      }));
    },
    enabled: !!tenantId,
  });

  const topPerformersQuery = useQuery({
    queryKey: ['mentor-reports-top-performers', tenantId],
    queryFn: async (): Promise<TopPerformer[]> => {
      if (!tenantId) throw new Error('No tenant');

      // Get memberships with user profiles
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'mentee')
        .eq('status', 'active');

      if (!memberships?.length) return [];

      // Get user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', memberships.map(m => m.user_id));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get leads per membership
      const { data: leads } = await supabase
        .from('crm_prospections')
        .select('membership_id')
        .eq('tenant_id', tenantId);

      const leadsPerMembership: Record<string, number> = {};
      leads?.forEach(l => {
        if (l.membership_id) {
          leadsPerMembership[l.membership_id] = (leadsPerMembership[l.membership_id] || 0) + 1;
        }
      });

      // Get activities per membership
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('membership_id, points_earned')
        .eq('tenant_id', tenantId);

      const activitiesPerMembership: Record<string, { count: number; points: number }> = {};
      activities?.forEach(a => {
        if (a.membership_id) {
          if (!activitiesPerMembership[a.membership_id]) {
            activitiesPerMembership[a.membership_id] = { count: 0, points: 0 };
          }
          activitiesPerMembership[a.membership_id].count++;
          activitiesPerMembership[a.membership_id].points += a.points_earned || 0;
        }
      });

      // Combine data
      const performers: TopPerformer[] = memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        const activityData = activitiesPerMembership[m.id] || { count: 0, points: 0 };
        return {
          mentoradoId: m.id,
          name: profile?.full_name || 'Sem nome',
          avatar: profile?.avatar_url || null,
          leadsCount: leadsPerMembership[m.id] || 0,
          activitiesCount: activityData.count,
          points: activityData.points,
        };
      });

      // Sort by points + leads
      return performers
        .sort((a, b) => (b.points + b.leadsCount * 10) - (a.points + a.leadsCount * 10))
        .slice(0, 5);
    },
    enabled: !!tenantId,
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    activityByDay: activityByDayQuery.data || [],
    activityByDayLoading: activityByDayQuery.isLoading,
    leadsByStatus: leadsByStatusQuery.data || [],
    leadsByStatusLoading: leadsByStatusQuery.isLoading,
    topPerformers: topPerformersQuery.data || [],
    topPerformersLoading: topPerformersQuery.isLoading,
  };
}
