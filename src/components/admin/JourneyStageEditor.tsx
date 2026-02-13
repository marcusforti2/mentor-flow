import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useJourneyStages, DEFAULT_JOURNEY_STAGES, type JourneyStage } from "@/hooks/useJourneyStages";
import { useJourneys, type Journey } from "@/hooks/useJourneys";
import { GripVertical, Plus, Trash2, Save, RotateCcw, Loader2, Wand2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { journeys, isLoading: journeysLoading, reload: reloadJourneys, createJourney, updateJourney, deleteJourney } = useJourneys(tenantId);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const { stages: currentStages, isLoading: stagesLoading, reload: reloadStages } = useJourneyStages(tenantId, selectedJourneyId || undefined);
  
  const [editStages, setEditStages] = useState<JourneyStage[]>([]);
  const [journeyName, setJourneyName] = useState("Jornada CS");
  const [totalDays, setTotalDays] = useState(365);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Select first journey when loaded
  useEffect(() => {
    if (journeys.length > 0 && !selectedJourneyId) {
      setSelectedJourneyId(journeys[0].id);
    }
  }, [journeys, selectedJourneyId]);

  // Update form when journey or stages change
  useEffect(() => {
    setEditStages(currentStages.map((s, i) => ({ ...s, position: i })));
    if (currentStages.length > 0) {
      setTotalDays(currentStages[currentStages.length - 1].day_end);
    }
  }, [currentStages]);

  useEffect(() => {
    const j = journeys.find(j => j.id === selectedJourneyId);
    if (j) {
      setJourneyName(j.name);
      setTotalDays(j.total_days);
    }
  }, [selectedJourneyId, journeys]);

  const handleCreateJourney = async () => {
    const newJourney = await createJourney(`Nova Jornada ${journeys.length + 1}`);
    if (newJourney) {
      setSelectedJourneyId(newJourney.id);
      // Add default stages for the new journey
      const defaultStages = DEFAULT_JOURNEY_STAGES.map((s, i) => ({
        tenant_id: tenantId,
        journey_id: newJourney.id,
        name: s.name,
        stage_key: s.stage_key,
        day_start: s.day_start,
        day_end: s.day_end,
        color: s.color,
        position: i,
      }));
      await (supabase.from("cs_journey_stages" as any) as any).insert(defaultStages);
      await reloadStages();
      toast({ title: "Nova jornada criada!" });
    }
  };

  const handleDeleteJourney = async () => {
    if (!selectedJourneyId) return;
    await deleteJourney(selectedJourneyId);
    setSelectedJourneyId(journeys.find(j => j.id !== selectedJourneyId)?.id || null);
    setDeleteConfirm(false);
    toast({ title: "Jornada excluída!" });
    onSaved?.();
  };

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
        color: AVAILABLE_COLORS[editStages.length % AVAILABLE_COLORS.length],
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
    setTotalDays(365);
  };

  const redistributeDays = () => {
    if (editStages.length === 0) return;
    const count = editStages.length;
    const total = totalDays;
    const weights = editStages.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let currentDay = 0;
    const redistributed = editStages.map((stage, i) => {
      const allocation = Math.round((weights[i] / totalWeight) * total);
      const dayStart = currentDay;
      const dayEnd = i === count - 1 ? total : currentDay + allocation - 1;
      currentDay = dayEnd + 1;
      return { ...stage, day_start: dayStart, day_end: dayEnd, position: i };
    });
    setEditStages(redistributed);
    toast({ title: "Dias redistribuídos automaticamente!" });
  };

  const handleSave = async () => {
    const names = editStages.map((s) => s.name.trim());
    if (names.some((n) => !n)) {
      toast({ title: "Todas as etapas precisam de um nome", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Ensure journey exists
      let journeyId = selectedJourneyId;
      if (!journeyId) {
        const newJ = await createJourney(journeyName, totalDays);
        if (!newJ) throw new Error("Failed to create journey");
        journeyId = newJ.id;
        setSelectedJourneyId(journeyId);
      } else {
        await updateJourney(journeyId, { name: journeyName, total_days: totalDays });
      }

      // Delete existing stages for this journey
      await (supabase.from("cs_journey_stages" as any) as any)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("journey_id", journeyId);

      // Insert new stages
      const { error } = await (supabase.from("cs_journey_stages" as any) as any).insert(
        editStages.map((s, i) => ({
          tenant_id: tenantId,
          journey_id: journeyId,
          name: s.name.trim(),
          stage_key: s.stage_key,
          day_start: s.day_start,
          day_end: s.day_end,
          color: s.color,
          position: i,
        }))
      );
      if (error) throw error;

      await reloadStages();
      await reloadJourneys();
      onSaved?.();
      toast({ title: "Jornada salva com sucesso!" });
    } catch (error) {
      console.error("Error saving journey stages:", error);
      toast({ title: "Erro ao salvar etapas", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (journeysLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Journey Tabs */}
      {journeys.length > 0 && (
        <div className="flex items-center gap-2">
          <Tabs value={selectedJourneyId || ""} onValueChange={setSelectedJourneyId} className="flex-1">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
              {journeys.map((j) => (
                <TabsTrigger
                  key={j.id}
                  value={j.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5 rounded-full"
                >
                  {j.name}
                  {j.is_default && <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 h-4">padrão</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="icon" onClick={handleCreateJourney} title="Criar nova jornada" className="shrink-0">
            <PlusCircle className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* No journeys state */}
      {journeys.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-3">Nenhuma jornada configurada</p>
            <Button onClick={handleCreateJourney} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Criar primeira jornada
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stage Editor */}
      {selectedJourneyId && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Configurar Etapas</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Personalize as etapas e os intervalos desta jornada.
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="journey-name" className="text-xs text-muted-foreground">Nome da Jornada</Label>
                  <Input
                    id="journey-name"
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                    placeholder="Ex: Jornada de Vendas"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="total-days" className="text-xs text-muted-foreground">Duração Total (dias)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="total-days"
                      type="number"
                      value={totalDays}
                      onChange={(e) => setTotalDays(parseInt(e.target.value) || 365)}
                      className="h-9 flex-1"
                      min={30}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={redistributeDays}
                      className="gap-1.5 whitespace-nowrap h-9"
                      title="Redistribuir dias automaticamente entre as etapas"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Reorganizar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 pt-0">
            {editStages.map((stage, index) => (
              <div
                key={`${stage.stage_key}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "p-3 rounded-lg border bg-card transition-all space-y-2",
                  dragIndex === index && "opacity-50 border-primary"
                )}
              >
                {/* Row 1: Drag + Name */}
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                  <div className={cn("w-3 h-3 rounded-full shrink-0", stage.color)} />
                  <Input
                    value={stage.name}
                    onChange={(e) => updateStage(index, "name", e.target.value)}
                    className="flex-1 h-8 font-medium"
                    placeholder="Nome da etapa"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeStage(index)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
                {/* Row 2: Days + Colors */}
                <div className="flex items-center gap-2 pl-8">
                  <span className="text-xs text-muted-foreground">Dia</span>
                  <Input
                    type="number"
                    value={stage.day_start}
                    onChange={(e) => updateStage(index, "day_start", parseInt(e.target.value) || 0)}
                    className="w-16 h-7 text-center text-xs"
                  />
                  <span className="text-xs text-muted-foreground">a</span>
                  <Input
                    type="number"
                    value={stage.day_end}
                    onChange={(e) => updateStage(index, "day_end", parseInt(e.target.value) || 0)}
                    className="w-16 h-7 text-center text-xs"
                  />
                  <div className="flex gap-1 ml-auto shrink-0">
                    {AVAILABLE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateStage(index, "color", color)}
                        className={cn(
                          "w-4 h-4 rounded-full transition-all",
                          color,
                          stage.color === color ? "ring-2 ring-offset-1 ring-primary" : "opacity-30 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addStage}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Etapa
            </Button>

            {/* Delete journey button */}
            {journeys.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir esta jornada
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Jornada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta jornada? Todas as etapas e vínculos com mentorados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJourney}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
