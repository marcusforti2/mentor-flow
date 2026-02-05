 import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 
 export type MembershipRole = 'master_admin' | 'admin' | 'ops' | 'mentor' | 'mentee';
 
 import type { Json } from '@/integrations/supabase/types';
 
 export interface Tenant {
   id: string;
   name: string;
   slug: string;
   logo_url: string | null;
   primary_color: string | null;
   secondary_color: string | null;
   settings: Json;
 }
 
 export interface Membership {
   id: string;
   tenant_id: string; // UUID as string
   tenant_name: string;
   tenant_slug: string;
   user_id: string;
   role: MembershipRole;
   status: string;
   can_impersonate: boolean;
 }
 
 export interface TenantContextType {
   // Tenant info
   tenant: Tenant | null;
   
   // Membership info
   memberships: Membership[];
   activeMembership: Membership | null;
   realMembership: Membership | null;
   
   // Impersonation state
   isImpersonating: boolean;
   impersonationLogId: string | null;
   
   // Loading states
   isLoading: boolean;
   
   // Actions
   switchMembership: (membershipId: string) => Promise<void>;
   endImpersonation: () => Promise<void>;
   refreshMemberships: () => Promise<void>;
  refreshMembershipsAndWait: () => Promise<Membership[]>;
   
   // Helpers
   hasRole: (roles: MembershipRole | MembershipRole[]) => boolean;
   isAdmin: boolean;
   isOps: boolean;
   isMentor: boolean;
   isMentee: boolean;
   isMasterAdmin: boolean;
   canImpersonate: boolean;
 }
 
 const TenantContext = createContext<TenantContextType | undefined>(undefined);
 
 const ACTIVE_MEMBERSHIP_KEY = 'active_membership_id';
 const IMPERSONATION_LOG_KEY = 'impersonation_log_id';

