import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyComparison } from "@/hooks/useMentorReports";

interface MonthlyComparisonChartProps {
  data: MonthlyComparison[];
  isLoading: boolean;
}

export function MonthlyComparisonChart({ data, isLoading }: MonthlyComparisonChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Comparativo Mensal (6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Bar dataKey="leads" fill="hsl(var(--primary))" name="Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="activities" fill="hsl(var(--accent))" name="Atividades" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
