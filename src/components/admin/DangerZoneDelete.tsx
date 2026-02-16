import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ChevronDown, Loader2, Trash2 } from "lucide-react";

interface DangerZoneDeleteProps {
  name: string;
  isDeleting: boolean;
  onConfirmDelete: () => void;
}

const KEYWORD = "EXCLUIR";

export function DangerZoneDelete({ name, isDeleting, onConfirmDelete }: DangerZoneDeleteProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const canDelete = typed.trim().toUpperCase() === KEYWORD;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="pt-4">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full justify-center py-2">
          <AlertTriangle className="h-3 w-3" />
          Zona de perigo
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3 border border-destructive/20 rounded-lg p-4 bg-destructive/5">
        <p className="text-sm text-muted-foreground">
          Esta ação vai desativar o acesso de <strong className="text-foreground">{name}</strong> à plataforma.
        </p>
        <p className="text-xs text-muted-foreground">
          Para confirmar, digite <strong className="text-destructive">{KEYWORD}</strong> abaixo:
        </p>
        <Input
          placeholder={`Digite ${KEYWORD} para confirmar`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="font-mono text-sm"
        />
        <Button
          variant="destructive"
          className="w-full"
          disabled={!canDelete || isDeleting}
          onClick={() => {
            if (canDelete) onConfirmDelete();
          }}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Excluir Mentorado
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
