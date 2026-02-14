import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface WeeklyDataPoint {
  week: string; // ISO date string (start of week)
  activities: number;
  leads: number;
  tasksCompleted: number;
}

interface PerformanceChartProps {
  data: WeeklyDataPoint[];
  isLoading: boolean;
}

export function PerformanceChart({ data, isLoading }: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Evolução Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Sem dados de evolução
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="week"
                tickFormatter={(val) => {
                  try {
                    return format(parseISO(val), "dd/MM", { locale: ptBR });
                  } catch { return val; }
                }}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                labelFormatter={(val) => {
                  try {
                    return `Semana de ${format(parseISO(val as string), "dd 'de' MMM", { locale: ptBR })}`;
                  } catch { return String(val); }
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="activities"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Atividades"
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Leads"
              />
              <Line
                type="monotone"
                dataKey="tasksCompleted"
                stroke="hsl(var(--emerald))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Tarefas"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
