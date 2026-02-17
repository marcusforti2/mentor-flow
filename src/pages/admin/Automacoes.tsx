import { useState } from 'react';
import { useAutomations, CATEGORY_LABELS, getAutomationMeta } from '@/hooks/useAutomations';
import { AutomationCard } from '@/components/admin/AutomationCard';
import { Loader2, Zap, CheckCircle2, XCircle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | 'engagement' | 'intelligence' | 'communication' | 'growth';

export default function Automacoes() {
  const { automations, loading, toggleAutomation, updateConfig, runNow } = useAutomations();
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const handleRunNow = async (key: string) => {
    setRunningKey(key);
    await runNow(key);
    setRunningKey(null);
  };

  const activeCount = automations.filter(a => a.is_enabled).length;
  const errorCount = automations.filter(a => a.last_run_status === 'error').length;

  const filtered = filter === 'all'
    ? automations
    : automations.filter(a => {
        const meta = getAutomationMeta(a.automation_key);
        return meta.category === filter;
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Automações</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Configure rotinas inteligentes que trabalham no piloto automático para você e seus mentorados.
        </p>
      </div>

      {/* Stats summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span><strong className="text-foreground">{activeCount}</strong> ativas</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
          <Pause className="h-3.5 w-3.5" />
          <span><strong className="text-foreground">{automations.length - activeCount}</strong> pausadas</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive rounded-full px-3 py-1.5">
            <XCircle className="h-3.5 w-3.5" />
            <span><strong>{errorCount}</strong> com erro</span>
          </div>
        )}
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full border transition-colors",
            filter === 'all'
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
          )}
        >
          Todas ({automations.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, cat]) => {
          const count = automations.filter(a => getAutomationMeta(a.automation_key).category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key as CategoryFilter)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filter === key
                  ? cn(cat.color)
                  : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
              )}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((automation) => (
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

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma automação encontrada nesta categoria.</p>
        </div>
      )}
    </div>
  );
}
