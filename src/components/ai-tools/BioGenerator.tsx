import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  User, 
  Copy, 
  Check, 
  Loader2, 
  Instagram, 
  Linkedin,
  Phone,
  Sparkles,
  Target,
  Award,
  Zap,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BusinessProfile } from '@/lib/api/firecrawl';
import { useAIToolHistory } from '@/hooks/useAIToolHistory';
import { AIToolHistoryPanel } from './AIToolHistoryPanel';

interface BioGeneratorProps {
  mentoradoId: string | null;
}

type Platform = 'instagram' | 'linkedin' | 'whatsapp';
type Style = 'authority' | 'approachable' | 'results' | 'storytelling';

interface GeneratedBio {
  bio: string;
  headline?: string;
  callToAction: string;
  emojis: string[];
  hashtags?: string[];
  characterCount: number;
}

interface BioResult {
  primary: GeneratedBio;
  alternative1: GeneratedBio;
  alternative2: GeneratedBio;
  tips: string[];
}

export function BioGenerator({ mentoradoId }: BioGeneratorProps) {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [style, setStyle] = useState<Style>('authority');
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [mainResult, setMainResult] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BioResult | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { history, loading: loadingHistory, saveToHistory } = useAIToolHistory(mentoradoId, 'bio_generator');

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!mentoradoId) return;

      try {
        // Query by membership_id or mentorado_id (dual-ID for backward compat)
        const { data } = await supabase
          .from('mentorado_business_profiles')
          .select('*')
          .eq('membership_id', mentoradoId)
          .maybeSingle();

        if (data) {
          setBusinessProfile(data);
          if (data.business_type) setNiche(data.business_type);
          if (data.target_audience) setTargetAudience(data.target_audience);
          if (data.unique_value_proposition) setDifferentiator(data.unique_value_proposition);
        }
      } catch (error) {
        console.error('Error fetching business profile:', error);
      }
    };

    fetchBusinessProfile();
  }, [mentoradoId]);

  const handleGenerate = async () => {
    if (!niche.trim()) {
      toast.error('Preencha seu nicho/área de atuação');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-bio', {
        body: {
          platform,
          style,
          niche,
          targetAudience,
          mainResult,
          differentiator,
          businessProfile,
        },
      });

      if (error) throw error;

      if (data.success && data.result) {
        setResult(data.result);
        toast.success('Bios geradas com sucesso!');
        await saveToHistory({
          title: `Bio ${platform} - ${style}`,
          inputData: { platform, style, niche, targetAudience },
          outputData: data.result,
        });
      } else {
        toast.error(data.error || 'Erro ao gerar bios');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Erro ao gerar bios');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Bio copiada!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const platformConfig = {
    instagram: {
      icon: Instagram,
      label: 'Instagram',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      limit: '150 caracteres',
      description: 'Bio curta e impactante',
    },
    linkedin: {
      icon: Linkedin,
      label: 'LinkedIn',
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
      limit: '220 caracteres (headline) + resumo',
      description: 'Headline profissional + resumo',
    },
    whatsapp: {
      icon: Phone,
      label: 'WhatsApp Business',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      limit: '139 caracteres',
      description: 'Status comercial otimizado',
    },
  };

  const styleConfig = {
    authority: {
      label: '👑 Autoridade',
      description: 'Posicionamento como especialista reconhecido',
    },
    approachable: {
      label: '🤝 Acessível',
      description: 'Tom amigável e próximo do público',
    },
    results: {
      label: '📊 Resultados',
      description: 'Foco em números e transformações',
    },
    storytelling: {
      label: '📖 Storytelling',
      description: 'Narrativa pessoal envolvente',
    },
  };

  const PlatformIcon = platformConfig[platform].icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Gerador de Bio Otimizada
          </CardTitle>
          <CardDescription>
            Crie bios magnéticas que convertem visitantes em seguidores e clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Plataforma
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(platformConfig) as Platform[]).map((p) => {
                const config = platformConfig[p];
                const Icon = config.icon;
                return (
                  <Button
                    key={p}
                    type="button"
                    variant={platform === p ? 'default' : 'outline'}
                    onClick={() => setPlatform(p)}
                    className={`flex flex-col h-auto py-3 ${platform === p ? '' : 'hover:bg-muted/50'}`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${platform === p ? '' : config.color}`} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {platformConfig[platform].description} • Limite: {platformConfig[platform].limit}
            </p>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Estilo da Bio
            </Label>
            <RadioGroup value={style} onValueChange={(v) => setStyle(v as Style)}>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(styleConfig) as Style[]).map((s) => {
                  const config = styleConfig[s];
                  return (
                    <div 
                      key={s}
                      className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-all ${style === s ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    >
                      <RadioGroupItem value={s} id={s} />
                      <Label htmlFor={s} className="cursor-pointer flex-1">
                        <span className="font-medium">{config.label}</span>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Form Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="niche">Nicho/Área de Atuação *</Label>
              <Input
                id="niche"
                placeholder="Ex: Mentoria para médicos, Coach de emagrecimento..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Público-Alvo</Label>
              <Input
                id="targetAudience"
                placeholder="Ex: Médicos que querem escalar consultório..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainResult">Principal Resultado/Transformação</Label>
            <Input
              id="mainResult"
              placeholder="Ex: +R$ 100k/mês, -20kg em 90 dias, 10x mais clientes..."
              value={mainResult}
              onChange={(e) => setMainResult(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="differentiator">Diferencial/Método Único</Label>
            <Textarea
              id="differentiator"
              placeholder="Ex: Método exclusivo testado em +500 alunos, 15 anos de experiência..."
              value={differentiator}
              onChange={(e) => setDifferentiator(e.target.value)}
              rows={2}
            />
          </div>

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando 3 opções de bio...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Bios Otimizadas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-3 rounded-lg ${platformConfig[platform].bgColor}`}>
            <PlatformIcon className={`h-6 w-6 ${platformConfig[platform].color}`} />
            <div>
              <h3 className="font-semibold text-foreground">Bios para {platformConfig[platform].label}</h3>
              <p className="text-xs text-muted-foreground">3 opções otimizadas para conversão</p>
            </div>
          </div>

          {/* Primary Bio */}
          <BioCard
            bio={result.primary}
            label="⭐ Recomendada"
            platform={platform}
            copiedField={copiedField}
            onCopy={(text) => copyToClipboard(text, 'primary')}
            isCopied={copiedField === 'primary'}
            variant="primary"
          />

          {/* Alternative 1 */}
          <BioCard
            bio={result.alternative1}
            label="Alternativa 1"
            platform={platform}
            copiedField={copiedField}
            onCopy={(text) => copyToClipboard(text, 'alt1')}
            isCopied={copiedField === 'alt1'}
            variant="secondary"
          />

          {/* Alternative 2 */}
          <BioCard
            bio={result.alternative2}
            label="Alternativa 2"
            platform={platform}
            copiedField={copiedField}
            onCopy={(text) => copyToClipboard(text, 'alt2')}
            isCopied={copiedField === 'alt2'}
            variant="secondary"
          />

          {/* Tips */}
          {result.tips && result.tips.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Dicas para Maximizar sua Bio</h4>
                </div>
                <ul className="space-y-3">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-3">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <span className="text-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Regenerate Button */}
          <Button 
            variant="outline" 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="w-full"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Gerar Novas Opções
          </Button>
        </div>
      )}

      {/* History */}
      <AIToolHistoryPanel
        history={history}
        loading={loadingHistory}
        onSelect={(entry) => {
          if (entry.output_data && typeof entry.output_data === 'object') {
            setResult(entry.output_data as any);
          }
          if (entry.input_data) {
            const input = entry.input_data as any;
            if (input.platform) setPlatform(input.platform);
            if (input.style) setStyle(input.style);
            if (input.niche) setNiche(input.niche);
          }
          toast.success('Bio carregada do histórico');
        }}
      />
    </div>
  );
}

