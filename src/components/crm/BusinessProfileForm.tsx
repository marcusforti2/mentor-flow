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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Sparkles, X, Target } from "lucide-react";

interface BusinessProfile {
  id?: string;
  business_name: string;
  business_type: string;
  target_audience: string;
  main_offer: string;
  price_range: string;
  unique_value_proposition: string;
  pain_points_solved: string[];
  ideal_client_profile: string;
  daily_prospection_goal: number;
}

interface BusinessProfileFormProps {
  mentoradoId: string;
}

const businessTypes = [
  { value: "mentoria", label: "Mentoria" },
  { value: "consultoria", label: "Consultoria" },
  { value: "coaching", label: "Coaching" },
  { value: "cursos", label: "Cursos Online" },
  { value: "servicos", label: "Prestação de Serviços" },
  { value: "outro", label: "Outro" },
];

const priceRanges = [
  { value: "ate_1k", label: "Até R$ 1.000" },
  { value: "1k_5k", label: "R$ 1.000 - R$ 5.000" },
  { value: "5k_10k", label: "R$ 5.000 - R$ 10.000" },
  { value: "10k_50k", label: "R$ 10.000 - R$ 50.000" },
  { value: "acima_50k", label: "Acima de R$ 50.000" },
];

export function BusinessProfileForm({ mentoradoId }: BusinessProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [painPointInput, setPainPointInput] = useState("");
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
  });

  useEffect(() => {
    loadProfile();
  }, [mentoradoId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("mentorado_business_profiles")
        .select("*")
        .eq("mentorado_id", mentoradoId)
        .single();

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
        });
      }
    } catch (error) {
      console.log("No profile found, using defaults");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        mentorado_id: mentoradoId,
        business_name: profile.business_name || null,
        business_type: profile.business_type || null,
        target_audience: profile.target_audience || null,
        main_offer: profile.main_offer || null,
        price_range: profile.price_range || null,
        unique_value_proposition: profile.unique_value_proposition || null,
        pain_points_solved: profile.pain_points_solved,
        ideal_client_profile: profile.ideal_client_profile || null,
        daily_prospection_goal: profile.daily_prospection_goal,
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

      toast({ title: "Perfil salvo!", description: "Suas informações foram atualizadas." });
      loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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

  // Calculate completion percentage
  const filledFields = [
    profile.business_name,
    profile.business_type,
    profile.target_audience,
    profile.main_offer,
    profile.price_range,
    profile.unique_value_proposition,
    profile.pain_points_solved.length > 0,
    profile.ideal_client_profile,
  ].filter(Boolean).length;
  const completionPercent = Math.round((filledFields / 8) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Perfil do Negócio
        </CardTitle>
        <CardDescription>
          Essas informações ajudam a IA a gerar análises personalizadas para seus leads.
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium">{completionPercent}%</span>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nome do Negócio</Label>
            <Input
              value={profile.business_name}
              onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              placeholder="Ex: Mentoria de Vendas"
            />
          </div>
          <div>
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

        <div>
          <Label>Público-Alvo</Label>
          <Input
            value={profile.target_audience}
            onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
            placeholder="Ex: Empreendedores que querem escalar suas vendas"
          />
        </div>

        <div>
          <Label>Oferta Principal</Label>
          <Textarea
            value={profile.main_offer}
            onChange={(e) => setProfile({ ...profile, main_offer: e.target.value })}
            placeholder="Ex: Programa de mentoria em grupo de 12 semanas para dobrar o faturamento"
            rows={2}
          />
        </div>

        <div>
          <Label>Faixa de Preço</Label>
          <Select
            value={profile.price_range}
            onValueChange={(value) => setProfile({ ...profile, price_range: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {priceRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Diferencial / Proposta de Valor</Label>
          <Textarea
            value={profile.unique_value_proposition}
            onChange={(e) => setProfile({ ...profile, unique_value_proposition: e.target.value })}
            placeholder="O que torna seu serviço único? Por que clientes devem escolher você?"
            rows={2}
          />
        </div>

        <div>
          <Label>Dores que Resolve</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={painPointInput}
              onChange={(e) => setPainPointInput(e.target.value)}
              placeholder="Ex: Dificuldade em fechar vendas"
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

        <div>
          <Label>Perfil do Cliente Ideal</Label>
          <Textarea
            value={profile.ideal_client_profile}
            onChange={(e) => setProfile({ ...profile, ideal_client_profile: e.target.value })}
            placeholder="Descreva seu cliente ideal: cargo, empresa, faturamento, desafios..."
            rows={3}
          />
        </div>

        <div className="pt-4 border-t">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Meta Diária de Prospecções
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Quantas prospecções você quer fazer por dia?
          </p>
          <Input
            type="number"
            min={1}
            max={100}
            value={profile.daily_prospection_goal}
            onChange={(e) => setProfile({ ...profile, daily_prospection_goal: parseInt(e.target.value) || 10 })}
            className="w-32"
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Perfil
        </Button>
      </CardContent>
    </Card>
  );
}
