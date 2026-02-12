
# Corrigir Erros no Sistema de Tarefas (Campan)

## Problema Identificado

A funcao de extrair tarefas da transcricao esta falhando por dois motivos nos logs:

1. **Erro principal**: A edge function `extract-tasks` chama `ai-tools` com `tool: "custom"`, mas esse tipo nao existe -- retorna `"Unknown tool type: custom"`
2. **Fallback quebrado**: O fallback tenta usar `https://ai-proxy.lovable.dev/chat` que nao resolve DNS -- `"failed to lookup address information"`

Resultado: o mentor clica "Gerar tarefas com IA" e recebe erro.

## Solucao

Reescrever a edge function `extract-tasks` para chamar diretamente o **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) usando a chave `LOVABLE_API_KEY` (ja configurada).

## Alteracao

**Arquivo**: `supabase/functions/extract-tasks/index.ts`

- Remover a chamada intermediaria ao `ai-tools`
- Remover o fallback com URL errada
- Chamar diretamente o gateway com `LOVABLE_API_KEY`
- Usar tool calling para extrair JSON estruturado (mais confiavel que pedir JSON no prompt)
- Tratar erros 429 (rate limit) e 402 (creditos) com mensagens claras
- Modelo: `google/gemini-3-flash-preview`

## Detalhes Tecnicos

A nova implementacao vai:

1. Receber a transcricao do frontend (sem mudanca)
2. Chamar `https://ai.gateway.lovable.dev/v1/chat/completions` com:
   - Header `Authorization: Bearer LOVABLE_API_KEY`
   - Tool calling para forcar retorno estruturado (array de tarefas)
3. Parsear o resultado e retornar as tarefas no formato esperado pelo `TranscriptionTaskExtractor`
4. Nenhuma mudanca no frontend -- o contrato de resposta permanece identico
