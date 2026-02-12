import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';

interface RecentActivity {
  id: string;
  role: string;
  created_at: string;
  tenants: { name: string };
  profiles: { full_name: string | null; email: string | null };
}

export function useMasterDashboardStats() {
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

  // Query 4: Recent activity (exclude sandbox)
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

  const isLoading = tenantsLoading || membershipsLoading || usersLoading || activityLoading;

  return { 
    tenantsCount, 
    membershipsCount,
    usersCount, 
    recentActivity, 
    isLoading 
  };
}