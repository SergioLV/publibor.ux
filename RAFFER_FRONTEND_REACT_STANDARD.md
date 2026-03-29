# Raffer Frontend React Standard

> Living document — the single source of truth for architecture, conventions, and quality gates in the Raffer web client.

---

## 1. Mission

Ship a fast, maintainable, and testable React SPA that scales with the Raffer product without accumulating tech debt. Every decision below serves that goal.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript 5.9+ (strict) | Catch bugs at compile time |
| Framework | React 19 | Concurrent features, RSC-ready |
| Build | Vite 7 + SWC | Sub-second HMR |
| Routing | TanStack Router | Type-safe, file-based routes |
| Server State | TanStack Query v5 | Cache, dedup, background refetch |
| Client State | Zustand | Minimal boilerplate, devtools |
| Forms | React Hook Form + Zod | Validation collocated with schema |
| Styling | CSS Modules | Scoped by default, zero runtime |
| Charts | Recharts | Already in use, good enough |
| Animation | Framer Motion (sparingly) | Only for meaningful transitions |
| Testing | Vitest + Testing Library + MSW | Fast, realistic, mockable |
| E2E | Playwright | Cross-browser confidence |
| Linting | ESLint flat config + Prettier | Consistent formatting |
| CI | GitHub Actions | Lint → Type-check → Test → Build |

---

## 3. Feature-Sliced Design (FSD)

We follow [Feature-Sliced Design](https://feature-sliced.design/) adapted for our scale.

### 3.1 Layer Hierarchy

```
src/
├── app/                  # App shell: providers, router, global styles
│   ├── providers/        # QueryClient, ThemeProvider, AuthProvider
│   ├── router/           # TanStack Router config + route tree
│   ├── styles/           # index.css, variables.css, reset.css
│   └── App.tsx
│
├── pages/                # Route-level components (thin wrappers)
│   ├── dashboard/
│   ├── orders/
│   ├── clients/
│   ├── invoices/
│   ├── prices/
│   └── login/
│
├── features/             # Business logic slices (the meat)
│   ├── auth/
│   │   ├── api/          # login, getMe queries/mutations
│   │   ├── model/        # auth store (Zustand), types
│   │   ├── ui/           # LoginForm, AuthGuard
│   │   └── index.ts      # Public API barrel
│   │
│   ├── orders/
│   │   ├── api/          # useOrders, useCreateOrder, useUpdateOrder
│   │   ├── model/        # Order types, schemas (Zod)
│   │   ├── ui/           # OrderList, OrderDetail, NewOrderForm
│   │   ├── lib/          # Price calculation, helpers
│   │   └── index.ts
│   │
│   ├── clients/
│   │   ├── api/
│   │   ├── model/
│   │   ├── ui/
│   │   └── index.ts
│   │
│   ├── invoices/
│   │   ├── api/
│   │   ├── model/
│   │   ├── ui/
│   │   └── index.ts
│   │
│   └── prices/
│       ├── api/
│       ├── model/
│       ├── ui/
│       └── index.ts
│
├── shared/               # Cross-cutting, feature-agnostic
│   ├── api/              # apiFetch, interceptors, base URL
│   ├── ui/               # Button, Input, Modal, SlideOver, Table, Skeleton
│   ├── lib/              # formatCLP, formatDate, cn(), constants
│   ├── hooks/            # useEscapeKey, useMediaQuery, useDebounce
│   └── types/            # ServiceType, shared enums
│
└── main.tsx              # Entry point
```

### 3.2 Import Rules

Layers can only import from layers below them:

```
app → pages → features → shared
```

- `shared/` NEVER imports from `features/` or `pages/`
- `features/` NEVER imports from `pages/`
- Cross-feature imports go through the barrel `index.ts` only
- No circular dependencies between features

### 3.3 Barrel Exports

Every feature exposes a public API via `index.ts`:

```ts
// features/orders/index.ts
export { useOrders, useCreateOrder } from './api';
export { OrderList, NewOrderForm } from './ui';
export type { Order, CreateOrderInput } from './model';
```

Internal modules (helpers, sub-components) stay private.

---

## 4. TanStack Query Conventions

### 4.1 Query Keys

Use a factory pattern per feature:

```ts
// features/orders/api/keys.ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};
```

### 4.2 Hooks

```ts
// features/orders/api/useOrders.ts
export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
    staleTime: 30_000,
  });
}
```

### 4.3 Mutations

Always invalidate related queries on success:

```ts
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
```

---

## 5. State Management

| What | Where |
|---|---|
| Server data (orders, clients, invoices) | TanStack Query |
| Auth token + user | Zustand `useAuthStore` |
| UI state (sidebar collapsed, theme) | Zustand `useUIStore` |
| Form state | React Hook Form (local) |
| Ephemeral UI (modal open, tooltip) | `useState` (local) |

Rule: if it comes from the API, it lives in TanStack Query. Period.

---

## 6. Testing Strategy (TDD)

### 6.1 Test Pyramid

```
        ┌─────────┐
        │   E2E   │  ← Few, critical paths only
        ├─────────┤
        │  Integ  │  ← Feature-level (render + MSW)
        ├─────────┤
        │  Unit   │  ← Pure functions, hooks, utils
        └─────────┘
```

### 6.2 Rules

1. Write the test FIRST (red), then make it pass (green), then refactor
2. Every feature ships with tests — no exceptions
3. Unit tests for: `lib/`, `model/` (schemas, transforms, calculations)
4. Integration tests for: `ui/` components with mocked API (MSW)
5. E2E tests for: login flow, create order, mark paid, invoice emission
6. Coverage target: 80% lines minimum per feature

### 6.3 File Naming

```
features/orders/
├── lib/
│   ├── calcPrice.ts
│   └── calcPrice.test.ts        # Unit test next to source
├── ui/
│   ├── OrderList.tsx
│   └── OrderList.test.tsx        # Integration test
└── api/
    ├── useOrders.ts
    └── useOrders.test.ts         # Hook test with MSW
```

### 6.4 MSW Setup

```ts
// shared/api/__mocks__/handlers.ts
export const handlers = [
  http.get('/api/orders', () => HttpResponse.json({ orders: mockOrders, total: 10 })),
  http.post('/api/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '999', ...body }, { status: 201 });
  }),
];
```

### 6.5 Commands

```bash
vitest --run              # Single run (CI)
vitest                    # Watch mode (dev)
vitest --coverage         # With coverage report
playwright test           # E2E
```

---

## 7. Zod Schemas as Source of Truth

Every API response and form input has a Zod schema:

```ts
// features/orders/model/schemas.ts
import { z } from 'zod';

export const orderSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  service: z.enum(['DTF', 'SUBLIMACION', 'UV', ...]),
  meters: z.number().positive(),
  unit_price: z.number().nonneg(),
  total_amount: z.number(),
  is_paid: z.boolean(),
  created_at: z.string().datetime(),
});

export type Order = z.infer<typeof orderSchema>;

export const createOrderSchema = z.object({
  client_id: z.string().min(1, 'Selecciona un cliente'),
  service: z.enum(['DTF', 'SUBLIMACION', 'UV', ...]),
  meters: z.number().positive('Ingresa cantidad'),
  price_override: z.number().optional(),
  description: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

Benefits:
- Runtime validation on API responses (catch backend drift)
- Form validation via `@hookform/resolvers/zod`
- Types derived from schemas (single source of truth)

---

## 8. Routing (TanStack Router)

```ts
// app/router/routes.ts
import { createRootRoute, createRoute } from '@tanstack/react-router';

const rootRoute = createRootRoute({ component: AppLayout });

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders',
  component: OrdersPage,
});

