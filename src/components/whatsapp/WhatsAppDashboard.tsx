import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, Zap, Users, Phone, TrendingUp, CheckCircle2, XCircle, Clock, BarChart3,
} from "lucide-react";

interface DashboardProps {
  totalSent: number;
  totalCampaigns: number;
  menteesWithPhone: number;
  menteesWithoutPhone: number;
  activeFlows: number;
  recentLogs: Array<{ status: string }>;
}

export function WhatsAppDashboard({
  totalSent,
  totalCampaigns,
  menteesWithPhone,
  menteesWithoutPhone,
  activeFlows,
  recentLogs,
}: DashboardProps) {
  const successRate = recentLogs.length > 0
    ? Math.round((recentLogs.filter(l => l.status === "sent").length / recentLogs.length) * 100)
    : 0;

  const stats = [
    {
      label: "Mensagens Enviadas",
      value: totalSent,
      icon: Send,
      color: "text-emerald-500",
      bg: "bg-emerald-500/20",
    },
    {
      label: "Campanhas",
      value: totalCampaigns,
      icon: Zap,
      color: "text-primary",
      bg: "bg-primary/20",
    },
    {
      label: "Fluxos Ativos",
      value: activeFlows,
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/20",
    },
    {
      label: "Taxa de Entrega",
      value: `${successRate}%`,
      icon: BarChart3,
      color: "text-violet-500",
      bg: "bg-violet-500/20",
    },
    {
      label: "Com Telefone",
      value: menteesWithPhone,
      icon: Users,
      color: "text-cyan-500",
      bg: "bg-cyan-500/20",
    },
    {
      label: "Sem Telefone",
      value: menteesWithoutPhone,
      icon: Phone,
      color: "text-amber-500",
      bg: "bg-amber-500/20",
      alert: menteesWithoutPhone > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-col gap-2">
              <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${stat.alert ? "text-amber-500" : ""}`}>
                  {stat.value}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
