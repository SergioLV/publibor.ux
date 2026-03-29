import { useState, useEffect, useMemo } from 'react';
import type { ServiceType } from '../../../shared/types';
import { SERVICE_TYPES } from '../../../shared/types';
import type { Client } from '../model/types';
import type { PriceTier } from '../../prices/model/types';
import { useClients, useCreateClient, useUpdateClient } from '../api/hooks';
import { fetchClientById } from '../api/clients-api';
import { useDefaultPrices } from '../../prices/api/hooks';
import type { EditingClient } from './ClientEditPanel';
import ClientToolbar from './ClientToolbar';
import ClientTable from './ClientTable';
import ClientMobileCards from './ClientMobileCards';
import ClientPagination from './ClientPagination';
import ClientEditPanel from './ClientEditPanel';
import './ClientList.css';

const PAGE_SIZE = 20;

export default function ClientListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState<EditingClient | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<ServiceType | null>(null);

  const { data: tiers = [] } = useDefaultPrices();
  const { data: clientsData, isLoading: loading } = useClients({
    page, limit: PAGE_SIZE,
    search: search || undefined,
    active: showAll ? undefined : true,
  });
  const clients = clientsData?.clients ?? [];
  const total = clientsData?.total ?? 0;
  const totalPages = clientsData?.totalPages ?? 1;

  const createMut = useCreateClient();
  const updateMut = useUpdateClient();

  useEffect(() => { setPage(1); }, [search, showAll]);

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
    setEditing({ id: '', name: '', rut: '', email: '', phone: '', billing_addr: '', giro: '', comuna: '', ciudad: '', is_active: true, prices: [] });
  }

  async function openEdit(c: Client) {
    setIsNew(false); setError(''); setLoadingEdit(true);
    setEditing({ id: c.id, name: c.name, rut: c.rut || '', email: '', phone: '', billing_addr: '', giro: '', comuna: '', ciudad: '', is_active: c.is_active, prices: [] });
    try {
      const full = await fetchClientById(c.id);
      setEditing({
        id: full.id, name: full.name, rut: full.rut || '', email: full.email || '', phone: full.phone || '',
        billing_addr: full.billing_addr || '', giro: full.giro || '', comuna: full.comuna || '', ciudad: full.ciudad || '',
        is_active: full.is_active, prices: full.prices.map((p) => ({ default_price_id: p.default_price_id, price: p.price })),
      });
    } catch (e) { setEditing(null); setError(e instanceof Error ? e.message : 'Error cargando cliente'); }
    finally { setLoadingEdit(false); }
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
    if (num !== '' && num > 0) existing.push({ default_price_id: tierId, price: num });
    setEditing({ ...editing, prices: existing });
  }

  async function save() {
    if (!editing || !editing.name.trim()) return;
    const cleanPrices = editing.prices.filter((p) => typeof p.price === 'number' && p.price > 0).map((p) => ({ default_price_id: p.default_price_id, price: p.price as number }));
    setSaving(true); setError('');
    try {
      const payload = { name: editing.name, rut: editing.rut || undefined, email: editing.email || undefined, phone: editing.phone || undefined, billing_addr: editing.billing_addr || undefined, giro: editing.giro || undefined, comuna: editing.comuna || undefined, ciudad: editing.ciudad || undefined, prices: cleanPrices };
      if (isNew) { await createMut.mutateAsync(payload); setFeedback('Cliente creado exitosamente'); }
      else { await updateMut.mutateAsync({ id: editing.id, data: { ...payload, is_active: editing.is_active } }); setFeedback('Cliente actualizado'); }
      setTimeout(() => setFeedback(''), 3000); setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error guardando cliente'); }
    finally { setSaving(false); }
  }

  return (
    <div className="client-list">
      <ClientToolbar search={search} onSearchChange={setSearch} showAll={showAll} onShowAllChange={setShowAll} onNewClient={openNew} />
      {feedback && <div className="feedback-msg">{feedback}</div>}
      {error && <div className="error-msg">{error}</div>}
      <ClientTable clients={clients} loading={loading} search={search} onEdit={openEdit} onNew={openNew} />
      <ClientMobileCards clients={clients} loading={loading} search={search} onEdit={openEdit} onNew={openNew} />
      <ClientPagination total={total} page={page} totalPages={totalPages} onPageChange={setPage} />
      {editing && (
        <ClientEditPanel
          editing={editing} isNew={isNew} saving={saving} loadingEdit={loadingEdit}
          tiersGrouped={tiersGrouped} openAccordion={openAccordion} onToggleAccordion={setOpenAccordion}
          onChange={setEditing} onClose={() => setEditing(null)} onSave={save}
          getEditPrice={getEditPrice} setEditPrice={setEditPrice}
        />
      )}
    </div>
  );
}
