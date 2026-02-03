
# Plano: Liberar Gamificação para Todos os Usuários + Melhorias

## Resumo
O sistema de gamificação atual exige um registro na tabela `mentorados` para funcionar. Vamos atualizar o código para usar o `user.id` como fallback, liberando a Loja de Prêmios, badges, streaks e pontos para **todos os usuários logados**.

---

## 1. Atualizar Hook de Gamificação

**Arquivo:** `src/hooks/useGamification.tsx`

**Mudanças:**
- Usar `user.id` como fallback quando não houver registro de mentorado
- Carregar badges e rewards mesmo sem mentorado_id
- Manter funcionalidade de streak e rastreamento de uso

```text
┌─────────────────────────────────────────┐
│  Fluxo Atual (restrito)                 │
├─────────────────────────────────────────┤
│  User logado                            │
│       ↓                                 │
│  Busca mentorado_id                     │
│       ↓                                 │
│  Não encontrou? → Dados vazios ❌       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Novo Fluxo (liberado)                  │
├─────────────────────────────────────────┤
│  User logado                            │
│       ↓                                 │
│  Busca mentorado_id                     │
│       ↓                                 │
│  Não encontrou? → Usa user.id ✓        │
│       ↓                                 │
│  Carrega badges, rewards, stats ✓      │
└─────────────────────────────────────────┘
```

---

## 2. Atualizar Dashboard do Membro

**Arquivo:** `src/pages/member/MemberDashboard.tsx`

**Mudanças:**
- Garantir que DailyGoalCounter funcione com user.id
- Mostrar componentes de gamificação para todos

---

## 3. Sugestões para Potencializar a Gamificação

### 3.1 Página de Ranking Completa
- Leaderboard semanal/mensal com top 10
- Avatar e pontos de cada participante
- Posição do usuário destacada

### 3.2 Sistema de Níveis
- Níveis de 1 a 20 baseados em XP total
- Barra de progresso para próximo nível
- Títulos especiais (Bronze, Prata, Ouro, Diamante)

### 3.3 Desafios Diários/Semanais
- "Faça 5 prospecções hoje" → +50 pts bonus
- "Complete 3 lições esta semana" → badge especial
- Timer de contagem regressiva

### 3.4 Notificações de Conquistas
- Toast animado quando desbloquear badge
- Confetes (já tem canvas-confetti instalado)
- Som de celebração opcional

### 3.5 Multiplicadores de Pontos
- 2x pontos durante "happy hour" (horários específicos)
- Streak bonus: +10% por cada dia consecutivo
- Primeira ação do dia vale 1.5x

### 3.6 Compartilhamento Social
- Botão para compartilhar conquista no WhatsApp/LinkedIn
- Card visual bonito com a conquista

---

## Técnico - Mudanças no Código

### useGamification.tsx (principais alterações)
```typescript
// Adicionar fallback para user.id
useEffect(() => {
  const getMentoradoId = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("mentorados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Usar mentorado_id se existir, senão user.id
    setMentoradoId(data?.id || user.id);
  };

  getMentoradoId();
}, [user]);

// Carregar dados mesmo com fallback
useEffect(() => {
  const fetchData = async () => {
    if (!mentoradoId) {
      // Ainda carregar badges e rewards para exibição
      const { data: allBadges } = await supabase
        .from("badges")
        .select("*")
        .order("points_required", { ascending: true });
      
      if (allBadges) setBadges(allBadges);
      
      const { data: rewardsData } = await supabase
        .from("reward_catalog")
        .select("*")
        .eq("is_active", true);
      
      if (rewardsData) setRewards(rewardsData);
      
      setIsLoading(false);
      return;
    }
    // ... resto do código
  };
  fetchData();
}, [mentoradoId]);
```

---

## Ordem de Implementação

1. **Atualizar `useGamification.tsx`** - fallback para user.id
2. **Testar Loja de Prêmios** - verificar se exibe badges e rewards
3. **Atualizar Dashboard** - garantir que componentes funcionem
4. **(Opcional)** Implementar melhorias de gamificação sugeridas

---

## Resultado Esperado

- Qualquer usuário logado verá a Loja de Prêmios com todos os itens
- Badges e conquistas serão exibidos para todos
- Sistema de pontos e streaks funcionará universalmente
- Base preparada para futuras melhorias de gamificação
