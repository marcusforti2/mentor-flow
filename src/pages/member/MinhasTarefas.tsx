import { useTenant } from '@/contexts/TenantContext';
import { CampanKanban } from '@/components/campan/CampanKanban';
import { Loader2 } from 'lucide-react';

const MinhasTarefas = () => {
  const { activeMembership } = useTenant();

  if (!activeMembership) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Minhas Tarefas</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas tarefas atribuídas pelo mentor</p>
      </div>

      <CampanKanban mentoradoMembershipId={activeMembership.id} />
    </div>
  );
};

export default MinhasTarefas;
