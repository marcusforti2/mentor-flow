import { lazy, Suspense, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWindowManager, AppConfig } from '@/hooks/useWindowManager';
import { DesktopTopBar } from './DesktopTopBar';
import { DesktopIcon } from './DesktopIcon';
import { DesktopDock } from './DesktopDock';
import { DesktopWindow } from './DesktopWindow';
import { DevModeSelector } from '@/components/DevModeSelector';
import { Loader2 } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Calendar,
  Headphones,
  Trophy,
  AlertTriangle,
  User,
} from 'lucide-react';

// Lazy load page components
const MemberDashboard = lazy(() => import('@/pages/member/MemberDashboard'));
const Trilhas = lazy(() => import('@/pages/member/Trilhas'));
const MeuCRM = lazy(() => import('@/pages/member/MeuCRM'));
const Treinamento = lazy(() => import('@/pages/member/Treinamento'));
const CentroSOS = lazy(() => import('@/pages/member/CentroSOS'));
const Perfil = lazy(() => import('@/pages/member/Perfil'));

// App configurations
const apps: AppConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, defaultSize: { width: 1000, height: 700 } },
  { id: 'trilhas', label: 'Trilhas', icon: BookOpen, defaultSize: { width: 1100, height: 750 } },
  { id: 'meu-crm', label: 'Meu CRM', icon: Target, defaultSize: { width: 1000, height: 700 } },
  { id: 'calendario', label: 'Calendário', icon: Calendar, defaultSize: { width: 800, height: 600 } },
  { id: 'treinamento', label: 'Treinamento', icon: Headphones, defaultSize: { width: 900, height: 650 } },
  { id: 'ranking', label: 'Ranking', icon: Trophy, defaultSize: { width: 800, height: 600 } },
  { id: 'sos', label: 'Centro SOS', icon: AlertTriangle, defaultSize: { width: 900, height: 650 } },
  { id: 'perfil', label: 'Meu Perfil', icon: User, defaultSize: { width: 800, height: 600 } },
];

// Loading fallback
function WindowLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Content renderer for each app
function AppContent({ appId }: { appId: string }) {
  switch (appId) {
    case 'dashboard':
      return <MemberDashboard />;
    case 'trilhas':
      return <Trilhas />;
    case 'meu-crm':
      return <MeuCRM />;
    case 'treinamento':
      return <Treinamento />;
    case 'sos':
      return <CentroSOS />;
    case 'perfil':
      return <Perfil />;
    case 'calendario':
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Calendário em breve...</p>
          </div>
        </div>
      );
    case 'ranking':
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ranking em breve...</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function Desktop() {
  const { profile, signOut } = useAuth();
  const windowManager = useWindowManager(apps);
  const { 
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
  } = windowManager;

  const openWindowIds = useMemo(() => 
    getOpenWindows().map(w => w.id), 
    [getOpenWindows]
  );

  const handleDesktopClick = () => {
    selectIcon(null);
  };

  return (
    <div 
      className="desktop-container min-h-screen relative overflow-hidden"
      onClick={handleDesktopClick}
    >
      {/* Animated gradient background */}
      <div className="animated-gradient-bg" />

      {/* Top Bar */}
      <DesktopTopBar
        userName={profile?.full_name || 'Mentorado'}
        avatarUrl={profile?.avatar_url || undefined}
        onLogout={signOut}
      />

      {/* Desktop Icons Grid */}
      <div className="pt-14 pb-24 px-6">
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-w-[400px]">
          {apps.map((app) => (
            <DesktopIcon
              key={app.id}
              id={app.id}
              label={app.label}
              icon={app.icon}
              isSelected={selectedIcon === app.id}
              isOpen={windows[app.id]?.isOpen || false}
              onSelect={() => selectIcon(app.id)}
              onDoubleClick={() => openWindow(app.id)}
            />
          ))}
        </div>
      </div>

      {/* Windows */}
      {apps.map((app) => {
        const state = windows[app.id];
        if (!state?.isOpen) return null;
        
        return (
          <DesktopWindow
            key={app.id}
            id={app.id}
            title={app.label}
            icon={app.icon}
            state={state}
            onClose={() => closeWindow(app.id)}
            onMinimize={() => minimizeWindow(app.id)}
            onMaximize={() => maximizeWindow(app.id)}
            onFocus={() => focusWindow(app.id)}
            onPositionChange={(pos) => updatePosition(app.id, pos)}
            onSizeChange={(size) => updateSize(app.id, size)}
          >
            <div className="p-6 h-full overflow-auto">
              <Suspense fallback={<WindowLoader />}>
                <AppContent appId={app.id} />
              </Suspense>
            </div>
          </DesktopWindow>
        );
      })}

      {/* Dock */}
      <DesktopDock
        apps={apps}
        openWindows={openWindowIds}
        onAppClick={toggleWindow}
      />

      {/* Dev Mode Selector */}
      <DevModeSelector />
    </div>
  );
}
