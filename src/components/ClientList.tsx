import { useState } from 'react';
import { SERVICE_TYPES } from '../data/types';
import type { Client, ServiceType } from '../data/types';
import { getClients, createClient, updateClient } from '../data/store';
import { formatCLP } from '../data/format';
import './ClientList.css';

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>(getClients());
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = clients
    .filter((c) => showAll || c.is_active)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.rut && c.rut.includes(search))
    );

  function refresh() {
    setClients(getClients());
  }

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
      preferentialPrices: {},
    });
  }

  function openEdit(c: Client) {
    setIsNew(false);
    setEditing({ ...c, preferentialPrices: { ...c.preferentialPrices } });
  }

  function save() {
    if (!editing || !editing.name.trim()) return;
    // Clean preferential prices
    const cleaned: Partial<Record<ServiceType, number>> = {};
    for (const s of SERVICE_TYPES) {
      const v = editing.preferentialPrices[s];
      if (v !== undefined && v > 0) cleaned[s] = v;
    }
    const data = { ...editing, preferentialPrices: cleaned };
    if (isNew) {
      createClient(data);
    } else {
      updateClient(editing.id, data);
    }
    setEditing(null);
    refresh();
  }

  function setPrefPrice(service: ServiceType, val: string) {
    if (!editing) return;
    const num = val === '' ? undefined : Number(val);
    setEditing({
      ...editing,
      preferentialPrices: { ...editing.preferentialPrices, [service]: num },
    });
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
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />{' '}
          Mostrar todos
        </label>
        <button className="btn-primary" onClick={openNew}>
          + Nuevo Cliente
        </button>
      </div>

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RUT</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Textil</th>
            <th>UV</th>
            <th>Texturizado</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.rut || '—'}</td>
              <td>{c.email || '—'}</td>
              <td>{c.phone || '—'}</td>
              <td>{c.preferentialPrices.TEXTIL ? formatCLP(c.preferentialPrices.TEXTIL) : '—'}</td>
              <td>{c.preferentialPrices.UV ? formatCLP(c.preferentialPrices.UV) : '—'}</td>
              <td>{c.preferentialPrices.TEXTURIZADO ? formatCLP(c.preferentialPrices.TEXTURIZADO) : '—'}</td>
              <td>{c.is_active ? '✓' : '✗'}</td>
              <td>
                <button className="btn-sm" onClick={() => openEdit(c)}>Editar</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign: 'center' }}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>
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
                <input value={editing.rut || ''} onChange={(e) => setEditing({ ...editing, rut: e.target.value })} />
              </label>
              <label>Email
                <input value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </label>
              <label>Teléfono
                <input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </label>
              <label>Dirección facturación
                <input value={editing.billing_addr || ''} onChange={(e) => setEditing({ ...editing, billing_addr: e.target.value })} />
              </label>
              <label>
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                {' '}Activo
              </label>
            </div>
            <h4>Precios preferenciales (CLP/m)</h4>
            <div className="form-grid">
              {SERVICE_TYPES.map((s) => (
                <label key={s}>{s}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editing.preferentialPrices[s] ?? ''}
                    onChange={(e) => setPrefPrice(s, e.target.value)}
                    placeholder="Sin override"
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={save}>Guardar</button>
              <button onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
