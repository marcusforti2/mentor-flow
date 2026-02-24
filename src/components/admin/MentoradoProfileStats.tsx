import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Target, CheckCircle, BookOpen, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  membershipId: string;
  legacyMentoradoId?: string | null;
}

interface Stats {
  leadsCount: number;
  tasksDone: number;
  trailsCompleted: number;
  lastActivity: string | null;
}

export function MentoradoProfileStats({ membershipId, legacyMentoradoId }: Props) {
  const [stats, setStats] = useState<Stats>({ leadsCount: 0, tasksDone: 0, trailsCompleted: 0, lastActivity: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [leadsRes, leadsLegacyRes, tasksRes, trailsRes, activityRes] = await Promise.all([
        supabase.from('crm_prospections').select('id', { count: 'exact', head: true }).eq('membership_id', membershipId),
        supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('owner_membership_id', membershipId),
        supabase.from('campan_tasks').select('id', { count: 'exact', head: true }).eq('mentorado_membership_id', membershipId).eq('status_column', 'done'),
        supabase.from('trail_progress').select('id', { count: 'exact', head: true }).eq('membership_id', membershipId).eq('completed', true),
        supabase.from('activity_logs').select('created_at').eq('membership_id', membershipId).order('created_at', { ascending: false }).limit(1),
      ]);

      setStats({
        leadsCount: (leadsRes.count || 0) + (leadsLegacyRes.count || 0),
        tasksDone: tasksRes.count || 0,
        trailsCompleted: trailsRes.count || 0,
        lastActivity: activityRes.data?.[0]?.created_at || null,
      });
      setLoading(false);
    };
    fetch();
  }, [membershipId]);

  const items = [
    { label: "Leads CRM", value: stats.leadsCount, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Tarefas feitas", value: stats.tasksDone, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Trilhas concluídas", value: stats.trailsCompleted, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
    {
      label: "Última atividade",
      value: stats.lastActivity
        ? formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true, locale: ptBR })
        : "—",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      isText: true,
    },
  ];

  if (loading) return <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-4 h-16 animate-pulse bg-muted/50" /></Card>)}</div>;

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                {item.isText ? (
                  <p className="text-xs font-medium text-foreground truncate">{item.value}</p>
                ) : (
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                )}
                <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
