import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface MentorProject {
  id: string;
  tenant_id: string;
  membership_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  id: string;
  project_id: string;
  name: string;
  color: string;
  status_key: string;
  position: number;
  is_done: boolean;
}

export interface MentorTask {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  tenant_id: string;
  membership_id: string;
  title: string;
  description: string | null;
  status_id: string | null;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
  // Joined
  status?: TaskStatus | null;
  subtasks?: MentorTask[];
  checklists?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  membership_id: string;
  content: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  membership_id: string;
  minutes: number;
  description: string | null;
  started_at: string | null;
  created_at: string;
}

export interface TaskAutomation {
  id: string;
  project_id: string;
  tenant_id: string;
  membership_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
}

const DEFAULT_STATUSES = [
  { name: 'A Fazer', status_key: 'todo', color: '#94a3b8', position: 0, is_done: false },
  { name: 'Em Progresso', status_key: 'in_progress', color: '#3b82f6', position: 1, is_done: false },
  { name: 'Em Revisão', status_key: 'review', color: '#f59e0b', position: 2, is_done: false },
  { name: 'Concluído', status_key: 'done', color: '#10b981', position: 3, is_done: true },
];

export function useMentorProjects() {
  const { activeMembership, tenant } = useTenant();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const membershipId = activeMembership?.id;

  // ─── Projects ───
  const projectsQuery = useQuery({
    queryKey: ['mentor-projects', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_projects')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('membership_id', membershipId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MentorProject[];
    },
    enabled: !!tenantId && !!membershipId,
  });

  const createProject = useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('mentor_projects')
        .insert({
          tenant_id: tenantId!,
          membership_id: membershipId!,
          name: input.name,
          description: input.description || null,
          color: input.color || '#6366f1',
          icon: input.icon || 'folder',
        })
        .select()
        .single();
      if (error) throw error;

      // Seed default statuses
      const statuses = DEFAULT_STATUSES.map(s => ({ ...s, project_id: data.id }));
      await supabase.from('mentor_task_statuses').insert(statuses);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mentor-projects'] });
      toast.success('Projeto criado!');
    },
    onError: () => toast.error('Erro ao criar projeto'),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mentor_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mentor-projects'] });
      toast.success('Projeto excluído');
    },
  });

  // ─── Statuses ───
  const useStatuses = (projectId: string | undefined) =>
    useQuery({
      queryKey: ['mentor-task-statuses', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mentor_task_statuses')
          .select('*')
          .eq('project_id', projectId!)
          .order('position');
        if (error) throw error;
        return data as TaskStatus[];
      },
      enabled: !!projectId,
    });

  // ─── Tasks ───
  const useTasks = (projectId: string | undefined) =>
    useQuery({
      queryKey: ['mentor-tasks', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mentor_tasks')
          .select('*, mentor_task_statuses(*), mentor_task_checklists(*)')
          .eq('project_id', projectId!)
          .is('parent_task_id', null)
          .order('position');
        if (error) throw error;

        // Fetch subtasks
        const { data: subtasks } = await supabase
          .from('mentor_tasks')
          .select('*, mentor_task_statuses(*), mentor_task_checklists(*)')
          .eq('project_id', projectId!)
          .not('parent_task_id', 'is', null)
          .order('position');

        return (data || []).map((t: any) => ({
          ...t,
          status: t.mentor_task_statuses,
          checklists: t.mentor_task_checklists || [],
          subtasks: (subtasks || [])
            .filter((s: any) => s.parent_task_id === t.id)
            .map((s: any) => ({
              ...s,
              status: s.mentor_task_statuses,
              checklists: s.mentor_task_checklists || [],
            })),
        })) as MentorTask[];
      },
      enabled: !!projectId,
    });

  const createTask = useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      description?: string;
      status_id?: string;
      priority?: string;
      due_date?: string;
      start_date?: string;
      parent_task_id?: string;
      tags?: string[];
      estimated_minutes?: number;
    }) => {
      const { data, error } = await supabase
        .from('mentor_tasks')
        .insert({
          project_id: input.project_id,
          tenant_id: tenantId!,
          membership_id: membershipId!,
          title: input.title,
          description: input.description || null,
          status_id: input.status_id || null,
          priority: input.priority || 'medium',
          due_date: input.due_date || null,
          start_date: input.start_date || null,
          parent_task_id: input.parent_task_id || null,
          tags: input.tags || [],
          estimated_minutes: input.estimated_minutes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] });
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });

  const updateTask = useMutation({
    mutationFn: async (input: { id: string; project_id: string; updates: Partial<MentorTask> }) => {
      const { status, subtasks, checklists, ...cleanUpdates } = input.updates as any;
      const { error } = await supabase
        .from('mentor_tasks')
        .update(cleanUpdates)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from('mentor_tasks').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] });
      toast.success('Tarefa excluída');
    },
  });

  // ─── Checklists ───
  const addChecklistItem = useMutation({
    mutationFn: async (input: { task_id: string; title: string; project_id: string }) => {
      const { error } = await supabase.from('mentor_task_checklists').insert({
        task_id: input.task_id,
        title: input.title,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] }),
  });

  const toggleChecklistItem = useMutation({
    mutationFn: async (input: { id: string; is_completed: boolean; project_id: string }) => {
      const { error } = await supabase
        .from('mentor_task_checklists')
        .update({ is_completed: input.is_completed })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] }),
  });

  const deleteChecklistItem = useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from('mentor_task_checklists').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] }),
  });

  // ─── Comments ───
  const useComments = (taskId: string | undefined) =>
    useQuery({
      queryKey: ['mentor-task-comments', taskId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mentor_task_comments')
          .select('*')
          .eq('task_id', taskId!)
          .order('created_at');
        if (error) throw error;
        return data as TaskComment[];
      },
      enabled: !!taskId,
    });

  const addComment = useMutation({
    mutationFn: async (input: { task_id: string; content: string }) => {
      const { error } = await supabase.from('mentor_task_comments').insert({
        task_id: input.task_id,
        membership_id: membershipId!,
        content: input.content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-task-comments', vars.task_id] }),
  });

  // ─── Time Entries ───
  const useTimeEntries = (taskId: string | undefined) =>
    useQuery({
      queryKey: ['mentor-time-entries', taskId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mentor_time_entries')
          .select('*')
          .eq('task_id', taskId!)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as TimeEntry[];
      },
      enabled: !!taskId,
    });

  const addTimeEntry = useMutation({
    mutationFn: async (input: { task_id: string; minutes: number; description?: string; project_id: string }) => {
      const { error: insertError } = await supabase.from('mentor_time_entries').insert({
        task_id: input.task_id,
        membership_id: membershipId!,
        minutes: input.minutes,
        description: input.description || null,
      });
      if (insertError) throw insertError;

      // Update actual_minutes on task
      const { data: existing } = await supabase
        .from('mentor_tasks')
        .select('actual_minutes')
        .eq('id', input.task_id)
        .single();
      
      await supabase.from('mentor_tasks').update({
        actual_minutes: (existing?.actual_minutes || 0) + input.minutes,
      }).eq('id', input.task_id);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mentor-time-entries', vars.task_id] });
      qc.invalidateQueries({ queryKey: ['mentor-tasks', vars.project_id] });
    },
  });

  // ─── Automations ───
  const useAutomations = (projectId: string | undefined) =>
    useQuery({
      queryKey: ['mentor-task-automations', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mentor_task_automations')
          .select('*')
          .eq('project_id', projectId!)
          .order('created_at');
        if (error) throw error;
        return data as TaskAutomation[];
      },
      enabled: !!projectId,
    });

  const createAutomation = useMutation({
    mutationFn: async (input: { project_id: string; name: string; trigger_type: string; trigger_config: Record<string, unknown>; action_type: string; action_config: Record<string, unknown>; is_active: boolean }) => {
      const { error } = await supabase.from('mentor_task_automations').insert([{
        project_id: input.project_id,
        name: input.name,
        trigger_type: input.trigger_type,
        trigger_config: input.trigger_config as any,
        action_type: input.action_type,
        action_config: input.action_config as any,
        is_active: input.is_active,
        tenant_id: tenantId!,
        membership_id: membershipId!,
      }]);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mentor-task-automations', vars.project_id] });
      toast.success('Automação criada!');
    },
  });

  const toggleAutomation = useMutation({
    mutationFn: async (input: { id: string; is_active: boolean; project_id: string }) => {
      const { error } = await supabase
        .from('mentor_task_automations')
        .update({ is_active: input.is_active })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-task-automations', vars.project_id] }),
  });

  const deleteAutomation = useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from('mentor_task_automations').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mentor-task-automations', vars.project_id] });
      toast.success('Automação removida');
    },
  });

  // ─── Dependencies ───
  const useDependencies = (projectId: string | undefined) =>
    useQuery({
      queryKey: ['mentor-task-deps', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mentor_task_dependencies')
          .select('*');
        if (error) throw error;
        return data as Array<{ id: string; task_id: string; depends_on_task_id: string; dependency_type: string }>;
      },
      enabled: !!projectId,
    });

  const addDependency = useMutation({
    mutationFn: async (input: { task_id: string; depends_on_task_id: string; project_id: string }) => {
      const { error } = await supabase.from('mentor_task_dependencies').insert({
        task_id: input.task_id,
        depends_on_task_id: input.depends_on_task_id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-task-deps', vars.project_id] }),
  });

  const removeDependency = useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from('mentor_task_dependencies').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mentor-task-deps', vars.project_id] }),
  });

  return {
    projects: projectsQuery.data || [],
    isLoadingProjects: projectsQuery.isLoading,
    createProject,
    deleteProject,
    useStatuses,
    useTasks,
    createTask,
    updateTask,
    deleteTask,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    useComments,
    addComment,
    useTimeEntries,
    addTimeEntry,
    useAutomations,
    createAutomation,
    toggleAutomation,
    deleteAutomation,
    useDependencies,
    addDependency,
    removeDependency,
  };
}
