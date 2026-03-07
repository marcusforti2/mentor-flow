import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, UserCheck, Target, Award, Bell, Lightbulb, Zap, Play, Loader2,
  HeartHandshake, CalendarClock, BarChart3, PartyPopper, CheckCircle2, XCircle, Clock,
  MessageSquare, Trash2, Plus,
} from 'lucide-react';
import { type Automation, getAutomationMeta, CATEGORY_LABELS } from '@/hooks/useAutomations';
import { type JarvisConversation } from '@/hooks/useJarvis';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  mail: Mail, 'user-check': UserCheck, target: Target,
  award: Award, bell: Bell, lightbulb: Lightbulb, zap: Zap,
  'hand-heart': HeartHandshake, 'calendar-clock': CalendarClock,
  'bar-chart-3': BarChart3, 'party-popper': PartyPopper,
};

interface Props {
  automations: Automation[];
  onToggle: (id: string, enabled: boolean) => void;
  onRunNow: (key: string) => void;
  runningKey: string | null;
  conversations?: JarvisConversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export function JarvisSidebar({
  automations, onToggle, onRunNow, runningKey,
  conversations = [], activeConversationId, onSelectConversation, onDeleteConversation, onNewChat,
}: Props) {
  const activeCount = automations.filter(a => a.is_enabled).length;

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="history" className="flex flex-col h-full">
        <div className="p-3 border-b border-border/50">
          <TabsList className="w-full h-8">
            <TabsTrigger value="history" className="text-xs flex-1 gap-1">
              <MessageSquare className="h-3 w-3" />
              Conversas
            </TabsTrigger>
            <TabsTrigger value="automations" className="text-xs flex-1 gap-1">
              <Zap className="h-3 w-3" />
              Automações
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="history" className="flex-1 m-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/50">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={onNewChat}
            >
              <Plus className="h-3 w-3" />
              Nova conversa
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Nenhuma conversa ainda
                </p>
              )}
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                    activeConversationId === conv.id
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                  onClick={() => onSelectConversation?.(conv.id)}
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{conv.title}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDeleteConversation?.(conv.id); }}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="automations" className="flex-1 m-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Automações
              </h3>
              <Badge variant="outline" className="text-[10px]">
                {activeCount}/{automations.length} ativas
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Gerencie aqui ou peça ao Jarvis
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {automations.map(automation => {
                const meta = getAutomationMeta(automation.automation_key);
                const Icon = iconMap[meta.icon] || Zap;
                const isRunning = runningKey === automation.automation_key;

                return (
                  <div
                    key={automation.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      automation.is_enabled
                        ? "border-primary/20 bg-primary/5"
                        : "border-border/30 bg-muted/20 opacity-70"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "p-1.5 rounded-lg shrink-0",
                        automation.is_enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-medium text-foreground truncate">{meta.label}</h4>
                          <Switch
                            checked={automation.is_enabled}
                            onCheckedChange={(checked) => onToggle(automation.id, checked)}
                            className="scale-75"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-muted-foreground">{meta.frequencyLabel}</span>
                          {automation.last_run_at && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              {automation.last_run_status === 'success'
                                ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                : automation.last_run_status === 'error'
                                ? <XCircle className="h-2.5 w-2.5 text-destructive" />
                                : <Clock className="h-2.5 w-2.5" />
                              }
                              {formatDistanceToNow(new Date(automation.last_run_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => onRunNow(automation.automation_key)}
                        disabled={isRunning}
                      >
                        {isRunning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
                        {isRunning ? 'Executando...' : 'Executar'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
