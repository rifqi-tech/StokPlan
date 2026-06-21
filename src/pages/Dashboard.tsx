import React from 'react';
import { useStok } from '../context/StokContext';
import { History, Package, TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { totalModal, totalOmset, products, transactions, loading, isSupabaseConnected, user, signOut } = useStok();

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Compute some quick stats
  const totalBarangTipe = products.length;
  const totalStokBarang = products.reduce((sum, p) => sum + p.stok, 0);
  const outOfStockItems = products.filter(p => p.stok === 0).length;

  const recentTransactions = transactions.slice(0, 4);

  if (loading && products.length === 0) {
    return (
      <div className="empty-state animate-fade-in" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
        <p>Memuat data dasbor...</p>
      </div>
    );
  }

  return (
    <div className="main-content animate-fade-in">
      <div className="header-bar">
        <div>
          <span className="text-xs text-muted font-bold font-display" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>YO, WELCOME BACK! 👋</span>
          <h1 className="header-title" style={{ margin: 0, fontSize: '32px' }}>StokPlan</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className={isSupabaseConnected ? "badge badge-success" : "badge"} style={{ 
            background: isSupabaseConnected ? 'var(--success-bg)' : 'rgba(245, 158, 11, 0.1)', 
            borderColor: isSupabaseConnected ? 'var(--success-border)' : 'rgba(245, 158, 11, 0.25)', 
            color: isSupabaseConnected ? 'var(--success)' : 'var(--warning)',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}>
            <span>{isSupabaseConnected ? 'Cloud' : 'Demo'}</span>
          </div>
          <div className="badge badge-success">
            <TrendingUp size={14} />
            <span>Akun Aktif</span>
          </div>
        </div>
      </div>

      <div style={{ 
        margin: '-12px 0 0 0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '12px 16px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Akun Terhubung</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700 }}>{user?.email}</span>
        </div>
        
        <button 
          onClick={signOut} 
          className="btn-icon-only" 
          title="Keluar Akun"
          style={{ color: 'var(--danger)', width: '36px', height: '36px', borderRadius: '10px' }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        {/* Total Modal Card */}
        <div className="glass-card" style={{ 
          position: 'relative', 
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(22, 30, 49, 0.7) 100%)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Modal Tertanam</span>
            <span style={{ color: 'var(--primary)', padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)' }}>
              <Package size={18} />
            </span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', fontFamily: 'var(--font-display)' }} className="text-primary">
            {formatRupiah(totalModal)}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Dihitung dari total (Stok × Harga Modal) semua barang
          </p>
        </div>

        {/* Total Omset Card */}
        <div className="glass-card" style={{ 
          position: 'relative', 
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(22, 30, 49, 0.7) 100%)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Omset Penjualan</span>
            <span style={{ color: 'var(--success)', padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', fontFamily: 'var(--font-display)' }} className="text-success">
            {formatRupiah(totalOmset)}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Dihitung dari total (Jumlah × Harga Jual) transaksi keluar
          </p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div className="glass-card" style={{ padding: '14px 10px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tipe Barang</span>
          <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{totalBarangTipe}</span>
        </div>
        <div className="glass-card" style={{ padding: '14px 10px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Total Unit</span>
          <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{totalStokBarang}</span>
        </div>
        <div className="glass-card" style={{ 
          padding: '14px 10px', 
          textAlign: 'center',
          border: outOfStockItems > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Stok Habis</span>
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            fontFamily: 'var(--font-display)',
            color: outOfStockItems > 0 ? 'var(--danger)' : 'var(--text-primary)' 
          }}>{outOfStockItems}</span>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} className="text-muted" />
            Riwayat Terbaru
          </h3>
          <Link to="/riwayat" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Lihat Semua
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            Belum ada transaksi tercatat.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTransactions.map((tx) => (
              <div key={tx.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
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
                    <h4 style={{ fontSize: '14px', margin: '0 0 2px 0', fontWeight: 600 }}>{tx.nama_barang}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 700,
                    color: tx.tipe === 'masuk' ? 'var(--success)' : 'var(--danger)',
                    display: 'block'
                  }}>
                    {tx.tipe === 'masuk' ? '+' : '-'}{tx.jumlah}
                  </span>
                  {tx.tipe === 'keluar' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatRupiah((tx.harga_jual || 0) * tx.jumlah)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
