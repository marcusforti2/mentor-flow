

## Rebranding: LBV TECH → Learning Brand

Troca completa de toda a identidade visual e textual da plataforma de "LBV TECH" para "Learning Brand".

---

### Arquivos e alteracoes

#### 1. `index.html` — Meta tags e titulo
- Substituir todas as ocorrencias de "LBV TECH" por "Learning Brand"
- Atualizar `og:site_name`, `twitter:site`, titulo, descricao, author

#### 2. `src/components/LBVLogo.tsx` — Renomear para `src/components/BrandLogo.tsx`
- Renomear componente de `LBVLogo` para `BrandLogo`
- Trocar texto "LBV" + "TECH" por "Learning" + "Brand"
- Manter a mesma estetica visual (hexagono dourado, cores premium)
- Trocar a letra "L" no hexagono para "LB" ou manter "L" (de Learning)

#### 3. Atualizar todos os imports de `LBVLogo` para `BrandLogo`
Arquivos que importam o componente:
- `src/pages/Auth.tsx` — trocar import + uso + texto "LBV TECH" no CardTitle
- `src/pages/Index.tsx` — trocar import + uso + textos "LBV TECH" no hero, CTA e footer
- `src/pages/Setup.tsx` — trocar import + uso
- `src/components/layouts/MemberLayout.tsx` — trocar import + uso
- `src/components/layouts/MentorLayout.tsx` — trocar import + uso
- `src/components/layouts/MentoradoLayout.tsx` — trocar import + uso
- `src/components/layouts/AdminLayout.tsx` — trocar import + uso (se existir)
- `src/components/layouts/MasterLayout.tsx` — trocar import + uso (se existir)
- `src/pages/master/ApresentacaoPage.tsx` — trocar import + uso
- `src/components/presentation/SlideRenderer.tsx` — trocar import + uso

#### 4. `src/pages/master/MasterDashboard.tsx`
- Trocar "LBV TECH" por "Learning Brand" no texto do dashboard

#### 5. `src/components/email/FlowTestModal.tsx`
- Trocar "LBV TECH" por "Learning Brand" no preview de email

#### 6. `src/pages/admin/PropriedadeIntelectual.tsx`
- Trocar "LBV TECH" por "Learning Brand" no PDF e fallback

#### 7. `src/components/admin/CreateMenteeModal.tsx`
- Trocar fallback "LBV TECH" por "Learning Brand"

#### 8. Edge Functions (emails e backend)
- **`supabase/functions/send-otp/index.ts`** — Trocar "LBV TECH" no remetente, subject e corpo do email
- **`supabase/functions/create-membership/index.ts`** — Trocar "LBV TECH" no remetente, subject, corpo e copyright
- **`supabase/functions/create-invite/index.ts`** — Trocar "LBV TECH" no remetente, subject, corpo e copyright
- **`supabase/functions/send-test-flow/index.ts`** — Trocar `FROM_EMAIL` e copyright
- **`supabase/functions/send-sos-notification/index.ts`** — Trocar "LBV TECH" e "SOS LBV TECH" nos remetentes e rodapes
- **`supabase/functions/system-fingerprint/index.ts`** — Trocar "LBV TECH" por "Learning Brand" no documento conceitual
- **`supabase/functions/generate-email-campaign/index.ts`** — Sem ocorrencias de LBV (nenhuma alteracao)

#### 9. Dominio de email
O dominio de envio `@equipe.aceleracaoforti.online` sera mantido (pois depende da configuracao do Resend/DNS). Apenas o nome do remetente muda de "LBV TECH" para "Learning Brand".

---

### Resumo

| Arquivo | Tipo de alteracao |
|---|---|
| `index.html` | Meta tags |
| `src/components/LBVLogo.tsx` → `BrandLogo.tsx` | Renomear + rebranding |
| 10 arquivos `.tsx` que importam LBVLogo | Atualizar imports |
| `src/pages/Auth.tsx`, `Index.tsx` | Textos de branding |
| `src/pages/master/MasterDashboard.tsx` | Texto |
| `src/components/email/FlowTestModal.tsx` | Preview de email |
| `src/pages/admin/PropriedadeIntelectual.tsx` | PDF |
| `src/components/admin/CreateMenteeModal.tsx` | Fallback |
| 6 edge functions | Remetente e corpo de emails |

Total: ~20 arquivos editados. Nenhuma alteracao de banco de dados necessaria.

