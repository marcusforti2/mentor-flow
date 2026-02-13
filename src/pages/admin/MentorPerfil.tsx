import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Sparkles, Target, Users, Trophy, Heart } from "lucide-react";

interface MentorSettings {
  mentorship_description: string;
  methodology: string;
  ideal_mentee_profile: string;
  main_results: string;
  expectations: string;
}

const defaultSettings: MentorSettings = {
  mentorship_description: '',
  methodology: '',
  ideal_mentee_profile: '',
  main_results: '',
  expectations: '',
};

const MentorPerfil = () => {
  const [settings, setSettings] = useState<MentorSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const { toast } = useToast();

  useEffect(() => {
    if (!activeMembership) return;
    loadSettings();
  }, [activeMembership]);

  const loadSettings = async () => {
    if (!activeMembership) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('mentor_profiles')
        .select('settings')
        .eq('membership_id', activeMembership.id)
        .maybeSingle();

      if (data?.settings) {
        const s = data.settings as Record<string, unknown>;
        setSettings({
          mentorship_description: (s.mentorship_description as string) || '',
          methodology: (s.methodology as string) || '',
          ideal_mentee_profile: (s.ideal_mentee_profile as string) || '',
          main_results: (s.main_results as string) || '',
          expectations: (s.expectations as string) || '',
        });
      }
    } catch (err) {
      console.error('Error loading mentor settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeMembership) return;
    setIsSaving(true);
    try {
      // Try update first
      const { data: existing } = await supabase
        .from('mentor_profiles')
        .select('id, settings')
        .eq('membership_id', activeMembership.id)
        .maybeSingle();

      if (existing) {
        const currentSettings = (existing.settings as Record<string, unknown>) || {};
        const { error } = await supabase
          .from('mentor_profiles')
          .update({ settings: { ...currentSettings, ...settings } as any })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mentor_profiles')
          .insert([{
            membership_id: activeMembership.id,
            settings: settings as any,
          }]);
        if (error) throw error;
      }

      toast({ title: "Perfil salvo!", description: "Suas informações foram atualizadas com sucesso." });
    } catch (err: any) {
      console.error('Error saving mentor settings:', err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fields = [
    {
      key: 'mentorship_description' as const,
      label: 'Descrição da Mentoria',
      placeholder: 'O que você faz na mentoria? Qual transformação você entrega para seus mentorados?',
      description: 'Descreva sua mentoria de forma completa. A IA usará isso para personalizar análises.',
      icon: Sparkles,
      rows: 4,
    },
    {
      key: 'methodology' as const,
      label: 'Metodologia Principal',
      placeholder: 'Como funciona o seu processo de mentoria? Quais etapas, ferramentas e frameworks você usa?',
      description: 'Explique como funciona seu método de trabalho.',
      icon: Target,
      rows: 4,
    },
    {
      key: 'ideal_mentee_profile' as const,
      label: 'Perfil Ideal do Mentorado',
      placeholder: 'Quem se encaixa melhor na sua mentoria? Nível de experiência, nicho, mindset...',
      description: 'Isso ajuda a IA a calibrar a análise comportamental.',
      icon: Users,
      rows: 3,
    },
    {
      key: 'main_results' as const,
      label: 'Principais Resultados que Entrega',
      placeholder: 'Quais resultados concretos seus mentorados alcançam? Faturamento, posicionamento, escala...',
      description: 'Resultados concretos que seus mentorados alcançam.',
      icon: Trophy,
      rows: 3,
    },
    {
      key: 'expectations' as const,
      label: 'O que Espera do Mentorado',
      placeholder: 'Qual nível de comprometimento e dedicação você espera? O que o mentorado precisa trazer?',
      description: 'Comprometimento, dedicação e expectativas.',
      icon: Heart,
      rows: 3,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Perfil da Mentoria</h1>
        <p className="text-muted-foreground mt-1">
          Descreva sua mentoria para que a IA possa cruzar com o perfil dos mentorados e gerar análises comportamentais personalizadas.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map(({ key, label, placeholder, description, icon: Icon, rows }) => (
          <Card key={key} className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings[key]}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                placeholder={placeholder}
                rows={rows}
                className="resize-none"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full gradient-gold text-primary-foreground"
        size="lg"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Perfil da Mentoria
      </Button>
    </div>
  );
};

export default MentorPerfil;
