import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, X, Shield, TrendingUp, Users, Crosshair, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AIBusinessProfileParser } from "./AIBusinessProfileParser";
import { PitchContextEditor } from "./PitchContextEditor";

interface BusinessProfile {
  id?: string;
  // Identidade
  business_name: string;
  business_type: string;
  target_audience: string;
  main_offer: string;
  price_range: string;
  unique_value_proposition: string;
  pain_points_solved: string[];
  ideal_client_profile: string;
  daily_prospection_goal: number;
  pitch_context: string;
  // Diagnóstico
  monthly_revenue: string;
  team_size: string;
  time_in_market: string;
  maturity_level: string;
  main_chaos_points: string[];
  // Vendas
  has_commercial_process: boolean;
  sales_predictability: string;
  main_bottleneck: string;
  owner_dependency_level: string;
  current_sales_channels: string[];
  average_ticket: string;
  sales_cycle_days: number;
  monthly_leads_volume: string;
  conversion_rate: string;
}

interface BusinessProfileFormProps {
  membershipId: string;
}

const businessTypes = [
  { value: "mentoria", label: "Mentoria" },
  { value: "consultoria", label: "Consultoria" },
  { value: "coaching", label: "Coaching" },
  { value: "assessoria", label: "Assessoria" },
  { value: "servicos_intelectuais", label: "Serviços Intelectuais" },
  { value: "outro", label: "Outro" },
];

const revenueRanges = [
  { value: "ate_10k", label: "Até R$ 10.000/mês" },
  { value: "10k_30k", label: "R$ 10.000 - R$ 30.000/mês" },
  { value: "30k_50k", label: "R$ 30.000 - R$ 50.000/mês" },
  { value: "50k_100k", label: "R$ 50.000 - R$ 100.000/mês" },
  { value: "100k_300k", label: "R$ 100.000 - R$ 300.000/mês" },
  { value: "acima_300k", label: "Acima de R$ 300.000/mês" },
];

const ticketRanges = [
  { value: "ate_1k", label: "Até R$ 1.000" },
  { value: "1k_5k", label: "R$ 1.000 - R$ 5.000" },
  { value: "5k_10k", label: "R$ 5.000 - R$ 10.000" },
  { value: "10k_30k", label: "R$ 10.000 - R$ 30.000" },
  { value: "30k_50k", label: "R$ 30.000 - R$ 50.000" },
  { value: "50k_100k", label: "R$ 50.000 - R$ 100.000" },
  { value: "acima_100k", label: "Acima de R$ 100.000" },
];

const teamSizes = [
  { value: "solo", label: "Só eu" },
  { value: "1_3", label: "1 a 3 pessoas" },
  { value: "4_10", label: "4 a 10 pessoas" },
  { value: "11_30", label: "11 a 30 pessoas" },
  { value: "acima_30", label: "Mais de 30 pessoas" },
];

const timeInMarketOptions = [
  { value: "menos_1", label: "Menos de 1 ano" },
  { value: "1_3", label: "1 a 3 anos" },
  { value: "3_5", label: "3 a 5 anos" },
  { value: "5_10", label: "5 a 10 anos" },
  { value: "mais_10", label: "Mais de 10 anos" },
];

const maturityLevels = [
  { value: "caos", label: "Caos total - apagando incêndios", color: "text-red-500" },
  { value: "sobrevivencia", label: "Sobrevivência - vendas acontecem, mas sem controle", color: "text-orange-500" },
  { value: "estruturacao", label: "Estruturação - começando a organizar", color: "text-yellow-500" },
  { value: "crescimento", label: "Crescimento - processos funcionando", color: "text-blue-500" },
  { value: "maturidade", label: "Maturidade - negócio previsível", color: "text-green-500" },
];

const predictabilityLevels = [
  { value: "zero", label: "Zero - nunca sei quanto vai entrar" },
  { value: "baixa", label: "Baixa - consigo prever 1 semana" },
  { value: "media", label: "Média - consigo prever 1 mês" },
  { value: "alta", label: "Alta - consigo prever 3 meses" },
  { value: "total", label: "Total - previsibilidade trimestral clara" },
];

const dependencyLevels = [
  { value: "total", label: "Total - nada acontece sem mim" },
  { value: "alta", label: "Alta - preciso aprovar tudo" },
  { value: "media", label: "Média - delego parte das decisões" },
  { value: "baixa", label: "Baixa - time opera com autonomia" },
  { value: "minima", label: "Mínima - negócio roda sem mim" },
];