// Role priority order (highest privilege first)
const ROLE_ORDER: MembershipRole[] = ['master_admin', 'admin', 'ops', 'mentor', 'mentee'];
 
 export function TenantProvider({ children }: { children: ReactNode }) {
   const { user } = useAuth();
   const navigate = useNavigate();
   
   const [tenant, setTenant] = useState<Tenant | null>(null);
   const [memberships, setMemberships] = useState<Membership[]>([]);
   const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
   const [realMembership, setRealMembership] = useState<Membership | null>(null);
   const [isImpersonating, setIsImpersonating] = useState(false);
   const [impersonationLogId, setImpersonationLogId] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(true);
 
   // Fetch memberships when user changes
   const fetchMemberships = useCallback(async () => {
      if (!user?.id) {
        setMemberships([]);
        setActiveMembership(null);
        setRealMembership(null);
        setTenant(null);
        setIsLoading(false);
        return [];
      }
 
     try {
       // Get all memberships for user
       const { data: membershipData, error } = await supabase
         .rpc('get_user_memberships', { _user_id: user.id });
 
       if (error) throw error;
 
        if (!membershipData || membershipData.length === 0) {
          setMemberships([]);
          setActiveMembership(null);
          setRealMembership(null);
          setTenant(null);
          setIsLoading(false);
          return [];
        }
 
       // Map to full membership objects
       const fullMemberships: Membership[] = membershipData.map((m: {
         id: string;
         tenant_id: string;
         tenant_name: string;
         tenant_slug: string;
         role: MembershipRole;
         status: string;
       }) => ({
         id: m.id,
         tenant_id: m.tenant_id,
         tenant_name: m.tenant_name,
         tenant_slug: m.tenant_slug,
         user_id: user.id,
         role: m.role,
         status: m.status,
         can_impersonate: m.role === 'admin', // Admins can always impersonate
       }));
 
       setMemberships(fullMemberships);
 
       // Determine real membership (highest privilege)
       const sortedMemberships = [...fullMemberships].sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
       );
       const real = sortedMemberships[0];
       setRealMembership(real);
      
      console.log('[TenantContext] Memberships loaded:', {
        count: fullMemberships.length,
        realRole: real?.role,
        roles: fullMemberships.map(m => m.role),
      });
 
       // Check for stored active membership (for impersonation persistence)
       const storedMembershipId = localStorage.getItem(ACTIVE_MEMBERSHIP_KEY);
       const storedLogId = localStorage.getItem(IMPERSONATION_LOG_KEY);
       
       let active = real;
       if (storedMembershipId && storedMembershipId !== real?.id) {
         const storedMembership = fullMemberships.find(m => m.id === storedMembershipId);
         if (storedMembership) {
           active = storedMembership;
           setIsImpersonating(true);
           setImpersonationLogId(storedLogId);
         } else {
           // Stored membership no longer valid, clear it
           localStorage.removeItem(ACTIVE_MEMBERSHIP_KEY);
           localStorage.removeItem(IMPERSONATION_LOG_KEY);
         }
       }
       
       setActiveMembership(active);
 
       // Fetch tenant details
       if (active) {
         const { data: tenantData } = await supabase
           .from('tenants')
           .select('*')
           .eq('id', active.tenant_id)
           .single();
         
         setTenant(tenantData);
       }
      
      return fullMemberships;
     } catch (error) {
       console.error('Error fetching memberships:', error);
      return [];
     } finally {
       setIsLoading(false);
     }
   }, [user?.id]);
 
   useEffect(() => {
     fetchMemberships();
   }, [fetchMemberships]);
 
   // Switch to a different membership (impersonation)
   const switchMembership = useCallback(async (membershipId: string) => {
     if (!realMembership || !activeMembership) return;
     
     const targetMembership = memberships.find(m => m.id === membershipId);
     if (!targetMembership) return;
 
     // If switching back to real membership, just end impersonation
     if (membershipId === realMembership.id) {
       await endImpersonation();
       return;
     }
 
     // Can only impersonate if current membership is admin or has can_impersonate
     if (realMembership.role !== 'admin' && !realMembership.can_impersonate) {
       console.error('No permission to impersonate');
       return;
     }
 
     try {
       // Log impersonation start
       const { data: logId, error } = await supabase
         .rpc('start_impersonation', {
           _admin_membership_id: realMembership.id,
           _target_membership_id: membershipId,
         });
 
       if (error) throw error;
 
       // Update state
       setActiveMembership(targetMembership);
       setIsImpersonating(true);
       setImpersonationLogId(logId);
       
       // Persist for page refresh
       localStorage.setItem(ACTIVE_MEMBERSHIP_KEY, membershipId);
       localStorage.setItem(IMPERSONATION_LOG_KEY, logId);
 
       // Navigate to appropriate dashboard
       const targetPath = getTargetPath(targetMembership.role);
       navigate(targetPath);
     } catch (error) {
       console.error('Error starting impersonation:', error);
     }
   }, [realMembership, activeMembership, memberships, navigate]);
 
   // End impersonation
   const endImpersonation = useCallback(async () => {
     if (!realMembership) return;
 
     try {
       // Log impersonation end
       if (impersonationLogId) {
         await supabase.rpc('end_impersonation', { _log_id: impersonationLogId });
       }
 
       // Update state
       setActiveMembership(realMembership);
       setIsImpersonating(false);
       setImpersonationLogId(null);
       
       // Clear storage
       localStorage.removeItem(ACTIVE_MEMBERSHIP_KEY);
       localStorage.removeItem(IMPERSONATION_LOG_KEY);
 
       // Navigate to appropriate dashboard
       const targetPath = getTargetPath(realMembership.role);
       navigate(targetPath);
     } catch (error) {
       console.error('Error ending impersonation:', error);
     }
   }, [realMembership, impersonationLogId, navigate]);
 
   // Helper to check if active membership has role(s)
   const hasRole = useCallback((roles: MembershipRole | MembershipRole[]) => {
     if (!activeMembership) return false;
     const roleArray = Array.isArray(roles) ? roles : [roles];
     return roleArray.includes(activeMembership.role);
   }, [activeMembership]);
 
   // Helper to get correct path for role
   const getTargetPath = (role: MembershipRole): string => {
     switch (role) {
       case 'master_admin':
         return '/master';
       case 'admin':
       case 'ops':
       case 'mentor':
         return '/mentor';
       case 'mentee':
         return '/mentorado';
       default:
         return '/mentorado';
     }
   };
 
   const value: TenantContextType = {
     tenant,
     memberships,
     activeMembership,
     realMembership,
     isImpersonating,
     impersonationLogId,
     isLoading,
     switchMembership,
     endImpersonation,
     refreshMemberships: async () => { await fetchMemberships(); },
     refreshMembershipsAndWait: fetchMemberships,
     hasRole,
     isAdmin: hasRole('admin'),
     isOps: hasRole('ops'),
     isMentor: hasRole('mentor'),
     isMentee: hasRole('mentee'),
     isMasterAdmin: hasRole('master_admin'),
     canImpersonate: realMembership?.role === 'admin' || realMembership?.can_impersonate || false,
   };
 
   return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
 }
 
 export function useTenant() {
   const context = useContext(TenantContext);
   if (context === undefined) {
     throw new Error('useTenant must be used within a TenantProvider');
   }
   return context;
 }