 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 interface RecentActivity {
   id: string;
   role: string;
   created_at: string;
   tenants: { name: string };
   profiles: { full_name: string | null; email: string | null };
 }
 
 export function useMasterDashboardStats() {
   // Query 1: Count tenants
   const { data: tenantsCount, isLoading: tenantsLoading } = useQuery({
     queryKey: ['master-stats-tenants'],
     queryFn: async () => {
       const { count, error } = await supabase
         .from('tenants')
         .select('*', { count: 'exact', head: true });
       if (error) throw error;
       return count || 0;
     }
   });
 
   // Query 2: Count active memberships
   const { data: membershipsCount, isLoading: membershipsLoading } = useQuery({
     queryKey: ['master-stats-memberships'],
     queryFn: async () => {
       const { count, error } = await supabase
         .from('memberships')
         .select('*', { count: 'exact', head: true })
         .eq('status', 'active');
       if (error) throw error;
       return count || 0;
     }
   });
 
   // Query 3: Count unique users
   const { data: usersCount, isLoading: usersLoading } = useQuery({
     queryKey: ['master-stats-users'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('memberships')
         .select('user_id')
         .eq('status', 'active');
       if (error) throw error;
       const uniqueUsers = new Set(data?.map(m => m.user_id));
       return uniqueUsers.size;
     }
   });
 
    // Query 4: Recent activity (últimos memberships criados)
    const { data: recentActivity, isLoading: activityLoading } = useQuery({
      queryKey: ['master-recent-activity'],
      queryFn: async () => {
        // Fetch memberships with tenant info
        const { data: memberships, error } = await supabase
          .from('memberships')
          .select('id, role, created_at, user_id, tenant_id, tenants!inner(name)')
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        if (!memberships || memberships.length === 0) return [];
        
        // Fetch profiles separately (no FK between memberships and profiles)
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