const chaosPointsOptions = [
  "Vendas imprevisíveis",
  "Falta de processo comercial",
  "Sem clareza de números",
  "Decisões emocionais",
  "Dependência do dono",
  "Time desorganizado",
  "Atendimento inconsistente",
  "Marketing sem estratégia",
  "Financeiro bagunçado",
  "Sem metas claras",
];

const salesChannels = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indicacao", label: "Indicação" },
  { value: "eventos", label: "Eventos/Palestras" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "ads", label: "Tráfego Pago" },
  { value: "email", label: "E-mail Marketing" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

const leadsVolumeOptions = [
  { value: "menos_10", label: "Menos de 10 leads/mês" },
  { value: "10_30", label: "10 a 30 leads/mês" },
  { value: "30_50", label: "30 a 50 leads/mês" },
  { value: "50_100", label: "50 a 100 leads/mês" },
  { value: "mais_100", label: "Mais de 100 leads/mês" },
];

const conversionRates = [
  { value: "menos_5", label: "Menos de 5%" },
  { value: "5_10", label: "5% a 10%" },
  { value: "10_20", label: "10% a 20%" },
  { value: "20_30", label: "20% a 30%" },
  { value: "mais_30", label: "Mais de 30%" },
  { value: "nao_sei", label: "Não sei" },
];

export function BusinessProfileForm({ membershipId }: BusinessProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [painPointInput, setPainPointInput] = useState("");
  const [resolvedMentoradoId, setResolvedMentoradoId] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: "",
    business_type: "",
    target_audience: "",
    main_offer: "",
    price_range: "",
    unique_value_proposition: "",
    pain_points_solved: [],
    ideal_client_profile: "",
    daily_prospection_goal: 10,
    pitch_context: "",
    monthly_revenue: "",
    team_size: "",
    time_in_market: "",
    maturity_level: "",
    main_chaos_points: [],
    has_commercial_process: false,
    sales_predictability: "",
    main_bottleneck: "",
    owner_dependency_level: "",
    current_sales_channels: [],
    average_ticket: "",
    sales_cycle_days: 0,
    monthly_leads_volume: "",
    conversion_rate: "",
  });

  useEffect(() => {
    if (membershipId) {
      setResolvedMentoradoId(membershipId);
      loadProfile(membershipId);
    } else {
      setIsLoading(false);
    }
  }, [membershipId]);

  const loadProfile = async (mentoradoId: string) => {
    try {
      const { data, error } = await supabase
        .from("mentorado_business_profiles")
        .select("*")
        .eq('membership_id', mentoradoId)
        .maybeSingle();

      if (data && !error) {
        setProfile({
          id: data.id,
          business_name: data.business_name || "",
          business_type: data.business_type || "",
          target_audience: data.target_audience || "",
          main_offer: data.main_offer || "",
          price_range: data.price_range || "",
          unique_value_proposition: data.unique_value_proposition || "",
          pain_points_solved: data.pain_points_solved || [],
          ideal_client_profile: data.ideal_client_profile || "",
          daily_prospection_goal: data.daily_prospection_goal || 10,
          pitch_context: (data as any).pitch_context || "",
          monthly_revenue: data.monthly_revenue || "",
          team_size: data.team_size || "",
          time_in_market: data.time_in_market || "",
          maturity_level: data.maturity_level || "",
          main_chaos_points: data.main_chaos_points || [],
          has_commercial_process: data.has_commercial_process || false,
          sales_predictability: data.sales_predictability || "",
          main_bottleneck: data.main_bottleneck || "",
          owner_dependency_level: data.owner_dependency_level || "",
          current_sales_channels: data.current_sales_channels || [],
          average_ticket: data.average_ticket || "",
          sales_cycle_days: data.sales_cycle_days || 0,
          monthly_leads_volume: data.monthly_leads_volume || "",
          conversion_rate: data.conversion_rate || "",
        });
      }
    } catch (error) {
      console.log("No profile found, using defaults");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resolvedMentoradoId) {
      toast({ title: "Erro", description: "Não foi possível identificar o mentorado.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        membership_id: resolvedMentoradoId,
        business_name: profile.business_name || null,
        business_type: profile.business_type || null,
        target_audience: profile.target_audience || null,
        main_offer: profile.main_offer || null,
        price_range: profile.price_range || null,
        unique_value_proposition: profile.unique_value_proposition || null,
        pain_points_solved: profile.pain_points_solved,
        ideal_client_profile: profile.ideal_client_profile || null,
        daily_prospection_goal: profile.daily_prospection_goal,
        pitch_context: profile.pitch_context || null,
        monthly_revenue: profile.monthly_revenue || null,
        team_size: profile.team_size || null,
        time_in_market: profile.time_in_market || null,
        maturity_level: profile.maturity_level || null,
        main_chaos_points: profile.main_chaos_points,
        has_commercial_process: profile.has_commercial_process,
        sales_predictability: profile.sales_predictability || null,
        main_bottleneck: profile.main_bottleneck || null,
        owner_dependency_level: profile.owner_dependency_level || null,
        current_sales_channels: profile.current_sales_channels,
        average_ticket: profile.average_ticket || null,
        sales_cycle_days: profile.sales_cycle_days || null,
        monthly_leads_volume: profile.monthly_leads_volume || null,
        conversion_rate: profile.conversion_rate || null,
      };

      if (profile.id) {
        const { error } = await supabase
          .from("mentorado_business_profiles")
          .update(payload)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mentorado_business_profiles")
          .insert(payload);
        if (error) throw error;
      }

      toast({ title: "Perfil salvo!", description: "Seu diagnóstico foi atualizado." });
      loadProfile(resolvedMentoradoId);

      // Trigger AI prospection tips email in background (fire-and-forget)
      if (profile.daily_prospection_goal && profile.daily_prospection_goal > 0) {
        supabase.functions.invoke("send-prospection-tips", {
          body: { membership_id: resolvedMentoradoId },
        }).then(res => {
          if (!res.error) {
            toast({ title: "📧 Email enviado!", description: "Você receberá dicas de prospecção personalizadas por email." });
          }
        }).catch(() => { /* silent fail */ });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      const errorMsg = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as any).message)
          : "Erro desconhecido";
      toast({
        title: "Erro ao salvar",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIProfileParsed = (parsed: Partial<BusinessProfile>) => {
    setProfile(prev => {
      const updated = { ...prev };
      for (const [key, value] of Object.entries(parsed)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
          // Merge arrays without duplicates
          const existing = (prev as any)[key] || [];
          (updated as any)[key] = [...new Set([...existing, ...value])];
        } else if (typeof value === "string" && value.trim() === "") {
          continue;
        } else {
          // Only overwrite if the existing field is empty
          const existingVal = (prev as any)[key];
          if (!existingVal || existingVal === "" || existingVal === 0) {
            (updated as any)[key] = value;
          }
        }
      }
      return updated;
    });
  };

  const addPainPoint = () => {
    if (painPointInput.trim() && !profile.pain_points_solved.includes(painPointInput.trim())) {
      setProfile({
        ...profile,
        pain_points_solved: [...profile.pain_points_solved, painPointInput.trim()],
      });
      setPainPointInput("");
    }
  };

  const removePainPoint = (point: string) => {
    setProfile({
      ...profile,
      pain_points_solved: profile.pain_points_solved.filter((p) => p !== point),
    });
  };

  const toggleChaosPoint = (point: string) => {
    if (profile.main_chaos_points.includes(point)) {
      setProfile({
        ...profile,
        main_chaos_points: profile.main_chaos_points.filter((p) => p !== point),
      });
    } else {
      setProfile({
        ...profile,
        main_chaos_points: [...profile.main_chaos_points, point],
      });
    }
  };

  const toggleSalesChannel = (channel: string) => {
    if (profile.current_sales_channels.includes(channel)) {
      setProfile({
        ...profile,
        current_sales_channels: profile.current_sales_channels.filter((c) => c !== channel),
      });
    } else {
      setProfile({
        ...profile,
        current_sales_channels: [...profile.current_sales_channels, channel],
      });
    }
  };

  // Calculate completion by section
  const diagnosticChecks = {
    'Faturamento Mensal': !!profile.monthly_revenue,
    'Tamanho do Time': !!profile.team_size,
    'Tempo de Mercado': !!profile.time_in_market,
    'Nível de Maturidade': !!profile.maturity_level,
    'Pontos de Caos': profile.main_chaos_points.length > 0,
    'Dependência do Dono': !!profile.owner_dependency_level,
  };

  const salesChecks = {
    'Previsibilidade': !!profile.sales_predictability,
    'Gargalo de Vendas': !!profile.main_bottleneck,
    'Canais de Aquisição': profile.current_sales_channels.length > 0,
    'Ticket Médio': !!profile.average_ticket,
    'Volume de Leads': !!profile.monthly_leads_volume,
    'Taxa de Conversão': !!profile.conversion_rate,
  };

  const identityChecks = {
    'Nome do Negócio': !!profile.business_name,
    'Tipo de Negócio': !!profile.business_type,
    'Público-Alvo': !!profile.target_audience,
    'Oferta Principal': !!profile.main_offer,
    'Proposta de Valor': !!profile.unique_value_proposition,
    'Cliente Ideal': !!profile.ideal_client_profile,
  };

  const diagnosticFields = Object.values(diagnosticChecks).filter(Boolean).length;
  const salesFields = Object.values(salesChecks).filter(Boolean).length;
  const identityFields = Object.values(identityChecks).filter(Boolean).length;

  const totalFields = diagnosticFields + salesFields + identityFields;
  const maxFields = 18;
  const completionPercent = Math.round((totalFields / maxFields) * 100);

  const getMissingFields = (checks: Record<string, boolean>) => 
    Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-primary" />
            Governo do Negócio
          </CardTitle>
          <AIBusinessProfileParser onProfileParsed={handleAIProfileParsed} />
        </div>
        <CardDescription className="text-muted-foreground">
          Diagnóstico estratégico para clareza, controle e previsibilidade de vendas.
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-sm font-mono font-semibold">{completionPercent}%</span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className={diagnosticFields < 6 ? 'text-yellow-500' : 'text-green-500'}>
                Diagnóstico: {diagnosticFields}/6
              </span>
              <span className={salesFields < 6 ? 'text-yellow-500' : 'text-green-500'}>
                Vendas: {salesFields}/6
              </span>
              <span className={identityFields < 6 ? 'text-yellow-500' : 'text-green-500'}>
                Identidade: {identityFields}/6
              </span>
            </div>
            {completionPercent < 100 && (
              <div className="mt-2 text-xs text-yellow-500/80">
                Faltam: {[
                  ...getMissingFields(diagnosticChecks),
                  ...getMissingFields(salesChecks),
                  ...getMissingFields(identityChecks),
                ].join(', ')}
              </div>
            )}
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="diagnostico" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="contexto-ia" className="gap-2">
              <Crosshair className="w-4 h-4" />
              <span className="hidden sm:inline">Contexto IA</span>
            </TabsTrigger>
            <TabsTrigger value="diagnostico" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Diagnóstico</span>
            </TabsTrigger>
            <TabsTrigger value="vendas" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="identidade" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Identidade</span>
            </TabsTrigger>
          </TabsList>

          {/* CONTEXTO IA */}
          <TabsContent value="contexto-ia" className="space-y-6">
            <PitchContextEditor
              value={profile.pitch_context}
              onChange={(value) => setProfile({ ...profile, pitch_context: value })}
              mentoradoId={resolvedMentoradoId}
            />
          </TabsContent>

          {/* DIAGNÓSTICO */}
          <TabsContent value="diagnostico" className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Radiografia do Negócio
              </h3>
              <p className="text-xs text-muted-foreground">
                Onde você está agora? Seja brutalmente honesto.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Faturamento Mensal</Label>
                <Select
                  value={profile.monthly_revenue}
                  onValueChange={(value) => setProfile({ ...profile, monthly_revenue: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tamanho do Time</Label>
                <Select
                  value={profile.team_size}
                  onValueChange={(value) => setProfile({ ...profile, team_size: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tempo de Mercado</Label>
                <Select
                  value={profile.time_in_market}
                  onValueChange={(value) => setProfile({ ...profile, time_in_market: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {timeInMarketOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dependência do Dono</Label>
                <Select
                  value={profile.owner_dependency_level}
                  onValueChange={(value) => setProfile({ ...profile, owner_dependency_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dependencyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nível de Maturidade do Negócio</Label>
              <Select
                value={profile.maturity_level}
                onValueChange={(value) => setProfile({ ...profile, maturity_level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu estágio atual..." />
                </SelectTrigger>
                <SelectContent>
                  {maturityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <span className={level.color}>{level.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Pontos de Caos Atuais</Label>
              <p className="text-xs text-muted-foreground">
                Selecione os problemas que você enfrenta hoje. Seja honesto.
              </p>
              <div className="flex flex-wrap gap-2">
                {chaosPointsOptions.map((point) => (
                  <Badge
                    key={point}
                    variant={profile.main_chaos_points.includes(point) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleChaosPoint(point)}
                  >
                    {profile.main_chaos_points.includes(point) && (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* VENDAS */}
          <TabsContent value="vendas" className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Máquina de Vendas
              </h3>
              <p className="text-xs text-muted-foreground">
                Sem vendas previsíveis, não existe empresa. Exponha a realidade.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div>
                <Label className="text-base">Processo Comercial Definido?</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Você tem um processo de vendas documentado e replicável?
                </p>
              </div>
              <Switch
                checked={profile.has_commercial_process}
                onCheckedChange={(checked) => setProfile({ ...profile, has_commercial_process: checked })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Previsibilidade de Vendas</Label>
                <Select
                  value={profile.sales_predictability}
                  onValueChange={(value) => setProfile({ ...profile, sales_predictability: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {predictabilityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ticket Médio</Label>
                <Select
                  value={profile.average_ticket}
                  onValueChange={(value) => setProfile({ ...profile, average_ticket: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Volume de Leads por Mês</Label>
                <Select
                  value={profile.monthly_leads_volume}
                  onValueChange={(value) => setProfile({ ...profile, monthly_leads_volume: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leadsVolumeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Taxa de Conversão</Label>
                <Select
                  value={profile.conversion_rate}
                  onValueChange={(value) => setProfile({ ...profile, conversion_rate: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {conversionRates.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ciclo de Vendas (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={profile.sales_cycle_days || ""}
                  onChange={(e) => setProfile({ ...profile, sales_cycle_days: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 30"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo médio do primeiro contato até o fechamento
                </p>
              </div>

              <div className="space-y-2">
                <Label>Meta Diária de Prospecções</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={profile.daily_prospection_goal}
                  onChange={(e) => setProfile({ ...profile, daily_prospection_goal: parseInt(e.target.value) || 10 })}
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Canais de Aquisição</Label>
              <p className="text-xs text-muted-foreground">
                De onde vêm seus clientes hoje?
              </p>
              <div className="flex flex-wrap gap-2">
                {salesChannels.map((channel) => (
                  <Badge
                    key={channel.value}
                    variant={profile.current_sales_channels.includes(channel.value) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleSalesChannel(channel.value)}
                  >
                    {profile.current_sales_channels.includes(channel.value) && (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    {channel.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Principal Gargalo de Vendas</Label>
              <Textarea
                value={profile.main_bottleneck}
                onChange={(e) => setProfile({ ...profile, main_bottleneck: e.target.value })}
                placeholder="O que mais impede seu crescimento de vendas hoje? Seja específico."
                rows={3}
                className="resize-none"
              />
            </div>
          </TabsContent>

          {/* IDENTIDADE */}
          <TabsContent value="identidade" className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Identidade do Negócio
              </h3>
              <p className="text-xs text-muted-foreground">
                Clareza sobre quem você é e quem você serve.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Negócio</Label>
                <Input
                  value={profile.business_name}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  placeholder="Ex: Consultoria Estratégica XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Negócio</Label>
                <Select
                  value={profile.business_type}
                  onValueChange={(value) => setProfile({ ...profile, business_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Público-Alvo</Label>
              <Input
                value={profile.target_audience}
                onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
                placeholder="Ex: Médicos e dentistas que faturam acima de R$ 50k/mês"
              />
            </div>

            <div className="space-y-2">
              <Label>Oferta Principal</Label>
              <Textarea
                value={profile.main_offer}
                onChange={(e) => setProfile({ ...profile, main_offer: e.target.value })}
                placeholder="Ex: Mentoria de 6 meses para estruturar negócio de alto ticket com processo comercial previsível"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Proposta de Valor Única</Label>
              <Textarea
                value={profile.unique_value_proposition}
                onChange={(e) => setProfile({ ...profile, unique_value_proposition: e.target.value })}
                placeholder="O que te diferencia? Por que clientes escolhem você e não o concorrente?"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Dores que Você Resolve</Label>
              <div className="flex gap-2">
                <Input
                  value={painPointInput}
                  onChange={(e) => setPainPointInput(e.target.value)}
                  placeholder="Ex: Falta de previsibilidade em vendas"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPainPoint())}
                />
                <Button type="button" variant="outline" onClick={addPainPoint}>
                  Adicionar
                </Button>
              </div>
              {profile.pain_points_solved.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.pain_points_solved.map((point, idx) => (
                    <Badge key={idx} variant="secondary" className="pr-1">
                      {point}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => removePainPoint(point)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-primary" />
                Perfil do Cliente Ideal
              </Label>
              <Textarea
                value={profile.ideal_client_profile}
                onChange={(e) => setProfile({ ...profile, ideal_client_profile: e.target.value })}
                placeholder="Descreva seu cliente ideal: faturamento, estágio do negócio, problemas, comportamento..."
                rows={3}
                className="resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Diagnóstico
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}