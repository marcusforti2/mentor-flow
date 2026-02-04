import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Loader2, 
  Instagram, 
  Linkedin,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { coldMessagesApi, ColdMessagesResult, BusinessProfile } from '@/lib/api/firecrawl';

interface ColdMessageGeneratorProps {
  mentoradoId: string | null;
}

export function ColdMessageGenerator({ mentoradoId }: ColdMessageGeneratorProps) {
  const [leadName, setLeadName] = useState('');
  const [leadContext, setLeadContext] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'linkedin'>('instagram');
  const [tone, setTone] = useState<'casual' | 'professional' | 'direct'>('casual');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ColdMessagesResult | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!mentoradoId) return;

      try {
        const { data } = await supabase
          .from('mentorado_business_profiles')
          .select('*')
          .eq('mentorado_id', mentoradoId)
          .single();

        if (data) {
          setBusinessProfile(data);
        }
      } catch (error) {
        console.error('Error fetching business profile:', error);
      }
    };

    fetchBusinessProfile();
  }, [mentoradoId]);

  const handleGenerate = async () => {
    if (!leadName.trim()) {
      toast.error('Digite o nome do lead');
      return;
    }

    setIsLoading(true);
    setMessages(null);

    try {
      const result = await coldMessagesApi.generate({
        leadName,
        leadContext,
        platform,
        tone,
        businessProfile: businessProfile || undefined,
      });

      if (result.success && result.messages) {
        setMessages(result.messages);
        toast.success('Mensagens geradas!');
      } else {
        toast.error(result.error || 'Erro ao gerar mensagens');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Erro ao gerar mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Gerador de Cold Messages
          </CardTitle>
          <CardDescription>
            Crie mensagens de prospecção fria personalizadas para Instagram DM e LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Plataforma</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={platform === 'instagram' ? 'default' : 'outline'}
                onClick={() => setPlatform('instagram')}
                className="flex-1"
              >
                <Instagram className="mr-2 h-4 w-4" />
                Instagram DM
              </Button>
              <Button
                type="button"
                variant={platform === 'linkedin' ? 'default' : 'outline'}
                onClick={() => setPlatform('linkedin')}
                className="flex-1"
              >
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
            </div>
          </div>

          {/* Lead Name */}
          <div className="space-y-2">
            <Label htmlFor="leadName">Nome do Lead *</Label>
            <Input
              id="leadName"
              placeholder="Ex: Marina Silva"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
            />
          </div>

          {/* Lead Context */}
          <div className="space-y-2">
            <Label htmlFor="leadContext">Contexto do Lead (opcional)</Label>
            <Textarea
              id="leadContext"
              placeholder="Ex: Coach de emagrecimento, posta muito sobre mindset e transformação pessoal, tem ~5k seguidores"
              value={leadContext}
              onChange={(e) => setLeadContext(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais contexto, mais personalizadas as mensagens
            </p>
          </div>

          {/* Tone Selection */}
          <div className="space-y-3">
            <Label>Tom da Mensagem</Label>
            <RadioGroup value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual" className="cursor-pointer flex-1">
                    <span className="font-medium">😊 Casual e Leve</span>
                    <p className="text-xs text-muted-foreground">Descontraído, com emojis</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="cursor-pointer flex-1">
                    <span className="font-medium">💼 Profissional</span>
                    <p className="text-xs text-muted-foreground">Cordial mas formal</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="cursor-pointer flex-1">
                    <span className="font-medium">🎯 Direto</span>
                    <p className="text-xs text-muted-foreground">Objetivo e sem rodeios</p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando mensagens...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Mensagens
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {messages && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {platform === 'instagram' ? (
              <Instagram className="h-5 w-5 text-pink-500" />
            ) : (
              <Linkedin className="h-5 w-5 text-blue-600" />
            )}
            <h3 className="font-semibold">
              {platform === 'instagram' ? 'Instagram DM' : 'LinkedIn'}
            </h3>
          </div>

          {/* Message 1 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">📨 Mensagem 1</Badge>
                  <span className="text-sm font-medium">{messages.message1.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(messages.message1.content, 'msg1')}
                >
                  {copiedField === 'msg1' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="bg-muted rounded-lg p-4 mb-3">
                <p className="whitespace-pre-wrap">{messages.message1.content}</p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⏰ {messages.message1.timing}
              </p>
            </CardContent>
          </Card>

          {/* Message 2 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">📨 Mensagem 2</Badge>
                  <span className="text-sm font-medium">{messages.message2.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(messages.message2.content, 'msg2')}
                >
                  {copiedField === 'msg2' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="bg-muted rounded-lg p-4 mb-3">
                <p className="whitespace-pre-wrap">{messages.message2.content}</p>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⏰ {messages.message2.timing}
              </p>
            </CardContent>
          </Card>

          {/* Tips */}
          {messages.tips && messages.tips.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Dicas para Maximizar Resultados</h4>
                </div>
                <ul className="space-y-2">
                  {messages.tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5">💡</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
