import { useState } from 'react';
import { type MentorProject } from '@/hooks/useMentorProjects';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KanbanView } from './views/KanbanView';
import { ListView } from './views/ListView';
import { CalendarView } from './views/CalendarView';
import { GanttView } from './views/GanttView';
import { ProjectDashboard } from './views/ProjectDashboard';
import { AutomationsView } from './views/AutomationsView';
import { SprintsView } from './views/SprintsView';
import { GoalsView } from './views/GoalsView';
import { LayoutGrid, List, Calendar, BarChart3, Zap, GanttChart, Rocket, Target } from 'lucide-react';

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
        <TabsList className="bg-card/50 border border-border/50 w-fit flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="kanban" className="gap-1 text-[11px] h-7">
            <LayoutGrid className="h-3 w-3" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1 text-[11px] h-7">
            <List className="h-3 w-3" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1 text-[11px] h-7">
            <Calendar className="h-3 w-3" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1 text-[11px] h-7">
            <GanttChart className="h-3 w-3" /> Gantt
          </TabsTrigger>
          <TabsTrigger value="sprints" className="gap-1 text-[11px] h-7">
            <Rocket className="h-3 w-3" /> Sprints
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1 text-[11px] h-7">
            <Target className="h-3 w-3" /> Metas
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1 text-[11px] h-7">
            <BarChart3 className="h-3 w-3" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1 text-[11px] h-7">
            <Zap className="h-3 w-3" /> Automações
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
        <TabsContent value="gantt" className="flex-1 min-h-0 mt-3">
          <GanttView projectId={project.id} />
        </TabsContent>
        <TabsContent value="sprints" className="flex-1 min-h-0 mt-3">
          <SprintsView projectId={project.id} />
        </TabsContent>
        <TabsContent value="goals" className="flex-1 min-h-0 mt-3">
          <GoalsView />
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
