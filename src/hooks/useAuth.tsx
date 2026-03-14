import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/App';

type AppRole = 'mentor' | 'mentorado' | 'admin_master';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isMentor: boolean;
  isMentorado: boolean;
  isAdminMaster: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Invalidate all cached queries on auth state change (login/logout/token refresh)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries();
        }
        
        // Defer data fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setProfile(profileData);

      // Derive role from the highest-priority active membership
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('status', 'active');

      setRole(resolveHighestRole(membershipData || []));
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });

    // Update profile with full name if provided
    if (!error && data.user && fullName) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', data.user.id);
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const value = {
    user,
    session,
    profile,
    role, // Role real do banco (sem override)
    isLoading,
    signIn,
    signUp,
    signOut,
    isMentor: role === 'mentor' || role === 'admin_master',
    isMentorado: role === 'mentorado' || role === 'admin_master',
    isAdminMaster: role === 'admin_master',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const fallbackAuth: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  role: null,
  isLoading: true,
  signIn: async () => ({ error: new Error('AuthProvider not mounted') }),
  signUp: async () => ({ error: new Error('AuthProvider not mounted') }),
  signOut: async () => {},
  isMentor: false,
  isMentorado: false,
  isAdminMaster: false,
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR transitions the provider tree may briefly unmount;
    // return a safe loading fallback instead of crashing the app.
    console.warn('[useAuth] Context undefined – returning fallback (HMR transition)');
    return fallbackAuth;
  }
  return context;
}
