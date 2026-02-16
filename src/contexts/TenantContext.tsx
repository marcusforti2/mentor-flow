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
  accent_color?: string | null;
  font_family?: string | null;
  brand_attributes?: Json | null;
  settings: Json;
}

export interface Membership {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  user_id: string;
  role: MembershipRole;
  status: string;
  can_impersonate: boolean;
}

export interface TenantContextType {
  tenant: Tenant | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  realMembership: Membership | null;
  isImpersonating: boolean;
  impersonationLogId: string | null;
  isLoading: boolean;
  switchMembership: (membershipId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
  refreshMembershipsAndWait: () => Promise<Membership[]>;
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
        // Both admin and master_admin can impersonate
        can_impersonate: m.role === 'admin' || m.role === 'master_admin',
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
        // First check own memberships
        let storedMembership = fullMemberships.find(m => m.id === storedMembershipId);
        
        // If not found and user is master_admin, try fetching from DB (cross-tenant preview)
        if (!storedMembership && real?.role === 'master_admin') {
          try {
            const fetched = await fetchMembershipById(storedMembershipId);
            if (fetched) {
              storedMembership = fetched;
            }
          } catch (e) {
            console.warn('[TenantContext] Could not restore external membership:', e);
          }
        }
        
        if (storedMembership) {
          active = storedMembership;
          setIsImpersonating(true);
          setImpersonationLogId(storedLogId);
        } else {
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

  // Dynamic branding injection: set CSS variables on document.body to override :root/@layer base
  useEffect(() => {
    const STYLE_ID = 'tenant-branding-override';
    const body = document.body;
    const injectedProps: string[] = [];

    const cleanup = () => {
      // Remove inline style properties from body
      injectedProps.forEach(prop => body.style.removeProperty(prop));
      injectedProps.length = 0;
      // Also remove any leftover style tag
      const existing = document.getElementById(STYLE_ID);
      if (existing) existing.remove();
    };

    if (!tenant) {
      cleanup();
      return;
    }

    const isMasterView = realMembership?.role === 'master_admin' && !isImpersonating;
    if (isMasterView) {
      cleanup();
      return;
    }

    const hexToHsl = (hex: string): string | null => {
      try {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      } catch { return null; }
    };

    const isHslValue = (val: string): boolean => /^\d+\s+\d+%\s+\d+%$/.test(val.trim());

    const inject = (prop: string, value: string | null | undefined) => {
      if (!value) return;
      // Strip accidental hsl() wrapper: "hsl(220 15% 10%)" -> "220 15% 10%"
      let cleaned = value;
      const hslMatch = value.match(/^hsl\(([^)]+)\)$/i);
      if (hslMatch) cleaned = hslMatch[1].trim();
      
      let hsl: string | null;
      if (isHslValue(cleaned)) {
        hsl = cleaned;
      } else {
        hsl = hexToHsl(cleaned);
      }
      if (hsl) {
        body.style.setProperty(prop, hsl);
        injectedProps.push(prop);
      }
    };

    // Core colors
    inject('--primary', tenant.primary_color);
    inject('--primary-foreground', '0 0% 98%');
    inject('--secondary', tenant.secondary_color);
    inject('--accent', tenant.accent_color);
    inject('--ring', tenant.primary_color);

    // Advanced brand_attributes
    const attrs = tenant.brand_attributes as Record<string, string> | null;
    if (attrs) {
      inject('--background', attrs.background);
      inject('--foreground', attrs.foreground);
      inject('--card', attrs.card);
      inject('--card-foreground', attrs.card_foreground);
      inject('--muted', attrs.muted);
      inject('--muted-foreground', attrs.muted_foreground);
      inject('--border', attrs.border);
      inject('--input', attrs.border);
      inject('--popover', attrs.card);
      inject('--popover-foreground', attrs.card_foreground);
    }

    // Font overrides
    if (tenant.font_family) {
      body.style.setProperty('--font-display', `'${tenant.font_family}', sans-serif`);
      body.style.setProperty('--font-body', `'${tenant.font_family}', sans-serif`);
      injectedProps.push('--font-display', '--font-body');
    }

    console.log('[Branding] Body vars injected for', tenant.name, ':', injectedProps.length, 'vars');

    return cleanup;
  }, [tenant, realMembership?.role, isImpersonating]);

  // Helper to fetch a single membership by ID from DB (for master_admin cross-tenant access)
  const fetchMembershipById = async (membershipId: string): Promise<Membership | null> => {
    const { data, error } = await supabase
      .from('memberships')
      .select('id, role, status, tenant_id, user_id, tenants(name, slug)')
      .eq('id', membershipId)
      .eq('status', 'active')
      .single();
    
    if (error || !data) return null;
    
    const tenantData = data.tenants as any;
    return {
      id: data.id,
      tenant_id: data.tenant_id,
      tenant_name: tenantData?.name || '',
      tenant_slug: tenantData?.slug || '',
      user_id: data.user_id,
      role: data.role as MembershipRole,
      status: data.status,
      can_impersonate: false,
    };
  };

  // Switch to a different membership (impersonation)
  const switchMembership = useCallback(async (membershipId: string) => {
    if (!realMembership || !activeMembership) return;
    
    // If switching back to real membership, just end impersonation
    if (membershipId === realMembership.id) {
      await endImpersonation();
      return;
    }

    // First try to find in own memberships
    let targetMembership = memberships.find(m => m.id === membershipId);
    
    // If not found and user is master_admin, fetch from DB (cross-tenant preview)
    if (!targetMembership && realMembership.role === 'master_admin') {
      console.log('[TenantContext] Fetching external membership for master_admin preview:', membershipId);
      try {
        const fetched = await fetchMembershipById(membershipId);
        if (fetched) {
          targetMembership = fetched;
        }
      } catch (e) {
        console.error('[TenantContext] Failed to fetch external membership:', e);
      }
    }
    
    if (!targetMembership) {
      console.error('[TenantContext] Target membership not found:', membershipId);
      return;
    }

    // Can only impersonate if current membership is admin/master_admin or has can_impersonate
    if (!['admin', 'master_admin'].includes(realMembership.role) && !realMembership.can_impersonate) {
      console.error('No permission to impersonate');
      return;
    }

    try {
      // Log impersonation start via DB function
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
      
      // Also update tenant context for the target
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', targetMembership.tenant_id)
        .single();
      if (tenantData) setTenant(tenantData);
      
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
      
      // Restore real tenant context
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', realMembership.tenant_id)
        .single();
      if (tenantData) setTenant(tenantData);
      
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
    // master_admin and admin can always impersonate
    canImpersonate: realMembership?.role === 'admin' || realMembership?.role === 'master_admin' || realMembership?.can_impersonate || false,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    console.warn('[TenantContext] Context undefined - this may be a HMR transition');
    return {
      tenant: null,
      memberships: [],
      activeMembership: null,
      realMembership: null,
      isImpersonating: false,
      impersonationLogId: null,
      isLoading: true,
      switchMembership: async () => {},
      endImpersonation: async () => {},
      refreshMemberships: async () => {},
      refreshMembershipsAndWait: async () => [],
      hasRole: () => false,
      isAdmin: false,
      isOps: false,
      isMentor: false,
      isMentee: false,
      isMasterAdmin: false,
      canImpersonate: false,
    } as TenantContextType;
  }
  return context;
}
