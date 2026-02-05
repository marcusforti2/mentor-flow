
# Plano: Ação "Convidar Mentor via WhatsApp" no Master Admin

## Visão Geral

Adicionar funcionalidade no menu de ações da página de Gestão de Usuários que permite ao Master Admin enviar convites para mentores via WhatsApp com mensagem pré-formatada contendo instruções de login OTP.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/InviteMentorModal.tsx` | **Criar** - Modal de convite WhatsApp |
| `src/pages/master/UsersPage.tsx` | **Modificar** - Adicionar opções no menu dropdown |

---

## 1. Criar Modal de Convite (InviteMentorModal.tsx)

**Componente com:**
- Campos read-only: Nome e Email do mentor
- Campo editável: Telefone WhatsApp (opcional)
- Textarea editável: Mensagem de convite
- Botões: "Copiar mensagem" e "Abrir WhatsApp"

**Template da mensagem:**
```
Olá, {NOME}. Seu acesso ao sistema {TENANT_NOME} já está liberado.

Email de login: {EMAIL}

Como entrar:
1) Acesse: {LOGIN_URL}
2) Digite seu email
3) Você vai receber um código no email
4) Digite o código e pronto

Se não achar o código, veja spam e promoções. Se travar, me avise.
```

**Props do componente:**
```typescript
interface InviteMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: MembershipWithDetails | null;
}
```

---

## 2. Modificar UsersPage.tsx

**Adicionar no menu dropdown (apenas para role = mentor):**
- "Convidar (WhatsApp)" - Abre modal
- "Copiar link de acesso" - Copia URL diretamente

**Validações antes de abrir modal:**
- `role === 'mentor'`
- `status === 'active'`
- `profile` existe
- `tenant` existe

**Estado adicional:**
```typescript
const [inviteModalOpen, setInviteModalOpen] = useState(false);
const [selectedMembership, setSelectedMembership] = useState<MembershipWithDetails | null>(null);
```

---

## 3. Estrutura do Modal

```text
┌─────────────────────────────────────────────┐
│  Convidar Mentor via WhatsApp         [X]   │
├─────────────────────────────────────────────┤
│                                             │
│  Nome do Mentor                             │
│  ┌─────────────────────────────────────┐   │
│  │ João Silva               (disabled) │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Email                                      │
│  ┌─────────────────────────────────────┐   │
│  │ joao@email.com           (disabled) │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Telefone WhatsApp (opcional)               │
│  ┌─────────────────────────────────────┐   │
│  │ 11999999999                         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Mensagem                                   │
│  ┌─────────────────────────────────────┐   │
│  │ Olá, João. Seu acesso ao sistema... │   │
│  │ ...                                 │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │ Copiar mensagem│  │  Abrir WhatsApp  │  │
│  └────────────────┘  └──────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 4. Lógica de Abertura WhatsApp

```typescript
const openWhatsApp = () => {
  const encodedMessage = encodeURIComponent(message);
  const phone = whatsappPhone.replace(/\D/g, ''); // Remove não-dígitos
  
  if (phone) {
    // Com número: wa.me/5511999999999?text=...
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  } else {
    // Sem número: abre WhatsApp Web para colar
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  }
};
```

---

## 5. Fluxo de Uso

```text
Master Admin na /master/users
          │
          ▼
    Filtra por "Mentor"
          │
          ▼
   Clica em "..." de um mentor
          │
          ├──► "Convidar (WhatsApp)"
          │           │
          │           ▼
          │     [Validação]
          │           │
          │    ┌──────┴──────┐
          │    │ OK         │ Erro
          │    ▼             ▼
          │  Modal        Toast erro
          │    │
          │    ├──► Edita telefone/mensagem
          │    │
          │    ├──► "Copiar mensagem" → Clipboard
          │    │
          │    └──► "Abrir WhatsApp" → wa.me
          │
          └──► "Copiar link" → Copia URL login
```

---

## Detalhes Técnicos

### Imports necessários no Modal:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
```

### URL de Login:
```typescript
const LOGIN_URL = 'https://client-flourish-ai.lovable.app/auth';
// Ou usar window.location.origin + '/auth' para flexibilidade
```

### Validação de Segurança:
```typescript
const canInvite = (membership: MembershipWithDetails): boolean => {
  return (
    membership.role === 'mentor' &&
    membership.status === 'active' &&
    !!membership.profile?.email &&
    !!membership.tenant?.name
  );
};
```

---

## Resultado Esperado

1. Master Admin acessa `/master/users`
2. Filtra por papel "Mentor" (opcional)
3. Clica nos "..." de um mentor ativo
4. Vê opções "Convidar (WhatsApp)" e "Copiar link"
5. Clica em "Convidar (WhatsApp)"
6. Modal abre com dados preenchidos
7. Opcionalmente adiciona telefone
8. Clica em "Abrir WhatsApp" ou "Copiar mensagem"
9. Mentor recebe instruções claras de acesso OTP
