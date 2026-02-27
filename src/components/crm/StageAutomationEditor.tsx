import { useState } from "react";
import { Zap, Plus, Trash2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmAutomations } from "@/hooks/useCrmAutomations";
import type { PipelineStage } from "@/hooks/usePipelineStages";

interface StageAutomationEditorProps {
  membershipId: string;
  tenantId: string;
  stages: PipelineStage[];
}

export function StageAutomationEditor({ membershipId, tenantId, stages }: StageAutomationEditorProps) {
  const { automations, isLoading, createAutomation, updateAutomation, deleteAutomation } = useCrmAutomations(membershipId, tenantId);

  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [delayDays, setDelayDays] = useState("3");

  const handleCreate = () => {
    if (!fromKey || !toKey || !delayDays) return;
    createAutomation.mutate({
      from_stage_key: fromKey,
      to_stage_key: toKey,
      delay_days: parseInt(delayDays),
    });
    setFromKey("");
    setToKey("");
    setDelayDays("3");
  };

  const getStageName = (key: string) => {
    return stages.find((s) => s.status_key === key)?.name || key;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Automações de Funil</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure o avanço automático de etapas. Quando um lead ficar X dias em uma etapa, ele avança automaticamente para a próxima.
      </p>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Automação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Etapa de Origem</Label>
              <Select value={fromKey} onValueChange={setFromKey}>
                <SelectTrigger><SelectValue placeholder="De..." /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.status_key} value={s.status_key}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Etapa de Destino</Label>
              <Select value={toKey} onValueChange={setToKey}>
                <SelectTrigger><SelectValue placeholder="Para..." /></SelectTrigger>
                <SelectContent>
                  {stages.filter((s) => s.status_key !== fromKey).map((s) => (
                    <SelectItem key={s.status_key} value={s.status_key}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dias para avançar</Label>
              <Input
                type="number"
                min="1"
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={!fromKey || !toKey || !delayDays || createAutomation.isPending} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> Criar Automação
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          Automações ativas ({automations.length})
        </h4>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {automations.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Nenhuma automação configurada.</p>
        )}
        {automations.map((auto) => (
          <Card key={auto.id} className={!auto.is_active ? "opacity-50" : ""}>
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-medium">{getStageName(auto.from_stage_key)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getStageName(auto.to_stage_key)}</span>
                <span className="text-muted-foreground">
                  — {auto.delay_days} {auto.delay_days === 1 ? "dia" : "dias"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={auto.is_active}
                  onCheckedChange={(checked) =>
                    updateAutomation.mutate({ id: auto.id, updates: { is_active: checked } })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAutomation.mutate(auto.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
