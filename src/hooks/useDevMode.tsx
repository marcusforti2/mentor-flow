import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

type AppRole = 'mentor' | 'mentorado';

interface DevModeContextType {
  isDevModeActive: boolean;
  overrideRole: AppRole | null;
  setOverrideRole: (role: AppRole | null) => void;
  clearOverride: () => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

const DEV_MODE_KEY = 'dev_mode_role_override';

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [overrideRole, setOverrideRoleState] = useState<AppRole | null>(null);
  const navigate = useNavigate();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DEV_MODE_KEY);
    if (stored === 'mentor' || stored === 'mentorado') {
      setOverrideRoleState(stored);
    }
  }, []);

  const setOverrideRole = (role: AppRole | null) => {
    setOverrideRoleState(role);
    if (role) {
      localStorage.setItem(DEV_MODE_KEY, role);
      // Redirect to appropriate panel
      const targetPath = role === 'mentor' ? '/admin' : '/app';
      navigate(targetPath);
    } else {
      localStorage.removeItem(DEV_MODE_KEY);
    }
  };

  const clearOverride = () => {
    setOverrideRoleState(null);
    localStorage.removeItem(DEV_MODE_KEY);
  };

  const value = {
    isDevModeActive: overrideRole !== null,
    overrideRole,
    setOverrideRole,
    clearOverride,
  };

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}
