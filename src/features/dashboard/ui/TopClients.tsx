import { formatCLP } from '../../../shared/lib/format';

interface ClientEntry {
  name: string;
  count: number;
  total: number;
}

interface Props {
  clients: ClientEntry[];
}

export default function TopClients({ clients }: Props) {
  return (
    <div className="dash-panel">
      <div className="panel-header"><h3>Top clientes</h3></div>
      {clients.length === 0 && <p className="empty-text">Sin órdenes aún</p>}
      <div className="top-clients">
        {clients.map((c, i) => (
          <div key={i} className="tc-row">
            <span className={`tc-rank tc-rank-${i + 1}`}>{i + 1}</span>
            <div className="tc-info">
              <span className="tc-name">{c.name}</span>
              <span className="tc-meta">{c.count} órdenes</span>
            </div>
            <span className="tc-total">{formatCLP(c.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
