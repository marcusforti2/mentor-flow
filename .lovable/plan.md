

## Diagnóstico

Encontrei um **bug crítico** no `jarvis-chat/index.ts` que impede o `full_system_audit` de funcionar corretamente.

**O problema:** Nas linhas 1247-1252, o case `full_system_audit` termina com `result = JSON.stringify(audit)` na linha 1247, mas logo em seguida (linhas 1249-1251) existe código **órfão do case `award_badge`** que foi mesclado incorretamente. Esse código:
1. Sobrescreve o `result` da auditoria com `"Badge concedido."`
2. Tenta inserir um badge com `args.mentee_membership_id` e `args.badge_id` (que não existem no contexto do audit), causando erro
3. O case `award_badge` **não existe como case separado** no switch — foi engolido pelo `full_system_audit`

Isso significa que toda vez que o Jarvis tenta fazer a auditoria, o resultado é destruído e substituído por um erro ou "Badge concedido".

## Plano

### 1. Corrigir o case `full_system_audit` — separar o código órfão

Nas linhas 1247-1252 do `supabase/functions/jarvis-chat/index.ts`:

**Antes:**
```typescript
result = JSON.stringify(audit);
executedActions.push("full_system_audit");
await supabase.from("membership_badges").insert({ ... });
result = "Badge concedido.";
executedActions.push(`award_badge:${args.badge_id}`);
break;
}
```

**Depois:**
```typescript
result = JSON.stringify(audit);
executedActions.push("full_system_audit");
break;
}
case "award_badge": {
  await supabase.from("membership_badges").insert({ membership_id: args.mentee_membership_id, badge_id: args.badge_id });
  result = "Badge concedido.";
  executedActions.push(`award_badge:${args.badge_id}`);
  break;
}
```

Essa é a **única** mudança necessária — adicionar `break;` + `}` ao audit e criar o case `award_badge` separado. Sem alterações no frontend.

