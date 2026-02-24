import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2 } from "lucide-react";

interface Props {
  legacyMentoradoId?: string | null;
  membershipId?: string;
}

const PROFILE_FIELDS = [
  'business_name', 'business_type', 'monthly_revenue', 'average_ticket',
  'conversion_rate', 'monthly_leads_volume', 'maturity_level', 'owner_dependency_level',
  'main_chaos_points', 'main_offer', 'target_audience',
];

export function MentoradoBusinessSummary({ legacyMentoradoId, membershipId }: Props) {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveId = membershipId || legacyMentoradoId;

  useEffect(() => {
    const fetch = async () => {
      if (!effectiveId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from('mentorado_business_profiles')
        .select('*')
        .eq('membership_id', effectiveId)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    fetch();
  }, [effectiveId]);

  if (loading) return <Card><CardContent className="pt-4 h-24 animate-pulse bg-muted/50" /></Card>;

  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Perfil de negócio não preenchido.</p>
        </CardContent>
      </Card>
    );
  }

  const filled = PROFILE_FIELDS.filter(f => profile[f] != null && profile[f] !== '' && !(Array.isArray(profile[f]) && profile[f].length === 0)).length;
  const completeness = Math.round((filled / PROFILE_FIELDS.length) * 100);

  const maturityColors: Record<string, string> = {
    'iniciante': 'bg-destructive/10 text-destructive',
    'basico': 'bg-amber-500/10 text-amber-700',
    'intermediario': 'bg-blue-500/10 text-blue-700',
    'avancado': 'bg-green-500/10 text-green-700',
  };

  const depColors: Record<string, string> = {
    'alta': 'bg-destructive/10 text-destructive',
    'media': 'bg-amber-500/10 text-amber-700',
    'baixa': 'bg-green-500/10 text-green-700',
  };

  const chaosPoints: string[] = Array.isArray(profile.main_chaos_points) ? profile.main_chaos_points : [];

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Governo do Negócio
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">{completeness}% preenchido</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <Progress value={completeness} className="h-1.5" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {profile.monthly_revenue && (
            <div><span className="text-muted-foreground">Faturamento</span><p className="font-medium">{profile.monthly_revenue}</p></div>
          )}
          {profile.average_ticket && (
            <div><span className="text-muted-foreground">Ticket Médio</span><p className="font-medium">{profile.average_ticket}</p></div>
          )}
          {profile.conversion_rate && (
            <div><span className="text-muted-foreground">Taxa Conversão</span><p className="font-medium">{profile.conversion_rate}</p></div>
          )}
          {profile.monthly_leads_volume && (
            <div><span className="text-muted-foreground">Volume Leads</span><p className="font-medium">{profile.monthly_leads_volume}</p></div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profile.maturity_level && (
            <Badge variant="secondary" className={`text-[10px] border-0 ${maturityColors[profile.maturity_level] || ''}`}>
              Maturidade: {profile.maturity_level}
            </Badge>
          )}
          {profile.owner_dependency_level && (
            <Badge variant="secondary" className={`text-[10px] border-0 ${depColors[profile.owner_dependency_level] || ''}`}>
              Dep. dono: {profile.owner_dependency_level}
            </Badge>
          )}
        </div>

        {chaosPoints.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Pontos de caos</p>
            <div className="flex flex-wrap gap-1">
              {chaosPoints.map((p, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
