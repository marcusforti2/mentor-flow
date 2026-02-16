import { useState } from 'react';
import { useAutomations } from '@/hooks/useAutomations';
import { AutomationCard } from '@/components/admin/AutomationCard';
import { Loader2, Zap } from 'lucide-react';

export default function Automacoes() {
  const { automations, loading, toggleAutomation, updateConfig, runNow } = useAutomations();
  const [runningKey, setRunningKey] = useState<string | null>(null);

  const handleRunNow = async (key: string) => {
    setRunningKey(key);
    await runNow(key);
    setRunningKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Automações</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Configure e gerencie todas as automações do seu programa de mentoria.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onToggle={toggleAutomation}
            onUpdateConfig={updateConfig}
            onRunNow={handleRunNow}
            running={runningKey === automation.automation_key}
          />
        ))}
      </div>

      {automations.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma automação configurada para este tenant.</p>
        </div>
      )}
    </div>
  );
}
