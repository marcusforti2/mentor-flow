
# Plano: Dashboard Master com Dados Reais

## Objetivo
Substituir os números hardcoded do Master Dashboard por queries reais ao banco de dados.

## Dados Atuais no Banco
| Métrica | Valor Real |
|---------|------------|
| Tenants | 2 (LBV Tech, LBV Preview Sandbox) |
| Usuários Únicos | 32 |
| Memberships | 34 (31 mentees, 2 mentors, 1 master_admin) |

---

## Implementação

### 1. Criar Hook `useMasterDashboardStats`

Novo hook que busca estatísticas em tempo real:

```typescript
// src/hooks/useMasterDashboardStats.tsx
export function useMasterDashboardStats() {
  // Query 1: Count tenants
  const { data: tenantsCount } = useQuery({
    queryKey: ['master-stats-tenants'],
    queryFn: async () => {
      const { count } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  // Query 2: Count unique active users
  const { data: usersCount } = useQuery({
    queryKey: ['master-stats-users'],
    queryFn: async () => {
      const { count } = await supabase
        .from('memberships')
        .select('user_id', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    }
  });

  // Query 3: Recent activity (últimos memberships criados)
  const { data: recentActivity } = useQuery({
    queryKey: ['master-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('memberships')
        .select(`
          id, role, created_at,
          tenants!inner(name),
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  return { tenantsCount, usersCount, recentActivity, isLoading };
}
```

### 2. Atualizar MasterDashboard.tsx

Substituir valores hardcoded pelo hook:

```typescript
export default function MasterDashboard() {
  const { tenantsCount, usersCount, recentActivity, isLoading } = useMasterDashboardStats();

  const stats = [
    { label: 'Tenants Ativos', value: tenantsCount?.toString() || '...', icon: Building2 },
    { label: 'Usuários Totais', value: usersCount?.toString() || '...', icon: Users },
    { label: 'Memberships', value: membershipsCount?.toString() || '...', icon: Activity },
  ];
  
  // Renderizar atividade recente dinamicamente
}
```

### 3. Criar Tabela `activity_logs` (Opcional - Fase 2)

Para rastrear atividades em tempo real como logins, criações, etc:

```sql
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  tenant_id uuid REFERENCES tenants(id),
  action text NOT NULL, -- 'login', 'create_user', 'update_trail', etc
  resource_type text,   -- 'membership', 'trail', 'post', etc
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS: Apenas master_admin pode ler todos os logs
CREATE POLICY "master_admin_read_logs" ON activity_logs
  FOR SELECT USING (is_master_admin());
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useMasterDashboardStats.tsx` | **Novo** - Hook com queries reais |
| `src/pages/master/MasterDashboard.tsx` | Usar hook e renderizar dados reais |

---

## Resultado Esperado

- **Tenants Ativos**: Contagem real da tabela `tenants`
- **Usuários Totais**: Contagem real de `memberships` ativos
- **Atividade Recente**: Lista dinâmica dos últimos memberships/ações criadas
- Loading states enquanto dados carregam
- Atualização automática via React Query
