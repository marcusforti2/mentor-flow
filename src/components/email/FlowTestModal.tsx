import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
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
  History,
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

const STORAGE_KEY = 'lb_test_emails';

export default function FlowTestModal({ 
  open, 
  onOpenChange, 
  flowName, 
  nodes,
  templates 
}: FlowTestModalProps) {
  const [testEmails, setTestEmails] = useState<string[]>([]);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const { toast } = useToast();

  // Load saved emails from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedEmails(parsed);
      } catch (e) {
        console.error('Error parsing saved emails:', e);
      }
    }
  }, []);

  // Save emails to localStorage whenever testEmails changes
  useEffect(() => {
    if (testEmails.length > 0) {
      const uniqueEmails = [...new Set([...savedEmails, ...testEmails])];
      setSavedEmails(uniqueEmails);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueEmails));
    }
  }, [testEmails]);

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

  const addEmail = (email?: string) => {
    const emailToAdd = email || newEmail.trim();
    if (!emailToAdd) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    if (testEmails.includes(emailToAdd)) {
      toast({ title: "Email já adicionado", variant: "destructive" });
      return;
    }
    setTestEmails([...testEmails, emailToAdd]);
    if (!email) setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setTestEmails(testEmails.filter(e => e !== email));
  };

  const removeSavedEmail = (email: string) => {
    const updated = savedEmails.filter(e => e !== email);
    setSavedEmails(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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

  // Count email nodes properly
  const emailNodeIndices = nodes
    .map((node, idx) => ({ node, idx }))
    .filter(({ node }) => node.type === 'email')
    .map(({ idx }, emailIdx) => ({ originalIdx: idx, emailNumber: emailIdx + 1 }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Testar Fluxo: {flowName}
          </DialogTitle>
          <DialogDescription>
            Visualize como os emails aparecem e envie um teste para seus emails
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left: Phone Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Preview Mobile</Label>
              {emailNodes.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  Email {selectedPreviewIndex + 1} de {emailNodes.length}
                </Badge>
              )}
            </div>
            
            {/* Phone Frame */}
            <div className="mx-auto w-[300px] h-[520px] bg-zinc-900 rounded-[40px] p-3 shadow-2xl border-4 border-zinc-800">
              {/* Phone Notch */}
              <div className="w-24 h-6 bg-zinc-800 rounded-full mx-auto mb-2" />
              
              {/* Phone Screen - White background like real email */}
              <div className="bg-white rounded-[28px] h-[calc(100%-32px)] overflow-hidden flex flex-col">
                {/* Email Header */}
                <div className="bg-gray-100 p-3 border-b border-gray-200">
                  <p className="text-xs text-gray-500">De: Vértice Hub Forti &lt;noreply@equipe.aceleracaoforti.online&gt;</p>
                  <p className="text-sm font-semibold text-gray-900 truncate mt-1">
                    {previewContent?.subject || 'Selecione um email'}
                  </p>
                </div>
                
                {/* Email Body - White bg with dark text like real email client */}
                <ScrollArea className="flex-1 p-3 bg-white">
                  {previewContent ? (
                    <div 
                      className="text-sm text-gray-800 email-preview-content"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(
                          previewContent.body
                            .replace(/\{\{nome\}\}/g, '<strong>João Silva</strong>')
                        )
                      }}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Adicione emails ao fluxo para visualizar
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Email Selector - Always show if there are emails */}
            {emailNodes.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {emailNodes.map((node, index) => {
                  const content = getEmailContent(node);
                  return (
                    <Button
                      key={index}
                      variant={selectedPreviewIndex === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPreviewIndex(index)}
                      className="h-auto py-1 px-3 text-xs"
                      title={content.subject}
                    >
                      Email {index + 1}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Flow Overview & Test Config */}
          <div className="space-y-4">
            {/* Flow Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Etapas do Fluxo</Label>
                <Badge variant="secondary" className="text-xs">
                  {nodes.length} etapas • {emailNodes.length} emails
                </Badge>
              </div>
              <ScrollArea className="h-[220px] pr-2">
                <div className="space-y-2">
                  {getFlowSteps().map((step, index) => {
                    const emailInfo = emailNodeIndices.find(e => e.originalIdx === index);
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border border-border/50"
                      >
                        <div className={`h-9 w-9 rounded-lg ${step?.bgColor} flex items-center justify-center shrink-0`}>
                          {step?.icon && <step.icon className={`h-4 w-4 ${step.color}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{step?.label}</p>
                          <p className="text-xs text-muted-foreground capitalize">{step?.type}</p>
                        </div>
                        {emailInfo && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs shrink-0 cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => setSelectedPreviewIndex(emailInfo.emailNumber - 1)}
                          >
                            Email {emailInfo.emailNumber}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
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
                <Button onClick={() => addEmail()} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Saved Emails - Quick Select */}
              {savedEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <History className="h-3 w-3 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">Emails salvos:</Label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {savedEmails.filter(e => !testEmails.includes(e)).map((email) => (
                      <Badge
                        key={email}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs group"
                        onClick={() => addEmail(email)}
                      >
                        <span className="truncate max-w-[120px]">{email}</span>
                        <button
                          className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSavedEmail(email);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Email List */}
              <ScrollArea className="h-[100px]">
                <div className="space-y-2 pr-2">
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
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:text-destructive shrink-0"
                          onClick={() => removeEmail(email)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSendTest}
              disabled={isSending || testEmails.length === 0 || emailNodes.length === 0}
              className="w-full gradient-gold text-primary-foreground h-12"
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
              Todos os {emailNodes.length} emails do fluxo serão enviados de uma vez
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
