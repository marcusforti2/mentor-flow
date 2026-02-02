
# Configurar Domínio Verificado no Resend

## Resumo
Configurar o domínio `equipe.aceleracaoforti.online` no Resend para enviar emails de autenticação (OTP) e notificações com seu domínio próprio, dando mais credibilidade e evitando que caiam em spam.

---

## Passo 1: Configurar o Domínio no Resend (Manual)

Você precisa fazer isso no painel do Resend:

1. Acesse **https://resend.com/domains**
2. Clique em **"Add Domain"**
3. Digite: `equipe.aceleracaoforti.online`
4. O Resend vai mostrar **registros DNS** que você precisa adicionar

### Registros DNS Típicos do Resend

Você precisará adicionar no seu provedor de DNS (onde o domínio está hospedado):

| Tipo | Nome/Host | Valor |
|------|-----------|-------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| CNAME | `resend._domainkey` | (valor fornecido pelo Resend) |

O Resend fornecerá os valores exatos quando você adicionar o domínio.

---

## Passo 2: Aguardar Verificação

- Após adicionar os registros DNS, clique em **"Verify"** no Resend
- A propagação pode levar de **alguns minutos até 48 horas**
- O status mudará para **"Verified"** quando estiver pronto

---

## Passo 3: Atualizar as Edge Functions (Eu farei isso)

Depois que o domínio estiver verificado, atualizarei os arquivos:

### `send-otp/index.ts`
```text
De: "MentorHub Pro <noreply@resend.dev>"
Para: "LBV TECH <noreply@equipe.aceleracaoforti.online>"
```

### `send-sos-notification/index.ts`
```text
De: "SOS Mentoria <sos@equipe.marcusforti.online>"
Para: "SOS LBV TECH <sos@equipe.aceleracaoforti.online>"

De: "Mentoria High Ticket <contato@equipe.marcusforti.online>"
Para: "LBV TECH <contato@equipe.aceleracaoforti.online>"
```

### Também atualizarei o branding nos templates HTML:
- Trocar "MentorHub Pro" por "LBV TECH"
- Manter as cores dourado/azul do novo branding

---

## Emails que Serão Enviados

| Tipo | Remetente | Usado Para |
|------|-----------|------------|
| `noreply@equipe.aceleracaoforti.online` | Códigos OTP de login |
| `sos@equipe.aceleracaoforti.online` | Alertas SOS para mentores |
| `contato@equipe.aceleracaoforti.online` | Confirmações para mentorados |

---

## Próximos Passos

1. **Você faz**: Adiciona o domínio no Resend e configura os DNS
2. **Você confirma**: Quando o domínio estiver verificado (status "Verified")
3. **Eu faço**: Atualizo as edge functions com o novo domínio e branding LBV TECH
