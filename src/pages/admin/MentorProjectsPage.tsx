import { useState } from 'react';
import { useMentorProjects, type MentorProject } from '@/hooks/useMentorProjects';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { ProjectWorkspace } from '@/components/projects/ProjectWorkspace';
import { Loader2 } from 'lucide-react';

const MentorProjectsPage = () => {
  const { projects, isLoadingProjects, createProject } = useMentorProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0] || null;

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)] min-h-0">
      <ProjectSidebar
        projects={projects}
        selectedId={selectedProject?.id || null}
        onSelect={setSelectedProjectId}
        onCreate={(name) => createProject.mutate({ name })}
      />
      {selectedProject ? (
        <ProjectWorkspace project={selectedProject} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Crie seu primeiro projeto</p>
            <p className="text-sm">Organize suas tarefas como no ClickUp</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorProjectsPage;
