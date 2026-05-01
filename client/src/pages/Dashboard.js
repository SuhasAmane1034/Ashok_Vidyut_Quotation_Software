import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, TrendingUp, Calendar, Plus, ArrowRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '60%', height: 28, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '40%', height: 14 }} />
    </div>
  );
}

export default function Dashboard() {
  const { settings, user } = useApp();
  const currency = settings?.currency || '₹';

  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: () => axios.get('/api/analytics').then(r => r.data) });
  const { data: invDash }   = useQuery({ queryKey: ['inventory-dash'], queryFn: () => axios.get('/api/inventory/dashboard').then(r => r.data) });

  const statusColors = { draft: '#6b7280', sent: 'var(--info)', approved: 'var(--success)', rejected: 'var(--danger)' };

  const stats = [
    { label: 'Total Quotations', value: data?.total_quotes,    icon: <FileText size={18} />,  color: 'var(--accent)' },
    { label: 'Approved Revenue', value: data?.total_revenue != null ? `${currency}${Number(data.total_revenue).toLocaleString('en-IN')}` : null, icon: <TrendingUp size={18} />, color: 'var(--success)' },
    { label: 'This Month',       value: data?.this_month,      icon: <Calendar size={18} />,  color: 'var(--warning)' },
    { label: 'Low Stock Items',  value: invDash?.low_stock?.length, icon: <AlertTriangle size={18} />, color: 'var(--danger)' },
  ];

  return (
    <div>
      <div className="top-header">
        <div>
          <div className="header-title">Dashboard</div>
          {user && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Welcome back, {user.name} 👋</div>}
        </div>
        <div className="header-actions">
          <Link to="/quotations/new" className="btn btn-primary"><Plus size={15} /> New Quotation</Link>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          {isLoading
            ? [0,1,2,3].map(i => <SkeletonCard key={i} />)
            : stats.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card-glow" />
                <div className="stat-icon" style={{ background: s.color + '22', color: s.color }}>{s.icon}</div>
                <div className="stat-value">{s.value ?? '0'}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))
          }
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Recent Quotations */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Quotations</span>
              <Link to="/quotations" className="btn btn-ghost btn-sm">View All <ArrowRight size={13} /></Link>
            </div>
            {isLoading ? (
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 36 }} />)}
              </div>
            ) : !data?.recent?.length ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <div className="empty-state-icon" style={{ fontSize: 32 }}>📄</div>
                <h3>No quotations yet</h3>
                <Link to="/quotations/new" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}><Plus size={12} /> Create First</Link>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Quote #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.recent.map(q => (
                      <tr key={q.id}>
                        <td><Link to={`/quotations/${q.id}/edit`} style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{q.quote_number}</Link></td>
                        <td style={{ fontWeight: 500, fontSize: 12.5 }}>{q.customer_name || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{currency}{Number(q.total).toLocaleString('en-IN')}</td>
                        <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Top Products</span>
              <span className="badge badge-accent">By Revenue</span>
            </div>
            <div className="card-body">
              {!data?.top_products?.length ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '20px 0', fontSize: 13 }}>No sales data yet</p>
              ) : data.top_products.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.top_products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ width: 24, height: 24, background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.product_name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Qty: {p.total_qty}</div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: 13 }}>{currency}{Number(p.total_amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Overview + Low Stock Alert */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          {data?.status_counts?.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Quote Status</span></div>
              <div className="card-body" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {data.status_counts.map(s => (
                  <div key={s.status} style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 30, fontWeight: 800, color: statusColors[s.status] || 'var(--accent)', fontFamily: 'var(--font-display)' }}>{s.c}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{s.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invDash?.low_stock?.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--warning)' }}>⚠ Low Stock Alert</span>
                <Link to="/inventory" className="btn btn-warning btn-sm">View All</Link>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invDash.low_stock.slice(0, 4).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    <span style={{ color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                      {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Link to="/quotations/new" className="fab"><Plus size={18} /> New Quotation</Link>
    </div>
  );
}
