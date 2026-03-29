# Components Migration Plan

> Decomposing monolithic components into small, composable, testable pieces following Feature-Sliced Design.

---

## Rules

- Each component file: 50–150 lines max (hard limit 200)
- Components are either **smart** (has queries/mutations, orchestrates) or **dumb** (receives props, renders)
- Only the Page component is smart — everything else is dumb
- Props over internal state. If a child needs data, the parent passes it
- CSS stays in one file per feature (e.g. `ClientList.css`) — no splitting CSS
- Barrel `index.ts` in each `ui/` folder exports only the Page component
- Old `src/components/` files get deleted after migration
- Old `useClientList.ts` hook gets deleted (logic moves into the Page component directly)

## File Structure Per Feature

```
features/{name}/ui/
├── {Name}Page.tsx           # Smart: queries, mutations, state orchestration
├── {Sub}Component.tsx       # Dumb: props in, JSX out
├── {Sub}Component.tsx
├── {Name}.css               # Styles (moved from src/components/)
└── index.ts                 # export { default } from './{Name}Page'
```

## Migration Order

| # | Component | Lines | Difficulty | Target | Status |
|---|-----------|-------|------------|--------|--------|
| 1 | Login | ~180 | Easy | `features/auth/ui/` | Done ✅ |
| 2 | Prices | ~200 | Easy | `features/prices/ui/` | Done ✅ |
| 3 | Dashboard | ~300 | Easy-Med | `features/dashboard/ui/` | Done ✅ |
| 4 | Facturacion | ~400 | Medium | `features/invoices/ui/` | Done ✅ |
| 5 | ClientList | ~700 | Medium | `features/clients/ui/` | Done ✅ |
| 6 | NewOrder | ~900 | Hard | `features/orders/ui/` | Done ✅ |
| 7 | OrderList | ~1500 | Hardest | `features/orders/ui/` | Done ✅ |
| 8 | App.tsx | ~300 | Medium | `app/` | Done ✅ |

## Decomposition Plans

### 1. Login → `features/auth/ui/`

```
LoginPage.tsx          # Form state, submit handler, loading overlay
```

Small enough to stay as one file. Just move + update imports.

### 2. Prices → `features/prices/ui/`

```
PricesPage.tsx         # useDefaultPrices query, edit state
PriceCard.tsx          # Single service card with tier rows + inline edit
```

### 3. Dashboard → `features/dashboard/ui/`

```
DashboardPage.tsx      # Queries (orders, clients, invoices), stats computation
HeroCards.tsx           # 2 big KPI cards (por cobrar, cobrado)
MetricStrip.tsx         # 3 small metric cards
RevenueChart.tsx        # Area chart panel
ServiceBreakdown.tsx    # Progress bars by service
TopClients.tsx          # Ranked client list
ActivityFeed.tsx        # Recent orders feed
DashboardSkeleton.tsx   # Loading state
```

### 4. Facturacion → `features/invoices/ui/`

```
InvoicesPage.tsx        # Queries, filter state, detail state
InvoiceKPIs.tsx         # KPI cards row
InvoiceFilters.tsx      # Filter chips + refresh
InvoiceTable.tsx        # Desktop table
InvoiceMobileCards.tsx  # Mobile card list
InvoiceDetailPanel.tsx  # Slide-over detail view
```

### 5. ClientList → `features/clients/ui/`

```
ClientListPage.tsx      # Queries, pagination, edit state
ClientToolbar.tsx       # Search + toggle + new button
ClientTable.tsx         # Desktop table
ClientMobileCards.tsx   # Mobile cards
ClientEditPanel.tsx     # Slide-over form
ClientPriceAccordion.tsx # Preferential prices section
ClientPagination.tsx    # Footer pagination
```

### 6. NewOrder → `features/orders/ui/`

```
NewOrderPage.tsx        # Wizard state, step navigation
StepIndicator.tsx       # Dot progress bar
ClientStep.tsx          # Client search + selection
ServiceStep.tsx         # Service grid + details + price
ReviewStep.tsx          # Summary + submit
OrderSummary.tsx        # Sidebar summary card
SuccessScreen.tsx       # Animated check + actions
```

### 7. OrderList → `features/orders/ui/`

```
OrderListPage.tsx       # Queries, filters, selection, edit state
OrderFilters.tsx        # Filter bar
OrderTable.tsx          # Desktop table
OrderMobileCards.tsx    # Mobile cards
OrderEditPanel.tsx      # Edit slide-over with collapsible sections
OrderSelectionBar.tsx   # Bulk actions bar
MarkPaidModal.tsx       # Confirm payment modal
FacturarModal.tsx       # Invoice emission modal
DeleteOrderModal.tsx    # Delete confirmation
```

### 8. App.tsx → `app/`

```
app/
├── App.tsx             # Router + auth gate
├── layout/
│   ├── AppLayout.tsx   # Sidebar + topbar + content area
│   ├── Sidebar.tsx     # Navigation sidebar
│   ├── Topbar.tsx      # Top header bar
│   └── UserMenu.tsx    # Avatar popover menu
└── router/
    └── routes.ts       # TanStack Router config
```

## After Each Migration

1. Update imports in `App.tsx` (or router) to point to new location
2. Delete old file from `src/components/`
3. Run `tsc --noEmit` to verify
4. Smoke test in browser

## After All Migrations

1. Delete `src/components/` folder
2. Delete `src/components/useClientList.ts`
3. Delete `src/data/` compatibility shims (api.ts, types.ts, format.ts, store.ts)
4. Update all remaining imports to use `features/` and `shared/` directly
5. Final `tsc --noEmit` + full browser test
