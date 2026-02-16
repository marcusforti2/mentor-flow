

# Reorganizacao do Dock e Unificacao do Agendamento

## Problema Atual

**Dock do Mentor** tem 12 itens e do **Mentorado** tem 11 itens — muitos para navegar de forma eficiente. Alem disso, "Calendario" e "Agendamento" sao paginas separadas que fazem coisas relacionadas.

## Solucao

### 1. Unificar Agendamento dentro do Calendario

Eliminar a rota `/mentor/agendamento` e `/mentorado/agendamento` como paginas separadas. O conteudo sera absorvido dentro da pagina de Calendario existente:

- **Mentor**: A pagina `Calendario` ganha uma terceira aba "Agendamento" com o `AvailabilityEditor` + `BookingCalendar` (ja tem "Sessoes" e "Disponibilidade")
- **Mentorado**: A pagina `Calendario` ganha uma aba "Agendar Sessao" com o `BookingCalendar`

Remover rotas e imports de `Agendamento` e `AgendamentoMembro` do `App.tsx`.

### 2. Agrupar itens no Dock com sub-menus expansiveis

Reduzir o dock para **6-7 itens principais** usando grupos que expandem ao clicar:

**Dock do Mentor (7 itens):**
```text
Dashboard
Mentorados (expande: Mentorados, Jornada CS, CRM)
Conteudo (expande: Trilhas, Playbooks)
Calendario (agora inclui agendamento)
Comunicacao (expande: Emails, Centro SOS)
Relatorios
Meu Perfil
```

**Dock do Mentorado (6 itens):**
```text
Dashboard
Aprender (expande: Trilhas, Playbooks)
Vendas (expande: Meu CRM, Arsenal de Vendas)
Calendario (agora inclui agendamento)
Meus Arquivos (ja inclui reunioes)
Meu Perfil
```

Centro SOS e Tarefas ficam dentro dos sub-grupos relevantes.

### 3. Mostrar nome e email nas sessoes agendadas

Atualizar o `BookingCalendar` para resolver e exibir:
- **Para o mentor**: nome e email do mentorado que agendou
- **Para o mentorado**: nome do mentor com quem agendou

Buscar dados de `profiles` via join com `memberships` (ja parcialmente implementado, mas falta email e falta resolucao do lado do mentorado).

---

## Detalhes Tecnicos

### Arquivos modificados:

1. **`src/components/FloatingDock.tsx`** — Adicionar suporte a `children` (sub-itens) nos `DockItem`. Ao clicar em um item com filhos, expandir um mini-painel com os sub-links (similar ao overflow ja existente, mas por grupo).

2. **`src/components/layouts/MentorLayout.tsx`** — Reestruturar `menuItems` para usar grupos:
   ```
   { icon, label, path?, children?: DockItem[] }
   ```

3. **`src/components/layouts/MentoradoLayout.tsx`** — Mesma reestruturacao com grupos do mentorado.

4. **`src/pages/admin/Calendario.tsx`** — Adicionar aba "Agendamento" com `AvailabilityEditor` + `BookingCalendar`.

5. **`src/pages/member/Calendario.tsx`** — Adicionar aba "Agendar Sessao" com `BookingCalendar`.

6. **`src/pages/admin/Agendamento.tsx`** — Sera removido.

7. **`src/pages/member/Agendamento.tsx`** — Sera removido.

8. **`src/App.tsx`** — Remover rotas `/mentor/agendamento` e `/mentorado/agendamento`. Remover imports correspondentes.

9. **`src/components/scheduling/BookingCalendar.tsx`** — Resolver email do mentorado/mentor e exibir na lista de sessoes e no calendario semanal. Adicionar busca de `email` junto com `full_name` na query de profiles.

### Comportamento do Dock expansivel:

- Ao clicar num item com sub-itens, abre um mini-painel ao lado (desktop) ou acima (mobile) mostrando os links do grupo
- O item pai fica "ativo" se qualquer filho estiver na rota atual
- Clicar fora ou em outro item fecha o painel expandido
- No mobile, o sub-menu abre como overlay similar ao "Mais" atual

