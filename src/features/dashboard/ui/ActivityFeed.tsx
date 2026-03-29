import { formatCLP } from '../../../shared/lib/format';
import { formatDateShort } from '../../../shared/lib/format';

interface ActivityItem {
  id: string;
  client: string;
  service: string;
  amount: number;
  date: string;
  isPaid: boolean;
}

interface Props {
  items: ActivityItem[];
}

export default function ActivityFeed({ items }: Props) {
  return (
    <div className="dash-panel">
      <div className="panel-header"><h3>Actividad reciente</h3></div>
      <div className="activity-feed">
        {items.map((item) => (
          <div key={item.id} className="af-row">
            <span className={`af-dot af-dot-${item.isPaid ? 'paid' : 'unpaid'}`} />
            <div className="af-content">
              <span className="af-title">Orden #{item.id} — {item.service}</span>
              <span className="af-client">{item.client}</span>
            </div>
            <div className="af-right">
              <span className="af-amount">{formatCLP(item.amount)}</span>
              <span className="af-date">{formatDateShort(item.date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
