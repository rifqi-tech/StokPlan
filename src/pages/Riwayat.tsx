import React, { useState } from 'react';
import { useStok } from '../context/StokContext';
import { History, ArrowUpRight, ArrowDownLeft, Calendar, Filter } from 'lucide-react';

const Riwayat: React.FC = () => {
  const { transactions, loading } = useStok();
  const [filterType, setFilterType] = useState<'semua' | 'masuk' | 'keluar'>('semua');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'semua') return true;
    return t.tipe === filterType;
  });

  if (loading && transactions.length === 0) {
    return (
      <div className="empty-state animate-fade-in" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
        <p>Memuat riwayat transaksi...</p>
      </div>
    );
  }

  return (
    <div className="main-content animate-fade-in">
      <div className="header-bar">
        <div>
          <span className="text-xs text-muted font-bold font-display" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>MUTASI STOK</span>
          <h1 className="header-title" style={{ margin: 0, fontSize: '28px' }}>Riwayat Transaksi</h1>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="glass-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, paddingRight: '8px', borderRight: '1px solid var(--border-color)', flexShrink: 0 }}>
          <Filter size={14} />
          Filter
        </span>

        {['semua', 'masuk', 'keluar'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type as any)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'var(--transition-fast)',
              background: filterType === type ? 'var(--primary)' : 'transparent',
              color: filterType === type ? '#fff' : 'var(--text-secondary)'
            }}
          >
            {type === 'semua' ? 'Semua' : type === 'masuk' ? 'Stok Masuk' : 'Stok Keluar'}
          </button>
        ))}
      </div>

      {/* TRANSACTIONS LIST */}
      {filteredTransactions.length === 0 ? (
        <div className="empty-state glass-card">
          <History className="empty-state-icon" />
          <div>
            <h3 style={{ margin: '0 0 6px 0' }}>Tidak Ada Transaksi</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {filterType === 'semua' 
                ? 'Belum ada aktivitas mutasi stok pada akun Anda.' 
                : `Tidak ditemukan transaksi dengan tipe "stok ${filterType}".`}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="glass-card" style={{ 
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: tx.tipe === 'masuk' 
                ? 'linear-gradient(to right, rgba(16, 185, 129, 0.03) 0%, var(--bg-surface) 100%)' 
                : 'linear-gradient(to right, rgba(239, 68, 68, 0.03) 0%, var(--bg-surface) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  padding: '8px', 
                  borderRadius: '10px', 
                  background: tx.tipe === 'masuk' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: tx.tipe === 'masuk' ? 'var(--success)' : 'var(--danger)'
                }}>
                  {tx.tipe === 'masuk' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', margin: '0 0 4px 0', fontWeight: 600, lineHeight: 1.3 }}>{tx.nama_barang}</h4>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <Calendar size={12} />
                    <span>
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${tx.tipe === 'masuk' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '2px 8px', fontSize: '11px', marginBottom: '4px' }}>
                  {tx.tipe === 'masuk' ? '+' : '-'}{tx.jumlah} Unit
                </span>
                
                {tx.tipe === 'keluar' && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
                    {formatRupiah((tx.harga_jual || 0) * tx.jumlah)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Riwayat;
