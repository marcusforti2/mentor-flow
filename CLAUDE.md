# CLAUDE.md — MentorFlow.io

This document describes the architecture, conventions, and workflows for the MentorFlow.io codebase. It is intended for AI assistants and developers onboarding to the project.

---

## Project Overview

MentorFlow.io is a **multi-tenant SaaS platform** for high-ticket mentors managing 200+ mentees. It provides CRM, learning trails, automation, scheduling, gamification, AI tools, and real-time notifications—all under a white-label, per-tenant branding system.

The project is developed with [Lovable](https://lovable.dev) (a no-code/AI-code collaborative platform), which means the IDE and the Lovable visual editor stay in sync. Avoid renaming or restructuring files in ways that break Lovable's component tagging.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18.3, TypeScript 5.8, Vite 5.4 |
| Styling | Tailwind CSS 3.4, shadcn/ui, Radix UI primitives |
| Animations | Framer Motion 11, tailwindcss-animate |
| Routing | React Router DOM 6 |
| Server State | TanStack React Query 5 |
| Forms | React Hook Form 7 + Zod validation |
| Rich Text | Tiptap 3 (with table, image, link, YouTube, task-list extensions) |
| Flow Builder | @xyflow/react 12 |
| Charts | Recharts 2 |
| PDF Export | jsPDF 4 + html2canvas |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Voice/TTS | ElevenLabs React SDK |
| Build | Vite + SWC plugin, PostCSS + Autoprefixer |
| Testing | Vitest 3, Testing Library React, jsdom |
| Linting | ESLint 9, typescript-eslint, eslint-plugin-react-hooks |

---

## Repository Structure

```
mentor-flow/
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root app: providers, router, lazy imports
│   ├── index.css                   # Global CSS, Tailwind base, design tokens
│   ├── App.css                     # App-level styles
│   │
│   ├── pages/
│   │   ├── Index.tsx               # Public landing page (static import)
│   │   ├── Auth.tsx                # Authentication page
│   │   ├── Onboarding.tsx          # New user onboarding
│   │   ├── admin/                  # Mentor/admin area (~21 pages)
│   │   ├── member/                 # Mentee area (~12 pages)
│   │   └── master/                 # Platform super-admin area (~4 pages)
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (Button, Dialog, etc.)
│   │   ├── layouts/                # MasterLayout, MentorLayout, MentoradoLayout
│   │   ├── admin/                  # Admin-specific components
│   │   ├── trails/                 # Learning trail components
│   │   ├── crm/                    # CRM pipeline components
│   │   ├── playbooks/              # Playbook editor and viewer
│   │   ├── email/                  # Email campaign components
│   │   ├── whatsapp/               # WhatsApp automation components
│   │   ├── scheduling/             # Calendar and scheduling
│   │   ├── gamification/           # Badges, points, leaderboards
│   │   ├── certificates/           # Certificate generation
│   │   ├── jarvis/                 # AI assistant (Jarvis) components
│   │   ├── ai-tools/               # AI-powered content tools
│   │   ├── community/              # Community posts and chat
│   │   ├── notifications/          # Smart alerts and notification bell
│   │   ├── onboarding/             # Onboarding flow components
│   │   ├── showcase/               # Public showcase page components
│   │   ├── activity/               # Activity log components
│   │   ├── campan/                 # Campaign components
│   │   ├── faq/                    # FAQ components
│   │   ├── popups/                 # Popup/modal components
│   │   ├── projects/               # Mentor project components
│   │   ├── master/                 # Master admin components
│   │   ├── dev/                    # Developer tools UI
│   │   ├── ProtectedRoute.tsx      # RBAC route guard
│   │   ├── LazyErrorBoundary.tsx   # Error boundary for lazy routes
│   │   └── PageSpinner.tsx         # Full-page loading spinner
│   │
│   ├── hooks/                      # ~40+ custom React hooks
│   │   ├── useAuth.tsx             # Authentication state & methods
│   │   ├── useActivityLog.tsx      # Activity log writing
│   │   ├── useAutomations.tsx      # Email/WhatsApp automation
│   │   ├── useCertificates.tsx     # Certificate CRUD
│   │   ├── useCommunityPosts.tsx   # Community feed with realtime
│   │   ├── useCrmAutomations.tsx   # CRM pipeline automation
│   │   ├── useDashboardStats.tsx   # Dashboard KPI queries
│   │   ├── useGamification.tsx     # Points/badges
│   │   ├── useJarvis.tsx           # AI assistant chat
│   │   ├── useJourneys.tsx         # Journey/stage management
│   │   ├── useMemberships.tsx      # User-tenant memberships
│   │   ├── useNotifications.tsx    # Smart alert subscriptions
│   │   ├── usePermissions.tsx      # Role-based permission helpers
│   │   ├── usePlaybooks.tsx        # Playbook CRUD
│   │   ├── useRouteChunkPrefetch.ts # Route chunk prefetching
│   │   └── use-toast.ts            # Toast notification helper
│   │
│   ├── contexts/
│   │   └── TenantContext.tsx       # Multi-tenant state, membership, impersonation
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client singleton
│   │       └── types.ts            # Auto-generated DB types (do not edit)
│   │
│   ├── lib/
│   │   └── utils.ts                # cn() utility and misc helpers
│   │
│   ├── types/                      # Shared TypeScript interfaces
│   │
│   └── test/
│       ├── setup.ts                # Vitest setup (jest-dom + matchMedia mock)
│       └── mocks/                  # Supabase and other mocks
│
├── supabase/
│   ├── config.toml                 # Supabase project config
│   ├── migrations/                 # Timestamped SQL migration files
│   └── functions/                  # 88+ Deno-based Edge Functions
│
├── public/                         # Static assets served as-is
├── .lovable/                       # Lovable DevTools metadata (plan.md, etc.)
├── vite.config.ts                  # Vite + SWC + path aliases
├── tailwind.config.ts              # Tailwind theme tokens
├── tsconfig.json                   # TypeScript base config
├── tsconfig.app.json               # App TypeScript config
├── vitest.config.ts                # Vitest config
├── eslint.config.js                # ESLint flat config
├── components.json                 # shadcn/ui CLI config
└── package.json                    # Scripts and dependencies
```

---

## Development Commands

```bash
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build
npm run build:dev    # Development build (for debugging artifacts)
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

---

## Architecture & Key Patterns

### Routing

- Three protected route segments:
  - `/master/*` — Platform super-admin (multi-tenant management)
  - `/mentor/*` — Mentor/admin dashboard
  - `/mentorado/*` — Mentee dashboard
- Public routes: `/`, `/auth`, `/onboarding`, `/t/:slug`, `/p/:slug`, `/f/:slug`
- All pages except `Index` and layouts are **lazy-loaded** via `lazyRetry()` (see `App.tsx`)
- `lazyRetry()` wraps `React.lazy()` with 3 automatic retries (1s interval) on chunk load failure
- Layouts (`MasterLayout`, `MentorLayout`, `MentoradoLayout`) are **statically imported** because they are structural

### Lazy Loading Pattern

```typescript
// Use lazyRetry for all page imports (not layouts):
const SomePage = lazyRetry(() => import("./pages/admin/SomePage"));

// Wrap in Suspense with fallback:
<Suspense fallback={<PageSpinner />}>
  <SomePage />
</Suspense>
```

Heavy components within pages (Tiptap editor, XyFlow automations, jsPDF tools) should also be lazy-loaded when inside a tab or modal that isn't immediately visible.

### State Management

- **Server state**: TanStack React Query (preferred for all Supabase queries)
- **Auth state**: `useAuth()` hook (wraps Supabase Auth, exposes `user`, `session`, `signOut`)
- **Tenant/membership state**: `useTenant()` from `TenantContext`
- **Local UI state**: `useState` / `useReducer` as appropriate
- **Forms**: React Hook Form + Zod schema validation

### React Query Configuration (global, in App.tsx)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes GC
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

- Always pass `tenant_id` in query keys so caches are isolated per tenant
- Use `placeholderData` to avoid blank UI during transitions
- Prefer skeleton loaders over full-page spinners inside pages

### Supabase Data Access

```typescript
import { supabase } from "@/integrations/supabase/client";

// Standard pattern:
const { data, error } = await supabase
  .from("table_name")
  .select("col1, col2, related_table(col)")
  .eq("tenant_id", tenantId)
  .order("created_at", { ascending: false });
```

- Always filter by `tenant_id` for tenant-scoped tables
- RLS policies enforce tenant isolation at the database level — still filter in queries for clarity and performance
- Edge Functions are invoked via `supabase.functions.invoke("function-name", { body: {...} })`
- Realtime subscriptions: `.channel().on("postgres_changes", ...).subscribe()` — unsubscribe on cleanup

### Authentication & RBAC

Roles (defined in `TenantContext.tsx`):
```
master_admin > admin > ops > mentor > mentee
```

- `ProtectedRoute` guards pages by minimum required role
- `useTenant().hasRole(["admin", "ops"])` checks role(s) for the active membership
- `isAdmin`, `isOps`, `isMentor`, `isMentee` convenience booleans also available
- Impersonation: admins can impersonate mentees; `isImpersonating` and `realMembership` track the state

### Multi-Tenancy

- Each organization is a **tenant** with a unique `slug` and custom branding (colors, logo, font)
- A user can belong to multiple tenants with different roles
- `activeMembership` in `TenantContext` determines the current tenant context
- Tenant branding is applied via CSS custom properties set at runtime

---

## Design System & Styling

### Tailwind Configuration

- **Dark mode**: `class` strategy (toggled via `next-themes`)
- **Custom colors** defined as CSS HSL variables in `index.css`, consumed as Tailwind tokens:
  - `primary`, `secondary`, `accent`, `muted`, `destructive`, `border`, `ring`
  - `sidebar-*` (sidebar-specific tokens)
  - Custom: `gold`, `emerald`, `blue-accent` for premium aesthetic
- **Design language**: Glassmorphism (transparency + `backdrop-filter: blur`)
- **Animations**: `fade-in`, `slide-in`, `shimmer`, `accordion-up/down` (tailwindcss-animate)

### Component Conventions

- Use `cn()` from `@/lib/utils` for conditional class merging (combines `clsx` + `tailwind-merge`)
- Prefer shadcn/ui primitives from `@/components/ui/` over custom implementations
- Use Radix UI primitives directly when shadcn doesn't cover the use case
- All icons from `lucide-react`
- Toast notifications via `sonner` (`import { toast } from "sonner"`)

---

## TypeScript Conventions

- Path alias: `@/` → `src/` (configured in `tsconfig.json` and `vite.config.ts`)
- **Relaxed strict mode** (`strict: false`, `noImplicitAny: false`) — intentional for rapid development
- Auto-generated Supabase types in `src/integrations/supabase/types.ts` — **never edit manually**
- Prefer explicit `interface` for component props
- Hooks return typed objects, not arrays (except simple state hooks)

---

## Testing

- **Framework**: Vitest 3 with jsdom environment
- **Assertions**: `@testing-library/jest-dom` matchers (imported in `src/test/setup.ts`)
- **Component testing**: `@testing-library/react`
- **Mocks**: Supabase client mocked in `src/test/mocks/`

Test file locations follow the pattern `src/**/*.test.ts` or `src/**/*.spec.tsx`.

Setup file (`src/test/setup.ts`) provides:
- `@testing-library/jest-dom` global matchers
- `window.matchMedia` mock (required for Tailwind breakpoint hooks)

Run tests:
```bash
npm run test          # single pass
npm run test:watch    # watch mode during development
```

---

## Supabase Edge Functions

Located in `supabase/functions/`. Each function is a Deno module. Key functions include:

| Function | Purpose |
|---|---|
| `ai-analysis` | OpenAI-powered mentee analysis |
| `ai-tools` | General AI content generation |
| `analyze-lead-screenshots` | Lead qualification via screenshot analysis |
| `auto-qualify-lead` | Automated lead scoring |
| `celebrate-achievements` | Trigger achievement notifications |
| `check-alerts` | Smart alert evaluation |
| `check-badges` | Badge award logic |
| `cold-lead-followup` | Automated follow-up sequences |
| `contextual-chat` | Jarvis AI assistant chat |
| `create-invite` | Generate and send user invitations |
| `create-membership` | Provision new tenant memberships |
| `elevenlabs-tts` | Text-to-speech via ElevenLabs |
| `execute-email-flow` | Run email campaign automation |
| `generate-bio` / `generate-cover` | AI content generation |
| `generate-email-campaign` | AI-assisted email drafting |
| `generate-lessons` | AI lesson content generation |
| `generate-onboarding-form` | Dynamic onboarding form creation |
| `jarvis-*` | Jarvis assistant pipeline functions |
| `send-whatsapp` | WhatsApp message dispatch |
| `verify-otp` | OTP verification |

---

## Database Migrations

SQL migrations live in `supabase/migrations/` with UUID-based filenames. When making schema changes:

1. Create a new migration file with `supabase migration new <description>`
2. Write idempotent SQL (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.)
3. Always add RLS policies for new tables
4. Add indexes for frequently filtered columns, especially:
   - `(tenant_id, <status/role>, created_at DESC)` compound indexes
   - Foreign key columns used in joins

---

## Performance Guidelines

From the project optimization plan (`.lovable/plan.md`):

### Do
- Use **React Query** for all Supabase data fetching (not `useEffect + useState`)
- Pass `staleTime` per query to control cache duration
- Use `placeholderData` / `keepPreviousData` on navigation-critical queries
- Lazy-load heavy components (Tiptap, XyFlow, jsPDF) inside tabs/modals
- Use skeleton placeholders instead of full-page spinners within page content

### Avoid
- Triggering `useSmartAlerts()` more than once per layout tree (causes duplicate Realtime subscriptions)
- Prefetching all route chunks eagerly — limit to 2-3 most-likely next routes
- Sequential waterfall queries — use `Promise.all` or Supabase RPCs to consolidate
- Heavy CSS effects (`backdrop-filter: blur`, animated gradients) outside the main dashboard

### Current Performance Targets
- Sub-400ms perceived transition between cached pages
- 30–50% reduction in initial page load time vs. baseline

---

## Key Files to Know

| File | Why It Matters |
|---|---|
| `src/App.tsx` | All routes, providers, lazy loading strategy |
| `src/contexts/TenantContext.tsx` | Multi-tenancy, roles, impersonation |
| `src/hooks/useAuth.tsx` | Auth state, session management |
| `src/integrations/supabase/client.ts` | Single Supabase client instance |
| `src/integrations/supabase/types.ts` | Auto-generated DB type definitions |
| `src/index.css` | Global CSS, design tokens, animations |
| `tailwind.config.ts` | Theme tokens and dark mode config |
| `vite.config.ts` | Build config, path aliases, dev server port |
| `vitest.config.ts` | Test runner configuration |
| `.lovable/plan.md` | Performance optimization roadmap |

---

## External Integrations

| Service | Usage |
|---|---|
| **Supabase** | Database, Auth, Realtime, Edge Functions |
| **OpenAI** | AI analysis, content generation (via Edge Functions) |
| **ElevenLabs** | Text-to-speech for lessons/Jarvis |
| **WhatsApp Business API** | Campaign messaging |
| **Google Calendar** | Event sync via OAuth |
| **Google Drive** | Video content embedding |
| **Apify / Firecrawl** | Web scraping for lead enrichment |
| **TallyDots** | Meeting transcription |

---

## Lovable DevTools Integration

This project is managed with Lovable DevTools (`lovable-tagger` package):

- In development mode, `componentTagger()` plugin annotates DOM elements with source metadata
- Do **not** remove the `lovable-tagger` plugin from `vite.config.ts`
- Do **not** restructure component files in ways that break Lovable's source mapping
- The Lovable visual editor and this codebase are kept in sync — changes in one reflect in the other

---

## Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

These are public/anon keys (safe for the browser). Sensitive API keys (OpenAI, ElevenLabs, etc.) are stored as Supabase secrets and accessed only within Edge Functions.

---

## Common Gotchas

1. **Supabase types file** (`src/integrations/supabase/types.ts`) is auto-generated — any manual edits will be overwritten. Use the Supabase CLI to regenerate after schema changes.

2. **Dark mode** is class-based. Wrap theme toggles with `next-themes` `ThemeProvider` (already in `App.tsx`).

3. **Route code splitting**: layouts are statically imported to avoid layout flash. Only page content components should be lazy.

4. **Realtime subscriptions** must be unsubscribed in `useEffect` cleanup to avoid memory leaks and duplicate event handlers.

5. **Tenant isolation**: always include `tenant_id` in Supabase queries even though RLS enforces it — queries without `tenant_id` filters can be slower and harder to debug.

6. **React Query keys** should include `tenant_id` and any other scope identifiers to prevent cross-tenant cache pollution.

7. **HMR overlay** is disabled in `vite.config.ts` (`hmr: { overlay: false }`) — check the browser console for runtime errors instead.
