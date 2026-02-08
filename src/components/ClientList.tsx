import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Client, PriceTier, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel } from '../data/types';
import { fetchClients, apiCreateClient, apiUpdateClient, fetchDefaultPrices } from '../data/api';
import { formatCLP } from '../data/format';
import './ClientList.css';

const PAGE_SIZE = 20;

function tierRangeLabel(tier: PriceTier): string {
  if (tier.min_meters === 0 && tier.max_meters === null) return 'Cualquier';
  if (tier.max_meters === null) return `${tier.min_meters}+`;
  return `${tier.min_meters}–${tier.max_meters}`;
}

interface EditingClient {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  billing_addr: string;
  is_active: boolean;
  prices: { default_price_id: number; price: number | '' }[];
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditingClient | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);

  // Load tiers once
  useEffect(() => {
    fetchDefaultPrices().then(setTiers).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClients({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        active: showAll ? undefined : true,
      });
      setClients(res.clients);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }, [page, search, showAll]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, showAll]);

  const tiersGrouped = useMemo(() => {
    const map: Partial<Record<ServiceType, PriceTier[]>> = {};
    for (const s of SERVICE_TYPES) {
      map[s] = tiers.filter((t) => t.service === s).sort((a, b) => a.min_meters - b.min_meters);
    }
    return map;
  }, [tiers]);

  function openNew() {
    setIsNew(true);
    setEditing({
      id: '',
      name: '',
      rut: '',
      email: '',
      phone: '',
      billing_addr: '',
      is_active: true,
      prices: [],
    });
  }

  function openEdit(c: Client) {
    setIsNew(false);
    setEditing({
      id: c.id,
      name: c.name,
      rut: c.rut || '',
      email: c.email || '',
      phone: c.phone || '',
      billing_addr: c.billing_addr || '',
      is_active: c.is_active,
      prices: c.prices.map((p) => ({ default_price_id: p.default_price_id, price: p.price })),
    });
  }

  function getEditPrice(tierId: number): number | '' {
    if (!editing) return '';
    const found = editing.prices.find((p) => p.default_price_id === tierId);
    return found ? found.price : '';
  }

  function setEditPrice(tierId: number, val: string) {
    if (!editing) return;
    const num = val === '' ? '' : Number(val);
    const existing = editing.prices.filter((p) => p.default_price_id !== tierId);
    if (num !== '' && num > 0) {
      existing.push({ default_price_id: tierId, price: num });
    }
    setEditing({ ...editing, prices: existing });
  }

  async function save() {
    if (!editing || !editing.name.trim()) return;
    const cleanPrices = editing.prices
      .filter((p) => typeof p.price === 'number' && p.price > 0)
      .map((p) => ({ default_price_id: p.default_price_id, price: p.price as number }));

    setSaving(true);
    setError('');
    try {
      if (isNew) {
        await apiCreateClient({
          name: editing.name,
          rut: editing.rut || undefined,
          email: editing.email || undefined,
          phone: editing.phone || undefined,
          billing_addr: editing.billing_addr || undefined,
          prices: cleanPrices,
        });
      } else {
        await apiUpdateClient(editing.id, {
          name: editing.name,
          rut: editing.rut || undefined,
          email: editing.email || undefined,
          phone: editing.phone || undefined,
          billing_addr: editing.billing_addr || undefined,
          is_active: editing.is_active,
          prices: cleanPrices,
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando cliente');
    } finally {
      setSaving(false);
    }
  }

  // Count overrides per client
  function overrideCount(c: Client): number {
    return c.prices.length;
  }

  return (
    <div className="client-list">
      <div className="client-toolbar">
        <h2>Clientes</h2>
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          {' '}Mostrar todos
        </label>
        <button className="btn-primary" onClick={openNew}>+ Nuevo Cliente</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RUT</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Precios especiales</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row">
              <td><span className="skeleton-cell wide" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell wide" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell short" /></td>
              <td><span className="skeleton-cell tiny" /></td>
              <td><span className="skeleton-cell tiny" /></td>
            </tr>
          ))}
          {!loading && clients.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.rut || '—'}</td>
              <td>{c.email || '—'}</td>
              <td>{c.phone || '—'}</td>
              <td>{overrideCount(c) > 0 ? `${overrideCount(c)} override${overrideCount(c) > 1 ? 's' : ''}` : '—'}</td>
              <td>{c.is_active ? '✓' : '✗'}</td>
              <td><button className="btn-sm" onClick={() => openEdit(c)}>Editar</button></td>
            </tr>
          ))}
          {!loading && clients.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center' }}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="order-footer">
        <span>{total} clientes</span>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span>Pág {page} de {Math.max(totalPages, 1)}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{isNew ? 'Nuevo Cliente' : 'Editar Cliente'}</h3>
            <div className="form-grid">
              <label>Nombre *
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label>RUT
                <input value={editing.rut} onChange={(e) => setEditing({ ...editing, rut: e.target.value })} />
              </label>
              <label>Email
                <input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </label>
              <label>Teléfono
                <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </label>
              <label>Dirección facturación
                <input value={editing.billing_addr} onChange={(e) => setEditing({ ...editing, billing_addr: e.target.value })} />
              </label>
              <label>
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                {' '}Activo
              </label>
            </div>

            <h4>Precios preferenciales</h4>
            <p className="prices-hint">Deja vacío para usar el precio por defecto del rango.</p>
            {SERVICE_TYPES.map((service) => {
              const serviceTiers = tiersGrouped[service] || [];
              if (serviceTiers.length === 0) return null;
              return (
                <div key={service} className="pref-service-group">
                  <span className="pref-service-label">{service}</span>
                  <div className="pref-tiers">
                    {serviceTiers.map((tier) => (
                      <div key={tier.id} className="pref-tier-row">
                        <span className="pref-tier-range">
                          {tierRangeLabel(tier)} {unitLabel(service)}
                        </span>
                        <span className="pref-tier-default">{formatCLP(tier.price)}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={getEditPrice(tier.id)}
                          onChange={(e) => setEditPrice(tier.id, e.target.value)}
                          placeholder={formatCLP(tier.price)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="modal-actions">
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
