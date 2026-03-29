export default function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <div className="stat-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`stat-card${i === 0 ? ' accent' : i === 1 ? ' success' : ''}`}>
            <div className="stat-icon"><span className="skeleton-block" style={{ width: 24, height: 24, borderRadius: '50%' }} /></div>
            <div className="stat-content">
              <span className="skeleton-block" style={{ width: '55%', height: 11 }} />
              <span className="skeleton-block" style={{ width: '70%', height: 30, marginTop: 2 }} />
              <span className="skeleton-block" style={{ width: '60%', height: 12, marginTop: 2 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        {[0, 1].map((i) => (
          <div key={i} className="dash-panel">
            <div className="panel-header"><span className="skeleton-block" style={{ width: '40%', height: 12 }} /></div>
            <div className="chart-container"><span className="skeleton-block" style={{ width: '100%', height: 220 }} /></div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid-3">
        <div className="dash-panel">
          <div className="panel-header"><span className="skeleton-block" style={{ width: '50%', height: 12 }} /></div>
          <div className="service-breakdown">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="sb-row">
                <div className="sb-top">
                  <span className="skeleton-block sb-dot" />
                  <span className="skeleton-block" style={{ width: '30%', height: 13 }} />
                  <span className="skeleton-block" style={{ width: '20%', height: 12, marginLeft: 'auto' }} />
                  <span className="skeleton-block" style={{ width: 70, height: 13, flexShrink: 0 }} />
                </div>
                <div className="sb-bar-track"><span className="skeleton-block" style={{ width: `${70 - i * 15}%`, height: 6, borderRadius: 3 }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-panel">
          <div className="panel-header"><span className="skeleton-block" style={{ width: '40%', height: 12 }} /></div>
          <div className="top-clients">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="tc-row">
                <span className="skeleton-block tc-rank" />
                <div className="tc-info">
                  <span className="skeleton-block" style={{ width: '65%', height: 14 }} />
                  <span className="skeleton-block" style={{ width: '40%', height: 11 }} />
                </div>
                <span className="skeleton-block" style={{ width: 70, height: 14, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="dash-panel">
          <div className="panel-header"><span className="skeleton-block" style={{ width: '45%', height: 12 }} /></div>
          <div className="activity-feed">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="af-row">
                <span className="skeleton-block af-dot" />
                <div className="af-content">
                  <span className="skeleton-block" style={{ width: '75%', height: 13 }} />
                  <span className="skeleton-block" style={{ width: '45%', height: 11 }} />
                </div>
                <div className="af-right">
                  <span className="skeleton-block" style={{ width: 60, height: 13 }} />
                  <span className="skeleton-block" style={{ width: 40, height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="quick-actions">
        {[130, 110, 110, 110].map((w, i) => (
          <span key={i} className="skeleton-block" style={{ width: w, height: 36, borderRadius: 6 }} />
        ))}
      </div>
    </div>
  );
}
