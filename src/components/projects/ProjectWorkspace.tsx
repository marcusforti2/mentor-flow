import { useState } from 'react';
import { type MentorProject } from '@/hooks/useMentorProjects';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KanbanView } from './views/KanbanView';
import { ListView } from './views/ListView';
import { CalendarView } from './views/CalendarView';
import { ProjectDashboard } from './views/ProjectDashboard';
import { AutomationsView } from './views/AutomationsView';
import { LayoutGrid, List, Calendar, BarChart3, Zap } from 'lucide-react';

interface Props {
  project: MentorProject;
}

export function ProjectWorkspace({ project }: Props) {
  const [view, setView] = useState('kanban');

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: project.color }} />
        <h2 className="text-lg font-display font-bold text-foreground truncate">{project.name}</h2>
      </div>

      <Tabs value={view} onValueChange={setView} className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-card/50 border border-border/50 w-fit">
          <TabsTrigger value="kanban" className="gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5 text-xs">
            <List className="h-3.5 w-3.5" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Automações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 min-h-0 mt-3">
          <KanbanView projectId={project.id} />
        </TabsContent>
        <TabsContent value="list" className="flex-1 min-h-0 mt-3">
          <ListView projectId={project.id} />
        </TabsContent>
        <TabsContent value="calendar" className="flex-1 min-h-0 mt-3">
          <CalendarView projectId={project.id} />
        </TabsContent>
        <TabsContent value="dashboard" className="flex-1 min-h-0 mt-3">
          <ProjectDashboard projectId={project.id} />
        </TabsContent>
        <TabsContent value="automations" className="flex-1 min-h-0 mt-3">
          <AutomationsView projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
