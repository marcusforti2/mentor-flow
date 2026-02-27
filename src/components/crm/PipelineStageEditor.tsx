import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineStages, type PipelineStage } from "@/hooks/usePipelineStages";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  Users,
  Globe,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AVAILABLE_COLORS = [
  "bg-slate-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-red-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-emerald-500",
];

interface MenteeOption {
  id: string;
  name: string;
}

interface PipelineStageEditorProps {
  tenantId: string;
  mentorados?: MenteeOption[];
  /** If set, hides scope selector and locks to this membership */
  fixedMembershipId?: string;
}

export function PipelineStageEditor({ tenantId, mentorados = [], fixedMembershipId }: PipelineStageEditorProps) {
  const { toast } = useToast();
  const [selectedScope, setSelectedScope] = useState<string>(fixedMembershipId || "tenant");
  const membershipId = fixedMembershipId || (selectedScope === "tenant" ? undefined : selectedScope);
  const { stages: currentStages, isLoading, reload, DEFAULT_STAGES } = usePipelineStages(tenantId, membershipId);
  const [editStages, setEditStages] = useState<PipelineStage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setEditStages(currentStages.map((s, i) => ({ ...s, position: i })));
  }, [currentStages]);

  // Reload when scope changes
  useEffect(() => {
    reload();
  }, [selectedScope]);

  const addStage = () => {
    const newKey = `custom_${Date.now()}`;
    setEditStages([
      ...editStages,
      { name: "Novo Estágio", status_key: newKey, color: "bg-slate-500", position: editStages.length },
    ]);
  };

  const removeStage = (index: number) => {
    if (editStages.length <= 2) {
      toast({ title: "Mínimo de 2 estágios", variant: "destructive" });
      return;
    }
    setEditStages(editStages.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i })));
  };

  const updateStage = (index: number, field: keyof PipelineStage, value: string) => {
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
    setEditStages(DEFAULT_STAGES.map((s, i) => ({ ...s, position: i })));
  };

  const handleSave = async () => {
    const names = editStages.map((s) => s.name.trim());
    if (names.some((n) => !n)) {
      toast({ title: "Todos os estágios precisam de um nome", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Delete existing stages for this scope
      let deleteQuery = supabase.from("crm_pipeline_stages").delete().eq("tenant_id", tenantId);
      if (membershipId) {
        deleteQuery = deleteQuery.eq("membership_id", membershipId);
      } else {
        deleteQuery = deleteQuery.is("membership_id", null);
      }
      await deleteQuery;

      // Check if stages match default
      const isDefault =
        editStages.length === DEFAULT_STAGES.length &&
        editStages.every((s, i) => s.name === DEFAULT_STAGES[i].name && s.status_key === DEFAULT_STAGES[i].status_key && s.color === DEFAULT_STAGES[i].color);

      if (!isDefault) {
        const { error } = await supabase.from("crm_pipeline_stages").insert(
          editStages.map((s, i) => ({
            tenant_id: tenantId,
            membership_id: membershipId || null,
            name: s.name.trim(),
            status_key: s.status_key,
            color: s.color,
            position: i,
          }))
        );
        if (error) throw error;
      }

      await reload();
      toast({ title: "Pipeline salvo com sucesso!" });
    } catch (error) {
      console.error("Error saving pipeline:", error);
      toast({ title: "Erro ao salvar pipeline", variant: "destructive" });
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
      {/* Scope selector - only for admin/mentor view */}
      {!fixedMembershipId && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">Configurar pipeline para:</label>
              <Select value={selectedScope} onValueChange={setSelectedScope}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Todos os mentorados (padrão)
                    </div>
                  </SelectItem>
                  {mentorados.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {m.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {membershipId && (
              <p className="text-xs text-muted-foreground mt-2">
                Este pipeline será exclusivo para este mentorado. Se removido, ele volta ao pipeline padrão do tenant.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stage editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {membershipId ? "Pipeline Individual" : "Pipeline Padrão"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Defina os estágios do pipeline. Arraste para reordenar.
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
              key={`${stage.status_key}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
                dragIndex === index && "opacity-50 border-primary"
              )}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <div className={cn("w-4 h-4 rounded-full shrink-0", stage.color)} />
              <Input
                value={stage.name}
                onChange={(e) => updateStage(index, "name", e.target.value)}
                className="flex-1 h-8"
                placeholder="Nome do estágio"
              />
              <div className="flex gap-1 shrink-0">
                {AVAILABLE_COLORS.slice(0, 6).map((color) => (
                  <button
                    key={color}
                    onClick={() => updateStage(index, "color", color)}
                    className={cn(
                      "w-5 h-5 rounded-full transition-all",
                      color,
                      stage.color === color ? "ring-2 ring-offset-2 ring-primary" : "opacity-50 hover:opacity-100"
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
            Adicionar Estágio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
