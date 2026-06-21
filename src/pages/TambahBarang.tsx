import React, { useState } from 'react';
import { useStok } from '../context/StokContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';

const TambahBarang: React.FC = () => {
  const { addProduct, categories, error, clearError, loading } = useStok();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('category_id') || '';

  const [formInputs, setFormInputs] = useState({
    nama: '',
    hargaModal: '',
    hargaJual: '',
    stokAwal: '0'
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categoryIdParam);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    const { nama, hargaModal, hargaJual, stokAwal } = formInputs;
    
    // Validations
    if (!nama.trim()) {
      setValidationError('Nama barang tidak boleh kosong');
      return;
    }

    const modalNum = parseInt(hargaModal);
    const jualNum = parseInt(hargaJual);
    const stokNum = parseInt(stokAwal);

    if (isNaN(modalNum) || modalNum <= 0) {
      setValidationError('Harga modal harus berupa angka positif (> 0)');
      return;
    }

    if (isNaN(jualNum) || jualNum <= 0) {
      setValidationError('Harga jual harus berupa angka positif (> 0)');
      return;
    }

    if (isNaN(stokNum) || stokNum < 0) {
      setValidationError('Stok awal tidak boleh bernilai negatif');
      return;
    }

    try {
      await addProduct(nama, modalNum, jualNum, stokNum, selectedCategoryId || null);
      
      // If we came from a specific category folder, redirect back to it
      if (categoryIdParam) {
        navigate(`/barang?category_id=${categoryIdParam}`);
      } else {
        navigate('/barang');
      }
    } catch (err: any) {
      // Error will be caught and set in the context
    }
  };

  return (
    <div className="main-content animate-fade-in">
      <div className="header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link 
            to={categoryIdParam ? `/barang?category_id=${categoryIdParam}` : "/barang"} 
            className="btn-icon-only" 
            style={{ borderRadius: '12px' }} 
            onClick={clearError}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <span className="text-xs text-muted font-bold font-display" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>KATALOG BARANG</span>
            <h1 className="header-title" style={{ margin: 0, fontSize: '22px' }}>Tambah Barang Baru</h1>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="input-nama">Nama Barang</label>
            <input 
              id="input-nama"
              type="text" 
              placeholder="Contoh: Gula Pasir 1kg" 
              className="input-control"
              value={formInputs.nama}
              onChange={(e) => setFormInputs({ ...formInputs, nama: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="select-kategori">Kategori / Kelompok Barang</label>
            <select 
              id="select-kategori"
              className="input-control"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              style={{ 
                background: 'rgba(5, 8, 17, 0.6) url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 16px center',
                backgroundSize: '16px',
                paddingRight: '40px',
                border: '2px solid var(--border-color)'
              }}
            >
              <option value="">-- Tanpa Kategori (Umum) --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="input-modal">Harga Modal (Rp)</label>
              <input 
                id="input-modal"
                type="number" 
                min="1"
                placeholder="10000" 
                className="input-control"
                value={formInputs.hargaModal}
                onChange={(e) => setFormInputs({ ...formInputs, hargaModal: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="input-jual">Harga Jual (Rp)</label>
              <input 
                id="input-jual"
                type="number" 
                min="1"
                placeholder="12000" 
                className="input-control"
                value={formInputs.hargaJual}
                onChange={(e) => setFormInputs({ ...formInputs, hargaJual: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="input-stok">Stok Awal</label>
            <input 
              id="input-stok"
              type="number" 
              min="0"
              placeholder="0" 
              className="input-control"
              value={formInputs.stokAwal}
              onChange={(e) => setFormInputs({ ...formInputs, stokAwal: e.target.value })}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Stok awal akan dicatat otomatis sebagai transaksi "Stok Masuk" pertama.
            </span>
          </div>

          {/* VALIDATION ERROR INDICATOR */}
          {(validationError || error) && (
            <div className="badge badge-danger" style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 500 }}>
                {validationError || error}
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginTop: '8px' }}>
            <Link 
              to={categoryIdParam ? `/barang?category_id=${categoryIdParam}` : "/barang"} 
              className="btn btn-secondary" 
              style={{ padding: '12px' }} 
              onClick={clearError}
            >
              Batal
            </Link>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16} />
              {loading ? 'Menyimpan...' : 'Simpan Barang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TambahBarang;
