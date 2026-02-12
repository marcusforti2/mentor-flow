import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Target, LogIn, CheckCircle, BookOpen, FileUp, AlertTriangle, 
  Wrench, UserCircle, Activity, Video, Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  membershipId: string;
}

interface ActivityItem {
  id: string;
  action_type: string;
  action_description: string | null;
  points_earned: number | null;
  created_at: string;
}

const iconMap: Record<string, any> = {
  lead_created: Target,
  lead_status_changed: Target,
  login: LogIn,
  lesson_completed: BookOpen,
  trail_started: BookOpen,
  trail_completed: BookOpen,
  file_uploaded: FileUp,
  sos_sent: AlertTriangle,
  ai_tool_used: Wrench,
  profile_updated: UserCircle,
  meeting_confirmed: Video,
};

const colorMap: Record<string, string> = {
  lead_created: "text-blue-500",
  login: "text-muted-foreground",
  lesson_completed: "text-purple-500",
  trail_completed: "text-green-500",
  trail_started: "text-purple-400",
  file_uploaded: "text-amber-500",
  sos_sent: "text-red-500",
  ai_tool_used: "text-primary",
  meeting_confirmed: "text-indigo-500",
};

export function MentoradoActivityTimeline({ membershipId }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action_type, action_description, points_earned, created_at')
        .eq('membership_id', membershipId)
        .order('created_at', { ascending: false })
        .limit(8);
      setActivities(data || []);
      setLoading(false);
    };
    fetch();
  }, [membershipId]);

  if (loading) return <Card><CardContent className="pt-4 h-24 animate-pulse bg-muted/50" /></Card>;

  if (activities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-0">
          {activities.map((a, i) => {
            const Icon = iconMap[a.action_type] || Activity;
            const color = colorMap[a.action_type] || "text-muted-foreground";
            return (
              <div key={a.id} className="flex items-start gap-3 py-2 relative">
                {i < activities.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
                )}
                <div className="relative z-10 mt-0.5">
                  <Icon className={`h-[18px] w-[18px] ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">
                    {a.action_description || a.action_type.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    {a.points_earned != null && a.points_earned > 0 && (
                      <span className="text-[10px] text-primary flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-primary" />+{a.points_earned}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
