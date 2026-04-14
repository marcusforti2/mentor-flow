import { useState } from "react";
import { cn } from "@/lib/utils";
import { LeadCard, type Lead } from "./LeadCard";

export interface KanbanColumnProps {
  title: string;
  status: string;
  leads: Lead[];
  color: string;
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

export function KanbanColumn({
  title,
  status,
  leads,
  color,
  onLeadClick,
  onStatusChange,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      onStatusChange(leadId, status);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-xl transition-colors duration-150",
        isDragOver && "bg-primary/10 ring-2 ring-primary/40 ring-dashed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        <div className={cn("w-3 h-3 rounded-full", color)} />
        <span className="font-medium text-sm">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {leads.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum lead
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
            />
          ))
        )}
      </div>
    </div>
  );
}
