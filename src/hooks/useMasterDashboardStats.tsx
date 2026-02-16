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

  // Query 1: Count tenants (exclude sandbox)
  const { data: tenantsCount, isLoading: tenantsLoading } = useQuery({
    queryKey: ['master-stats-tenants'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .neq('id', SANDBOX_TENANT_ID);
      if (error) throw error;
      return count || 0;
    }
  });

  // Query 2: Count active memberships (exclude sandbox)
  const { data: membershipsCount, isLoading: membershipsLoading } = useQuery({
    queryKey: ['master-stats-memberships'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);
      if (error) throw error;
      return count || 0;
    }
  });

  // Query 3: Count unique users (exclude sandbox)
  const { data: usersCount, isLoading: usersLoading } = useQuery({
    queryKey: ['master-stats-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);
      if (error) throw error;
      const uniqueUsers = new Set(data?.map(m => m.user_id));
      return uniqueUsers.size;
    }
  });

  // Query 4: Tenant breakdown with engagement
  const { data: tenantBreakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['master-tenant-breakdown'],
    queryFn: async () => {
      // Get all tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .neq('id', SANDBOX_TENANT_ID);
      if (!tenants) return [];

      // Get all memberships
      const { data: memberships } = await supabase
        .from('memberships')
        .select('id, tenant_id, role, status')
        .eq('status', 'active')
        .neq('tenant_id', SANDBOX_TENANT_ID);

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentLogs } = await supabase
        .from('activity_logs')
        .select('membership_id, tenant_id')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Get leads count per tenant
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
        } as TenantBreakdown;
      }).sort((a, b) => b.total - a.total);
    }
  });

  // Query 5: Growth — new memberships per week (last 8 weeks)
  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ['master-growth-data'],
    queryFn: async () => {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      const { data, error } = await supabase
        .from('memberships')
        .select('created_at, role')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .gte('created_at', eightWeeksAgo.toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Group by week
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

  // Query 6: Engagement rate (active in last 7 days / total active memberships)
  const { data: engagementRate, isLoading: engagementLoading } = useQuery({
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

  // Query 7: Recent activity (exclude sandbox)
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['master-recent-activity'],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('id, role, created_at, user_id, tenant_id, tenants!inner(name)')
        .neq('tenant_id', SANDBOX_TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
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

  // Query 8: Suspended mentees count
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
    selectedTenantId,
    setSelectedTenantId,
    isLoading,
    isGrowthLoading: growthLoading,
  };
}
