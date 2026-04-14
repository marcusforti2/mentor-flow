# Plano de Melhorias de UX — MentorFlow.io

> Documento gerado após auditoria completa de usabilidade (abril 2026).
> Implementar em ordem de fase. Cada item tem arquivo-alvo, descrição do problema e solução exata.

---

## FASE 1 — Crítico (implementar primeiro)

### 1.1 Indicador de etapa no Centro SOS do mentorado

**Arquivo:** `src/pages/member/CentroSOS.tsx`

**Problema:** O fluxo tem 3 etapas (descrever → análise IA → enviar para mentor) mas o usuário não sabe em qual etapa está nem se já enviou.

**Solução:**
- Adicionar barra de progresso no topo: `Etapa 1 de 3 → Etapa 2 de 3 → Etapa 3 de 3`
- Usar componente `Progress` do shadcn/ui
- Adicionar texto descritivo de cada etapa: "Descreva o problema", "Análise em andamento", "Enviar para seu mentor"
- Botão "Enviar para Mentor" deve ser explícito e destacado (não condicional escondido)
- Adicionar confirmação antes de enviar: `AlertDialog` com "Tem certeza que deseja enviar para seu mentor?"

---

### 1.2 Progresso visível na listagem "Todas as Trilhas"

**Arquivo:** `src/pages/member/Trilhas.tsx`

**Problema:** Na seção "Todas as Trilhas", os cards não mostram progresso (%). O usuário não sabe o que continuar.

**Solução:**
- No `TrailCarousel` da seção "Todas as Trilhas", passar `completedLessonIds` para cada `TrailCard`
- Cada `TrailCard` deve exibir:
  - Barra de progresso (`Progress`) na parte inferior do card
  - Texto `"45% concluído"` ou `"✓ Concluído"` se 100%
  - Badge verde com ✓ sobre a thumbnail se a trilha estiver 100% completa
  - Borda/ring verde se concluída, azul se em andamento

---

### 1.3 Confirmações de delete no OnboardingBuilder

**Arquivo:** `src/pages/admin/OnboardingBuilder.tsx`

**Problema:** `deleteForm()`, `removeQuestion()`, `removeOption()`, `deleteSubmission()` são chamados diretamente sem confirmação. Um clique errado apaga dados permanentemente.

**Solução:**
- Envolver todas as ações de exclusão em `<AlertDialog>`:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon"><Trash2 /></Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={removeQuestion}>Excluir</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
- Aplicar o mesmo padrão para: deleteForm, removeOption, deleteSubmission

---

### 1.4 Confirmação ao fechar SOS no admin

**Arquivo:** `src/pages/admin/CentroSOS.tsx`

**Problema:** Botão/select para marcar SOS como "resolved" executa imediatamente sem confirmação. Um clique acidental fecha um SOS sem resposta.

**Solução:**
- Antes de chamar `updateStatus(id, "resolved")`, abrir `AlertDialog`:
  - Título: "Marcar como Resolvido?"
  - Descrição: "Isso fechará o SOS de [nome]. O mentorado será notificado."
  - Botões: "Cancelar" e "Confirmar Resolução"
- Após resolver, limpar `newResponse` e mostrar `toast.success("SOS resolvido com sucesso")`

---

### 1.5 Feedback visual claro ao salvar trilha

**Arquivo:** `src/components/admin/TrailEditorSheet.tsx`

**Problema:** A sheet fecha silenciosamente após salvar. Sem toast, o mentor não sabe se salvou.

**Solução:**
- Em `handleSave()`, adicionar:
```tsx
toast.success("Trilha salva com sucesso!");
```
- Se o título estiver vazio, bloquear o save e mostrar erro inline:
```tsx
if (!formData.title.trim()) {
  setTitleError("Título é obrigatório");
  return;
}
```
- Mostrar `<p className="text-xs text-destructive mt-1">{titleError}</p>` abaixo do campo

---

## FASE 2 — Importante (implementar na sequência)

