import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { StokProvider, useStok } from './context/StokContext';
import Dashboard from './pages/Dashboard';
import Barang from './pages/Barang';
import TambahBarang from './pages/TambahBarang';
import Riwayat from './pages/Riwayat';
import Login from './pages/Login';
import { LayoutDashboard, Package, History, Camera, Loader, AlertTriangle, X } from 'lucide-react';
import './App.css';

// Gemini API OCR function
const scanReceiptWithGemini = async (base64Image: string, apiKey: string): Promise<{ total_omset: number; keterangan: string }> => {
  const rawBase64 = base64Image.split(',')[1] || base64Image;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Analyze this receipt image. Extract the total sales amount (total omset/total belanja) and return it ONLY as a raw JSON object with the format: {\"total_omset\": number, \"keterangan\": \"string\"}. The 'keterangan' should be a very short summary like the store name or main item (max 30 chars). Do not include any markdown formatting like ```json or any explanations, just return the raw JSON object."
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: rawBase64
            }
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errText}`);
  }

  const resData = await response.json();
  const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("Gagal membaca hasil analisis gambar dari AI.");
  }

  const cleanJsonText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleanJsonText);
    if (typeof parsed.total_omset !== 'number') {
      throw new Error("Total omset yang ditemukan tidak valid.");
    }
    return {
      total_omset: parsed.total_omset,
      keterangan: parsed.keterangan || 'Scan Struk'
    };
  } catch (e) {
    console.error("Failed to parse JSON response:", cleanJsonText);
    throw new Error("Format respons AI tidak sesuai. Silakan coba lagi.");
  }
};

const AppContent: React.FC = () => {
  const { user, loading, addScanTransaction } = useStok();
  const location = useLocation();

  // Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ total_omset: number; keterangan: string } | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Gemini API Key from environment
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const triggerCamera = () => {
    document.getElementById('camera-file-input')?.click();
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setScanResult(null);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setCapturedImage(base64Data);

      try {
        if (geminiApiKey) {
          const result = await scanReceiptWithGemini(base64Data, geminiApiKey);
          setScanResult(result);
        } else {
          // Simulation mode when no API Key is set
          await new Promise(resolve => setTimeout(resolve, 3000));
          const randomAmount = Math.floor(Math.random() * 6 + 1) * 25000 + 15000; // Rp40.000 to Rp165.000
          const mockShops = ['Indomaret', 'Alfamart', 'Superindo', 'Kopi Kenangan', 'Starbucks'];
          const randomShop = mockShops[Math.floor(Math.random() * mockShops.length)];
          setScanResult({
            total_omset: randomAmount,
            keterangan: `${randomShop} (Demo)`
          });
        }
      } catch (err: any) {
        console.error("Scan error:", err);
        setScanError(err.message || "Gagal memindai struk. Silakan coba lagi.");
      } finally {
        setIsScanning(false);
        setIsResultOpen(true);
      }
    };
    reader.readAsDataURL(file);
    
    // Clear input value so same file can be triggered again
    e.target.value = '';
  };

  const handleConfirmSave = async () => {
    if (!scanResult) return;
    setIsSaving(true);
    try {
      await addScanTransaction(scanResult.total_omset, scanResult.keterangan);
      setIsResultOpen(false);
      setCapturedImage(null);
      setScanResult(null);
    } catch (err: any) {
      alert(`Gagal menyimpan transaksi: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !isScanning && !isSaving) {
    return (
      <div className="empty-state" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: 600 }}>Menyiapkan Aplikasi...</p>
      </div>
    );
  }

  const showBottomNav = user && ['/dashboard', '/barang', '/riwayat'].includes(location.pathname);

  return (
    <div className="app-container" style={{ paddingBottom: showBottomNav ? '96px' : '24px' }}>
      
      {/* Hidden native camera trigger */}
      <input 
        id="camera-file-input"
        type="file" 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={handleCameraChange}
      />

      {/* Main App Routes */}
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/barang" element={<Barang />} />
            <Route path="/barang/baru" element={<TambahBarang />} />
            <Route path="/riwayat" element={<Riwayat />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>

      {/* Premium Bottom Navigation */}
      {showBottomNav && (
        <nav className="bottom-nav" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr 1fr', alignItems: 'center' }}>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/barang" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Package />
            <span>Barang</span>
          </NavLink>

          {/* Camera Scan Trigger Button */}
          <button 
            type="button" 
            className="bottom-nav-item camera-fab"
            onClick={triggerCamera}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <div className="camera-fab-circle">
              <Camera size={22} style={{ color: '#fff' }} />
            </div>
            <span>Scan Struk</span>
          </button>

          <NavLink 
            to="/riwayat" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <History />
            <span>Riwayat</span>
          </NavLink>
        </nav>
      )}

      {/* A. SCREENING / SCANNING OVERLAY MODAL */}
      {isScanning && (
        <div className="scanner-overlay animate-fade-in">
          <div className="scanner-viewfinder" style={{ backgroundImage: capturedImage ? `url(${capturedImage})` : 'none' }}>
            <div className="scan-laser"></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ borderColor: 'var(--primary) transparent transparent transparent', margin: '0 auto 16px auto' }}></div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Menganalisis Struk dengan AI ⚡
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', margin: 0, opacity: 0.8 }}>
              {geminiApiKey ? "Membaca teks struk menggunakan Gemini Vision..." : "Menjalankan pemindaian demo struk..."}
            </p>
          </div>
        </div>
      )}

      {/* B. CONFIRMATION / RESULT MODAL */}
      {isResultOpen && (
        <div className="modal-overlay" onClick={() => setIsResultOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Hasil Scan Struk 🧾</h3>
              <button className="btn-icon-only" onClick={() => setIsResultOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {scanError ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ color: 'var(--danger)', background: 'var(--danger-bg)', padding: '12px', borderRadius: '50%', display: 'inline-flex', marginBottom: '16px' }}>
                  <AlertTriangle size={32} />
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Pemindaian Gagal</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '20px' }}>
                  {scanError}
                </p>
                <button className="btn btn-primary" onClick={triggerCamera} style={{ width: '100%' }}>
                  Ambil Foto Ulang 📸
                </button>
              </div>
            ) : (
              <div>
                {capturedImage && (
                  <div style={{ 
                    width: '100%', 
                    height: '140px', 
                    borderRadius: '16px', 
                    backgroundImage: `url(${capturedImage})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    marginBottom: '20px',
                    border: '1px solid var(--border-color)',
                    position: 'relative'
                  }}>
                    {/* Small watermark */}
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '8px', fontSize: '9px', color: '#fff', fontWeight: 600 }}>
                      FOTO STRUK
                    </div>
                  </div>
                )}

                <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', marginBottom: '20px', borderRadius: '18px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Detail Struk</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>
                      {scanResult?.keterangan || 'Scan Struk'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Nominal (Omset)</span>
                    <span className="text-success" style={{ fontSize: '26px', fontWeight: 900, display: 'block', marginTop: '2px', fontFamily: 'var(--font-display)' }}>
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(scanResult?.total_omset || 0)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsResultOpen(false)} disabled={isSaving}>
                    Batal
                  </button>
                  <button className="btn btn-primary" onClick={handleConfirmSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isSaving ? <Loader size={16} className="spinner" /> : null}
                    {isSaving ? 'Menyimpan...' : 'Simpan ke Omset'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StokProvider>
      <Router>
        <AppContent />
      </Router>
    </StokProvider>
  );
};

export default App;
