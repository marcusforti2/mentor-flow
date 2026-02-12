import { useTenant } from '@/contexts/TenantContext';
import { MeetingHistoryList } from '@/components/campan/MeetingHistoryList';

const MinhasReunioes = () => {
  const { activeMembership } = useTenant();

  if (!activeMembership) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Minhas Reuniões</h1>
        <p className="text-muted-foreground text-sm">Histórico de reuniões com seu mentor</p>
      </div>

      <MeetingHistoryList
        mentoradoMembershipId={activeMembership.id}
        tenantId={activeMembership.tenant_id}
      />
    </div>
  );
};

export default MinhasReunioes;
