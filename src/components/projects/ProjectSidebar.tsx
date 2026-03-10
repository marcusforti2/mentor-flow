import { useState } from 'react';
import { type MentorProject, useMentorProjects } from '@/hooks/useMentorProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectAgentDialog } from './ProjectAgentDialog';

interface Props {
  projects: MentorProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

const PROJECT_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];

export function ProjectSidebar({ projects, selectedId, onSelect, onCreate }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editProject, setEditProject] = useState<MentorProject | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const { updateProject, deleteProject } = useMentorProjects();

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
  };

  const handleEdit = (p: MentorProject) => {
    setEditProject(p);
    setEditName(p.name);
    setEditColor(p.color);
  };

  const handleSaveEdit = () => {
    if (!editProject || !editName.trim()) return;
    updateProject.mutate({ id: editProject.id, updates: { name: editName.trim(), color: editColor } });
    setEditProject(null);
  };

  const handleDelete = (p: MentorProject) => {
    if (!confirm(`Excluir o projeto "${p.name}"? Todas as tarefas serão removidas.`)) return;
    deleteProject.mutate(p.id);
    if (selectedId === p.id) onSelect('');
  };

  return (
    <>
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
                <div key={p.id} className="group flex items-center">
                  <button
                    onClick={() => onSelect(p.id)}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left min-w-0",
                      isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                    {isSelected ? <FolderOpen className="h-3.5 w-3.5 shrink-0" /> : <Folder className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{p.name}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => handleEdit(p)} className="text-xs gap-2">
                        <Pencil className="h-3 w-3" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(p)} className="text-xs gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-3 w-3" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={v => !v && setEditProject(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Editar Projeto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-2 mt-1.5">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    className={cn("w-6 h-6 rounded-full transition-all", editColor === c && "ring-2 ring-offset-2 ring-primary")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full" size="sm">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
