import { useState, useCallback, useEffect } from 'react';

export interface WindowState {
  id: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export interface AppConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: { width: number; height: number };
}

const STORAGE_KEY = 'desktop-windows-state';

export function useWindowManager(apps: AppConfig[]) {
  const [windows, setWindows] = useState<Record<string, WindowState>>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load window state from localStorage');
    }
    
    // Initialize with default state for all apps
    const initial: Record<string, WindowState> = {};
    apps.forEach((app, index) => {
      initial[app.id] = {
        id: app.id,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        position: { x: 100 + index * 30, y: 50 + index * 30 },
        size: app.defaultSize,
        zIndex: 10 + index,
      };
    });
    return initial;
  });

  const [maxZIndex, setMaxZIndex] = useState(100);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
    } catch (e) {
      console.warn('Failed to save window state to localStorage');
    }
  }, [windows]);

  const openWindow = useCallback((id: string) => {
    setMaxZIndex(prev => prev + 1);
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: true,
        isMinimized: false,
        zIndex: maxZIndex + 1,
      },
    }));
  }, [maxZIndex]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
      },
    }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMinimized: true,
      },
    }));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMaximized: !prev[id].isMaximized,
      },
    }));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setMaxZIndex(prev => prev + 1);
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isMinimized: false,
        zIndex: maxZIndex + 1,
      },
    }));
  }, [maxZIndex]);

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        position,
      },
    }));
  }, []);

  const updateSize = useCallback((id: string, size: { width: number; height: number }) => {
    setWindows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        size,
      },
    }));
  }, []);

  const toggleWindow = useCallback((id: string) => {
    const window = windows[id];
    if (!window) return;

    if (!window.isOpen) {
      openWindow(id);
    } else if (window.isMinimized) {
      focusWindow(id);
    } else {
      focusWindow(id);
    }
  }, [windows, openWindow, focusWindow]);

  const selectIcon = useCallback((id: string | null) => {
    setSelectedIcon(id);
  }, []);

  const getOpenWindows = useCallback(() => {
    return Object.values(windows).filter(w => w.isOpen);
  }, [windows]);

  const hasOpenWindow = useCallback((id: string) => {
    return windows[id]?.isOpen && !windows[id]?.isMinimized;
  }, [windows]);

  return {
    windows,
    selectedIcon,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updatePosition,
    updateSize,
    toggleWindow,
    selectIcon,
    getOpenWindows,
    hasOpenWindow,
  };
}
