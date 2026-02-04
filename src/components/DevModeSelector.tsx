import { useState } from 'react';
import { useDevMode } from '@/hooks/useDevMode';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Wrench, X, Eye, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

// Busca a role diretamente do banco para evitar dependência circular
function useAdminMasterCheck() {
  return useQuery({
    queryKey: ['admin-master-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAdminMaster: false, role: null };
      
      const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: user.id });
      return { 
        isAdminMaster: roleData === 'admin_master', 
        role: roleData as 'mentor' | 'mentorado' | 'admin_master' | null 
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function DevModeSelector() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isDevModeActive, overrideRole, setOverrideRole, clearOverride } = useDevMode();
  const { data, isLoading } = useAdminMasterCheck();

  // Don't render while loading or if not admin_master
  if (isLoading || !data?.isAdminMaster) {
    return null;
  }

  const realRole = data.role;
  const currentViewRole = overrideRole || realRole;
  const isMentorView = currentViewRole === 'mentor';

  const handleToggle = () => {
    const newRole = isMentorView ? 'mentorado' : 'mentor';
    setOverrideRole(newRole);
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg",
          "bg-background/80 backdrop-blur-xl border border-border/50",
          "hover:bg-background/90 hover:scale-105 transition-all duration-200",
          isDevModeActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        size="icon"
      >
        <Wrench className="h-5 w-5 text-foreground" />
        {isDevModeActive && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
        )}
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 w-72",
      "glass-card rounded-2xl shadow-2xl",
      "animate-in slide-in-from-bottom-4 duration-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Dev Mode</span>
          {isDevModeActive && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
              ATIVO
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(false)}
          className="h-7 w-7 rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Current view indicator */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Visualizando como</p>
            <p className={cn(
              "font-semibold text-sm",
              isMentorView ? "text-primary" : "text-accent"
            )}>
              {isMentorView ? 'Mentor' : 'Mentorado'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <div className="flex flex-col">
            <span className={cn(
              "text-sm font-medium transition-colors",
              !isMentorView ? "text-accent" : "text-muted-foreground"
            )}>
              Mentorado
            </span>
          </div>
          
          <Switch
            checked={isMentorView}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-accent"
          />
          
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-sm font-medium transition-colors",
              isMentorView ? "text-primary" : "text-muted-foreground"
            )}>
              Mentor
            </span>
          </div>
        </div>

        {/* Real role info */}
        {realRole && (
          <div className="text-xs text-muted-foreground text-center">
            Sua role real: <span className="font-medium">{realRole}</span>
            {isDevModeActive && (
              <Button
                variant="link"
                size="sm"
                onClick={clearOverride}
                className="text-xs h-auto p-0 ml-2 text-destructive"
              >
                Restaurar
              </Button>
            )}
          </div>
        )}

        {/* DevTools Link */}
        <Link 
          to="/admin/devtools" 
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:from-primary/30 hover:to-accent/30 transition-all"
        >
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Abrir DevTools</span>
        </Link>
      </div>
    </div>
  );
}
