import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  BookOpen,
  Upload,
  Calendar,
  AlertCircle,
  Sparkles,
  User,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: string;
  action_type: string;
  action_description: string | null;
  points_earned: number | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const actionIcons: Record<string, React.ReactNode> = {
  lead_created: <Target className="h-4 w-4 text-accent" />,
  lead_status_changed: <ArrowRight className="h-4 w-4 text-blue-500" />,
  lesson_completed: <BookOpen className="h-4 w-4 text-emerald-500" />,
  trail_started: <BookOpen className="h-4 w-4 text-primary" />,
  trail_completed: <BookOpen className="h-4 w-4 text-amber-500" />,
  file_uploaded: <Upload className="h-4 w-4 text-purple-500" />,
  meeting_confirmed: <Calendar className="h-4 w-4 text-cyan-500" />,
  sos_sent: <AlertCircle className="h-4 w-4 text-red-500" />,
  ai_tool_used: <Sparkles className="h-4 w-4 text-primary" />,
  profile_updated: <User className="h-4 w-4 text-muted-foreground" />,
  login: <LogIn className="h-4 w-4 text-muted-foreground" />,
};

const actionLabels: Record<string, string> = {
  lead_created: "Novo lead cadastrado",
  lead_status_changed: "Lead movido",
  lesson_completed: "Aula concluída",
  trail_started: "Trilha iniciada",
  trail_completed: "Trilha concluída",
  file_uploaded: "Arquivo enviado",
  meeting_confirmed: "Presença confirmada",
  sos_sent: "SOS enviado",
  ai_tool_used: "Ferramenta IA usada",
  profile_updated: "Perfil atualizado",
  login: "Login realizado",
};

interface RecentActivityFeedProps {
  membershipId?: string;
  limit?: number;
  showEmpty?: boolean;
}

export function RecentActivityFeed({
  membershipId,
  limit = 5,
  showEmpty = true,
}: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!membershipId) {
      setIsLoading(false);
      return;
    }

    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching activities:", error);
      } else {
        setActivities((data || []) as ActivityLog[]);
      }
      setIsLoading(false);
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`activity-${membershipId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `membership_id=eq.${membershipId}`,
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityLog, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [membershipId, limit]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0 && showEmpty) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">Nenhuma atividade registrada ainda</p>
        <p className="text-xs mt-1">Suas ações aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            {actionIcons[activity.action_type] || <Target className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {activity.action_description || actionLabels[activity.action_type] || activity.action_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
              {activity.points_earned && activity.points_earned > 0 && (
                <span className="ml-2 text-primary">+{activity.points_earned} pts</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
