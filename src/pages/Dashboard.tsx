import React from 'react';
import { useStok } from '../context/StokContext';
import { History, Package, DollarSign, ArrowUpRight, ArrowDownLeft, LogOut, AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

const Dashboard: React.FC = () => {
  const { totalModal, products, transactions, loading, user, signOut, scanOutBarcode } = useStok();

  // Scan Out states
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [scanMessage, setScanMessage] = React.useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Report states
  const [isReportOpen, setIsReportOpen] = React.useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Hitung total omset hari ini (penjualan keluar hari ini)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalOmsetToday = transactions
    .filter(t => t.tipe === 'keluar')
    .filter(t => new Date(t.created_at) >= todayStart)
    .reduce((sum, t) => {
      const product = products.find(p => p.id === t.product_id);
      const price = product ? product.harga_jual : 0;
      return sum + (t.jumlah * price);
    }, 0);

  // 2. Hitung total omset bulan ini (penjualan keluar bulan ini)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalOmsetThisMonth = transactions
    .filter(t => t.tipe === 'keluar')
    .filter(t => new Date(t.created_at) >= startOfMonth)
    .reduce((sum, t) => {
      const product = products.find(p => p.id === t.product_id);
      const price = product ? product.harga_jual : 0;
      return sum + (t.jumlah * price);
    }, 0);

  // 3. Kelompokkan omset harian per tanggal
  const dailyOmsetReport: { tanggalStr: string; dateObj: Date; total: number }[] = [];

  transactions
    .filter(t => t.tipe === 'keluar')
    .forEach(t => {
      const date = new Date(t.created_at);
      const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      const product = products.find(p => p.id === t.product_id);
      const price = product ? product.harga_jual : 0;
      const subtotal = t.jumlah * price;

      const existingIndex = dailyOmsetReport.findIndex(r => r.tanggalStr === dateStr);
      if (existingIndex > -1) {
        dailyOmsetReport[existingIndex].total += subtotal;
      } else {
        dailyOmsetReport.push({
          tanggalStr: dateStr,
          dateObj: date,
          total: subtotal
        });
      }
    });

  // Urutkan laporan dari tanggal terbaru ke terlama
  dailyOmsetReport.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  // Compute some quick stats
  const totalBarangTipe = products.length;
  const totalStokBarang = products.reduce((sum, p) => sum + p.stok, 0);
  const outOfStockItems = products.filter(p => p.stok === 0).length;

  const recentTransactions = transactions.slice(0, 4);

  // Lifecycle hook for barcode scanner camera (Scan Out)
  React.useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (isScannerOpen) {
      setScanMessage({ type: 'info', text: 'Menginisialisasi kamera...' });
      
      const timer = setTimeout(() => {
        const elementId = "dashboard-scanner-reader";
        const element = document.getElementById(elementId);
        if (!element) {
          setScanMessage({ type: 'error', text: 'Gagal menemukan area pemindai kamera.' });
          return;
        }

        try {
          html5QrCode = new Html5Qrcode(elementId);
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            async (decodedText) => {
              setScanMessage({ type: 'info', text: `Barcode terdeteksi: ${decodedText}. Memproses...` });
              
              // Play a beep sound using Web Audio API
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
              } catch (beepErr) {
                console.log("Audio feedback failed:", beepErr);
              }

              try {
                // Call scanOutBarcode from context, which returns the product name
                const productName = await scanOutBarcode(decodedText);
                setScanMessage({ 
                  type: 'success', 
                  text: `Berhasil menjual: ${productName} (Barcode: ${decodedText})!` 
                });
                
                // Close scanner after showing success for a bit
                setTimeout(() => {
                  setIsScannerOpen(false);
                  setScanMessage(null);
                }, 1800);
              } catch (err: any) {
                setScanMessage({ type: 'error', text: err.message || 'Gagal memproses Scan Out' });
              }
            },
            () => {
              // Ignore verbose errors
            }
          ).then(() => {
            setScanMessage({ type: 'info', text: 'Kamera aktif. Arahkan ke barcode barang di tangan.' });
          }).catch((err) => {
            console.error("Camera start error:", err);
            setScanMessage({ type: 'error', text: `Gagal mengakses kamera: ${err.message || err}` });
          });
        } catch (initErr: any) {
          console.error("Scanner init error:", initErr);
          setScanMessage({ type: 'error', text: `Gagal menginisialisasi kamera: ${initErr.message || initErr}` });
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
        }
      };
    }
  }, [isScannerOpen]);

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
          <span className="text-xs text-muted font-mono" style={{ opacity: 0.6, letterSpacing: '0.5px' }}>@rrippkii</span>
        </div>
        <h1 className="header-title" style={{ margin: 0, fontSize: '26px' }}>StokPlan</h1>
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
            Dihitung dari akumulasi modal semua barang masuk
          </p>
        </div>

        {/* Total Omset Card */}
        <div 
          className="glass-card" 
          onClick={() => setIsReportOpen(true)}
          style={{ 
            position: 'relative', 
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(22, 30, 49, 0.7) 100%)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Omset Hari Ini</span>
            <span style={{ color: 'var(--success)', padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)' }}>
              <DollarSign size={18} />
            </span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', fontFamily: 'var(--font-display)' }} className="text-success">
            {formatRupiah(totalOmsetToday)}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Lihat Laporan Harian ➔
          </span>
        </div>
      </div>

      {/* GLOWING SCAN OUT BUTTON */}
      <button
        onClick={() => {
          setScanMessage(null);
          setIsScannerOpen(true);
        }}
        className="btn btn-primary"
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '18px',
          fontSize: '16px',
          background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
          boxShadow: '0 0 25px rgba(236, 72, 153, 0.35)',
          border: 'none',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          margin: '4px 0'
        }}
      >
        <span>📷 Scan Out (Keluar Barang)</span>
      </button>

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

      {/* GLOBAL SCAN OUT SCANNER MODAL */}
      {isScannerOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '450px', background: '#090d16', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="modal-header">
              <h3 className="modal-title">📷 Scan Out (Stok Keluar)</h3>
              <button 
                className="btn-icon-only" 
                onClick={() => {
                  setIsScannerOpen(false);
                  setScanMessage(null);
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Scan barcode unit barang untuk otomatis mengurangi stok barang tersebut sebanyak 1 unit dan mencatat transaksi penjualan.
              </p>
            </div>

            {/* Camera Viewfinder Box */}
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              background: '#000', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              border: '2px solid rgba(236, 72, 153, 0.3)',
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.15)',
              aspectRatio: '1',
              marginBottom: '16px'
            }}>
              <div id="dashboard-scanner-reader" style={{ width: '100%', height: '100%' }}></div>
              
              {/* Overlay Laser Scan Effect */}
              {scanMessage?.type === 'info' && scanMessage.text.includes('Kamera aktif') && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  background: 'var(--danger)',
                  boxShadow: '0 0 12px var(--danger)',
                  animation: 'laser-scan 2.5s infinite linear',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}></div>
              )}
            </div>

            {/* Hardware Barcode Gun Input */}
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Atau tembak barcode dengan scanner gun..." 
                className="input-control" 
                style={{ 
                  padding: '10px 14px', 
                  fontSize: '13px', 
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.1)'
                }}
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const code = (e.target as HTMLInputElement).value.trim();
                    if (!code) return;
                    setScanMessage({ type: 'info', text: `Memproses barcode: ${code}...` });
                    try {
                      const productName = await scanOutBarcode(code);
                      setScanMessage({ 
                        type: 'success', 
                        text: `Berhasil menjual: ${productName} (Barcode: ${code})!` 
                      });
                      (e.target as HTMLInputElement).value = '';
                      setTimeout(() => {
                        setIsScannerOpen(false);
                        setScanMessage(null);
                      }, 1800);
                    } catch (err: any) {
                      setScanMessage({ type: 'error', text: err.message || 'Gagal memproses Scan Out' });
                    }
                  }
                }}
              />
            </div>

            {/* Scan Message / Status */}
            {scanMessage && (
              <div className={`badge ${
                scanMessage.type === 'success' ? 'badge-success' : 
                scanMessage.type === 'error' ? 'badge-danger' : 'badge-info'
              }`} style={{ 
                width: '100%', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'flex-start',
                textAlign: 'left',
                fontSize: '13px',
                lineHeight: 1.4,
                marginBottom: '16px'
              }}>
                {scanMessage.type === 'success' && <span>✅</span>}
                {scanMessage.type === 'error' && <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />}
                {scanMessage.type === 'info' && <span className="animate-pulse">🔄</span>}
                <span style={{ fontWeight: 500 }}>{scanMessage.text}</span>
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setIsScannerOpen(false);
                setScanMessage(null);
              }}
              style={{ width: '100%', padding: '12px' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 3. DAILY OMSET REPORT MODAL */}
      {isReportOpen && (
        <div className="modal-overlay" onClick={() => setIsReportOpen(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧾 Laporan Omset Harian</span>
              </h3>
              <button className="btn-icon-only" onClick={() => setIsReportOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Report Content */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', marginBottom: '16px' }}>
              {dailyOmsetReport.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Belum ada transaksi penjualan yang tercatat.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dailyOmsetReport.map((day, idx) => (
                    <div 
                      key={idx} 
                      className="glass-card" 
                      style={{ 
                        padding: '14px 16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>📅</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {day.tanggalStr}
                        </span>
                      </div>
                      <span className="text-success" style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                        {formatRupiah(day.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Bottom Section: Monthly total */}
            <div style={{ 
              flexShrink: 0,
              padding: '16px', 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '20px', 
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block' }}>
                  Total Bulan Ini
                </span>
                <span className="text-success" style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: '2px', display: 'block' }}>
                  {formatRupiah(totalOmsetThisMonth)}
                </span>
              </div>
              <span style={{ fontSize: '24px' }}>📈</span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsReportOpen(false)}
              style={{ width: '100%', padding: '12px', flexShrink: 0 }}
            >
              Tutup Laporan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
