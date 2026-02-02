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
  Search,
  LayoutDashboard,
} from 'lucide-react';
import { DesktopIcon } from './DesktopIcon';
import { DesktopDock } from './DesktopDock';
import { DevModeSelector } from '@/components/DevModeSelector';
import { cn } from '@/lib/utils';

const apps = [
  { id: 'trilhas', label: 'Trilhas', icon: Route, path: '/app/trilhas', gradient: 'from-purple-500 to-pink-500' },
  { id: 'crm', label: 'Meu CRM', icon: Users, path: '/app/meu-crm', gradient: 'from-emerald-400 to-cyan-500' },
  { id: 'calendario', label: 'Calendário', icon: Calendar, path: '/app/calendario', gradient: 'from-red-500 to-orange-500' },
  { id: 'treinamento', label: 'Treinamento', icon: GraduationCap, path: '/app/treinamento', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'ranking', label: 'Ranking', icon: Trophy, path: '/app/ranking', gradient: 'from-yellow-400 to-orange-500' },
  { id: 'sos', label: 'Centro SOS', icon: LifeBuoy, path: '/app/sos', gradient: 'from-pink-500 to-rose-500' },
  { id: 'perfil', label: 'Meu Perfil', icon: User, path: '/app/perfil', gradient: 'from-sky-400 to-blue-500' },
];

const dockApps = [
  { id: 'trilhas', label: 'Trilhas', icon: Route, path: '/app/trilhas', gradient: 'from-purple-500 to-pink-500' },
  { id: 'crm', label: 'Meu CRM', icon: Users, path: '/app/meu-crm', gradient: 'from-emerald-400 to-cyan-500' },
  { id: 'treinamento', label: 'Treinamento', icon: GraduationCap, path: '/app/treinamento', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'sos', label: 'Centro SOS', icon: LifeBuoy, path: '/app/sos', gradient: 'from-pink-500 to-rose-500' },
];

export function Desktop() {
  const navigate = useNavigate();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = apps.filter(app => 
    app.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Beautiful gradient background like macOS */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500" />
        
        {/* Secondary gradients for depth */}
        <div className="absolute inset-0 bg-gradient-to-tl from-sky-400/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/30 via-transparent to-cyan-400/20" />
        
        {/* Light orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-white/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-300/20 rounded-full blur-[120px]" />
        
        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Blur overlay for Launchpad effect */}
      <div className="absolute inset-0 backdrop-blur-xl bg-black/20" />

      {/* Search Bar */}
      <div className="relative z-20 flex justify-center pt-12 pb-8">
        <div 
          className={cn(
            'relative flex items-center gap-2 px-4 py-2.5',
            'w-[280px] rounded-lg',
            'bg-white/20 backdrop-blur-md',
            'border border-white/30',
            'shadow-lg shadow-black/10'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Search className="h-4 w-4 text-white/70" />
          <input
            type="text"
            placeholder="Buscar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-sm text-white placeholder:text-white/60',
              'font-medium'
            )}
          />
        </div>
      </div>

      {/* App Grid - Centered like Launchpad */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-8 pb-32 overflow-auto">
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-8 md:gap-10 lg:gap-12 max-w-[1200px]">
          {filteredApps.map((app, index) => (
            <DesktopIcon
              key={app.id}
              id={app.id}
              label={app.label}
              icon={app.icon}
              gradient={app.gradient}
              isSelected={selectedIcon === app.id}
              onSelect={() => handleIconClick(app.id)}
              onDoubleClick={() => handleIconDoubleClick(app.path)}
              delay={index * 30}
            />
          ))}
        </div>
      </div>

      {/* Page Indicators */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-white/80" />
        <div className="w-2 h-2 rounded-full bg-white/30" />
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