// Bio Card Component
function BioCard({
  bio,
  label,
  platform,
  copiedField,
  onCopy,
  isCopied,
  variant,
}: {
  bio: GeneratedBio;
  label: string;
  platform: Platform;
  copiedField: string | null;
  onCopy: (text: string) => void;
  isCopied: boolean;
  variant: 'primary' | 'secondary';
}) {
  const fullBio = bio.headline ? `${bio.headline}\n\n${bio.bio}` : bio.bio;

  return (
    <Card className={variant === 'primary' ? 'border-primary/30 overflow-hidden' : 'overflow-hidden'}>
      {variant === 'primary' && (
        <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
      )}
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <Badge className={variant === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
            {label}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {bio.characterCount} chars
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(fullBio)}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Headline (for LinkedIn) */}
        {bio.headline && (
          <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-primary">
            <p className="text-xs text-muted-foreground mb-1">Headline:</p>
            <p className="font-medium text-foreground">{bio.headline}</p>
          </div>
        )}

        {/* Bio Content */}
        <div className="bg-muted rounded-lg p-4 mb-3">
          <p className="whitespace-pre-wrap text-foreground">{bio.bio}</p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">CTA:</span>
          <span className="text-sm text-foreground font-medium">{bio.callToAction}</span>
        </div>

        {/* Emojis & Hashtags */}
        <div className="flex flex-wrap gap-2">
          {bio.emojis.map((emoji, i) => (
            <span key={i} className="text-lg">{emoji}</span>
          ))}
          {bio.hashtags && bio.hashtags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