// ... etc
```

---

## 9. CSS Conventions

- One `.module.css` per component
- Use CSS custom properties from `app/styles/variables.css`
- BEM-ish naming inside modules: `.card`, `.cardHeader`, `.cardBody`
- No global class names except in `app/styles/`
- Responsive breakpoints: `768px` (mobile), `1024px` (tablet), `1280px` (desktop)
- Dark/light via `[data-theme]` attribute on `<html>`

---

## 10. Code Quality Gates

### Pre-commit (lint-staged + husky)
```bash
eslint --fix
prettier --write
tsc --noEmit
```

### CI Pipeline
```
1. Install deps
2. eslint .
3. tsc --noEmit
4. vitest --run --coverage
5. vite build
6. playwright test (on build output)
```

### PR Rules
- All checks green
- At least 1 approval
- No `any` types (eslint rule)
- No `console.log` in production code
- New feature = new tests

---

## 11. Git Conventions

### Branches
```
main              # Production
develop           # Integration
feat/xyz          # Feature branches
fix/xyz           # Bug fixes
refactor/xyz      # Refactors
```

### Commits (Conventional Commits)
```
feat(orders): add bulk mark-as-paid
fix(auth): handle expired token redirect
refactor(clients): migrate to TanStack Query
test(invoices): add emission flow e2e
chore: upgrade vite to v7.3
```

---

## 12. Migration Plan (Current → FSD)

### Phase 1: Foundation
- [ ] Install TanStack Query, TanStack Router, Zustand, Zod, RHF, Vitest, MSW
- [ ] Set up `app/`, `shared/`, folder structure
- [ ] Create `shared/api/apiFetch.ts` (extract from current `api.ts`)
- [ ] Create `shared/ui/` base components (Button, Input, Modal, SlideOver, Table)
- [ ] Set up Vitest + MSW

### Phase 2: Feature extraction (one at a time)
- [ ] `features/auth/` — extract login, token, AuthGuard
- [ ] `features/orders/` — extract OrderList, NewOrder, edit panel
- [ ] `features/clients/` — extract ClientList, edit panel
- [ ] `features/invoices/` — extract Facturacion
- [ ] `features/prices/` — extract Prices
- [ ] `features/dashboard/` — extract Dashboard (depends on other features' queries)

### Phase 3: Router migration
- [ ] Replace manual `view` state with TanStack Router
- [ ] Add URL-based navigation
- [ ] Deep linking support

### Phase 4: Quality
- [ ] 80% test coverage per feature
- [ ] E2E for critical paths
- [ ] CI pipeline
- [ ] Pre-commit hooks

---

## 13. API Layer Migration Notes

When Raffer APIs change:
1. Update Zod schemas in `features/*/model/schemas.ts`
2. Update fetch functions in `features/*/api/`
3. Run `vitest --run` — schema validation will catch mismatches
4. Update MSW handlers to match new shapes

The Zod-first approach means API drift is caught immediately at runtime, not silently swallowed.

---

## 14. Performance Budget

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle (gzipped) | < 150KB initial |
| Route chunk | < 50KB each |

Use `vite-plugin-bundle-analyzer` to monitor. Lazy-load all route pages.

---

*Last updated: 2026-03-29*
