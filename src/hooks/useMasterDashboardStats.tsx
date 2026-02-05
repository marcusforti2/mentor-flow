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
       const { data, error } = await supabase
         .from('memberships')
         .select(`
           id, role, created_at,
           tenants!inner(name),
           profiles!inner(full_name, email)
         `)
         .order('created_at', { ascending: false })
         .limit(5);
       if (error) throw error;
       return (data as unknown as RecentActivity[]) || [];
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