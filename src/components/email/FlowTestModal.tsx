import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Smartphone,
  Send,
  Plus,
  X,
  Loader2,
  Mail,
  Clock,
  GitBranch,
  Zap,
  CheckCircle2,
} from "lucide-react";

interface EmailNode {
  id: string;
  type: string;
  data: {
    subject?: string;
    body?: string;
    templateId?: string;
    duration?: number;
    unit?: string;
    triggerType?: string;
    conditionType?: string;
  };
}

interface FlowTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowName: string;
  nodes: EmailNode[];
  templates: Array<{ id: string; name: string; subject: string; body_html: string }>;
}

const TRIGGER_LABELS: Record<string, string> = {
  onboarding: 'Entrada no Programa',
  inactivity: 'Inatividade',
  trail_completion: 'Conclusão de Trilha',
  date: 'Data Específica',
  manual: 'Disparo Manual',
};

const UNIT_LABELS: Record<string, string> = {
  hours: 'hora(s)',
  days: 'dia(s)',
  weeks: 'semana(s)',
};

export default function FlowTestModal({ 
  open, 
  onOpenChange, 
  flowName, 
  nodes,
  templates 
}: FlowTestModalProps) {
  const [testEmails, setTestEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const { toast } = useToast();

  // Get email nodes from the flow
  const emailNodes = nodes.filter(n => n.type === 'email');
  
  // Get the email content for preview
  const getEmailContent = (node: EmailNode) => {
    if (node.data.templateId) {
      const template = templates.find(t => t.id === node.data.templateId);
      return {
        subject: template?.subject || 'Sem assunto',
        body: template?.body_html || '<p>Conteúdo do template</p>',
      };
    }
    return {
      subject: node.data.subject || 'Sem assunto',
      body: node.data.body || '<p>Configure o conteúdo do email</p>',
    };
  };

  const currentPreviewEmail = emailNodes[selectedPreviewIndex];
  const previewContent = currentPreviewEmail ? getEmailContent(currentPreviewEmail) : null;

  const addEmail = () => {
    if (!newEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    if (testEmails.includes(newEmail)) {
      toast({ title: "Email já adicionado", variant: "destructive" });
      return;
    }
    setTestEmails([...testEmails, newEmail]);
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setTestEmails(testEmails.filter(e => e !== email));
  };

  const handleSendTest = async () => {
    if (testEmails.length === 0) {
      toast({ title: "Adicione pelo menos um email", variant: "destructive" });
      return;
    }

    if (emailNodes.length === 0) {
      toast({ title: "Adicione pelo menos um nó de email ao fluxo", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Prepare email contents
      const emailContents = emailNodes.map(node => getEmailContent(node));

      const { data, error } = await supabase.functions.invoke('send-test-flow', {
        body: {
          flowName,
          emails: testEmails,
          emailContents,
        }
      });

      if (error) throw error;

      toast({ 
        title: "Teste enviado!", 
        description: `${emailContents.length} email(s) enviado(s) para ${testEmails.length} destinatário(s)` 
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast({ 
        title: "Erro ao enviar teste", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  // Get flow steps for visualization
  const getFlowSteps = () => {
    return nodes.map((node, index) => {
      switch (node.type) {
        case 'trigger':
          return {
            type: 'trigger',
            icon: Zap,
            label: TRIGGER_LABELS[node.data.triggerType || 'manual'] || 'Gatilho',
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/20',
          };
        case 'email':
          return {
            type: 'email',
            icon: Mail,
            label: node.data.subject || 'Email',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/20',
          };
        case 'wait':
          return {
            type: 'wait',
            icon: Clock,
            label: `Aguardar ${node.data.duration || 1} ${UNIT_LABELS[node.data.unit || 'days']}`,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/20',
          };
        case 'condition':
          return {
            type: 'condition',
            icon: GitBranch,
            label: 'Condição',
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/20',
          };
        default:
          return null;
      }
    }).filter(Boolean);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Testar Fluxo: {flowName}
          </DialogTitle>
          <DialogDescription>
            Visualize como os emails aparecem e envie um teste para seus emails
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 mt-4">
          {/* Left: Phone Preview */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Preview Mobile</Label>
            
            {/* Phone Frame */}
            <div className="mx-auto w-[280px] h-[500px] bg-foreground/5 rounded-[40px] p-3 shadow-2xl border-4 border-foreground/10">
              {/* Phone Notch */}
              <div className="w-24 h-6 bg-foreground/20 rounded-full mx-auto mb-2" />
              
              {/* Phone Screen */}
              <div className="bg-background rounded-[28px] h-[calc(100%-32px)] overflow-hidden flex flex-col">
                {/* Email Header */}
                <div className="bg-card p-3 border-b border-border">
                  <p className="text-xs text-muted-foreground">De: sua-mentoria@email.com</p>
                  <p className="text-sm font-semibold truncate mt-1">
                    {previewContent?.subject || 'Selecione um email'}
                  </p>
                </div>
                
                {/* Email Body */}
                <ScrollArea className="flex-1 p-3">
                  {previewContent ? (
                    <div 
                      className="text-sm prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: previewContent.body
                          .replace(/\{\{nome\}\}/g, '<strong>João Silva</strong>')
                      }} 
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Adicione emails ao fluxo para visualizar
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Email Selector */}
            {emailNodes.length > 1 && (
              <div className="flex gap-2 justify-center">
                {emailNodes.map((_, index) => (
                  <Button
                    key={index}
                    variant={selectedPreviewIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPreviewIndex(index)}
                    className="h-8 w-8 p-0"
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Flow Overview & Test Config */}
          <div className="space-y-4">
            {/* Flow Steps */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Etapas do Fluxo</Label>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                {getFlowSteps().map((step, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div className={`h-8 w-8 rounded-lg ${step?.bgColor} flex items-center justify-center`}>
                      {step?.icon && <step.icon className={`h-4 w-4 ${step.color}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{step?.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{step?.type}</p>
                    </div>
                    {step?.type === 'email' && (
                      <Badge variant="secondary" className="text-xs">
                        Email {emailNodes.findIndex(n => nodes.indexOf(n as any) === index) + 1}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Test Emails */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Enviar teste para:</Label>
              
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                  className="flex-1"
                />
                <Button onClick={addEmail} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Email List */}
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {testEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Adicione emails para enviar o teste
                  </p>
                ) : (
                  testEmails.map((email) => (
                    <div 
                      key={email} 
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={() => removeEmail(email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSendTest}
              disabled={isSending || testEmails.length === 0 || emailNodes.length === 0}
              className="w-full gradient-gold text-primary-foreground"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Teste ({emailNodes.length} emails para {testEmails.length} destinatário{testEmails.length !== 1 ? 's' : ''})
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Todos os emails do fluxo serão enviados de uma vez para testar
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
