import { useState } from 'react';
import { useAutomations } from '@/hooks/useAutomations';
import { useJarvis } from '@/hooks/useJarvis';
import { JarvisChat } from '@/components/jarvis/JarvisChat';
import { JarvisSidebar } from '@/components/jarvis/JarvisSidebar';
import { Bot, PanelRightClose, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Automacoes() {
  const { automations, loading, toggleAutomation, updateConfig, runNow } = useAutomations();
  const jarvis = useJarvis();
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleRunNow = async (key: string) => {
    setRunningKey(key);
    await runNow(key);
    setRunningKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex flex-col items-center gap-3">
          <Bot className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando Jarvis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Jarvis</h1>
            <p className="text-xs text-muted-foreground">Centro de comando inteligente — automações, WhatsApp, email e mais.</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:flex hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
        >
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat area */}
        <div className={cn(
          "flex-1 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col min-w-0",
        )}>
          <JarvisChat
            messages={jarvis.messages}
            isLoading={jarvis.isLoading}
            onSend={jarvis.sendMessage}
            onStop={jarvis.stopStreaming}
            onClear={jarvis.clearChat}
          />
        </div>

        {/* Sidebar - automations panel */}
        {sidebarOpen && (
          <div className="hidden md:flex w-80 shrink-0 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex-col">
            <JarvisSidebar
              automations={automations}
              onToggle={toggleAutomation}
              onRunNow={handleRunNow}
              runningKey={runningKey}
              conversations={jarvis.conversations}
              activeConversationId={jarvis.conversationId}
              onSelectConversation={jarvis.loadConversation}
              onDeleteConversation={jarvis.deleteConversation}
              onNewChat={jarvis.clearChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}
