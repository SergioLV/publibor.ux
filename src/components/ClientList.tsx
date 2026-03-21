import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Client, PriceTier, ServiceType } from '../data/types';
import { SERVICE_TYPES, unitLabel } from '../data/types';
import { fetchClients, apiCreateClient, apiUpdateClient, fetchDefaultPrices, fetchClientById } from '../data/api';
import { formatCLP } from '../data/format';
import './ClientList.css';

const PAGE_SIZE = 20;

function tierRangeLabel(tier: PriceTier): string {
  if (tier.min_meters === 0 && tier.max_meters === null) return 'Cualquier';
  if (tier.max_meters === null) return `${tier.min_meters}+`;
  return `${tier.min_meters}–${tier.max_meters}`;
}

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

interface EditingClient {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  billing_addr: string;
  giro: string;
  comuna: string;
  ciudad: string;
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
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState<EditingClient | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [openAccordion, setOpenAccordion] = useState<ServiceType | null>(null);

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

  // Escape key closes the edit panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editing && !loadingEdit) { setEditing(null); e.stopImmediatePropagation(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, loadingEdit]);

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
      giro: '',
      comuna: '',
      ciudad: '',
      is_active: true,
      prices: [],
    });
  }

  async function openEdit(c: Client) {
    setIsNew(false);
    setError('');
    setLoadingEdit(true);
    setEditing({
      id: c.id,
      name: c.name,
      rut: c.rut || '',
      email: '',
      phone: '',
      billing_addr: '',
      giro: '',
      comuna: '',
      ciudad: '',
      is_active: c.is_active,
      prices: [],
    });
    try {
      const full = await fetchClientById(c.id);
      setEditing({
        id: full.id,
        name: full.name,
        rut: full.rut || '',
        email: full.email || '',
        phone: full.phone || '',
        billing_addr: full.billing_addr || '',
        giro: full.giro || '',
        comuna: full.comuna || '',
        ciudad: full.ciudad || '',
        is_active: full.is_active,
        prices: full.prices.map((p) => ({ default_price_id: p.default_price_id, price: p.price })),
      });
    } catch (e) {
      setEditing(null);
      setError(e instanceof Error ? e.message : 'Error cargando cliente');
    } finally {
      setLoadingEdit(false);
    }
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
          giro: editing.giro || undefined,
          comuna: editing.comuna || undefined,
          ciudad: editing.ciudad || undefined,
          prices: cleanPrices,
        });
        setFeedback('Cliente creado exitosamente');
      } else {
        await apiUpdateClient(editing.id, {
          name: editing.name,
          rut: editing.rut || undefined,
          email: editing.email || undefined,
          phone: editing.phone || undefined,
          billing_addr: editing.billing_addr || undefined,
          giro: editing.giro || undefined,
          comuna: editing.comuna || undefined,
          ciudad: editing.ciudad || undefined,
          is_active: editing.is_active,
          prices: cleanPrices,
        });
        setFeedback('Cliente actualizado');
      }
      setTimeout(() => setFeedback(''), 3000);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="client-list">
      <div className="client-toolbar">
        <div className="ct-search-wrap">
          <svg className="ct-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="ct-toggle">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          <span>Mostrar inactivos</span>
        </label>
        <button className="btn-primary" onClick={openNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          Nuevo Cliente
        </button>
      </div>

      {feedback && <div className="feedback-msg">{feedback}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>RUT</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <tr key={`skel-${i}`} className="skeleton-row" style={{ animationDelay: `${i * 0.04}s` }}>
              <td>
                <div className="cl-name-cell">
                  <span className="skeleton-cell cl-avatar-sk" />
                  <span className="skeleton-cell wide" />
                </div>
              </td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell wide" /></td>
              <td><span className="skeleton-cell medium" /></td>
              <td><span className="skeleton-cell tiny" /></td>
              <td><span className="skeleton-cell tiny" /></td>
            </tr>
          ))}
          {!loading && clients.map((c, idx) => (
            <tr key={c.id} className="fade-in-row clickable-row" style={{ animationDelay: `${idx * 0.02}s` }} onClick={() => openEdit(c)}>
              <td>
                <div className="cl-name-cell">
                  <span className="cl-avatar">{clientInitials(c.name)}</span>
                  <span className="cl-name">{c.name}</span>
                </div>
              </td>
              <td>{c.rut ? <span className="cl-mono">{c.rut}</span> : <span className="cl-empty">Sin RUT</span>}</td>
              <td>{c.email ? <span className="cl-email">{c.email}</span> : <span className="cl-empty">Sin email</span>}</td>
              <td>{c.phone ? <span className="cl-mono">{c.phone}</span> : <span className="cl-empty">Sin teléfono</span>}</td>
              <td>
                <span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>
                  {c.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                <button className="btn-action" onClick={() => openEdit(c)} title="Editar cliente">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </td>
            </tr>
          ))}
          {!loading && clients.length === 0 && (
            <tr>
              <td colSpan={6}>
                <div className="cl-empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="cl-empty-title">Sin clientes</span>
                  <span className="cl-empty-desc">{search ? 'No se encontraron resultados para tu búsqueda' : 'Agrega tu primer cliente para comenzar'}</span>
                  {!search && <button className="btn-primary cl-empty-btn" onClick={openNew}>+ Nuevo Cliente</button>}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Mobile client cards */}
      <div className="mobile-client-cards">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`cskel-${i}`} className="mobile-client-card skeleton-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="skeleton-cell wide" />
            <div className="skeleton-cell medium" />
            <div className="skeleton-cell short" />
          </div>
        ))}
        {!loading && clients.map((c, idx) => (
          <div key={c.id} className="mobile-client-card fade-in-row" style={{ animationDelay: `${idx * 0.03}s` }} onClick={() => openEdit(c)}>
            <div className="mcc-top">
              <span className="cl-avatar">{clientInitials(c.name)}</span>
              <div className="mcc-info">
                <span className="mcc-name">{c.name}</span>
                {c.rut && <span className="mcc-rut">{c.rut}</span>}
              </div>
              <span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>
                {c.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mcc-details">
              {c.email && <div className="mcc-detail"><span className="mcc-label">Email</span><span>{c.email}</span></div>}
              {c.phone && <div className="mcc-detail"><span className="mcc-label">Teléfono</span><span>{c.phone}</span></div>}
              {!c.email && !c.phone && <span className="mcc-no-contact">Sin datos de contacto</span>}
            </div>
          </div>
        ))}
        {!loading && clients.length === 0 && (
          <div className="mcc-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="cl-empty-title">Sin clientes</span>
            <span className="cl-empty-desc">{search ? 'No se encontraron resultados' : 'Agrega tu primer cliente'}</span>
            {!search && <button className="btn-primary cl-empty-btn" onClick={openNew}>+ Nuevo Cliente</button>}
          </div>
        )}
      </div>

      <div className="cl-footer">
        <span className="cl-footer-count">{total} cliente{total !== 1 ? 's' : ''}</span>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
          <span>Pág {page} de {Math.max(totalPages, 1)}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente →</button>
        </div>
      </div>

      {editing && (
        <>
          <div className="cl-panel-backdrop" onClick={() => { if (!loadingEdit) setEditing(null); }} />
          <div className="cl-panel">
            <div className="cl-panel-header">
              <div className="cl-panel-header-left">
                {!isNew && <span className="cl-avatar">{clientInitials(editing.name || '?')}</span>}
                <h3>{isNew ? 'Nuevo Cliente' : editing.name || 'Cliente'}</h3>
                {!isNew && (
                  <span className={`status-badge ${editing.is_active ? 'active' : 'inactive'}`}>
                    {editing.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                )}
              </div>
              <button className="cl-panel-close" onClick={() => setEditing(null)}>✕</button>
            </div>

            <div className="cl-panel-body">
            {loadingEdit ? (
              <>
                <div className="modal-section">
                  <div className="section-label">Información general</div>
                  <div className="form-grid">
                    <label className="span-2">Nombre *<span className="skeleton-input" /></label>
                    <label>RUT<span className="skeleton-input" /></label>
                    <label>Giro<span className="skeleton-input" /></label>
                    <label>Email<span className="skeleton-input" /></label>
                    <label>Teléfono<span className="skeleton-input" /></label>
                    <label className="span-2">Dirección facturación<span className="skeleton-input" /></label>
                    <label>Comuna<span className="skeleton-input" /></label>
                    <label>Ciudad<span className="skeleton-input" /></label>
                  </div>
                </div>
                <div className="modal-section">
                  <div className="section-label">Precios preferenciales</div>
                  <div className="pref-services">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton-accordion">
                        <div className="skeleton-accordion-bar" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
            <div className="modal-section">
              <div className="section-label">Información general</div>
              <div className="form-grid">
                <label className="span-2">Nombre *
                  <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nombre de la empresa" />
                </label>
                <label>RUT
                  <input value={editing.rut} onChange={(e) => setEditing({ ...editing, rut: e.target.value })} placeholder="12.345.678-9" />
                </label>
                <label>Giro
                  <input value={editing.giro} onChange={(e) => setEditing({ ...editing, giro: e.target.value })} placeholder="Servicios de impresión" />
                </label>
                <label>Email
                  <input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="contacto@empresa.cl" />
                </label>
                <label>Teléfono
                  <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+56 9 1234 5678" />
                </label>
                <label className="span-2">Dirección facturación
                  <input value={editing.billing_addr} onChange={(e) => setEditing({ ...editing, billing_addr: e.target.value })} placeholder="Av. Principal 123" />
                </label>
                <label>Comuna
                  <input value={editing.comuna} onChange={(e) => setEditing({ ...editing, comuna: e.target.value })} placeholder="Santiago" />
                </label>
                <label>Ciudad
                  <input value={editing.ciudad} onChange={(e) => setEditing({ ...editing, ciudad: e.target.value })} placeholder="Santiago" />
                </label>
              </div>
              {!isNew && (
                <label className="active-toggle">
                  <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                  <span className={`toggle-label ${editing.is_active ? 'on' : 'off'}`}>
                    {editing.is_active ? 'Cliente activo' : 'Cliente inactivo'}
                  </span>
                </label>
              )}
            </div>

            <div className="modal-section">
              <div className="section-label">Precios preferenciales</div>
              <p className="prices-hint">Solo si el cliente tiene tarifa especial. Vacío = precio por defecto.</p>
              <div className="pref-services">
                {SERVICE_TYPES.map((service) => {
                  const serviceTiers = tiersGrouped[service] || [];
                  if (serviceTiers.length === 0) return null;
                  const isOpen = openAccordion === service;
                  const overrideCount = serviceTiers.filter((t) => {
                    const v = getEditPrice(t.id);
                    return v !== '' && Number(v) > 0;
                  }).length;
                  return (
                    <div key={service} className={`pref-service-card ${isOpen ? 'pref-open' : ''}`}>
                      <button
                        type="button"
                        className="pref-card-header pref-card-toggle"
                        onClick={() => setOpenAccordion(isOpen ? null : service)}
                      >
                        <div className="pref-card-header-left">
                          <span className={`pref-chevron ${isOpen ? 'pref-chevron-open' : ''}`}>›</span>
                          <span className="pref-card-service">{service}</span>
                          <span className="pref-card-unit">por {unitLabel(service)}</span>
                        </div>
                        {overrideCount > 0 && (
                          <span className="pref-override-count">{overrideCount} especial{overrideCount > 1 ? 'es' : ''}</span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="pref-card-tiers">
                          {serviceTiers.map((tier) => {
                            const val = getEditPrice(tier.id);
                            const hasOverride = val !== '' && Number(val) > 0;
                            return (
                              <div key={tier.id} className={`pref-tier-row ${hasOverride ? 'has-override' : ''}`}>
                                <div className="pref-tier-info">
                                  <span className="pref-tier-range">{tierRangeLabel(tier)} {unitLabel(service)}</span>
                                  <span className="pref-tier-default">Base: {formatCLP(tier.price)}</span>
                                </div>
                                <div className="pref-tier-input-wrap">
                                  <span className="pref-input-prefix">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={val}
                                    onChange={(e) => setEditPrice(tier.id, e.target.value)}
                                    placeholder={String(tier.price)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
            </div>

            <div className="cl-panel-footer">
              <button className="cl-panel-cancel" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={saving || !editing.name.trim()}>
                {saving ? 'Guardando...' : isNew ? 'Crear Cliente' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
