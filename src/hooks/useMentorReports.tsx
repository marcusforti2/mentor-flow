import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { MenteeScore } from "@/components/admin/MenteeScoreCard";
import type { WeeklyDataPoint } from "@/components/admin/PerformanceChart";
import type { PeriodRange } from "@/components/admin/ReportPeriodFilter";

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

export interface LeadsByStatus {
  status: string;
  count: number;
}

export interface MonthlyComparison {
  month: string; // "Jan", "Fev", etc.
  leads: number;
  activities: number;
  avgScore: number;
}

function calculateScore(data: {
  leadsCount: number;
  tasksCompleted: number;
  trailsProgress: number;
  activitiesCount: number;
  streak: number;
}): number {
  const leadsScore = Math.min(data.leadsCount * 5, 30);
  const tasksScore = Math.min(data.tasksCompleted * 4, 20);
  const trailsScore = (data.trailsProgress / 100) * 20;
  const activitiesScore = Math.min(data.activitiesCount * 2, 20);
  const streakScore = Math.min(data.streak * 2, 10);
  return Math.min(leadsScore + tasksScore + trailsScore + activitiesScore + streakScore, 100);
}

export function useMentorReports(period?: PeriodRange) {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;

  const fromISO = period?.from.toISOString() || '';
  const toISO = period?.to.toISOString() || '';

  // --- KPI Stats ---
  const statsQuery = useQuery({
    queryKey: ['mentor-reports-stats', tenantId, fromISO, toISO],
    queryFn: async (): Promise<MentorReportStats> => {
      if (!tenantId) throw new Error('No tenant');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startOfWeek = weekAgo.toISOString();

      let membershipsQ = supabase.from('memberships').select('id, user_id, status').eq('tenant_id', tenantId).eq('role', 'mentee');
      let leadsQ = supabase.from('crm_prospections').select('id, created_at, status').eq('tenant_id', tenantId);
      let activitiesQ = supabase.from('activity_logs').select('id, created_at').eq('tenant_id', tenantId);
      let progressQ = supabase.from('trail_progress').select('completed').eq('tenant_id', tenantId);

      if (period) {
        leadsQ = leadsQ.gte('created_at', fromISO).lte('created_at', toISO);
        activitiesQ = activitiesQ.gte('created_at', fromISO).lte('created_at', toISO);
      }

      const [membershipsRes, leadsRes, activitiesRes, progressRes] = await Promise.all([
        membershipsQ, leadsQ, activitiesQ, progressQ,
      ]);

      const memberships = membershipsRes.data || [];
      const leads = leadsRes.data || [];
      const activities = activitiesRes.data || [];
      const progress = progressRes.data || [];

      const totalMentorados = memberships.length;
      const activeMentorados = memberships.filter(m => m.status === 'active').length;
      const totalLeads = leads.length;
      const leadsThisMonth = leads.filter(l => l.created_at && l.created_at >= startOfMonth).length;
      const totalActivities = activities.length;
      const activitiesThisWeek = activities.filter(a => a.created_at >= startOfWeek).length;
      const avgLeadsPerMentorado = totalMentorados > 0 ? totalLeads / totalMentorados : 0;
      const completedLessons = progress.filter(p => p.completed).length;
      const trailCompletionRate = progress.length > 0 ? (completedLessons / progress.length) * 100 : 0;

      return { totalMentorados, activeMentorados, totalLeads, leadsThisMonth, totalActivities, activitiesThisWeek, trailCompletionRate, avgLeadsPerMentorado };
    },
    enabled: !!tenantId,
  });

  // --- Leads by Status ---
  const leadsByStatusQuery = useQuery({
    queryKey: ['mentor-reports-leads-by-status', tenantId, fromISO, toISO],
    queryFn: async (): Promise<LeadsByStatus[]> => {
      if (!tenantId) throw new Error('No tenant');
      let q = supabase.from('crm_prospections').select('status, created_at').eq('tenant_id', tenantId);
      if (period) q = q.gte('created_at', fromISO).lte('created_at', toISO);
      const { data: leads } = await q;
      const statusMap: Record<string, number> = {};
      leads?.forEach(l => {
        const status = l.status || 'novo';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
    },
    enabled: !!tenantId,
  });

  // --- Mentee Scores ---
  const menteeScoresQuery = useQuery({
    queryKey: ['mentor-reports-mentee-scores', tenantId, fromISO, toISO],
    queryFn: async (): Promise<MenteeScore[]> => {
      if (!tenantId) throw new Error('No tenant');

      const { data: memberships } = await supabase
        .from('memberships').select('id, user_id')
        .eq('tenant_id', tenantId).eq('role', 'mentee').eq('status', 'active');

      if (!memberships?.length) return [];

      const membershipIds = memberships.map(m => m.id);
      const userIds = memberships.map(m => m.user_id);

      let leadsQ = supabase.from('crm_prospections').select('membership_id').eq('tenant_id', tenantId).in('membership_id', membershipIds);
      let tasksQ = supabase.from('campan_tasks').select('mentorado_membership_id, status_column').eq('tenant_id', tenantId).in('mentorado_membership_id', membershipIds);
      let activitiesQ = supabase.from('activity_logs').select('membership_id, created_at, points_earned').eq('tenant_id', tenantId).in('membership_id', membershipIds);

      if (period) {
        leadsQ = leadsQ.gte('created_at', fromISO).lte('created_at', toISO);
        activitiesQ = activitiesQ.gte('created_at', fromISO).lte('created_at', toISO);
      }

      const [profilesRes, leadsRes, tasksRes, progressRes, activitiesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        leadsQ, tasksQ,
        supabase.from('trail_progress').select('membership_id, completed').eq('tenant_id', tenantId).in('membership_id', membershipIds),
        activitiesQ,
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

      const leadsPerM: Record<string, number> = {};
      (leadsRes.data || []).forEach(l => { if (l.membership_id) leadsPerM[l.membership_id] = (leadsPerM[l.membership_id] || 0) + 1; });

      const tasksPerM: Record<string, number> = {};
      (tasksRes.data || []).forEach(t => {
        if (t.mentorado_membership_id && t.status_column === 'done') {
          tasksPerM[t.mentorado_membership_id] = (tasksPerM[t.mentorado_membership_id] || 0) + 1;
        }
      });

      const trailProgressPerM: Record<string, { done: number; total: number }> = {};
      (progressRes.data || []).forEach(p => {
        if (p.membership_id) {
          if (!trailProgressPerM[p.membership_id]) trailProgressPerM[p.membership_id] = { done: 0, total: 0 };
          trailProgressPerM[p.membership_id].total++;
          if (p.completed) trailProgressPerM[p.membership_id].done++;
        }
      });

      const activitiesPerM: Record<string, { count: number; lastAt: string | null }> = {};
      (activitiesRes.data || []).forEach(a => {
        if (a.membership_id) {
          if (!activitiesPerM[a.membership_id]) activitiesPerM[a.membership_id] = { count: 0, lastAt: null };
          activitiesPerM[a.membership_id].count++;
          if (!activitiesPerM[a.membership_id].lastAt || a.created_at > activitiesPerM[a.membership_id].lastAt!) {
            activitiesPerM[a.membership_id].lastAt = a.created_at;
          }
        }
      });

      return memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        const tp = trailProgressPerM[m.id];
        const trailsProgress = tp ? Math.round((tp.done / tp.total) * 100) : 0;
        const leadsCount = leadsPerM[m.id] || 0;
        const tasksCompleted = tasksPerM[m.id] || 0;
        const actData = activitiesPerM[m.id] || { count: 0, lastAt: null };

        const score = calculateScore({ leadsCount, tasksCompleted, trailsProgress, activitiesCount: actData.count, streak: 0 });

        return {
          membershipId: m.id,
          name: profile?.full_name || 'Sem nome',
          avatar: profile?.avatar_url || null,
          score,
          previousScore: null,
          leadsCount,
          tasksCompleted,
          trailsProgress,
          activitiesCount: actData.count,
          lastActivityAt: actData.lastAt,
          streak: 0,
        };
      });
    },
    enabled: !!tenantId,
  });

  // --- Weekly Evolution ---
  const weeklyEvolutionQuery = useQuery({
    queryKey: ['mentor-reports-weekly-evolution', tenantId, fromISO, toISO],
    queryFn: async (): Promise<WeeklyDataPoint[]> => {
      if (!tenantId) throw new Error('No tenant');

      const startDate = period ? period.from : new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
      const endDate = period ? period.to : new Date();
      
      const weeks: WeeklyDataPoint[] = [];
      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);

      while (cursor <= endDate) {
        weeks.push({
          week: cursor.toISOString().split('T')[0],
          activities: 0,
          leads: 0,
          tasksCompleted: 0,
        });
        cursor.setDate(cursor.getDate() + 7);
      }

      if (weeks.length === 0) return [];

      const startISO = weeks[0].week;

      const [activitiesRes, leadsRes, tasksRes] = await Promise.all([
        supabase.from('activity_logs').select('created_at').eq('tenant_id', tenantId).gte('created_at', startISO).lte('created_at', toISO || new Date().toISOString()),
        supabase.from('crm_prospections').select('created_at').eq('tenant_id', tenantId).gte('created_at', startISO).lte('created_at', toISO || new Date().toISOString()),
        supabase.from('campan_tasks').select('updated_at, status_column').eq('tenant_id', tenantId).eq('status_column', 'done').gte('updated_at', startISO).lte('updated_at', toISO || new Date().toISOString()),
      ]);

      const getWeekIdx = (dateStr: string) => {
        const d = new Date(dateStr);
        for (let i = weeks.length - 1; i >= 0; i--) {
          if (d >= new Date(weeks[i].week)) return i;
        }
        return 0;
      };

      (activitiesRes.data || []).forEach(a => { weeks[getWeekIdx(a.created_at)].activities++; });
      (leadsRes.data || []).forEach(l => { if (l.created_at) weeks[getWeekIdx(l.created_at)].leads++; });
      (tasksRes.data || []).forEach(t => { weeks[getWeekIdx(t.updated_at)].tasksCompleted++; });

      return weeks;
    },
    enabled: !!tenantId,
  });

  // --- Monthly Comparison (last 6 months) ---
  const monthlyComparisonQuery = useQuery({
    queryKey: ['mentor-reports-monthly-comparison', tenantId],
    queryFn: async (): Promise<MonthlyComparison[]> => {
      if (!tenantId) throw new Error('No tenant');

      const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const now = new Date();
      const months: { label: string; from: string; to: string }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        months.push({
          label: MONTHS_PT[d.getMonth()],
          from: d.toISOString(),
          to: end.toISOString(),
        });
      }

      const sixMonthsAgo = months[0].from;

      const [leadsRes, activitiesRes] = await Promise.all([
        supabase.from('crm_prospections').select('created_at').eq('tenant_id', tenantId).gte('created_at', sixMonthsAgo),
        supabase.from('activity_logs').select('created_at').eq('tenant_id', tenantId).gte('created_at', sixMonthsAgo),
      ]);

      return months.map(m => {
        const leads = (leadsRes.data || []).filter(l => l.created_at && l.created_at >= m.from && l.created_at <= m.to).length;
        const activities = (activitiesRes.data || []).filter(a => a.created_at >= m.from && a.created_at <= m.to).length;
        return { month: m.label, leads, activities, avgScore: 0 };
      });
    },
    enabled: !!tenantId,
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    leadsByStatus: leadsByStatusQuery.data || [],
    leadsByStatusLoading: leadsByStatusQuery.isLoading,
    menteeScores: menteeScoresQuery.data || [],
    menteeScoresLoading: menteeScoresQuery.isLoading,
    weeklyEvolution: weeklyEvolutionQuery.data || [],
    weeklyEvolutionLoading: weeklyEvolutionQuery.isLoading,
    monthlyComparison: monthlyComparisonQuery.data || [],
    monthlyComparisonLoading: monthlyComparisonQuery.isLoading,
  };
}