### 2.1 Drag-and-drop do Kanban com highlight de coluna

**Arquivo:** `src/components/crm/KanbanColumn.tsx`

**Problema:** Ao arrastar um lead, a coluna de destino não dá nenhum feedback visual. O usuário não sabe se o drop vai funcionar.

**Solução:**
- Adicionar estado `isDragOver` na coluna
- No `onDragOver`: `setIsDragOver(true)` + `e.preventDefault()`
- No `onDragLeave` e `onDrop`: `setIsDragOver(false)`
- Aplicar classe condicional no container:
```tsx
className={cn(
  "flex flex-col gap-2 min-h-[200px] rounded-xl p-2 transition-colors duration-150",
  isDragOver && "bg-primary/10 ring-2 ring-primary/40 ring-dashed"
)}
```

---

### 2.2 Formulário de lead em 2 passos

**Arquivo:** `src/components/crm/ManualLeadModal.tsx`

**Problema:** Modal tem 10+ campos em bloco único. Usuários abandonam antes de completar.

**Solução:**
- Dividir em 2 passos com estado `step: 1 | 2`:
  - **Passo 1 "Dados Básicos":** Nome (obrigatório), Empresa, Cargo, Temperatura
  - **Passo 2 "Detalhes Opcionais":** Email, Telefone, Instagram, LinkedIn, Notas
- Adicionar indicador de passos no topo: `○ ● Básico` → `○ ● Detalhes`
- Botão "Criar Lead" disponível já no passo 1 (campos opcionais são opcionais de verdade)
- Botão "Próximo →" leva ao passo 2
- Adicionar tooltip em "Temperatura": "Hot = muito interessado · Warm = talvez · Cold = frio"

---

### 2.3 Badges com requisito de desbloqueio e animação

**Arquivo:** `src/components/gamification/BadgeCard.tsx`

**Problema:** Badges bloqueadas não explicam como desbloquear. Sem animação ao desbloquear.

**Solução:**
- Adicionar prop `requirement?: string` ao BadgeCard
- Exibir no hover/popover: `"Desbloqueio: Feche 10 vendas"` ou `"Progresso: 3/10"`
- Usar `Tooltip` do shadcn/ui para mostrar o requisito:
```tsx
<TooltipContent>
  <p className="font-medium">{badge.name}</p>
  <p className="text-muted-foreground text-xs">{badge.requirement}</p>
  {badge.progress && <Progress value={badge.progress} className="mt-1 h-1" />}
</TooltipContent>
```
- Ao desbloquear (transição de locked → unlocked), disparar animação `animate-bounce` por 1s no ícone
- Adicionar `toast.success("🎉 Badge desbloqueada: " + badge.name)` no momento do desbloqueio

---

### 2.4 Filtros do CRM persistidos na URL

**Arquivo:** `src/pages/admin/CRMMentorados.tsx`

**Problema:** Filtros de status, temperatura e mentorado resetam ao navegar para outra página e voltar.

**Solução:**
- Substituir `useState` dos filtros por `useSearchParams` do React Router:
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const selectedMentorado = searchParams.get("mentorado") || "";
const selectedStatus = searchParams.get("status") || "";
const selectedTemperature = searchParams.get("temp") || "";
```
- Ao mudar filtro: `setSearchParams({ mentorado, status, temp })`
- Ao montar, lê os params da URL — filtros são restaurados automaticamente

---

### 2.5 Breadcrumb nos Playbooks do mentorado

**Arquivo:** `src/pages/member/Playbooks.tsx`

**Problema:** Ao navegar em pastas e abrir playbooks, o usuário não sabe onde está. Só há um botão "← Voltar" genérico.

**Solução:**
- Adicionar breadcrumb acima do conteúdo:
```tsx
<nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
  <button onClick={() => navigateTo("root")} className="hover:text-foreground">
    Playbooks
  </button>
  {selectedFolder && (
    <>
      <ChevronRight className="h-3.5 w-3.5" />
      <button onClick={() => navigateTo("folder")} className="hover:text-foreground">
        {selectedFolder.name}
      </button>
    </>
  )}
  {selectedPlaybook && (
    <>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground font-medium">{selectedPlaybook.title}</span>
    </>
  )}
