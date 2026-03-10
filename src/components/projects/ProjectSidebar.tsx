import { useState } from 'react';
import { type MentorProject } from '@/hooks/useMentorProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Folder, FolderOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectAgentDialog } from './ProjectAgentDialog';

interface Props {
  projects: MentorProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

export function ProjectSidebar({ projects, selectedId, onSelect, onCreate }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
  };

  return (
    <div className="w-56 shrink-0 flex flex-col gap-2 bg-card/50 rounded-xl border border-border/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projetos</span>
        <div className="flex items-center gap-0.5">
          <ProjectAgentDialog onProjectCreated={onSelect} compact />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreating(!creating)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {creating && (
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="flex gap-1">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome do projeto"
            className="h-7 text-xs"
            autoFocus
          />
        </form>
      )}

      <ScrollArea className="flex-1 -mx-1">
        <div className="space-y-0.5 px-1">
          {projects.map(p => {
            const isSelected = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left",
                  isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/50 text-foreground"
                )}
              >
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                {isSelected ? <FolderOpen className="h-3.5 w-3.5 shrink-0" /> : <Folder className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
