
# Regra Oficial: Modelo de Mentorados

## Status: ✅ IMPLEMENTADO

---

## Modelo de Visibilidade

| Quem | Vê o quê |
|------|----------|
| Todos os mentores do tenant | TODOS os mentorados do tenant |
| Master Admin | TODOS os mentorados de todos os tenants |
| Mentorado | Apenas seus próprios dados |

**Não existe mentorado privado por mentor** - a diferença é AUTORIA, não visibilidade.

---

## Campos Obrigatórios por Mentorado

Tabela: `mentor_mentee_assignments`

| Campo | Descrição |
|-------|-----------|
| `mentor_membership_id` | Mentor responsável (quem é o "dono") |
| `mentee_membership_id` | O mentorado |
| `tenant_id` | Tenant do vínculo |
| `assigned_at` | Data REAL de entrada (pode ser diferente de created_at) |
| `created_by_membership_id` | Quem executou a ação (mentor ou master admin) |
| `created_at` | Quando o registro foi criado no sistema |

---

## Fluxo de Criação

### A) Mentor cria mentorado:
```
mentor_membership_id = membership_id do mentor logado (automático)
created_by_membership_id = mentor logado
tenant_id = tenant atual
```

### B) Master Admin cria mentorado:
```
mentor_membership_id = OBRIGATÓRIO selecionar
created_by_membership_id = master_admin
tenant_id = tenant selecionado
```

### C) Importação via Planilha:
```
mentor_membership_id = resolver pelo email/id do mentor na planilha
created_by_membership_id = quem executou a importação
assigned_at = data_entrada da planilha (NÃO usar now())
```

---

## Proibições

❌ Criar mentorado sem `mentor_membership_id`  
❌ Criar mentorado "solto" no tenant  
❌ Importar sem especificar mentor responsável  
❌ Usar data atual como entrada em importações  

---

## Critério de Aceitação

1. 5 mentores no tenant
2. Mentor A cadastra um mentorado
3. Mentores B, C, D, E veem o mentorado normalmente
4. Master Admin vê: "Mentorado X | Mentor responsável: A | Criado por: A"

---

## Edge Function: create-membership

Parâmetros aceitos:
```typescript
{
  tenant_id: string;        // obrigatório
  email: string;            // obrigatório
  role: 'mentor' | 'mentee'; // obrigatório
  full_name?: string;
  phone?: string;
  mentor_membership_id?: string; // obrigatório se role='mentee' e caller é admin/master
  joined_at?: string;       // data real de entrada (ISO 8601), default: now()
}
```

Comportamento:
- Se caller é **mentor** → `mentor_membership_id` é preenchido automaticamente
- Se caller é **admin/master_admin** → deve passar `mentor_membership_id` explicitamente
- Cria registro em `mentor_mentee_assignments` com autoria completa
