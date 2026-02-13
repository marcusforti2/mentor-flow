import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useJourneyStages, DEFAULT_JOURNEY_STAGES, type JourneyStage } from "@/hooks/useJourneyStages";
import { GripVertical, Plus, Trash2, Save, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AVAILABLE_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-green-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-orange-500",
  "bg-teal-500", "bg-indigo-500", "bg-emerald-500", "bg-slate-500",
];

interface JourneyStageEditorProps {
  tenantId: string;
  onSaved?: () => void;
}

export function JourneyStageEditor({ tenantId, onSaved }: JourneyStageEditorProps) {
  const { toast } = useToast();
  const { stages: currentStages, isLoading, reload } = useJourneyStages(tenantId);
  const [editStages, setEditStages] = useState<JourneyStage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setEditStages(currentStages.map((s, i) => ({ ...s, position: i })));
  }, [currentStages]);

  const addStage = () => {
    const last = editStages[editStages.length - 1];
    const newStart = last ? last.day_end + 1 : 0;
    setEditStages([
      ...editStages,
      {
        name: "Nova Etapa",
        stage_key: `custom_${Date.now()}`,
        day_start: newStart,
        day_end: newStart + 30,
        color: "bg-slate-500",
        position: editStages.length,
      },
    ]);
  };

  const removeStage = (index: number) => {
    if (editStages.length <= 2) {
      toast({ title: "Mínimo de 2 etapas", variant: "destructive" });
      return;
    }
    setEditStages(editStages.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i })));
  };

  const updateStage = (index: number, field: keyof JourneyStage, value: string | number) => {
    setEditStages(editStages.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newStages = [...editStages];
    const [moved] = newStages.splice(dragIndex, 1);
    newStages.splice(index, 0, moved);
    setEditStages(newStages.map((s, i) => ({ ...s, position: i })));
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const resetToDefault = () => {
    setEditStages(DEFAULT_JOURNEY_STAGES.map((s, i) => ({ ...s, position: i })));
  };

  const handleSave = async () => {
    const names = editStages.map((s) => s.name.trim());
    if (names.some((n) => !n)) {
      toast({ title: "Todas as etapas precisam de um nome", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Delete existing
      await (supabase.from("cs_journey_stages" as any) as any).delete().eq("tenant_id", tenantId);

      // Check if matches default
      const isDefault =
        editStages.length === DEFAULT_JOURNEY_STAGES.length &&
        editStages.every(
          (s, i) =>
            s.name === DEFAULT_JOURNEY_STAGES[i].name &&
            s.day_start === DEFAULT_JOURNEY_STAGES[i].day_start &&
            s.day_end === DEFAULT_JOURNEY_STAGES[i].day_end &&
            s.color === DEFAULT_JOURNEY_STAGES[i].color
        );

      if (!isDefault) {
        const { error } = await (supabase.from("cs_journey_stages" as any) as any).insert(
          editStages.map((s, i) => ({
            tenant_id: tenantId,
            name: s.name.trim(),
            stage_key: s.stage_key,
            day_start: s.day_start,
            day_end: s.day_end,
            color: s.color,
            position: i,
          }))
        );
        if (error) throw error;
      }

      await reload();
      onSaved?.();
      toast({ title: "Etapas da jornada salvas!" });
    } catch (error) {
      console.error("Error saving journey stages:", error);
      toast({ title: "Erro ao salvar etapas", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Etapas da Jornada CS</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Defina as etapas e os intervalos de dias. Arraste para reordenar.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Padrão
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editStages.map((stage, index) => (
            <div
              key={`${stage.stage_key}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border bg-card transition-all",
                dragIndex === index && "opacity-50 border-primary"
              )}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <div className={cn("w-4 h-4 rounded-full shrink-0", stage.color)} />
              <Input
                value={stage.name}
                onChange={(e) => updateStage(index, "name", e.target.value)}
                className="flex-1 h-8"
                placeholder="Nome da etapa"
              />
              <Input
                type="number"
                value={stage.day_start}
                onChange={(e) => updateStage(index, "day_start", parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-center"
                placeholder="Início"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <Input
                type="number"
                value={stage.day_end}
                onChange={(e) => updateStage(index, "day_end", parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-center"
                placeholder="Fim"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
              <div className="flex gap-1 shrink-0">
                {AVAILABLE_COLORS.slice(0, 6).map((color) => (
                  <button
                    key={color}
                    onClick={() => updateStage(index, "color", color)}
                    className={cn(
                      "w-4 h-4 rounded-full transition-all",
                      color,
                      stage.color === color ? "ring-2 ring-offset-1 ring-primary" : "opacity-40 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeStage(index)}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={addStage}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Etapa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