</nav>
```

---

### 2.6 Indicador de próxima aula no índice de trilha

**Arquivo:** `src/components/trails/TrailDetailSheet.tsx`

**Problema:** O índice de módulos e lições não mostra qual é a próxima aula a assistir.

**Solução:**
- Calcular `nextLesson`: primeira lição com `!completedLessonIds.includes(lesson.id)`
- Adicionar badge na lição correspondente:
```tsx
{isNextLesson && (
  <Badge variant="outline" className="ml-auto text-xs border-primary text-primary">
    Próxima
  </Badge>
)}
```
- Rolar automaticamente para a `nextLesson` ao abrir o sheet:
```tsx
useEffect(() => {
  if (nextLessonRef.current) {
    nextLessonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, []);
```

---

### 2.7 Streak Counter com "Ativo hoje" e countdown

**Arquivo:** `src/components/gamification/StreakCounter.tsx`

**Problema:** Mostra os dias de streak, mas não indica se o usuário já foi ativo hoje ou quanto tempo falta para o streak quebrar.

**Solução:**
- Calcular se `lastActiveDate === today`:
```tsx
const isActiveToday = lastActiveDate === format(new Date(), "yyyy-MM-dd");
```
- Exibir abaixo do contador:
```tsx
{isActiveToday
  ? <p className="text-xs text-emerald-500 font-medium">✓ Ativo hoje</p>
  : <p className="text-xs text-amber-500">Ative-se hoje para manter o streak!</p>
}
```
- Tooltip: "Streak reseta à meia-noite se você não realizar uma ação"

---

## FASE 3 — Polimento

### 3.1 Onboarding mais curto e com estimativa de tempo

**Arquivo:** `src/pages/Onboarding.tsx`

**Problema:** 17+ slides de onboarding. Taxa de abandono estimada >40%.

**Solução:**
- Tornar obrigatórios apenas: Nome, Email, Nome do Negócio
- Mover campos opcionais (telefone, redes sociais, perfil de negócio) para etapa de "Completar Perfil" dentro do app
- Remover perguntas comportamentais do onboarding (mover para IA Tools após login)
- Adicionar no primeiro slide: `"Leva menos de 2 minutos ⏱️"`
- Adicionar botão "Pular por agora →" nos slides não-obrigatórios
- Mostrar: `Etapa 2 de 4` em vez de `10/20`

---

### 3.2 Mensagens de erro de OTP específicas

**Arquivo:** `src/pages/Onboarding.tsx` (seção de verificação OTP)

**Problema:** Erro genérico "Código inválido" não orienta o usuário.

**Solução:**
- Diferenciar os casos:
  - Código expirado → "Código expirado. Clique em **Reenviar** para receber um novo."
  - Código errado → "Código incorreto. Verifique e tente novamente."
  - Muitas tentativas → "Muitas tentativas. Aguarde 5 minutos."
- Botão "Reenviar código" deve ficar destacado (variant="default") quando o código expira
- Adicionar contador regressivo: `"Reenviar em 45s"` durante o cooldown

---

### 3.3 Tour de boas-vindas reativável

**Arquivo:** `src/components/onboarding/MenteeWelcomeTour.tsx`

**Problema:** Tour acontece uma vez (localStorage). Se o usuário fechar acidentalmente, não consegue rever.

**Solução:**
- Adicionar botão "?" ou `<HelpCircle />` fixo no canto do header do mentorado
- Ao clicar, reabre o tour do início
- Reduzir delay de abertura de `2000ms` para `500ms`
- Salvar status do tour no banco (`mentee_profiles.tour_completed`) além do localStorage

---

### 3.4 Explicação do botão "Novo Lead com IA"

**Arquivo:** `src/pages/member/MeuCRM.tsx`

**Problema:** Botão não explica o que a IA faz. Usuários novos ignoram o recurso.

**Solução:**
- Renomear para: `"Analisar Perfil com IA"`
- Adicionar `Tooltip` com: `"Envie um screenshot do perfil LinkedIn ou Instagram para análise automática"`
- Adicionar subtexto pequeno abaixo do botão: `"📸 Envie um screenshot"`

---

### 3.5 Empty state no Centro SOS do admin quando não há pedidos

**Arquivo:** `src/pages/admin/CentroSOS.tsx`

**Problema:** Lista vazia aparece sem mensagem, o admin não sabe se é erro ou normalidade.

**Solução:**
```tsx
{sosRequests.length === 0 && (
  <Card className="border-dashed">
    <CardContent className="py-16 text-center">
      <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-4" />
      <h3 className="font-semibold text-foreground mb-1">Nenhum SOS pendente</h3>
      <p className="text-sm text-muted-foreground">
        Todos os mentorados estão bem! Novos pedidos aparecerão aqui.
      </p>
    </CardContent>
  </Card>
)}
```

---

### 3.6 Validação de export CSV vazio

**Arquivo:** `src/pages/admin/Relatorios.tsx`

**Problema:** Export CSV funciona mesmo sem dados, gerando arquivo com só headers.

**Solução:**
```tsx
const handleExportCSV = () => {
  if (menteeScores.length === 0) {
    toast.error("Nenhum dado para exportar. Ajuste os filtros.");
    return;
  }
  exportCSV(menteeScores, stats);
};
```

---

### 3.7 Feedback de upload de capa de trilha

**Arquivo:** `src/components/admin/TrailEditorSheet.tsx`

**Problema:** Se o upload falhar, `isUploading` fica `true` para sempre (estado travado).

**Solução:**
- Garantir `setIsUploading(false)` dentro de `finally {}`:
```tsx
} finally {
  setIsUploading(false);
}
```
- Adicionar validação de tipo de arquivo antes do upload:
```tsx
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
if (!ALLOWED_TYPES.includes(file.type)) {
  toast.error("Use JPG, PNG ou WebP");
  return;
}
```

---

## Resumo por arquivo

| Arquivo | Fases | Itens |
|---|---|---|
| `src/pages/member/CentroSOS.tsx` | 1 | Indicador de etapa, confirmação |
| `src/pages/member/Trilhas.tsx` | 1 | Progresso em todas as trilhas |
| `src/pages/admin/OnboardingBuilder.tsx` | 1 | Confirmação de delete |
| `src/pages/admin/CentroSOS.tsx` | 1, 3 | Confirmação de resolver, empty state |
| `src/components/admin/TrailEditorSheet.tsx` | 1, 3 | Toast de sucesso, validação título, fix upload |
| `src/components/crm/KanbanColumn.tsx` | 2 | Highlight drag-and-drop |
| `src/components/crm/ManualLeadModal.tsx` | 2 | Formulário 2 passos |
| `src/components/gamification/BadgeCard.tsx` | 2 | Requisito + animação |
| `src/pages/admin/CRMMentorados.tsx` | 2 | Filtros na URL |
| `src/pages/member/Playbooks.tsx` | 2 | Breadcrumb |
| `src/components/trails/TrailDetailSheet.tsx` | 2 | Indicador próxima aula |
| `src/components/gamification/StreakCounter.tsx` | 2 | "Ativo hoje" + countdown |
| `src/pages/Onboarding.tsx` | 3 | Reduzir passos, OTP errors |
| `src/components/onboarding/MenteeWelcomeTour.tsx` | 3 | Tour reativável |
| `src/pages/member/MeuCRM.tsx` | 3 | Explicação do botão IA |
| `src/pages/admin/Relatorios.tsx` | 3 | Validação export vazio |
