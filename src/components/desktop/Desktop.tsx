import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  Route, 
  Users, 
  Calendar, 
  GraduationCap, 
  Trophy, 
  LifeBuoy, 
  User,
} from 'lucide-react';
import { DesktopIcon } from './DesktopIcon';
import { DesktopDock } from './DesktopDock';
import { DesktopTopBar } from './DesktopTopBar';
import { DevModeSelector } from '@/components/DevModeSelector';

const apps = [
  { id: 'trilhas', label: 'Trilhas', icon: Route, path: '/app/trilhas', gradient: 'from-purple-500 to-pink-400' },
  { id: 'crm', label: 'Meu CRM', icon: Users, path: '/app/meu-crm', gradient: 'from-emerald-500 to-teal-400' },
  { id: 'calendario', label: 'Calendário', icon: Calendar, path: '/app/calendario', gradient: 'from-orange-500 to-amber-400' },
  { id: 'treinamento', label: 'Treinamento', icon: GraduationCap, path: '/app/treinamento', gradient: 'from-red-500 to-rose-400' },
  { id: 'ranking', label: 'Ranking', icon: Trophy, path: '/app/ranking', gradient: 'from-yellow-500 to-orange-400' },
  { id: 'sos', label: 'Centro SOS', icon: LifeBuoy, path: '/app/sos', gradient: 'from-pink-500 to-fuchsia-400' },
  { id: 'perfil', label: 'Meu Perfil', icon: User, path: '/app/perfil', gradient: 'from-indigo-500 to-violet-400' },
];

const dockApps = [
  { id: 'trilhas', label: 'Trilhas', icon: Route, path: '/app/trilhas', gradient: 'from-purple-500 to-pink-400' },
  { id: 'crm', label: 'Meu CRM', icon: Users, path: '/app/meu-crm', gradient: 'from-emerald-500 to-teal-400' },
  { id: 'treinamento', label: 'Treinamento', icon: GraduationCap, path: '/app/treinamento', gradient: 'from-red-500 to-rose-400' },
  { id: 'sos', label: 'Centro SOS', icon: LifeBuoy, path: '/app/sos', gradient: 'from-pink-500 to-fuchsia-400' },
];

export function Desktop() {
  const navigate = useNavigate();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const handleIconClick = (id: string) => {
    setSelectedIcon(id);
  };

  const handleIconDoubleClick = (path: string) => {
    navigate(path);
  };

  const handleDockClick = (path: string) => {
    navigate(path);
  };

  const handleDesktopClick = () => {
    setSelectedIcon(null);
  };

  return (
    <div 
      className="fixed inset-0 overflow-hidden select-none"
      onClick={handleDesktopClick}
    >
      {/* Premium Animated Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        {/* Large gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-cyan-600/25 to-blue-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-gradient-to-br from-emerald-600/20 to-teal-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
        
        {/* Top light beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-white/[0.03] to-transparent" />
      </div>

      {/* Top Bar */}
      <DesktopTopBar />

      {/* Desktop Icons Grid - Aligned to left */}
      <div className="relative z-10 pt-16 pb-32 px-8 md:px-12 h-full overflow-auto">
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-4 max-w-[360px] mt-4">
          {apps.map((app, index) => (
            <DesktopIcon
              key={app.id}
              id={app.id}
              label={app.label}
              icon={app.icon}
              gradient={app.gradient}
              isSelected={selectedIcon === app.id}
              onSelect={() => handleIconClick(app.id)}
              onDoubleClick={() => handleIconDoubleClick(app.path)}
              delay={index * 50}
            />
          ))}
        </div>
      </div>

      {/* Dock */}
      <DesktopDock 
        apps={dockApps}
        onAppClick={handleDockClick}
      />

      {/* Dev Mode Selector */}
      <DevModeSelector />
    </div>
  );
}
