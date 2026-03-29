# Raffer API Migration Guide

> Migrating from single-tenant Publibor API to multi-tenant Raffer API.

---

## Global Changes

| What | Old (Publibor) | New (Raffer) |
|---|---|---|
| Base URL | `https://s8agiab37c.execute-api.us-east-1.amazonaws.com/prod/api` | `https://api.raffer.cl/api` |
| Multi-tenant | No | Yes — tenant slug from subdomain (e.g. `publibor.raffer.cl`) |
| Login payload | `{ username, password }` | `{ tenant, username, password }` |
| Auth user response | `{ id, username, role }` | `{ id, tenant_id, username, role }` |
| Response wrapper | `{ data: ... }` | `{ data: ..., request_id: "..." }` |
| Invoice statuses | `pending, emitted, failed, error` | `pending, emitted, accepted, rejected, error` |
| Invoice emit response | `{ data: InvoiceDTO }` | `{ data: { execution_arn, order_ids } }` (async, 202) |
| Invoice new fields | — | `fma_pago`, `fch_venc`, `estado_sii`, `last_resend` |
| Pagination response | `{ data, total, page, limit, total_pages }` | Same structure + `request_id` |
| New endpoints | — | Purchase orders CRUD, photo CRUD, single order GET |

---

## File-by-File Migration

### 1. `shared/api/client.ts`

- Change `API_BASE` to `https://api.raffer.cl/api`
- Token storage keys stay the same (`publibor-token`, `publibor-token-expires`)
- No other changes — `apiFetch` already handles auth header and 401 redirect

### 2. `features/auth/api/auth-api.ts`

Changes:
- `apiLogin` now sends `{ tenant, username, password }` instead of `{ username, password }`
- Need to resolve tenant slug from `window.location.hostname` (e.g. `publibor.raffer.cl` → `publibor`)
- `apiGetMe` response now includes `tenant_id: string (UUID)`

```ts
// New: extract tenant from subdomain
function getTenantSlug(): string {
  const host = window.location.hostname; // e.g. "publibor.raffer.cl"
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0]; // "publibor"
  return 'publibor'; // fallback for localhost
}

// Updated login
async function apiLogin(username: string, password: string) {
  const res = await apiFetch<{ data: { token: string; expires_at: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ tenant: getTenantSlug(), username, password }),
  });
  return res.data;
}
```

Type update:
```ts
interface AuthUser {
  id: number;
  tenant_id: string; // NEW — UUID
  username: string;
  role: 'admin' | 'operator'; // was just string
}
```

### 3. `features/clients/api/clients-api.ts`

No endpoint changes. Same paths, same request/response shapes. Just the base URL change covers it.

### 4. `features/orders/api/orders-api.ts`

Mostly same. New endpoints to add:

- `GET /api/orders/{id}` — single order fetch (new, wasn't available before)
- `GET /api/orders/{id}/cotizacion` — now returns JSON `{ data, type }` instead of needing query param token
- `POST /api/orders/{id}/photos` — dedicated photo upload endpoint
- `DELETE /api/orders/{id}/photos/{photoId}` — dedicated photo delete
- `GET /api/orders/purchase-orders?client_id=X` — list POs by client
- `POST /api/orders/purchase-orders` — create standalone PO

Changes to existing:
- `GET /api/orders/{id}/cotizacion` — now uses Bearer auth header (no more `?token=` query param)
- `PUT /api/orders/mark-paid` — response now returns updated orders instead of `{ updated: number }`

New functions to add:
```ts
// Fetch single order
async function fetchOrderById(id: string): Promise<Order> { ... }

// Dedicated photo upload
async function uploadOrderPhotos(orderId: string, photos: PhotoPayload[]): Promise<OrderPhoto[]> { ... }

// Delete single photo
async function deleteOrderPhoto(orderId: string, photoId: number): Promise<void> { ... }

// List purchase orders by client
async function fetchPurchaseOrders(clientId: string): Promise<PurchaseOrder[]> { ... }

// Create standalone purchase order
async function createPurchaseOrder(clientId: number, ocNumber: string, date?: string): Promise<PurchaseOrder> { ... }
```

### 5. `features/invoices/api/invoices-api.ts`

Significant changes:

Invoice type update:
```ts
type InvoiceStatus = 'pending' | 'emitted' | 'accepted' | 'rejected' | 'error';
// NEW statuses: accepted, rejected (SII processing results)

interface Invoice {
  // ... existing fields ...
  fma_pago: number;      // NEW — 1=contado, 2=crédito
  fch_venc: string | null; // NEW — due date
  status: InvoiceStatus;
  estado_sii: string | null; // NEW — SII status code (DOK, RCH, etc.)
  last_resend: string | null; // NEW — last resend timestamp
}
```

Endpoint changes:
- `POST /api/invoices` — now returns `202` with `{ execution_arn, order_ids }` instead of the invoice directly (async emission via Step Functions)
- `POST /api/invoices/{id}/resend` — now returns `202` with execution ARN, has 1-min cooldown, only works for `error` status (not `failed`)
- `GET /api/invoices/{id}/pdf` — only works for invoices with a folio

UI implications:
- After emitting, show "Enviando al SII..." state and poll or wait for status change
- Handle `accepted` and `rejected` statuses in the UI
- Show `estado_sii` code in invoice detail panel
- Resend button should be disabled for 1 min after last resend
- `fma_pago` and `fch_venc` should be displayed in invoice detail

### 6. `features/prices/api/prices-api.ts`

Minor changes:
- `GET /api/default-prices` now supports optional `?service=DTF` filter parameter
- `POST /api/default-prices` is an upsert (same as before)
- `PUT /api/default-prices` is now also supported as an alias

No breaking changes.

---

## New TanStack Query Hooks Needed

```ts
// orders
useOrder(id)              // GET /api/orders/{id}
useUploadPhotos()         // POST /api/orders/{id}/photos
useDeletePhoto()          // DELETE /api/orders/{id}/photos/{photoId}
usePurchaseOrders(clientId) // GET /api/orders/purchase-orders?client_id=X
useCreatePurchaseOrder()  // POST /api/orders/purchase-orders

// invoices — update existing
useCreateInvoice()        // Now handles 202 async response
useResendInvoice()        // Now handles 202 + cooldown
```

---

## Migration Priority

1. `shared/api/client.ts` — change base URL (everything breaks without this)
2. `features/auth` — add tenant slug, update AuthUser type
3. `features/invoices` — biggest changes (new statuses, async emission, new fields)
4. `features/orders` — add new endpoints (photos, POs, single order)
5. `features/prices` — minor (add service filter param)
6. `features/clients` — no changes needed

---

## localStorage Keys

Keep existing keys — they're tenant-scoped by the browser origin (each subdomain gets its own localStorage):
- `publibor-token` → consider renaming to `raffer-token`
- `publibor-token-expires` → consider renaming to `raffer-token-expires`
- `publibor-view` → consider renaming to `raffer-view`
- `publibor-theme` → consider renaming to `raffer-theme`

---

## Error Response Format

All errors now follow:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | INTERNAL_ERROR",
    "message": "human-readable message"
  },
  "request_id": "uuid"
}
```

Update `apiFetch` error handling to parse this structure and surface `error.message` to the UI.
