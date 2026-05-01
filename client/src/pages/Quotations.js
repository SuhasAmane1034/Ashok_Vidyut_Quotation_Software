import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Quotations() {
  const { settings, addToast } = useApp();
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const qc = useQueryClient();
  const currency = settings?.currency || '₹';

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => axios.get('/api/quotations').then(r => r.data)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/quotations/${id}`),
    onSuccess: () => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['analytics']); addToast('Quotation deleted'); },
    onError: () => addToast('Failed to delete', 'error')
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, ...body }) => axios.put(`/api/quotations/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['analytics']); addToast('Status updated'); }
  });

  const filtered = quotations.filter(q => {
    const matchSearch = !search ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_mobile?.includes(search);
    return matchSearch && (statusFilter === 'all' || q.status === statusFilter);
  });

  const statusCounts = { all: quotations.length };
  quotations.forEach(q => { statusCounts[q.status] = (statusCounts[q.status] || 0) + 1; });

  return (
    <div>
      <div className="top-header">
        <span className="header-title">Quotations</span>
        <div className="header-actions">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input placeholder="Search by name, quote#, mobile…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
          </div>
          {search && <button className="btn btn-ghost btn-icon" onClick={() => setSearch('')}><X size={14} /></button>}
          <Link to="/quotations/new" className="btn btn-primary"><Plus size={15} /> New Quote</Link>
        </div>
      </div>

      <div className="page-content">
        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[['all','All'], ['draft','Draft'], ['sent','Sent'], ['approved','Approved'], ['rejected','Rejected']].map(([val, label]) => (
            <button key={val}
              className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(val)}
            >
              {label}
              {statusCounts[val] > 0 && (
                <span style={{ background: statusFilter === val ? 'rgba(255,255,255,0.25)' : 'var(--accent-muted)', color: statusFilter === val ? 'white' : 'var(--accent)', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 700 }}>
                  {statusCounts[val]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="card">
          {isLoading ? (
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>{search ? 'No results found' : 'No quotations yet'}</h3>
              <p>{search ? 'Try a different search term' : 'Create your first quotation to get started'}</p>
              <br />
              <Link to="/quotations/new" className="btn btn-primary"><Plus size={14} /> Create Quotation</Link>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Date</th>
                    <th>Valid Till</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q => {
                    const validTill = q.date && q.validity_days
                      ? new Date(new Date(q.date).getTime() + q.validity_days * 86400000).toLocaleDateString('en-IN')
                      : '—';
                    const isExpired = q.validity_days && q.date && new Date() > new Date(new Date(q.date).getTime() + q.validity_days * 86400000) && q.status !== 'approved';
                    return (
                      <tr key={q.id}>
                        <td>
                          <Link to={`/quotations/${q.id}/edit`} style={{ color: 'var(--accent)', fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: 13 }}>
                            {q.quote_number}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{q.customer_name || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{q.customer_mobile || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {q.date ? new Date(q.date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span style={{ color: isExpired ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: isExpired ? 700 : 400 }}>
                            {validTill} {isExpired && '⚠'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, textAlign: 'right' }}>
                          {currency}{Number(q.total || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <select
                            value={q.status}
                            onChange={e => updateStatus.mutate({ id: q.id, status: e.target.value })}
                            className={`badge badge-${q.status}`}
                            style={{ cursor: 'pointer', fontWeight: 700, fontSize: 11, padding: '3px 7px', border: 'none', appearance: 'none', borderRadius: 20 }}
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Link to={`/quotations/${q.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                              <Edit2 size={13} />
                            </Link>
                            <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                              onClick={() => window.confirm(`Delete ${q.quote_number}?`) && deleteMutation.mutate(q.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary row */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 4px', fontSize: 13, color: 'var(--text-muted)', gap: 20 }}>
            <span>{filtered.length} quotations</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Total: {currency}{filtered.reduce((s, q) => s + (q.total || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      <Link to="/quotations/new" className="fab"><Plus size={18} /> New Quotation</Link>
    </div>
  );
}
