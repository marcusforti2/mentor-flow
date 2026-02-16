import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

interface TenantBreakdown {
  tenant_id: string;
  tenant_name: string;
  mentors: number;
  mentees: number;
  total: number;
  activeLast7d: number;
  leadsCount: number;
  monthlyValue: number;
}

interface MasterAlert {
  type: 'tenant_inactive' | 'mentor_no_mentees';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  tenant_name?: string;
  mentor_name?: string;
}

interface ModuleUsage {
  module: string;
  label: string;
  count: number;
}

interface RecentActivity {
  id: string;
  role: string;
  created_at: string;
  tenants: { name: string };
  profiles: { full_name: string | null; email: string | null };
}

export function useMasterDashboardStats() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');

  // Query 1: Count tenants
  const { data: tenantsCount, isLoading: tenantsLoading } = useQuery({
    queryKey: ['master-stats-tenants'],
    queryFn: async () => {
      const { count } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .neq('id', SANDBOX_TENANT_ID);
      return count || 0;
    }
  });

  // Query 2: Count active memberships
  const { data: membershipsCount, isLoading: membershipsLoading } = useQuery({
    queryKey: ['master-stats-memberships'],
    queryFn: async () => {
      const { count } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);
      return count || 0;
    }
  });

  // Query 3: Unique users
  const { data: usersCount, isLoading: usersLoading } = useQuery({
    queryKey: ['master-stats-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);
      return new Set(data?.map(m => m.user_id)).size;
    }
  });

  // Query 4: Tenant breakdown with MRR
  const { data: tenantBreakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['master-tenant-breakdown'],
    queryFn: async () => {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, monthly_value')
        .neq('id', SANDBOX_TENANT_ID);
      if (!tenants) return [];

      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, tenant_id, role, status')
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentLogs } = await supabase
        .from('activity_logs')
        .select('membership_id, tenant_id')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: leads } = await supabase
        .from('crm_prospections')
        .select('tenant_id')
        .neq('tenant_id', SANDBOX_TENANT_ID);

      return tenants.map(t => {
        const tenantMembers = memberships?.filter(m => m.tenant_id === t.id) || [];
        const activeMemberIds = new Set(
          recentLogs?.filter(l => l.tenant_id === t.id).map(l => l.membership_id)
        );
        return {
          tenant_id: t.id,
          tenant_name: t.name,
          mentors: tenantMembers.filter(m => m.role === 'mentor').length,
          mentees: tenantMembers.filter(m => m.role === 'mentee').length,
          total: tenantMembers.length,
          activeLast7d: activeMemberIds.size,
          leadsCount: leads?.filter(l => l.tenant_id === t.id).length || 0,
          monthlyValue: Number((t as any).monthly_value) || 0,
        } as TenantBreakdown;
      }).sort((a, b) => b.total - a.total);
    }
  });

  // Query 5: Growth
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['master-growth-data'],
    queryFn: async () => {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const { data } = await supabase
        .from('memberships')
        .select('created_at, role')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', eightWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      const weeks: Record<string, { week: string; mentors: number; mentees: number; total: number }> = {};
      data?.forEach(m => {
        const d = new Date(m.created_at!);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split('T')[0];
        if (!weeks[key]) weeks[key] = { week: key, mentors: 0, mentees: 0, total: 0 };
        weeks[key].total++;
        if (m.role === 'mentor') weeks[key].mentors++;
        if (m.role === 'mentee') weeks[key].mentees++;
      });
      return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
    }
  });

  // Query 6: Engagement rate
  const { data: engagementRate } = useQuery({
    queryKey: ['master-engagement-rate'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: activeLogs } = await supabase
        .from('activity_logs')
        .select('membership_id')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', sevenDaysAgo.toISOString());
      const activeSet = new Set(activeLogs?.map(l => l.membership_id));
      const { count: totalMentees } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('role', 'mentee')
        .neq('tenant_id', SANDBOX_TENANT_ID);
      if (!totalMentees || totalMentees === 0) return 0;
      return Math.round((activeSet.size / totalMentees) * 100);
    }
  });

  // Query 7: Alerts — tenant inativo 7d + mentor sem mentorados
  const { data: alerts } = useQuery({
    queryKey: ['master-alerts'],
    queryFn: async () => {
      const result: MasterAlert[] = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Tenants without ANY activity in 7 days
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .neq('id', SANDBOX_TENANT_ID);

      const { data: recentLogs } = await supabase
        .from('activity_logs')
        .select('tenant_id')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', sevenDaysAgo.toISOString());

      const activeTenantIds = new Set(recentLogs?.map(l => l.tenant_id));

      // Also check memberships — only alert for tenants that actually have mentees
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, tenant_id, role, user_id')
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);

      tenants?.forEach(t => {
        const hasMentees = memberships?.some(m => m.tenant_id === t.id && m.role === 'mentee');
        if (hasMentees && !activeTenantIds.has(t.id)) {
          result.push({
            type: 'tenant_inactive',
            severity: 'critical',
            title: `${t.name} — inativo há 7+ dias`,
            description: 'Nenhuma atividade registrada nos últimos 7 dias',
            tenant_name: t.name,
          });
        }
      });

      // Mentors without any assigned mentees
      const mentors = memberships?.filter(m => m.role === 'mentor') || [];
      const { data: assignments } = await supabase
        .from('mentor_mentee_assignments')
        .select('mentor_membership_id')
        .eq('status', 'active');
      const assignedMentorIds = new Set(assignments?.map(a => a.mentor_membership_id));

      // Get mentor names
      const mentorUserIds = mentors.filter(m => !assignedMentorIds.has(m.id)).map(m => m.user_id);
      let mentorProfiles: Record<string, string> = {};
      if (mentorUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', mentorUserIds);
        profiles?.forEach(p => { mentorProfiles[p.user_id] = p.full_name || 'Sem nome'; });
      }

      const tenantMap = new Map(tenants?.map(t => [t.id, t.name]));
      mentors.forEach(m => {
        if (!assignedMentorIds.has(m.id)) {
          result.push({
            type: 'mentor_no_mentees',
            severity: 'warning',
            title: `${mentorProfiles[m.user_id] || 'Mentor'} — sem mentorados`,
            description: `${tenantMap.get(m.tenant_id) || 'Tenant'} — nenhum vínculo ativo`,
            mentor_name: mentorProfiles[m.user_id],
            tenant_name: tenantMap.get(m.tenant_id),
          });
        }
      });

      return result;
    }
  });

  // Query 8: Module usage (from activity_logs action_type)
  const { data: moduleUsage } = useQuery({
    queryKey: ['master-module-usage'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs } = await supabase
        .from('activity_logs')
        .select('action_type')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Map action_types to modules
      const moduleMap: Record<string, string> = {
        'lead_created': 'CRM',
        'lead_status_changed': 'CRM',
        'lead_uploaded': 'CRM',
        'lead_qualified': 'CRM',
        'lesson_completed': 'Trilhas',
        'trail_started': 'Trilhas',
        'login': 'Login',
        'sos_request': 'SOS',
        'ai_tool_used': 'IA',
        'booking_created': 'Agenda',
        'community_post': 'Comunidade',
        'task_completed': 'Tarefas',
        'prospection_added': 'CRM',
      };

      const counts: Record<string, number> = {};
      logs?.forEach(l => {
        const mod = moduleMap[l.action_type] || 'Outro';
        counts[mod] = (counts[mod] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([module, count]) => ({ module, label: module, count }))
        .sort((a, b) => b.count - a.count) as ModuleUsage[];
    }
  });

  // Query 9: Recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['master-recent-activity'],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, role, created_at, user_id, tenant_id, tenants!inner(name)')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!memberships || memberships.length === 0) return [];

      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      return memberships.map(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        return {
          id: m.id,
          role: m.role,
          created_at: m.created_at,
          tenants: (m as any).tenants || { name: 'N/A' },
          profiles: { full_name: profile?.full_name || null, email: profile?.email || null },
        };
      }) as RecentActivity[];
    }
  });

  // Query 10: Suspended count
  const { data: suspendedCount } = useQuery({
    queryKey: ['master-suspended-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'suspended')
        .eq('role', 'mentee')
        .neq('tenant_id', SANDBOX_TENANT_ID);
      return count || 0;
    }
  });

  // Computed: MRR total
  const totalMRR = tenantBreakdown?.reduce((sum, t) => sum + t.monthlyValue, 0) || 0;

  const isLoading = tenantsLoading || membershipsLoading || usersLoading || activityLoading || breakdownLoading;

  return {
    tenantsCount,
    membershipsCount,
    usersCount,
    recentActivity,
    tenantBreakdown,
    growthData,
    engagementRate,
    suspendedCount,
    alerts,
    moduleUsage,
    totalMRR,
    selectedTenantId,
    setSelectedTenantId,
    isLoading,
    isGrowthLoading: growthLoading,
  };
}
