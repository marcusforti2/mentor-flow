

# Plano: Central de Automacoes Visual (estilo n8n)

## Resumo

Transformar a Central de Automacoes em um hub visual interativo onde o mentor pode ver e editar as automacoes como um fluxo conectado -- similar ao n8n. O projeto ja usa `@xyflow/react` no modulo de Email Marketing, entao vamos reutilizar a mesma biblioteca.

---

## O que muda

Hoje a pagina de Automacoes e uma grade de cards independentes. O plano e adicionar uma **segunda aba "Mapa Visual"** que mostra todas as automacoes como nos conectados em um canvas interativo, organizados por categoria e com conexoes visuais mostrando o fluxo de dados (ex: "Boas-vindas" --> "Digest Semanal" --> "Re-engajamento").

A aba de cards continua existindo para quem prefere a visao lista.

---

## Interface Visual

```text
+------------------------------------------------------+
|  Automacoes          [Cards]  [Mapa Visual]          |
+------------------------------------------------------+
|                                                      |
|  [Gatilho: Novo Mentorado]                           |
|        |                                             |
|        v                                             |
|  [Boas-vindas Automatico] ----> [Digest Semanal]     |
|        |                              |              |
|        v                              v              |
|  [Verificacao de Badges]    [Re-engajamento]         |
|        |                              |              |
|        v                              v              |
|  [Celebracao Conquistas]   [Alertas Inteligentes]    |
|                                                      |
+------------------------------------------------------+
```

Cada no (node) do fluxo:
- Mostra icone, nome, status (ativo/inativo), ultima execucao
- Clique abre um painel lateral (Sheet) com toggle, configuracoes e "Executar Agora"
- Cor do no muda conforme categoria (Engajamento = azul, Inteligencia = roxo, etc.)
- Nos inativos ficam com opacidade reduzida
- Edges animados entre nos conectados

---

## Detalhes Tecnicos

### Arquivos novos

1. **`src/components/admin/AutomationFlowView.tsx`**
   - Componente principal com ReactFlow canvas
   - Gera nos automaticamente a partir das automacoes do banco
   - Layout automatico organizado por categoria (colunas) ou por fluxo logico
   - MiniMap + Controls + Background grid
   - Clique em no abre Sheet de edicao

2. **`src/components/admin/AutomationFlowNode.tsx`**
   - Node customizado para ReactFlow
   - Exibe: icone da categoria, nome, badge ativo/inativo, indicador de status (sucesso/erro)
   - Handles de conexao (source/target) para edges visuais

3. **`src/components/admin/AutomationDetailSheet.tsx`**
   - Painel lateral (Sheet) que abre ao clicar em um no
   - Contém: toggle liga/desliga, configuracoes (dias de inatividade, frequencia, etc.), botao "Executar Agora", historico de ultima execucao
   - Reutiliza a logica que ja existe no AutomationCard

### Arquivos modificados

4. **`src/pages/admin/Automacoes.tsx`**
   - Adiciona sistema de abas (Tabs): "Cards" e "Mapa Visual"
   - Na aba "Cards", mantem o grid atual
   - Na aba "Mapa Visual", renderiza o novo AutomationFlowView

### Logica de conexoes (edges)

As conexoes entre automacoes serao definidas com base no fluxo logico real do sistema:

| De | Para | Logica |
|----|------|--------|
| Gatilho: Novo Mentorado | Boas-vindas Automatico | Entrada no programa dispara boas-vindas |
| Boas-vindas Automatico | Digest Semanal | Apos boas-vindas, entra no ciclo semanal |
| Digest Semanal | Re-engajamento | Se nao abriu digest, verifica inatividade |
| Re-engajamento | Alertas Inteligentes | Inatividade persistente gera alerta ao mentor |
| Verificacao de Badges | Celebracao Conquistas | Badge concedida dispara celebracao |
| Gatilho: Reuniao Agendada | Lembrete de Reuniao | Reuniao proxima dispara lembrete |
| Gatilho: Fim do Mes | Relatorio Mensal | Ciclo mensal gera relatorio |
| Gatilho: Lead Criado | Auto-qualificacao | Novo lead dispara qualificacao |

Essas conexoes sao visuais e pre-definidas no frontend (nao precisam de tabela extra no banco). Elas ajudam o mentor a entender "o que aciona o que".

### Posicionamento dos nos

Layout automatico em colunas por categoria:
- Coluna 1: Gatilhos (nos virtuais que representam eventos)
- Coluna 2: Automacoes de Comunicacao
- Coluna 3: Automacoes de Engajamento
- Coluna 4: Automacoes de Inteligencia
- Coluna 5: Automacoes de Crescimento

O mentor pode arrastar nos para reorganizar como preferir.

---

## Interacoes do usuario

1. **Ver o mapa** -- Visualizar todas as automacoes e suas conexoes
2. **Clicar em um no** -- Abre Sheet lateral com detalhes e configuracoes
3. **Toggle direto** -- Liga/desliga automacao pelo Sheet
4. **Executar agora** -- Botao no Sheet para testar manualmente
5. **Arrastar nos** -- Reorganizar o layout visual livremente
6. **Zoom/Pan** -- Navegar pelo canvas com scroll e drag

---

## Ordem de implementacao

1. Criar `AutomationFlowNode.tsx` (node customizado)
2. Criar `AutomationDetailSheet.tsx` (painel lateral)
3. Criar `AutomationFlowView.tsx` (canvas principal)
4. Modificar `Automacoes.tsx` para adicionar abas Cards/Mapa

Nenhuma alteracao no banco de dados e necessaria -- tudo e frontend usando os dados ja existentes da tabela `tenant_automations`.

