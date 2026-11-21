/** Loading placeholder shaped like the dashboard, so the ~2 s first load reads as "almost there". */
function Line({ w, h = 12 }: { w: string; h?: number }) {
  return <span className="sk" style={{ width: w, height: h }} />;
}

export function DashboardSkeleton() {
  return (
    <div className="page skeleton" aria-busy="true">
      <p className="sr-only" role="status">
        Loading suki transactions…
      </p>
      <header className="top" aria-hidden>
        <div className="top-row">
          <div className="brand">
            <span className="sk" style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div className="sk-stack">
              <Line w="140px" h={20} />
              <Line w="200px" />
            </div>
          </div>
          <div className="controls">
            <Line w="200px" h={40} />
            <Line w="84px" h={40} />
            <Line w="84px" h={40} />
          </div>
        </div>
      </header>
      <div className="kpis" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card kpi sk-stack">
            <Line w="45%" />
            <Line w="60%" h={28} />
            <Line w="80%" />
          </div>
        ))}
      </div>
      <div className="grid" aria-hidden>
        <div className="card sk-stack">
          <Line w="30%" h={16} />
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="sk" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
        <div className="card sk-stack">
          <Line w="40%" h={16} />
          <Line w="100%" h={12} />
          {[0, 1, 2, 3].map((i) => (
            <Line key={i} w={`${85 - i * 10}%`} h={18} />
          ))}
        </div>
      </div>
    </div>
  );
}
