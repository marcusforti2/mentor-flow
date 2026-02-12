
# Adicionar textos explicativos no formulario de Registrar Reuniao

O formulario atual tem apenas labels curtos sem nenhuma orientacao. O mentor precisa entender o que preencher em cada campo, especialmente os opcionais como link de video e transcricao.

---

## Mudancas no MeetingRegistrar.tsx

Adicionar textos de ajuda (helper text) abaixo de cada campo com cor `text-muted-foreground` e tamanho `text-[11px]`:

### Campos e suas explicacoes:

| Campo | Explicacao a adicionar |
|-------|----------------------|
| **Titulo** | "Nome para identificar a reuniao. Ex: Sessao 3 - Funil de vendas" |
| **Data/hora** | "Quando a reuniao aconteceu. Deixe em branco se nao lembrar." |
| **Link do video** | "Cole o link da gravacao (YouTube, Google Drive, tl;dv). O sistema detecta a plataforma automaticamente. Deixe em branco se nao gravou." |
| **Transcricao** | "Cole o texto da transcricao ou envie um arquivo PDF/Word. A IA vai ler o conteudo para extrair tarefas e insights na aba Tarefas." |

### Detalhes tecnicos

- Arquivo alterado: `src/components/campan/MeetingRegistrar.tsx`
- Adicionar tags `<p>` com classes `text-[11px] text-muted-foreground` logo abaixo de cada `<Input>` ou `<Textarea>`
- Nenhum outro arquivo precisa ser alterado
- Nenhuma migracao necessaria
